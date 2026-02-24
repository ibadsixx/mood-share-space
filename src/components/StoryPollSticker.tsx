import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StoryPoll } from '@/hooks/useStoryPolls';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

interface StoryPollStickerProps {
  poll: StoryPoll;
  onVote: (optionIndex: number) => void;
}

const StoryPollSticker = ({ poll, onVote }: StoryPollStickerProps) => {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const userVote = poll.votes?.find(v => v.user_id === user?.id);
  const hasVoted = userVote !== undefined;
  const totalVotes = poll.votes?.length || 0;

  const getVotePercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    const votes = poll.votes?.filter(v => v.option_index === optionIndex).length || 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const handleVote = (index: number) => {
    if (!hasVoted) {
      setSelectedOption(index);
      onVote(index);
    }
  };

  return (
    <Card className="bg-background/90 backdrop-blur-sm p-4 space-y-3">
      <h4 className="font-semibold text-foreground">{poll.question}</h4>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const percentage = getVotePercentage(index);
          const isSelected = hasVoted && userVote.option_index === index;
          const isHovered = selectedOption === index;

          return (
            <motion.button
              key={index}
              onClick={() => handleVote(index)}
              disabled={hasVoted}
              className="w-full relative"
              whileHover={!hasVoted ? { scale: 1.02 } : {}}
              whileTap={!hasVoted ? { scale: 0.98 } : {}}
            >
              <div className={`
                relative overflow-hidden rounded-lg p-3 text-left
                ${hasVoted ? 'cursor-default' : 'cursor-pointer'}
                ${isSelected ? 'ring-2 ring-primary' : ''}
                ${!hasVoted ? 'hover:bg-accent' : ''}
              `}>
                {hasVoted && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="absolute inset-0 bg-primary/20"
                  />
                )}
                <div className="relative flex justify-between items-center">
                  <span className="font-medium text-sm">{option}</span>
                  {hasVoted && <span className="text-xs font-semibold">{percentage}%</span>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
      {hasVoted && (
        <p className="text-xs text-muted-foreground text-center">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </p>
      )}
    </Card>
  );
};

export default StoryPollSticker;
