import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, Info, Users } from 'lucide-react';
import { MessageBubble, Message } from './MessageBubble';
import { MessageInput, ReplyToMessage } from './MessageInput';
import { ChatInfoPanel } from './ChatInfoPanel';
import { ForwardMessageModal } from './ForwardMessageModal';
import { ReportMessageModal } from './ReportMessageModal';
import { PinnedMessagesBanner } from './PinnedMessagesBanner';
import { useCall } from '@/contexts/CallContext';
import { useConversationReport, useConversationSettings } from '@/hooks/useConversationSettings';
import { useBlocks } from '@/hooks/useBlocks';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { ReactionKey } from '@/lib/reactions';
import { GifItem } from '@/hooks/useGifSearch';

type OtherUser = {
  id: string;
  username: string;
  display_name: string;
  profile_pic?: string;
};

interface ChatWindowProps {
  otherUser: OtherUser | null;
  messages: Message[];
  currentUserId: string;
  conversationId?: string;
  onSendMessage: (content?: string, mediaUrl?: string, replyToId?: string) => void;
  onSendGif?: (gif: GifItem) => void;
  onSendAudioMessage?: (audioPath: string, duration: number, mimeType: string, fileSize: number) => void;
  onLoadMore?: () => void;
  loading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  otherUser,
  messages,
  currentUserId,
  conversationId,
  onSendMessage,
  onSendGif,
  onSendAudioMessage,
  onLoadMore,
  loading = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { initiateCall, status } = useCall();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyToMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState<Message | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [pendingScrollToMessageId, setPendingScrollToMessageId] = useState<string | null>(null);
  const [chatTheme, setChatTheme] = useState('default');
  const scrollAttemptsRef = useRef<Record<string, number>>({});
  const navigate = useNavigate();
  const { reportConversation } = useConversationReport();
  const { settings: conversationSettings, updateChatTheme } = useConversationSettings(conversationId);
  const { toggleReaction, fetchReactions, getMessageReactions } = useMessageReactions(conversationId);
  const { blockStatus, blockUser, unblockUser } = useBlocks(otherUser?.id || '', currentUserId);
  const { deleteMessage, pinMessage, reportMessage: submitReport, getPinnedMessages } = useMessageActions(conversationId, currentUserId);

  // Derive chat theme and quick emoji from conversation settings (fetched via RPC in useConversationSettings)
  useEffect(() => {
    if (conversationSettings?.chat_theme) {
      setChatTheme(conversationSettings.chat_theme);
    }
  }, [conversationSettings?.chat_theme]);

  const quickEmoji = conversationSettings?.quick_emoji || '👌';

  // Fetch pinned messages and reactions when conversation changes
  useEffect(() => {
    if (conversationId) {
      getPinnedMessages().then(setPinnedMessageIds);
    }
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      fetchReactions(messageIds);
    }
  }, [messages]);

  const handleReaction = async (messageId: string, reaction: string) => {
    await toggleReaction(messageId, reaction as ReactionKey, currentUserId);
  };

  const handleThemeChange = async (themeId: string) => {
    setChatTheme(themeId);
    await updateChatTheme(themeId);
  };

  const handleQuickEmojiChange = async (emoji: string) => {
    if (!conversationId) return;
    const { error } = await supabase.rpc('update_conversation_quick_emoji', {
      p_conversation_id: conversationId,
      p_quick_emoji: emoji
    });
    if (error) {
      console.error('Error updating quick emoji:', error);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  // Handle pin message
  const handlePinMessage = async (messageId: string) => {
    const success = await pinMessage(messageId);
    if (success) {
      setPinnedMessageIds(prev => 
        prev.includes(messageId) 
          ? prev.filter(id => id !== messageId)
          : [...prev, messageId]
      );
    }
  };

  // Handle report message
  const handleReportMessage = async (reason: string, details?: string): Promise<boolean> => {
    if (!reportMessage) return false;
    return await submitReport(reportMessage.id, reason, details);
  };

  const tryScrollToMessage = (messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return false;

    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Add a brief highlight effect
    messageElement.classList.add('bg-primary/10');
    setTimeout(() => {
      messageElement.classList.remove('bg-primary/10');
    }, 1500);
    return true;
  };

  // Scroll to a specific message by ID (auto-load older messages if needed)
  const handleScrollToMessage = (messageId: string) => {
    if (tryScrollToMessage(messageId)) {
      setPendingScrollToMessageId(null);
      delete scrollAttemptsRef.current[messageId];
      return;
    }

    if (!onLoadMore) return;

    const nextAttempts = (scrollAttemptsRef.current[messageId] ?? 0) + 1;
    scrollAttemptsRef.current[messageId] = nextAttempts;

    // Avoid infinite loops if the message is too old / unavailable
    if (nextAttempts > 5) {
      setPendingScrollToMessageId(null);
      return;
    }

    setPendingScrollToMessageId(messageId);
    onLoadMore();
  };

  // If we requested older messages to find a target, retry after messages update
  useEffect(() => {
    if (!pendingScrollToMessageId) return;
    if (tryScrollToMessage(pendingScrollToMessageId)) {
      delete scrollAttemptsRef.current[pendingScrollToMessageId];
      setPendingScrollToMessageId(null);
    }
    }, [pendingScrollToMessageId, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!otherUser) return;
    
    initiateCall(otherUser.id, {
      id: otherUser.id,
      username: otherUser.username,
      displayName: otherUser.display_name,
      profilePic: otherUser.profile_pic,
    }, type);
  };

  const isInCall = status !== 'idle';

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Select a conversation
          </h3>
          <p className="text-muted-foreground">
            Choose a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-background relative h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Chat Header */}
        <CardHeader className="border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherUser.profile_pic} alt={otherUser.display_name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {otherUser.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{otherUser.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
              </div>
              <Badge variant="secondary" className="ml-2">
                Online
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              {/* Call Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartCall('voice')}
                disabled={isInCall}
                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartCall('video')}
                disabled={isInCall}
                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Video className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollAreaRef}>

          {loading && messages.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-end space-x-2 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="bg-muted h-12 rounded-2xl flex-1 max-w-xs" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.length > 0 && onLoadMore && (
                <div className="text-center mb-4">
                  <Button variant="ghost" size="sm" onClick={onLoadMore}>
                    Load older messages
                  </Button>
                </div>
              )}
              
              <div className="space-y-1">
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === currentUserId;
                  const prevMessage = messages[index - 1];
                  const showAvatar = !prevMessage || 
                    prevMessage.sender_id !== message.sender_id ||
                    new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

                  const messageReactions = getMessageReactions(message.id);
                  const isPinned = pinnedMessageIds.includes(message.id);
                  
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwnMessage}
                        showAvatar={showAvatar}
                        reactions={messageReactions}
                        currentUserId={currentUserId}
                        isPinned={isPinned}
                        chatTheme={chatTheme}
                      onReact={handleReaction}
                      onReply={(msg) => setReplyTo({
                        id: msg.id,
                        content: msg.content,
                        sender_profile: msg.sender_profile
                      })}
                      onForward={(msg) => {
                        setForwardMessage(msg);
                        setIsForwardModalOpen(true);
                      }}
                      onDelete={handleDeleteMessage}
                      onPin={handlePinMessage}
                      onReport={(msg) => {
                        setReportMessage(msg);
                        setIsReportModalOpen(true);
                      }}
                      onScrollToMessage={handleScrollToMessage}
                    />
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>

        {/* Pinned Messages Banner - Facebook Messenger Style (positioned above input) */}
        <PinnedMessagesBanner
          messages={messages}
          pinnedMessageIds={pinnedMessageIds}
          currentUserId={currentUserId}
          onScrollToMessage={handleScrollToMessage}
          onUnpin={handlePinMessage}
        />

        {/* Message Input */}
        <MessageInput
          onSendMessage={(content, mediaUrl, replyToId) => {
            onSendMessage(content, mediaUrl, replyToId);
          }}

          onSendGif={onSendGif}
          onSendAudioMessage={onSendAudioMessage}
          conversationId={conversationId}
          disabled={loading}
          placeholder={`Message ${otherUser.display_name}...`}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          quickEmoji={quickEmoji}
        />
      </div>

      {/* Chat Info Panel */}
      <ChatInfoPanel
        isOpen={isInfoPanelOpen}
        onClose={() => setIsInfoPanelOpen(false)}
        conversationId={conversationId}
        otherUser={otherUser}
        pinnedMessageIds={pinnedMessageIds}
        chatTheme={chatTheme}
        quickEmoji={quickEmoji}
        onThemeChange={handleThemeChange}
        onQuickEmojiChange={handleQuickEmojiChange}
        onViewProfile={() => {
          if (otherUser) navigate(`/profile/${otherUser.username}`);
        }}
        onSearch={() => console.log('Search in chat')}
        onBlock={async (blockType?: 'messaging' | 'full') => {
          if (blockStatus.isBlocked) {
            await unblockUser();
          } else {
            await blockUser(blockType || 'full');
          }
        }}
        isBlocked={blockStatus.isBlocked}
        onReport={async (reportedUserId, reason, details) => {
          if (conversationId) {
            await reportConversation(conversationId, reportedUserId, reason || 'inappropriate', details || '');
          }
        }}
        onClearHistory={() => console.log('Clear chat history')}
        onScrollToMessage={handleScrollToMessage}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        open={isForwardModalOpen}
        onOpenChange={setIsForwardModalOpen}
        message={forwardMessage}
        currentUserId={currentUserId}
      />

      {/* Report Message Modal */}
      <ReportMessageModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        onReport={handleReportMessage}
      />
    </div>
  );
};
