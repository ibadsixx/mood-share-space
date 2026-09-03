// Regression test for the reporter: "The conversation did not appear in the
// sender's chat list."
//
// Scenario (messages.md): Sender A messages non-friend B via the Messages page
// chat window. The conversation C and a pending message request R (R.sender=A,
// R.receiver=B, R.conversation_id=C) are created. The conversation must show in
// A's Chats list.
//
// Root cause fixed: fetchVisibleDmUserIds only surfaced accepted friends and
// RECEIVED-accepted requests, so a conversation A *initiated* (A is the request
// SENDER) was filtered out of A's own Chats. The fix also marks the other
// participant of any request where A is the SENDER as visible.
//
// This drives the real gateway client + the real fetch/filter helpers against
// an in-memory model of the relevant tables, and asserts the sender's
// conversation survives the inbox filter.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';
import { fetchVisibleDmUserIds, filterRequestConversations } from '@/hooks/useConversations';
import { ensureMessageRequest } from '@/lib/messageRequests';

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // sender
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // non-friend recipient
const C = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; // shared conversation

function makeInMemoryDb() {
  const messageRequests: any[] = [];
  const friends: any[] = []; // no friendship between A and B
  const participants: any[] = [
    { conversation_id: C, user_id: A },
    { conversation_id: C, user_id: B },
  ];
  const conversations: any[] = [{ id: C, type: 'dm', description: null }];
  const profiles: any[] = [
    { id: A, username: 'a', display_name: 'A', profile_pic: null },
    { id: B, username: 'b', display_name: 'B', profile_pic: null },
  ];
  const messages: any[] = [
    { conversation_id: C, sender_id: A, receiver_id: B, content: 'hi', created_at: '2026-01-01T00:00:00Z' },
  ];

  const qs = (url: URL) => Object.fromEntries(url.searchParams.entries());

  return {
    handle(req: { url: string; method?: string; body?: unknown }) {
      const url = new URL(req.url, 'http://mock.test');
      const method = req.method || 'GET';
      const path = url.pathname;
      const params = qs(url);

      if (path === '/api/message_requests') {
        if (method === 'GET') {
          let rows: any[] = messageRequests;
          // sender_id=eq.<x>
          if (params['sender_id']) rows = rows.filter(r => r.sender_id === params['sender_id']);
          if (params['receiver_id']) rows = rows.filter(r => r.receiver_id === params['receiver_id']);
          return { status: 200, json: rows };
        }
        if (method === 'POST') {
          const row = {
            id: 'req-' + (messageRequests.length + 1),
            ...(req.body as object),
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          } as any;
          if (messageRequests.some(r => r.sender_id === row.sender_id && r.receiver_id === row.receiver_id)) {
            return { status: 409, json: { code: 409, message: 'duplicate sender/receiver' } };
          }
          messageRequests.push(row);
          return { status: 201, json: row };
        }
      }

      if (path === '/api/conversation_participants') {
        let rows = participants.slice();
        if (params['user_id']) rows = rows.filter(r => r.user_id === params['user_id']);
        if (params['conversation_id']) rows = rows.filter(r => r.conversation_id === params['conversation_id']);
        if (params['conversation_id'] || params['user_id']) {
          rows = participants.filter(r =>
            r.conversation_id === (params['conversation_id'] || r.conversation_id) &&
            r.user_id === (params['user_id'] || r.user_id)
          );
        }
        return { status: 200, json: rows };
      }

      if (path === '/api/conversations') {
        let rows = conversations.slice();
        if (params['id']) rows = conversations.filter(c => c.id === params['id']);
        return { status: 200, json: rows };
      }

      if (path === '/api/profiles') {
        let rows = profiles.slice();
        if (params['id']) rows = profiles.filter(p => p.id === params['id']);
        return { status: 200, json: rows };
      }

      if (path === '/api/messages') {
        let rows = messages.slice();
        if (params['conversation_id']) rows = messages.filter(m => m.conversation_id === params['conversation_id']);
        return { status: 200, json: rows };
      }

      if (path === '/api/notifications') {
        return { status: 201, json: { id: 'notif', ...(req.body as object) } };
      }

      if (path === '/api/friends') {
        return { status: 200, json: friends };
      }

      return { status: 404, json: { error: `no mock route for ${method} ${path}` } };
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('tone-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' }));

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
});

describe('sender Chats visibility after messaging a non-friend', () => {
  it('keeps the initiated conversation in the sender inbox filter', async () => {
    await ensureMessageRequest({ senderId: A, receiverId: B, conversationId: C, category: 'spam' });

    const visible = await fetchVisibleDmUserIds(A);
    expect(visible.has(B)).toBe(true); // B is the request receiver -> visible to sender A

    const firstOtherPerConv = new Map<string, string>([[C, B]]);
    const filtered = filterRequestConversations(
      [{ id: C, type: 'dm' }],
      firstOtherPerConv,
      visible
    );

    // The conversation A initiated is NOT filtered out of A's Chats.
    expect(filtered.map(c => c.id)).toContain(C);
  });

  it('still hides the conversation from a stranger (no request, no friendship)', async () => {
    // No message_request row exists between A and B here.
    const visible = await fetchVisibleDmUserIds(A);
    const firstOtherPerConv = new Map<string, string>([[C, B]]);
    const filtered = filterRequestConversations([{ id: C, type: 'dm' }], firstOtherPerConv, visible);
    expect(filtered.map(c => c.id)).not.toContain(C);
    expect(visible.has(B)).toBe(false);
  });

  it('does not leak a sender-initiated request into the RECIPIENT inbox (stays Pending)', async () => {
    await ensureMessageRequest({ senderId: A, receiverId: B, conversationId: C, category: 'spam' });

    // Recipient B sees A only if B has an ACCEPTED *incoming* request.
    const visibleForB = await fetchVisibleDmUserIds(B);
    expect(visibleForB.has(A)).toBe(false);
  });
});