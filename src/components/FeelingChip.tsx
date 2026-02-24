import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FeelingData } from './FeelingPicker';

interface FeelingChipProps {
  feeling: FeelingData;
  onEdit?: () => void;
  onRemove?: () => void;
  showControls?: boolean;
  className?: string;
}

export const FeelingChip = ({ 
  feeling, 
  onEdit, 
  onRemove, 
  showControls = true,
  className = '' 
}: FeelingChipProps) => {
  const getDisplayText = () => {
    let text = `${feeling.emoji} ${feeling.type} ${feeling.text}`;
    if (feeling.targetText) {
      text += ` ${feeling.targetText}`;
    }
    return text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-accent/50 text-accent-foreground rounded-full text-sm border ${className}`}
    >
      <span 
        className={showControls ? "cursor-pointer hover:text-primary" : ""}
        onClick={showControls ? onEdit : undefined}
        role={showControls ? "button" : undefined}
        tabIndex={showControls ? 0 : -1}
        onKeyDown={showControls ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit?.();
          }
        } : undefined}
      >
        {getDisplayText()}
      </span>
      
      {showControls && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
};