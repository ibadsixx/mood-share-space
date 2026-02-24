import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ConversationPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  
  const {
    messages,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    conversations
  } = useConversations(user?.id);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!conversationId) {
      navigate('/messages');
      return;
    }

    // Find the conversation to get other user info
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    if (conversation) {
      setOtherUser(conversation.other_user);
    }

    // Load messages for this conversation
    setPage(0);
    fetchMessages(conversationId, 0);
    
    // Mark messages as read when user enters conversation
    markMessagesAsRead(conversationId);
    
    setLoading(false);
  }, [conversationId, user, conversations]);

  const handleSendMessage = async (content?: string, mediaUrl?: string, replyToId?: string) => {
    if (!conversationId || !user) return;

    const success = await sendMessage(conversationId, content, mediaUrl, replyToId);
    if (success) {
      // Message will be added via real-time subscription
      // The specific error is already shown by the sendMessage function
    }
  };

  const handleSendAudioMessage = async (audioPath: string, duration: number, mimeType: string, fileSize: number) => {
    if (!conversationId || !user) return;

    try {
      // For now, we'll create a simple text message indicating it's an audio message
      // In a full implementation, you'd want to extend the sendMessage function to handle audio
      toast({
        title: "Audio Message",
        description: "Audio message functionality will be enhanced in the next update.",
      });
    } catch (error: any) {
      console.error('Error sending audio message:', error);
      toast({
        title: "Error",
        description: "Failed to send voice message. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Authentication Required
          </h2>
          <p className="text-muted-foreground">
            Please sign in to access your messages
          </p>
        </div>
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Invalid Conversation
          </h2>
          <p className="text-muted-foreground">
            The conversation you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/messages')} className="mt-4">
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with back button */}
      <div className="border-b border-border p-4 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/messages')}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {otherUser ? `${otherUser.display_name}` : 'Conversation'}
        </h1>
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow
          otherUser={otherUser}
          messages={messages}
          currentUserId={user.id}
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onSendAudioMessage={handleSendAudioMessage}
          onLoadMore={() => {
            if (!conversationId) return;
            setPage((prev) => {
              const next = prev + 1;
              fetchMessages(conversationId, next);
              return next;
            });
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ConversationPage;