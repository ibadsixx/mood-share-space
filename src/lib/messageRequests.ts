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

// Best-effort registration of a pending message request tied to a Send event.
// Tolerates duplicate (UNIQUE sender_id/receiver_id) inserts so subsequent
// messages to the same non-friend do not re-create the request, and an
// already-accepted request is left untouched. Never throws.
export const ensureMessageRequest = async (params: {
  senderId: string;
  receiverId: string;
  category?: MessageRequestCategory;
}): Promise<void> => {
  const { senderId, receiverId, category } = params;
  const resolvedCategory =
    category ?? (await determineMessageRequestCategory(senderId, receiverId));

  const { error: reqError } = await gateway
    .from('message_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
      category: resolvedCategory
    });

  if (reqError) {
    // The gateway client reports error.code as an HTTP status, so a duplicate
    // (Postgres 23505 unique violation) surfaces as 409, not 23505.
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
};
