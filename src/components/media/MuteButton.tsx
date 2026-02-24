import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const MuteButton = ({ 
  isMuted, 
  onToggle, 
  className,
  size = 'md' 
}: MuteButtonProps) => {
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
      {isMuted ? (
        <VolumeX className="h-4 w-4" size={iconSizes[size]} />
      ) : (
        <Volume2 className="h-4 w-4" size={iconSizes[size]} />
      )}
    </Button>
  );
};

export default MuteButton;
