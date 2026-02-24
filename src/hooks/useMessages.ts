import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender_profile?: {
    username: string;
    display_name: string;
    profile_pic?: string;
  };
  receiver_profile?: {
    username: string;
    display_name: string;
    profile_pic?: string;
  };
};

type Conversation = {
  conversation_id: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    profile_pic?: string;
  };
  last_message?: Message;
  unread_count: number;
};

export const useMessages = (currentUserId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch conversations with last message and unread count
  const fetchConversations = async () => {
    if (!currentUserId) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, display_name, profile_pic),
          receiver_profile:profiles!messages_receiver_id_fkey(username, display_name, profile_pic)
        `)
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation (other user)
      const conversationMap = new Map<string, Conversation>();
      
      messagesData?.forEach((message: any) => {
        const otherUserId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === currentUserId ? message.receiver_profile : message.sender_profile;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            conversation_id: otherUserId,
            other_user: {
              id: otherUserId,
              username: otherUser?.username || 'Unknown',
              display_name: otherUser?.display_name || 'Unknown',
              profile_pic: otherUser?.profile_pic
            },
            last_message: message,
            unread_count: 0
          });
        }

        // Count unread messages (where current user is receiver and read is false)
        if (message.receiver_id === currentUserId && !message.read) {
          const conv = conversationMap.get(otherUserId)!;
          conv.unread_count++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive"
      });
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (otherUserId: string, page = 0, limit = 50) => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, display_name, profile_pic),
          receiver_profile:profiles!messages_receiver_id_fkey(username, display_name, profile_pic),
          reply_to:messages!messages_reply_to_id_fkey(
            id,
            content,
            image_url,
            media_url,
            attachment_url,
            is_image,
            sender_id,
            sender_profile:profiles!messages_sender_id_fkey(display_name)
          )
        `)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      if (page === 0) {
        setMessages(data?.reverse() || []);
      } else {
        setMessages(prev => [...(data?.reverse() || []), ...prev]);
      }

      // Mark messages as read
      await markMessagesAsRead(otherUserId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive"
      });
      console.error('Error fetching messages:', error);
    }
  };

  // Send a new message
  const sendMessage = async (receiverId: string, content?: string, mediaUrl?: string) => {
    if (!currentUserId || (!content && !mediaUrl)) return;

    // Determine if the media is an image
    const isImage = mediaUrl && (
      mediaUrl.includes('avatars/') || // Supabase storage images
      /\.(jpg|jpeg|png|gif|webp)$/i.test(mediaUrl) ||
      mediaUrl.includes('image')
    );

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: isImage ? null : content, // Clear content for image messages
          media_url: mediaUrl,
          image_url: isImage ? mediaUrl : null,
          is_image: Boolean(isImage),
          read: false
        })
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(username, display_name, profile_pic),
          receiver_profile:profiles!messages_receiver_id_fkey(username, display_name, profile_pic)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      console.error('Error sending message:', error);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (senderId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', currentUserId)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          // Refresh conversations and messages
          fetchConversations();
          if (activeConversationId && 
              (payload.new as any).sender_id === activeConversationId) {
            fetchMessages(activeConversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          // Update read status
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeConversationId]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  return {
    conversations,
    messages,
    loading,
    activeConversationId,
    setActiveConversationId,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    refetchConversations: fetchConversations
  };
};