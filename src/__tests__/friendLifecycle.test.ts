// End-to-end gateway client integration for the friend-request lifecycle.
// Simulates the gateway (server ignores filters; client does local filtering /
// join resolution) to verify that after the receiver accepts:
//   - the accept UPDATE persists,
//   - the sender's status query (or=(and(...),and(...))) returns 'accepted',
//   - the sender's friends-list join query returns the friend.
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { gateway } from '@/lib/gateway';

const SENDER = 'sender-uuid-0001';
const RECEIVER = 'receiver-uuid-0002';
const ROW_ID = 'friendship-row-0001';

const senderProfile = { id: SENDER, username: 'sender', display_name: 'Sender', profile_pic: null };
const receiverProfile = { id: RECEIVER, username: 'receiver', display_name: 'Receiver', profile_pic: null };

function makeInMemoryDb() {
  const friends = [
    { id: 'friendship-row-0001', requester_id: SENDER, receiver_id: RECEIVER, status: 'pending', created_at: '2026-01-01T00:00:00Z' },
  ];
  return {
    friends,
    handle(req: { url: string; method?: string; body?: unknown }) {
      const url = new URL(req.url, 'http://mock.test');
      const method = req.method || 'GET';
      const path = url.pathname;

      if (path === '/api/friends') {
        if (method === 'GET') {
          return { status: 200, json: friends };
        }
        if (method === 'POST') {
          const row = { id: 'new-' + friends.length, ...(req.body as object), created_at: '2026-01-01T00:00:00Z' };
          friends.push(row as any);
          return { status: 201, json: row };
        }
      }

      const putMatch = path.match(/^\/api\/v1\/friends\/([^/]+)$/);
      if (method === 'PUT' && putMatch) {
        const id = putMatch[1];
        const row = friends.find((f) => f.id === id);
        if (!row) return { status: 404, json: { error: 'not found' } };
        Object.assign(row, req.body);
        return { status: 200, json: row };
      }

      if (path === '/api/profiles') {
        return { status: 200, json: [senderProfile, receiverProfile] };
      }

      if (path === '/api/followers') {
        return { status: 200, json: [] };
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

describe('friend request lifecycle via gateway', () => {
  it('receiver accept persists and sender sees ACCEPTED status', async () => {
    // Receiver accepts the pending request.
    const { data: updated, error } = await gateway
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', ROW_ID)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated?.status).toBe('accepted');

    // Sender's status query should now return that friendship as accepted.
    const { data: friendship, error: fErr } = await gateway
      .from('friends')
      .select('*')
      .or(`and(requester_id.eq.${SENDER},receiver_id.eq.${RECEIVER}),and(requester_id.eq.${RECEIVER},receiver_id.eq.${SENDER})`)
      .maybeSingle();

    expect(fErr).toBeNull();
    expect(friendship?.id).toBe(ROW_ID);
    expect(friendship?.status).toBe('accepted');
  });

  it('sender friends-list join query returns the friend after accept', async () => {
    await gateway.from('friends').update({ status: 'accepted' }).eq('id', ROW_ID).select().single();

    const { data, error } = await gateway
      .from('friends')
      .select(`
        *,
        requester_profile:profiles!friends_requester_id_fkey(id, username, display_name, profile_pic),
        receiver_profile:profiles!friends_receiver_id_fkey(id, username, display_name, profile_pic)
      `)
      .or(`requester_id.eq.${SENDER},receiver_id.eq.${SENDER}`)
      .eq('status', 'accepted');

    expect(error).toBeNull();
    expect(data?.length).toBe(1);

    const row = data![0] as any;
    const isRequester = row.requester_id === SENDER;
    const friendProfile = isRequester ? row.receiver_profile : row.requester_profile;
    expect(friendProfile?.id).toBe(RECEIVER);
    expect(friendProfile?.username).toBe('receiver');
  });

  it('receiver viewing sender page sees ACCEPTED, not Add Friend', async () => {
    await gateway.from('friends').update({ status: 'accepted' }).eq('id', ROW_ID).select().single();

    // Receiver (current user) visits the SENDER's profile page.
    const { data: friendship, error } = await gateway
      .from('friends')
      .select('*')
      .or(`and(requester_id.eq.${RECEIVER},receiver_id.eq.${SENDER}),and(requester_id.eq.${SENDER},receiver_id.eq.${RECEIVER})`)
      .maybeSingle();

    expect(error).toBeNull();
    expect(friendship?.id).toBe(ROW_ID);
    expect(friendship?.status).toBe('accepted');
    // isSender=false for the receiver (requester is the sender).
    expect(friendship?.requester_id).toBe(SENDER);
  });

  it('receiver friends tab (fetchFriends logic) returns the sender as a friend', async () => {
    await gateway.from('friends').update({ status: 'accepted' }).eq('id', ROW_ID).select().single();

    const profileId = RECEIVER;
    const { data: friendsData } = await gateway
      .from('friends')
      .select('created_at, requester_id, receiver_id')
      .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`)
      .eq('status', 'accepted');

    expect(friendsData?.length).toBe(1);
    const friendship = friendsData![0] as any;
    // receiver is the receiver, so the friend is the requester (sender).
    const friendId = friendship.requester_id === profileId ? friendship.receiver_id : friendship.requester_id;
    expect(friendId).toBe(SENDER);

    const { data: profilesData } = await gateway
      .from('profiles')
      .select('id, username, display_name, profile_pic')
      .in('id', [friendId]);

    const sender = profilesData?.find((p: any) => p.id === SENDER);
    expect(sender?.username).toBe('sender');
  });
});
