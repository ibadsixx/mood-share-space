import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Inbox, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MessageRequestsModal } from './MessageRequestsModal';
import { useMessageRequests } from '@/hooks/useMessageRequests';
import { cn } from '@/lib/utils';
import { EmojiText } from '@/components/EmojiText';

type Conversation = {
  conversation_id: string;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    profile_pic?: string;
  };
  last_message?: {
    content?: string;
    created_at: string;
  };
  unread_count: number;
};

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
  currentUserId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  currentUserId
}) => {
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { requests } = useMessageRequests(currentUserId);
  const totalRequests = requests.length;

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.other_user.display_name.toLowerCase().includes(query) ||
      conv.other_user.username.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const formatLastMessage = (message?: Conversation['last_message']) => {
    if (!message) return 'No messages yet';
    const content = message.content || 'Sent an attachment';
    return content.length > 35 ? content.slice(0, 35) + '...' : content;
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="p-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Messenger"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8 bg-muted border-0 rounded-full h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Message Requests */}
      {totalRequests > 0 && (
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-3 hover:bg-accent rounded-lg"
            onClick={() => setRequestsModalOpen(true)}
          >
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mr-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-foreground">Message Requests</p>
              <p className="text-sm text-muted-foreground">
                {totalRequests} pending request{totalRequests > 1 ? 's' : ''}
              </p>
            </div>
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              {searchQuery ? (
                <>
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No conversations found</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Inbox className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium text-foreground mb-1">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a new chat with your friends!
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isActive = activeConversationId === conversation.conversation_id;
              const hasUnread = conversation.unread_count > 0;
              
              return (
                <button
                  key={conversation.conversation_id}
                  onClick={() => onSelectConversation(conversation.conversation_id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isActive 
                      ? "bg-primary/10" 
                      : "hover:bg-accent"
                  )}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={conversation.other_user.profile_pic}
                        alt={conversation.other_user.display_name}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {conversation.other_user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-card" />
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn(
                        "font-medium truncate",
                        hasUnread ? "text-foreground" : "text-foreground/90"
                      )}>
                        {conversation.other_user.display_name}
                      </h3>
                      {conversation.last_message && (
                        <span className={cn(
                          "text-xs shrink-0",
                          hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(conversation.last_message.created_at), {
                            addSuffix: false
                          })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className={cn(
                        "text-sm truncate",
                        hasUnread 
                          ? "text-foreground font-medium" 
                          : "text-muted-foreground"
                      )}>
                        <EmojiText 
                          text={formatLastMessage(conversation.last_message)} 
                          emojiSize={14}
                        />
                      </div>
                      {hasUnread && (
                        <Badge 
                          variant="default" 
                          className="h-5 min-w-[20px] px-1.5 text-xs font-bold shrink-0"
                        >
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Requests Modal */}
      <MessageRequestsModal
        open={requestsModalOpen}
        onOpenChange={setRequestsModalOpen}
        currentUserId={currentUserId}
      />
    </div>
  );
};