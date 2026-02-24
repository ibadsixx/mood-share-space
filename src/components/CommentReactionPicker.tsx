import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { REACTIONS_LIST, STATIC_REACTION_ICONS, getReactionConfig, type ReactionKey } from '@/lib/reactions';
import AnimatedWebP from '@/components/AnimatedWebP';
import StaticReactionIcon from '@/components/StaticReactionIcon';

interface CommentReaction {
  id: string;
  user_id: string;
  emoji: string;
}

interface CommentReactionPickerProps {
  commentId: string;
  reactions?: CommentReaction[];
  onToggleReaction: (commentId: string, emoji: string) => void;
}

export const CommentReactionPicker = ({ commentId, reactions = [], onToggleReaction }: CommentReactionPickerProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionKey | null>(null);

  // Get user's current reaction
  const userReaction = reactions.find(r => r.user_id === user?.id);
  const currentReaction = userReaction ? getReactionConfig(userReaction.emoji) : null;

  const handleReaction = (reactionKey: ReactionKey) => {
    onToggleReaction(commentId, reactionKey);
    setIsOpen(false);
  };

  const handleDefaultReaction = () => {
    if (!isOpen) {
      onToggleReaction(commentId, 'ok');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center space-x-1 h-7 px-2 transition-colors ${
            currentReaction 
              ? (currentReaction.color || 'text-primary') + ' hover:opacity-80' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={handleDefaultReaction}
          onMouseEnter={() => setIsOpen(true)}
        >
          <StaticReactionIcon 
            reactionKey={userReaction?.emoji || null}
            size="sm"
            count={0}
            isActive={!!currentReaction}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 bg-popover border border-border shadow-lg rounded-full"
        side="top"
        align="start"
        sideOffset={8}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="flex items-center gap-1">
          <AnimatePresence mode="wait">
            {isOpen && REACTIONS_LIST.map((reaction, index) => {
              const hasUserReacted = reactions.some(r => r.emoji === reaction.key && r.user_id === user?.id);
              
              return (
                <motion.button
                  key={reaction.key}
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: 10 }}
                  transition={{ 
                    delay: index * 0.03,
                    type: "spring",
                    stiffness: 500,
                    damping: 25
                  }}
                  whileHover={{ scale: 1.3, y: -8 }}
                  onHoverStart={() => setHoveredReaction(reaction.key)}
                  onHoverEnd={() => setHoveredReaction(null)}
                  onClick={() => handleReaction(reaction.key)}
                  className={`relative p-1 rounded-full hover:bg-accent transition-colors cursor-pointer ${
                    hasUserReacted ? 'bg-accent' : ''
                  }`}
                  title={reaction.label}
                >
                  <AnimatedWebP 
                    webpPath={reaction.webpPath}
                    fallbackPath={STATIC_REACTION_ICONS[reaction.key]}
                    size={32}
                    alt={reaction.label}
                  />
                  
                  {/* Label tooltip on hover */}
                  <AnimatePresence>
                    {hoveredReaction === reaction.key && (
                      <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-0.5 rounded-full whitespace-nowrap z-10"
                      >
                        {reaction.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
};
