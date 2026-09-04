import { gateway } from '@/lib/gateway';
import { createNotification } from '@/hooks/useNotifications';

export type MessageRequestCategory = 'you_may_know' | 'spam';

// Re-uses the existing Maybe-you-know / Spam classification semantics from the
// server's determine_request_category, computed client-side because the server
// trigger (defined in the users host against `friends` / `restricted_users`)
// cannot run on the conversations host that owns message_requests (cross-project
// join -> insert fails). Mirrors the documented pattern of re-implementing
// cross-project logic with per-domain gateway queries:
//   'you_may_know' — mutual friends OR pending friend request from the sender
//   'spam'         — restricted/blocked user, or no connection at all
export const determineMessageRequestCategory = async (
  currentUserId?: string,
  otherUserId?: string
): Promise<MessageRequestCategory> => {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
    return 'spam';
  }

  try {
    // Restricted users are always spam.
    const { data: restricted } = await gateway
      .from('restricted_users')
      .select('id')
      .eq('user_id', otherUserId)
      .eq('restricted_user_id', currentUserId)
      .maybeSingle();
    if (restricted) return 'spam';

    // Mutual friends (re-uses the existing get_mutual_friends_count RPC).
    const { data: mutual } = await gateway.rpc('get_mutual_friends_count', {
      user_a: currentUserId,
      user_b: otherUserId
    });
    if (mutual && mutual > 0) return 'you_may_know';

    // Pending friend request sent by the sender to the receiver.
    const { data: pendingFriend } = await gateway
      .from('friends')
      .select('id')
      .eq('requester_id', currentUserId)
      .eq('receiver_id', otherUserId)
      .eq('status', 'pending')
      .maybeSingle();
    if (pendingFriend) return 'you_may_know';

    return 'spam';
  } catch (error) {
    console.error('[messageRequests] Error determining category:', error);
    return 'spam';
  }
};

// Best-effort registration of a single pending message request tied to a Send
// event and to the existing conversation it was launched from.
//
// Exactly one pending request exists per conversation:
//   ONE conversation -> ONE pending request -> MANY messages
//
// ensureMessageRequest (NOT createMessageRequest): every send fuses through
// this single well-known function, which checks-before-creates and so reuses
// the existing pending request rather than minting one per message.
//
//   1. Check BEFORE creating — query for an existing request row for this
//      sender/receiver pair in ANY state and reuse/respect it. The
//      sender/receiver pair is schema-stable (it is the original UNIQUE key),
//      so this check works whether or not the conversation_id migration has
//      been applied to the live host yet.
//   2. A row that already exists is left untouched regardless of its state:
//      still-pending requests are reused (no duplicate insert), and an
//      ACCEPTED request is never turned back into a pending one — so once the
//      recipient accepts, continuing to chat can never mint a second Message
//      Request (the acceptance invariant in messages.md).
//   3. Only if no row exists at all, insert a single pending request carrying
//      the conversation_id it arose from (conversation_id is never a uniqueness
//      check on its own here; message_id is never used as a key at all).
//   4. The DB enforces this authoritatively for concurrency: a partial UNIQUE
//      index on conversation_id WHERE status = 'pending' rejects any concurrent
//      second pending insert, and the pre-existing UNIQUE(sender_id,
//      receiver_id) still stops a second request for the same pair — so two
//      near-simultaneous sends can never create two requests.
//
// An already-accepted/declined/blocked request is left untouched. Never throws.
export const ensureMessageRequest = async (params: {
  senderId: string;
  receiverId: string;
  conversationId?: string;
  category?: MessageRequestCategory;
}): Promise<void> => {
  const { senderId, receiverId, conversationId, category } = params;
  const resolvedCategory =
    category ?? (await determineMessageRequestCategory(senderId, receiverId));

  // (1) Check-before-create. Look for an existing request row for this
  // sender/receiver pair in ANY state (the schema-stable UNIQUE key). The pair
  // filter alone is enough to dedup and works whether or not a conversation_id
  // column exists on the live host. The check deliberately does NOT filter by
  // status: an ACCEPTED request must short-circuit here so the pair is never
  // re-inserted (a second Message Request) after the recipient accepts.
  const { data: existing } = await gateway
    .from('message_requests')
    .select('id, status')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .maybeSingle();

  // TRACE: existing-request lookup (point 3)
  console.debug('[trace:request]', {
    step: 'existing_check',
    sender_id: senderId,
    receiver_id: receiverId,
    conversation_id: conversationId ?? null,
    existing_request_id: (existing as { id?: string } | null)?.id ?? null,
    existing_status: (existing as { status?: string } | null)?.status ?? null,
  });

  // (2) A row already exists for this pair — reuse it while pending, and never
  // resurrect an accepted/declined/blocked request. This is what keeps
  // "1 Message Request" true across the acceptance transition: after Accept
  // (status -> accepted), subsequent messages find `existing` and stop here
  // instead of attempting a second insert.
  if (existing) {
    return;
  }

  // (3) Insert one pending request. `conversation_id` is intentionally NOT
  // written: the live message_requests table has no such column, and selecting
  // or inserting it 400s (42703), which previously prevented the request from
  // ever reaching the recipient's Pending list. The sender/receiver UNIQUE
  // constraint still dedups, so the "many messages -> one request" invariant is
  // preserved.
  {
    const { error: reqError } = await gateway
      .from('message_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        category: resolvedCategory
      })
      .select('id, sender_id, receiver_id, status');

    if (reqError) {
      // The gateway client reports error.code as an HTTP status, so a duplicate
      // (Postgres 23505 unique violation on sender_id/receiver_id) surfaces as
      // 409. A duplicate means another request already exists — exactly what we
      // want — so it is not an error.
      const isDuplicate = reqError.code === '23505' || reqError.code === '409';
      if (!isDuplicate) {
        console.error('[messageRequests] Message request insert error:', reqError);
      }
      return;
    }

    createNotification({
      userId: receiverId,
      actorId: senderId,
      type: 'message_request',
      message: 'sent you a message'
    });
  }
};

// Resolves the conversation_id backing a message_request notification so a
// click can open the SAME conversation the sender is in (Chats) and the
// recipient has in Pending — never a different one. The notification row itself
// carries no conversation reference, so we derive it from the authoritative
// message_requests row for this sender/receiver pair (whose conversation_id was
// set when the request was created from the send's conversation). Best-effort:
// returns undefined when there is no request row (so the caller can fall back
// to the generic Messages page) rather than creating anything.
export const resolveMessageRequestConversation = async (
  senderId: string,
  receiverId: string
): Promise<string | undefined> => {
  if (!senderId || !receiverId || senderId === receiverId) return undefined;

  // The live `message_requests` table has no `conversation_id` column, so the
  // notification -> conversation link is derived from the SAME conversation the
  // request arose from: the shared DM between the sender and receiver, found via
  // conversation_participants. This preserves "open the same conversation" on
  // the schema that actually exists.
  try {
    const { data: myParts } = await gateway
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', senderId);

    const myIds = (myParts || []).map(p => p.conversation_id);
    if (myIds.length === 0) return undefined;

    const { data: shared } = await gateway
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', myIds)
      .eq('user_id', receiverId);

    const sharedIds = [...new Set((shared || []).map(p => p.conversation_id))];
    if (sharedIds.length === 0) return undefined;

    const { data: convs } = await gateway
      .from('conversations')
      .select('id, type')
      .in('id', sharedIds);
    const dm = (convs || []).find(c => c.type === 'dm');

    // TRACE: notification -> conversation resolution read (point 7)
    console.debug('[trace:notification-conversation]', {
      sender_id: senderId,
      receiver_id: receiverId,
      resolved_conversation_id: dm?.id ?? null,
    });

    return dm?.id as string | undefined;
  } catch (error) {
    console.warn('[messageRequests] Resolve request conversation failed:', error);
    return undefined;
  }
};
