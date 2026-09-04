// Regression test for the read-receipt / pending message-request bug (see
// messages.md).
//
// Scenario: A (sender) messages non-friend B and does NOT get accepted. While
// the request is pending, B must be able to open the conversation READ-ONLY to
// preview the message, and the sender must NOT learn the message was read
// (i.e. no ✓✓ / "Seen"). The suppression is centralized in
// isReadOnlyPendingConversation, which the hook's markMessagesAsRead now
// consults as the single authoritative gate for BOTH the message_reads DB write
// and the realtime message.read ping.
//
// This exercises isReadOnlyPendingConversation against an in-memory model of
// conversation_participants + message_requests to confirm the detection is
// correctly direction-sensitive:
//   - B (recipient of the pending request) is READ-ONLY,
//   - A (sender) is NOT read-only,
//   - after the request is accepted, neither side is read-only anymore.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { isReadOnlyPendingConversation } from '@/hooks/useConversations';

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const CONVERSATION = 'conversation-uuid-0001';

function applyServerFilter(rows: any[], filter: string | undefined): any[] {
  if (!filter) return rows;
  const eq = /^([^=]+)=eq\.(.+)$/.exec(filter);
  if (eq) return rows.filter(r => String(r[eq[1]]) === eq[2]);
  const inM = /^([^=]+)=in\.\(([^)]*)\)$/.exec(filter);
  if (inM) {
    const vals = new Set(inM[2] ? inM[2].split(',') : []);
    return rows.filter(r => vals.has(String(r[inM[1]])));
  }
  return rows;
}

function makeDb(requestStatus: string | null) {
  const participants: any[] = [
    { conversation_id: CONVERSATION, user_id: SENDER },
    { conversation_id: CONVERSATION, user_id: RECEIVER },
  ];
  const messageRequests: any[] =
    requestStatus === null
      ? []
      : [
          {
            id: 'req-1',
            sender_id: SENDER,
            receiver_id: RECEIVER,
            conversation_id: CONVERSATION,
            status: requestStatus,
          },
        ];

  return {
    handle(req: { url: string; method?: string }) {
      const url = new URL(req.url, 'http://mock.test');
      const path = url.pathname;
      const params = Object.fromEntries(url.searchParams.entries());

      if (path === '/api/conversation_participants') {
        let rows = participants.slice();
        if (params['filter']) rows = applyServerFilter(rows, params['filter']);
        return { status: 200, json: rows };
      }

      if (path === '/api/message_requests') {
        let rows = messageRequests.slice();
        if (params['filter']) rows = applyServerFilter(rows, params['filter']);
        return { status: 200, json: rows };
      }

      return { status: 404, json: { error: `no mock route for ${path}` } };
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    'tone-auth-token',
    JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' })
  );
});

function install(db: ReturnType<typeof makeDb>) {
  (globalThis as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const resp = db.handle({ url, method: 'GET' });
    return {
      ok: resp.status < 400,
      status: resp.status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => resp.json,
    } as Response;
  });
}

describe('isReadOnlyPendingConversation (read-receipt suppression gate)', () => {
  it('is TRUE for the recipient of a still-pending request (preview is read-only)', async () => {
    install(makeDb('pending'));
    const ro = await isReadOnlyPendingConversation(CONVERSATION, RECEIVER);
    expect(ro).toBe(true);
  });

  it('is FALSE for the sender while the request is pending (they may send + see receipts)', async () => {
    install(makeDb('pending'));
    const ro = await isReadOnlyPendingConversation(CONVERSATION, SENDER);
    expect(ro).toBe(false);
  });

  it('is FALSE for the recipient once the request is accepted (receipts resume)', async () => {
    install(makeDb('accepted'));
    const ro = await isReadOnlyPendingConversation(CONVERSATION, RECEIVER);
    expect(ro).toBe(false);
  });

  it('is FALSE when no request exists at all', async () => {
    install(makeDb(null));
    const ro = await isReadOnlyPendingConversation(CONVERSATION, RECEIVER);
    expect(ro).toBe(false);
  });
});
