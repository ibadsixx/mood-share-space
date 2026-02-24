import { STATIC_REACTION_ICONS, type ReactionKey } from '@/lib/reactions';

interface ReactionCount {
  key: ReactionKey;
  count: number;
}

interface ReactionsCounterProps {
  reactions: ReactionCount[];
  totalCount: number;
  maxIcons?: number;
}

const ReactionsCounter = ({ reactions, totalCount, maxIcons = 3 }: ReactionsCounterProps) => {
  if (totalCount === 0) return null;

  // Sort by count descending and take top N
  const topReactions = [...reactions]
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxIcons);

  if (topReactions.length === 0) return null;

  return (
    <div className="flex items-center">
      {/* Stacked reaction icons - Facebook style */}
      <div className="flex items-center">
        {topReactions.map((reaction, index) => (
          <div
            key={reaction.key}
            className="relative w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-background"
            style={{ 
              zIndex: topReactions.length - index,
              marginLeft: index === 0 ? 0 : -6
            }}
          >
            <img
              src={STATIC_REACTION_ICONS[reaction.key]}
              alt=""
              className="w-5 h-5 object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      
      {/* Count */}
      <span className="text-[13px] text-muted-foreground ml-1.5 leading-none">
        {totalCount}
      </span>
    </div>
  );
};

export default ReactionsCounter;
