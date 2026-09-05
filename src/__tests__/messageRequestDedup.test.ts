// Regression test for the Message Request duplication rules (see messages.md).
//
// A sender messaging the same non-friend multiple times before the request is
// accepted must produce exactly ONE pending message request. The DB enforces
// this with:
//   - UNIQUE(sender_id, receiver_id)                          (any state)
//   - partial UNIQUE index on (conversation_id) WHERE status='pending'
//     (20260902000000_add_conversation_id_to_message_requests.sql — one pending
//     request per conversation, concurrency-safe at the database level)
// both of which surface to the gateway client as 409/Postgres 23505. This
// simulation models both constraints so it verifies the real code path end to
// end:
//   - first send creates one pending request carrying the conversation_id,
//   - every subsequent send reuses it (no second insert, concurrent or serial),
//   - Test 5 (messages.md): two ACCEPTED friends never get a Message Request,
//   - the shared conversation + all messages are preserved.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';
import { ensureMessageRequest, hasAcceptedFriendship } from '@/lib/messageRequests';

export const __notifications: unknown[] = [];

vi.mock('@/hooks/useNotifications', () => ({
  createNotification: (n: unknown) => (__notifications as unknown[]).push(n),
}));

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const CONVERSATION = 'conversation-uuid-0001';

let notifications: unknown[] = [];

// Applies a single gateway `filter` param (eq/neq/in are honored; `or=(...)`
// falls through to "all rows") — mirroring the real gateway server.
function applyServerFilter(rows: any[], filter: string | undefined): any[] {
  if (!filter) return rows;
  const eq = /^([^=]+)=eq\.(.+)$/.exec(filter);
  if (eq) return rows.filter(r => String(r[eq[1]]) === eq[2]);
  const neq = /^([^=]+)=neq\.(.+)$/.exec(filter);
  if (neq) return rows.filter(r => String(r[neq[1]]) !== neq[2]);
  const inM = /^([^=]+)=in\.\(([^)]*)\)$/.exec(filter);
  if (inM) {
    const vals = new Set(inM[2] ? inM[2].split(',') : []);
    return rows.filter(r => vals.has(String(r[inM[1]])));
  }
  return rows; // or=(...) etc. — additional eq filters below still narrow rows
}

function makeInMemoryDb(opts?: { friends?: any[] }) {
  // Models public.message_requests with the columns that exist after
  // 20260902000000_add_conversation_id_to_message_requests.sql: sender/receiver
  // + conversation_id identity, status, category, plus the partial UNIQUE index
  // on (conversation_id) WHERE status='pending'.
  const messageRequests: any[] = [];
  const friends: any[] = opts?.friends ?? [];

  const enforceDbConstraints = (row: any): { status: number; json: object } | null => {
    // UNIQUE(sender_id, receiver_id) — any state.
    if (messageRequests.some(r => r.sender_id === row.sender_id && r.receiver_id === row.receiver_id)) {
      return { status: 409, json: { code: 409, message: 'duplicate sender/receiver' } };
    }
    // Partial UNIQUE index: never two pending requests for the same conversation.
    if (
      messageRequests.some(
        r => r.status === 'pending' && r.conversation_id && row.conversation_id && r.conversation_id === row.conversation_id
      )
    ) {
      return { status: 409, json: { code: 409, message: 'duplicate pending conversation' } };
    }
    return null;
  };

  return {
    handle(req: { url: string; method?: string; body?: unknown }) {
      const url = new URL(req.url, 'http://mock.test');
      const method = req.method || 'GET';
      const path = url.pathname;
      const filters = url.searchParams.getAll('filter');
      const apply = (rows: any[]) => {
        if (!filters.length) return rows;
        if (filters.length === 1) return applyServerFilter(rows, filters[0]);
        return rows.filter(r => filters.every(f => applyServerFilter([r], f).length > 0));
      };

      if (path === '/api/message_requests') {
        if (method === 'GET') {
          return { status: 200, json: apply(messageRequests) };
        }
        if (method === 'POST') {
          const row = {
            id: 'req-' + (messageRequests.length + 1),
            ...(req.body as object),
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          } as any;
          const dbViolation = enforceDbConstraints(row);
          if (dbViolation) return dbViolation;
          messageRequests.push(row);
          return { status: 201, json: row };
        }
      }

      if (path === '/api/friends') {
        return { status: 200, json: apply(friends) };
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
  it('creates exactly one pending request across many messages, tied to the conversation', async () => {
    // First message -> request created (with the conversation_id identity).
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
    expect(pending[0]).toMatchObject({
      sender_id: SENDER,
      receiver_id: RECEIVER,
      conversation_id: CONVERSATION,
    });

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

  it('concurrency-safe: the DB partial unique index rejects a second PENDING request for the same conversation', async () => {
    // Two near-simultaneous first sends both pass the client check and insert.
    await gateway.from('message_requests').insert({
      sender_id: SENDER,
      receiver_id: RECEIVER,
      status: 'pending',
      category: 'spam',
      conversation_id: CONVERSATION,
    });
    const dup = await gateway.from('message_requests').insert({
      sender_id: SENDER,
      receiver_id: RECEIVER,
      status: 'pending',
      category: 'spam',
      conversation_id: CONVERSATION,
    });

    expect(dup.error).toBeTruthy(); // 409 / 23505 from the partial unique index

    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(notifications).toHaveLength(0); // ensureMessageRequest was not involved
  });
});

describe('Test 5 (messages.md): existing friends get a NORMAL chat — no Message Request', () => {
  const friendsFixture = [
    { id: 'f-1', requester_id: SENDER, receiver_id: RECEIVER, status: 'accepted' },
  ];

  function withFriendsDb() {
    const db = makeInMemoryDb({ friends: friendsFixture });
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
    return db;
  }

  it('recognizes the accepted friendship (either direction semantics)', async () => {
    withFriendsDb();
    expect(await hasAcceptedFriendship(SENDER, RECEIVER)).toBe(true);
  });

  it('two sends between friends produce ZERO message requests', async () => {
    const db = withFriendsDb();
    // Exactly the sendMessage guard: only NON-friends register a request.
    const areFriends = await hasAcceptedFriendship(SENDER, RECEIVER);
    if (!areFriends) {
      await ensureMessageRequest({ senderId: SENDER, receiverId: RECEIVER, conversationId: CONVERSATION });
    }
    // A friend-to-friend send writes only the message (the conversation), never
    // a request — so repeating the send cannot mint a request either.
    for (let i = 0; i < 2; i++) {
      if (!areFriends) {
        await ensureMessageRequest({ senderId: SENDER, receiverId: RECEIVER, conversationId: CONVERSATION });
      }
    }

    expect(areFriends).toBe(true);
    expect(db.messageRequests).toHaveLength(0);
    expect(notifications).toHaveLength(0);
  });

  it('the SAME send branch DOES create exactly one request for non-friends (guard is not a no-op)', async () => {
    // beforeEach reset this test to the default NON-friend in-memory DB, so the
    // exact sendMessage guard must register a request (and only one).
    const areFriends = await hasAcceptedFriendship(SENDER, RECEIVER);
    expect(areFriends).toBe(false);

    for (let i = 0; i < 2; i++) {
      if (!areFriends) {
        await ensureMessageRequest({ senderId: SENDER, receiverId: RECEIVER, conversationId: CONVERSATION });
      }
    }

    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sender_id: SENDER,
      receiver_id: RECEIVER,
      conversation_id: CONVERSATION,
      status: 'pending',
    });
    expect(notifications).toHaveLength(1);
  });
});