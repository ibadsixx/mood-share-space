import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';
import { REACTIONS_LIST, STATIC_REACTION_ICONS, type ReactionKey } from '@/lib/reactions';
import AnimatedWebP from '@/components/AnimatedWebP';
import StaticReactionIcon from '@/components/StaticReactionIcon';

interface MessageReactionPickerProps {
  onReact: (reactionKey: ReactionKey) => void;
  selectedReactionKey?: ReactionKey | null;
}

const MessageReactionPicker = ({ onReact, selectedReactionKey = null }: MessageReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionKey | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, [clearCloseTimeout]);

  const handleReaction = (reactionKey: ReactionKey) => {
    clearCloseTimeout();
    onReact(reactionKey);
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    // Toggle on click
    if (isOpen) {
      setIsOpen(false);
    } else {
      clearCloseTimeout();
      setIsOpen(true);
    }
  };

  const handleTriggerMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleContentMouseEnter = () => {
    clearCloseTimeout();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center data-[state=open]:opacity-100"
          onClick={handleTriggerClick}
          onMouseEnter={handleTriggerMouseEnter}
          onMouseLeave={scheduleClose}
        >
          <StaticReactionIcon 
            reactionKey={selectedReactionKey}
            size="sm"
            isActive={!!selectedReactionKey}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 bg-popover border border-border shadow-lg rounded-full z-[100]"
        side="top"
        align="center"
        sideOffset={8}
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-center gap-1">
          <AnimatePresence mode="wait">
            {isOpen && REACTIONS_LIST.map((reaction, index) => (
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
                className="relative p-1 rounded-full hover:bg-accent transition-colors cursor-pointer"
                title={reaction.label}
              >
                <AnimatedWebP 
                  webpPath={reaction.webpPath}
                  fallbackPath={STATIC_REACTION_ICONS[reaction.key]}
                  size={36}
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
            ))}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageReactionPicker;
