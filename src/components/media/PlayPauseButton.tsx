import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlayPauseButton = ({ 
  isPlaying, 
  onToggle, 
  className,
  size = 'md' 
}: PlayPauseButtonProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        sizeClasses[size],
        "rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all",
        className
      )}
    >
      {isPlaying ? (
        <Pause className="h-4 w-4" size={iconSizes[size]} fill="currentColor" />
      ) : (
        <Play className="h-4 w-4" size={iconSizes[size]} fill="currentColor" />
      )}
    </Button>
  );
};

export default PlayPauseButton;
