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
  const { sendMessage, getOrCreateConversation } = useMessagingSystem(user?.id);
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
      // Try to send an initial message (this will handle friend/request logic)
      const result = await sendMessage(targetUserId, `Hello! I'd like to connect with you.`);
      
      if (result.success) {
        if (result.conversationId) {
          // Direct message sent - navigate to conversation
          toast({
            title: "Message sent",
            description: `Your message has been sent to ${targetDisplayName}`,
          });
          navigate(`/messages/${result.conversationId}`);
        } else {
          // Message request sent
          toast({
            title: "Message request sent",
            description: `Your message request has been sent to ${targetDisplayName}`,
          });
        }
      } else {
        // Show specific error from the messaging system
        toast({
          title: result.error?.code === 'USER_BLOCKED' ? "Cannot send message" : "Error",
          description: result.error?.message || "Failed to send message",
          variant: "destructive"
        });
      }
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