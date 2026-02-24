import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { REACTIONS_LIST, STATIC_REACTION_ICONS, type ReactionKey } from '@/lib/reactions';
import AnimatedWebP from '@/components/AnimatedWebP';

interface CommentReaction {
  id: string;
  user_id: string;
  emoji: string;
}

interface CommentReactionsProps {
  commentId: string;
  reactions?: CommentReaction[];
  onToggleReaction: (commentId: string, emoji: string) => void;
}

export const CommentReactions = ({ commentId, reactions = [], onToggleReaction }: CommentReactionsProps) => {
  const { user } = useAuth();
  const [hoveredReaction, setHoveredReaction] = useState<ReactionKey | null>(null);

  // Check if user has reacted with a specific reaction
  const getUserReaction = (reactionKey: ReactionKey) => {
    return reactions.some(r => r.emoji === reactionKey && r.user_id === user?.id);
  };

  // Get count for a specific reaction
  const getReactionCount = (reactionKey: ReactionKey) => {
    return reactions.filter(r => r.emoji === reactionKey).length;
  };

  const handleReaction = (reactionKey: ReactionKey) => {
    onToggleReaction(commentId, reactionKey);
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1">
        <AnimatePresence mode="wait">
          {REACTIONS_LIST.map((reaction, index) => {
            const count = getReactionCount(reaction.key);
            const hasUserReacted = getUserReaction(reaction.key);

            return (
              <motion.button
                key={reaction.key}
                initial={{ scale: 0, y: 5 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: 5 }}
                transition={{
                  delay: index * 0.02,
                  type: "spring",
                  stiffness: 500,
                  damping: 25
                }}
                whileHover={{ scale: 1.2, y: -4 }}
                onHoverStart={() => setHoveredReaction(reaction.key)}
                onHoverEnd={() => setHoveredReaction(null)}
                onClick={() => handleReaction(reaction.key)}
                className={`relative p-0.5 rounded-full transition-colors cursor-pointer ${
                  hasUserReacted ? 'bg-primary/20 ring-2 ring-primary/30' : 'hover:bg-accent'
                }`}
                title={reaction.label}
              >
                <AnimatedWebP
                  webpPath={reaction.webpPath}
                  fallbackPath={STATIC_REACTION_ICONS[reaction.key]}
                  size={28}
                  alt={reaction.label}
                />

                {/* Count badge */}
                {count > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-medium min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {count}
                  </span>
                )}

                {/* Label tooltip on hover */}
                <AnimatePresence>
                  {hoveredReaction === reaction.key && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap z-10"
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
    </div>
  );
};
