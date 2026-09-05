// Regression test for the Message Request categorization spec (messages.md).
//
// "One Conversation, one Message Request, one Category." The category
// (maybe_you_know | spam) is decided exactly ONCE — when the first Message
// Request is created — and is never re-classified by each subsequent message
// ("Don't let the category change with every message").
//
// The authoritative classifier is implemented in the GATEWAY
// (gateway/src/features/messageRequestCategory.ts): the gateway computes the
// category on insert for the sender/receiver pair. The client's
// `ensureMessageRequest` always re-fuses every send through the same
// check-before-create, so a later send that would suggest a different category
// must NOT touch the existing row. The client fallback
// (determineMessageRequestCategory) mirrors the EXACT messages.md rules against
// actual accepted friendships, so this also encodes:
//   Test 1 — mutual friend C between A and B        -> you_may_know
//   Test 2 — zero mutual friends                    -> spam
// plus the spec sharpness rule that a PENDING friend request is NOT a
// substitute for mutual friendship.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';
import { ensureMessageRequest, determineMessageRequestCategory } from '@/lib/messageRequests';

export const __notifications: unknown[] = [];

vi.mock('@/hooks/useNotifications', () => ({
  createNotification: (n: unknown) => (__notifications as unknown[]).push(n),
}));

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const CONVERSATION = 'conversation-uuid-0001';
const MUTUAL = 'mutual-friend-0001';

let notifications: unknown[] = [];

function applyServerFilter(rows: any[], filter: string | undefined): any[] {
  if (!filter) return rows;
  const eq = /^([^=]+)=eq\.(.+)$/.exec(filter);
  if (eq) return rows.filter(r => String(r[eq[1]]) === eq[2]);
  const neq = /^([^=]+)=neq\.(.+)$/.exec(filter);
  if (neq) return rows.filter(r => String(r[neq[1]]) !== neq[2]);
  return rows; // or=(...) etc. — additional eq filters below still narrow rows
}

function makeInMemoryDb(opts?: { friends?: any[]; restricted?: any[] }) {
  const messageRequests: any[] = [];
  const friends: any[] = opts?.friends ?? [];
  const restricted: any[] = opts?.restricted ?? [];

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
          return { status: 200, json: messageRequests };
        }
        if (method === 'POST') {
          const row = {
            id: 'req-' + (messageRequests.length + 1),
            ...(req.body as object),
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          } as any;
          if (
            messageRequests.some(
              (r) => r.sender_id === row.sender_id && r.receiver_id === row.receiver_id
            )
          ) {
            return { status: 409, json: { code: 409, message: 'duplicate sender/receiver' } };
          }
          messageRequests.push(row);
          return { status: 201, json: row };
        }
      }

      if (path === '/api/friends') {
        return { status: 200, json: apply(friends) };
      }

      if (path === '/api/restricted_users') {
        return { status: 200, json: apply(restricted) };
      }

      return { status: 404, json: { error: `no mock route for ${method} ${path}` } };
    },
    messageRequests,
  };
}

function installDb(db: ReturnType<typeof makeInMemoryDb>) {
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
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tone-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' }));
  notifications = [];

  installDb(makeInMemoryDb());
  notifications = __notifications;
  __notifications.length = 0;
});

describe('fallback classification uses ACTUAL mutual accepted friendships (messages.md)', () => {
  it('Test 1: mutual friend between sender and recipient -> you_may_know', async () => {
    installDb(makeInMemoryDb({
      friends: [
        { requester_id: SENDER, receiver_id: MUTUAL, status: 'accepted' },
        { requester_id: RECEIVER, receiver_id: MUTUAL, status: 'accepted' },
        { requester_id: SENDER, receiver_id: 'other-friend', status: 'accepted' }, // NOT mutual
      ],
    }));
    expect(await determineMessageRequestCategory(SENDER, RECEIVER)).toBe('you_may_know');
  });

  it('Test 2: zero mutual friends -> spam', async () => {
    installDb(makeInMemoryDb({
      friends: [
        { requester_id: SENDER, receiver_id: 'a', status: 'accepted' },
        { requester_id: RECEIVER, receiver_id: 'b', status: 'accepted' },
        { requester_id: SENDER, receiver_id: RECEIVER, status: 'pending' }, // not accepted
      ],
    }));
    expect(await determineMessageRequestCategory(SENDER, RECEIVER)).toBe('spam');
  });

  it('sharpness: a PENDING friend request does NOT upgrade zero mutual friends to you_may_know', async () => {
    installDb(makeInMemoryDb({
      friends: [
        { requester_id: SENDER, receiver_id: RECEIVER, status: 'pending' },
      ],
    }));
    expect(await determineMessageRequestCategory(SENDER, RECEIVER)).toBe('spam');
  });

  it('restricted/blocked sender is ALWAYS spam even with a mutual friend', async () => {
    installDb(makeInMemoryDb({
      friends: [
        { requester_id: SENDER, receiver_id: MUTUAL, status: 'accepted' },
        { requester_id: RECEIVER, receiver_id: MUTUAL, status: 'accepted' },
      ],
      restricted: [{ user_id: RECEIVER, restricted_user_id: SENDER }],
    }));
    expect(await determineMessageRequestCategory(SENDER, RECEIVER)).toBe('spam');
  });
});

describe('Message Request category is decided once at first-request creation', () => {
  it('stays the SAME category across every later message even when a send suggests a different one', async () => {
    // First message -> request created with the then-current category.
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      conversationId: CONVERSATION,
      category: 'you_may_know',
    });

    // "Hello" ... "How are you?" ... "I wanted to ask you something..." — each
    // send re-fuses through ensureMessageRequest. A later message that would be
    // classified differently (spam now) must NOT change the original category
    // nor mint a second request: ONE conversation, ONE request, ONE category.
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      conversationId: CONVERSATION,
      category: 'spam',
    });
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      conversationId: CONVERSATION,
      category: 'spam',
    });

    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      sender_id: SENDER,
      receiver_id: RECEIVER,
      status: 'pending',
      conversation_id: CONVERSATION,
      category: 'you_may_know', // created-once; never re-classified
    });

    // Only the first send registers a notification.
    expect(notifications).toHaveLength(1);
  });

  it('keeps the exact category written at creation when later messages send without one', async () => {
    // First request carries the resolved (gateway-supplied) category.
    await ensureMessageRequest({
      senderId: SENDER,
      receiverId: RECEIVER,
      category: 'spam',
    });

    // Follow-up messages don't even discuss a category — the row stays as-is.
    for (let i = 0; i < 3; i++) {
      await ensureMessageRequest({ senderId: SENDER, receiverId: RECEIVER });
    }

    const all = (await gateway.from('message_requests').select('*')).data || [];
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('pending');
    expect(all[0].category).toBe('spam');
  });
});