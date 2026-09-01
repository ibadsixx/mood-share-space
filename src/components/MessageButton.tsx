import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingSystem } from '@/hooks/useMessagingSystem';
import { useToast } from '@/hooks/use-toast';

interface MessageButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string;
  disabled?: boolean;
}

export const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUsername,
  targetDisplayName,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getOrCreateConversation, checkIfBlocked } = useMessagingSystem(user?.id);
  const { toast } = useToast();

  const handleMessageClick = async () => {
    if (!user || disabled) return;
    
    // Don't allow messaging yourself
    if (user.id === targetUserId) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send messages to yourself",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Guard against messaging a blocked/blocking user before opening the chat.
      const isBlocked = await checkIfBlocked(user.id, targetUserId);
      if (isBlocked) {
        toast({
          title: "Cannot send message",
          description: "You cannot send messages to this user",
          variant: "destructive"
        });
        return;
      }

      // Open/create the conversation WITHOUT sending any message — the user
      // types their own first message in the chat bubble.
      const conversationId = await getOrCreateConversation(user.id, targetUserId);
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to open conversation",
          variant: "destructive"
        });
        return;
      }

      navigate(`/messages/${conversationId}`);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Cannot message this user",
        description: error.message || "You cannot message this user at this time",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Hide button if it's the current user's own profile
  if (user?.id === targetUserId) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleMessageClick}
      disabled={disabled || loading}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {loading ? 'Loading...' : 'Message'}
    </Button>
  );
};