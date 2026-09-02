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
//   1. Check BEFORE creating — query for an existing pending request for this
//      sender/receiver (and, when known, the conversation) and reuse it. The
//      sender/receiver pair is schema-stable (it is the original UNIQUE key),
//      so this check works whether or not the conversation_id migration has
//      been applied to the live host yet.
//   2. Only if none exists, insert a single pending request carrying the
//      conversation_id it arose from (conversation_id is never a uniqueness
//      check on its own here; message_id is never used as a key at all).
//   3. The DB enforces this authoritatively for concurrency: a partial UNIQUE
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

  // (1) Check-before-create. Look for an existing pending request for this
  // sender/receiver pair (the schema-stable UNIQUE key). When the
  // conversation_id column is available we narrow by conversation too; the
  // pair filter alone is enough to dedup on hosts where the column is not yet
  // present.
  const { data: existing } = await gateway
    .from('message_requests')
    .select('id')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle();

  // Narrow to the same conversation when the column exists — but never widen
  // into matching a different sender's or a non-pending request.
  if (!existing && conversationId) {
    const { data: byConversation } = await gateway
      .from('message_requests')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle();
    if (byConversation) return;
  }

  // (2) Insert one pending request. conversation_id is omitted (null) when the
  // column is unavailable on the live host, or when no conversation is known —
  // the sender/receiver UNIQUE still dedups. When present, the check above
  // plus the partial UNIQUE index make this safe under concurrency.
  if (!existing) {
    const { error: reqError } = await gateway
      .from('message_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        conversation_id: conversationId || null,
        status: 'pending',
        category: resolvedCategory
      });

    if (reqError) {
      // The gateway client reports error.code as an HTTP status, so a duplicate
      // (Postgres 23505 unique violation from the pending-conversation index or
      // the sender/receiver constraint) surfaces as 409, not 23505. A duplicate
      // means another request already exists — exactly what we want — so it is
      // not an error.
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
