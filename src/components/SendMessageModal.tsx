import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingSystem } from '@/hooks/useMessagingSystem';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SendMessageModalProps {
  targetUser: {
    id: string;
    username: string;
    display_name: string;
    profile_pic?: string;
  };
  trigger?: React.ReactNode;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  targetUser,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { sendMessage } = useMessagingSystem(user?.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!message.trim() || !user) return;

    setLoading(true);
    try {
      const result = await sendMessage(targetUser.id, message.trim());
      
      if (result.success) {
        if (result.conversationId) {
          // Direct message sent - navigate to conversation
          toast({
            title: "Message sent",
            description: `Your message has been sent to ${targetUser.display_name}`,
          });
          navigate(`/messages/${result.conversationId}`);
          setOpen(false);
        } else {
          // Message request sent
          toast({
            title: "Message request sent",
            description: `Your message request has been sent to ${targetUser.display_name}`,
          });
          setOpen(false);
        }
        setMessage('');
      } else {
        // Show specific error from the messaging system
        toast({
          title: result.error?.code === 'USER_BLOCKED' ? "Cannot send message" : "Error",
          description: result.error?.message || "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <MessageSquare className="h-4 w-4 mr-2" />
      Message
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={targetUser.profile_pic} />
              <AvatarFallback className="bg-tone-gradient text-white">
                {targetUser.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{targetUser.display_name}</p>
              <p className="text-sm text-muted-foreground">@{targetUser.username}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Write a message to ${targetUser.display_name}...`}
              className="mt-1"
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || loading}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};