// Regression test for the Message Request duplication bug (see messages.md).
//
// A sender messaging the same non-friend multiple times before the request is
// accepted must produce exactly ONE pending message request. The DB enforces
// this with a partial UNIQUE index on (conversation_id) WHERE status='pending'
// (surfacing to the gateway client as 409 / Postgres 23505). This simulation
// models that constraint so it verifies the real code path end to end:
//   - first send creates one pending request,
//   - every subsequent send reuses it (no second insert),
//   - the shared conversation + all messages are preserved.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';
import { ensureMessageRequest } from '@/lib/messageRequests';

export const __notifications: unknown[] = [];

vi.mock('@/hooks/useNotifications', () => ({
  createNotification: (n: unknown) => (__notifications as unknown[]).push(n),
}));

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const CONVERSATION = 'conversation-uuid-0001';

let notifications: unknown[] = [];

function makeInMemoryDb() {
  // Models public.message_requests with:
  //   UNIQUE(sender_id, receiver_id)
  //   partial UNIQUE index (conversation_id) WHERE status='pending'
  const messageRequests: any[] = [];
  const friends: any[] = []; // no friendship => non-friend path

  const uniquePending = (row: any) =>
    messageRequests.some(
      (r) =>
        r.conversation_id === row.conversation_id &&
        r.status === 'pending'
    );

  return {
    handle(req: { url: string; method?: string; body?: unknown }) {
      const url = new URL(req.url, 'http://mock.test');
      const method = req.method || 'GET';
      const path = url.pathname;

      if (path === '/api/message_requests') {
        if (method === 'GET') {
          return { status: 200, json: messageRequests };
        }
        if (method === 'POST') {
          const row = {
            id: 'req-' + (messageRequests.length + 1),
            ...(req.body as object),
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          } as any;
          // DB-level guarantees the client must not be able to bypass.
          if (
            messageRequests.some(
              (r) => r.sender_id === row.sender_id && r.receiver_id === row.receiver_id
            )
          ) {
            return { status: 409, json: { code: 409, message: 'duplicate sender/receiver' } };
          }
          if (row.status === 'pending' && uniquePending(row)) {
            return { status: 409, json: { code: 409, message: 'duplicate pending conversation' } };
          }
          messageRequests.push(row);
          return { status: 201, json: row };
        }
      }

      if (path === '/api/friends') {
        return { status: 200, json: friends };
      }

      if (path === '/api/restricted_users') {
        return { status: 200, json: [] };
      }

      return { status: 404, json: { error: `no mock route for ${method} ${path}` } };
    },
    messageRequests,
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tone-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' }));
  notifications = [];

  const db = makeInMemoryDb();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    let body: unknown = undefined;
    if (init?.body) body = JSON.parse(init.body as string);
    const resp = db.handle({ url, method, body });
    return {
      ok: resp.status < 400,
      status: resp.status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => resp.json,
    } as Response;
  });
  (globalThis as any).fetch = fetchMock;

  notifications = __notifications;
  __notifications.length = 0;
});

describe('ensureMessageRequest dedup for the same conversation/recipient', () => {
  it('creates exactly one pending request across many messages to the same non-friend', async () => {
    // First message -> request created.
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      conversationId: CONVERSATION,
      category: 'spam',
    });

    // Messages 2..5 -> request reused, no new insert.
    for (let i = 0; i < 4; i++) {
      await ensureMessageRequest({
        senderId: SENDER,
        receiverId: RECEIVER,
        conversationId: CONVERSATION,
        category: 'spam',
      });
    }

    const pending = (await gateway.from('message_requests').select('*').eq('status', 'pending'))
      .data || [];
    expect(pending).toHaveLength(1);
    expect(pending[0].sender_id).toBe(SENDER);
    expect(pending[0].receiver_id).toBe(RECEIVER);
    expect(pending[0].conversation_id).toBe(CONVERSATION);

    // Only the first send should have registered a notification.
    expect(notifications).toHaveLength(1);

    // All rows in the table are pending (still no duplicates/blocked rows).
    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
  });

  it('dedups even when conversation_id is not yet present on the host', async () => {
    // Simulates the pre-migration host: conversation_id column absent, so we
    // send without a conversationId. The sender/receiver pair check (the
    // original schema-stable UNIQUE key) must still collapse to one request.
    for (let i = 0; i < 5; i++) {
      await ensureMessageRequest({
        senderId: SENDER,
        receiverId: RECEIVER,
        category: 'spam',
      });
    }
    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(notifications).toHaveLength(1);
  });
});
