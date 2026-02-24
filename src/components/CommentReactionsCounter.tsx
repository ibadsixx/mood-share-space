import { STATIC_REACTION_ICONS, type ReactionKey, getReactionConfig } from '@/lib/reactions';

interface CommentReaction {
  id: string;
  user_id: string;
  emoji: string;
}

interface ReactionCount {
  key: ReactionKey;
  count: number;
}

interface CommentReactionsCounterProps {
  reactions?: CommentReaction[];
  maxIcons?: number;
}

const CommentReactionsCounter = ({ reactions = [], maxIcons = 3 }: CommentReactionsCounterProps) => {
  if (!reactions || reactions.length === 0) return null;

  // Count reactions by type
  const reactionCounts = reactions.reduce((acc, reaction) => {
    const config = getReactionConfig(reaction.emoji);
    if (config) {
      acc[config.key] = (acc[config.key] || 0) + 1;
    }
    return acc;
  }, {} as Record<ReactionKey, number>);

  // Convert to array and sort by count
  const topReactions: ReactionCount[] = Object.entries(reactionCounts)
    .map(([key, count]) => ({ key: key as ReactionKey, count }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxIcons);

  if (topReactions.length === 0) return null;

  const totalCount = reactions.length;

  return (
    <div className="flex items-center">
      {/* Stacked reaction icons */}
      <div className="flex items-center">
        {topReactions.map((reaction, index) => (
          <div
            key={reaction.key}
            className="relative w-[18px] h-[18px] rounded-full flex items-center justify-center ring-2 ring-background"
            style={{ 
              zIndex: topReactions.length - index,
              marginLeft: index === 0 ? 0 : -6
            }}
          >
            <img
              src={STATIC_REACTION_ICONS[reaction.key]}
              alt=""
              className="w-[18px] h-[18px] object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      
      {/* Count */}
      <span className="text-xs text-muted-foreground ml-1.5 leading-none">
        {totalCount}
      </span>
    </div>
  );
};

export default CommentReactionsCounter;
