import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MessageButtonProps {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string;
  targetProfilePic?: string | null;
  disabled?: boolean;
}

export const MessageButton: React.FC<MessageButtonProps> = ({
  targetUserId,
  targetUsername,
  targetDisplayName,
  targetProfilePic,
  disabled = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleMessageClick = () => {
    if (!user || disabled) return;

    if (user.id === targetUserId) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send messages to yourself",
        variant: "destructive"
      });
      return;
    }

    // Dispatch custom event so FloatingIM opens a mini chat window
    window.dispatchEvent(
      new CustomEvent('open-im-chat', {
        detail: {
          id: targetUserId,
          username: targetUsername,
          display_name: targetDisplayName,
          profile_pic: targetProfilePic ?? null,
        },
      })
    );
  };

  if (user?.id === targetUserId) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleMessageClick}
      disabled={disabled}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Message
    </Button>
  );
};
