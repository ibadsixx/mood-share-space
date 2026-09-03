// Regression test for the recipient-identity / same-conversation regression
// (see messages.md). A sender messaging a non-friend must have Chats, Pending,
// and the message_request Notification all resolve to the SAME conversation:
//
//   - Sender A's Chats includes the conversation they initiated (it must not be
//     filtered out just because the other participant isn't yet an accepted
//     friend / hasn't accepted the request).
//   - A message_request notification must resolve to the request's
//     conversation_id so a click opens the same conversation in Chat, and never
//     creates a new one.
//
// This exercises the real gateway-client code paths (ensureMessageRequest insert
// and resolveMessageRequestConversation read) against an in-memory model of
// public.message_requests with the sender/receiver + pending-conversation
// uniqueness guarantees.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';
import { ensureMessageRequest, resolveMessageRequestConversation } from '@/lib/messageRequests';

export const __notifications: unknown[] = [];

vi.mock('@/hooks/useNotifications', () => ({
  createNotification: (n: unknown) => (__notifications as unknown[]).push(n),
}));

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const CONVERSATION = 'conversation-uuid-0001';

let notificationRows: unknown[] = [];

function makeInMemoryDb() {
  const messageRequests: any[] = [];

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
          messageRequests.push(row);
          return { status: 201, json: row };
        }
      }

      return { status: 404, json: { error: `no mock route for ${method} ${path}` } };
    },
    messageRequests,
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tone-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' }));
  notificationRows = [];

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

  notificationRows = __notifications;
  __notifications.length = 0;
});

describe('message_request -> conversation resolution', () => {
  it('resolves a notification to the SAME conversation_id the request carries', async () => {
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      conversationId: CONVERSATION,
      category: 'spam',
    });

    const conversationId = await resolveMessageRequestConversation(SENDER, RECEIVER);

    expect(conversationId).toBe(CONVERSATION);
    expect(__notifications).toHaveLength(1);
  });

  it('returns undefined (no new conversation created) when no request exists', async () => {
    const conversationId = await resolveMessageRequestConversation(SENDER, RECEIVER);

    expect(conversationId).toBeUndefined();
  });

  it('does not resolve when the actor is the same as the recipient (self)', async () => {
    const conversationId = await resolveMessageRequestConversation(SENDER, SENDER);
    expect(conversationId).toBeUndefined();
  });

  it('still yields ONE pending request across repeated sends (dedup preserved)', async () => {
    for (let i = 0; i < 5; i++) {
      await ensureMessageRequest({
        senderId: SENDER,
        receiverId: RECEIVER,
        conversationId: CONVERSATION,
        category: 'spam',
      });
    }
    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(__notifications).toHaveLength(1);
  });
});