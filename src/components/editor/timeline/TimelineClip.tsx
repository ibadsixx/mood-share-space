// TimelineClip - Draggable, trimmable clip on timeline
import { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';

interface TimelineClipProps {
  id: string;
  type: string;
  label: string;
  start: number;
  end: number;
  bgColor: string;
  pixelsPerSecond: number;
  isSelected: boolean;
  isActive?: boolean;
  canTrim?: boolean;
  canDelete?: boolean;
  onSelect: () => void;
  onUpdate: (updates: { start?: number; end?: number }) => void;
  onDelete?: () => void;
}

export function TimelineClip({
  id,
  type,
  label,
  start,
  end,
  bgColor,
  pixelsPerSecond,
  isSelected,
  isActive = false,
  canTrim = true,
  canDelete = true,
  onSelect,
  onUpdate,
  onDelete,
}: TimelineClipProps) {
  const [isDragging, setIsDragging] = useState<'move' | 'start' | 'end' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; start: number; end: number } | null>(null);

  const clipWidth = Math.max((end - start) * pixelsPerSecond, 30);
  const clipLeft = start * pixelsPerSecond;

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    
    if (mode === 'move') {
      onSelect();
    }
    
    setIsDragging(mode);
    dragStartRef.current = {
      mouseX: e.clientX,
      start,
      end,
    };
  }, [start, end, onSelect]);

  useEffect(() => {
    if (!isDragging || !dragStartRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (isDragging === 'move') {
        // Move entire clip
        const clipDuration = dragStartRef.current.end - dragStartRef.current.start;
        const newStart = Math.max(0, dragStartRef.current.start + deltaTime);
        const newEnd = newStart + clipDuration;
        onUpdate({ start: newStart, end: newEnd });
      } else if (isDragging === 'start') {
        // Trim start
        const newStart = Math.max(0, Math.min(
          dragStartRef.current.start + deltaTime,
          dragStartRef.current.end - 0.5
        ));
        onUpdate({ start: newStart });
      } else if (isDragging === 'end') {
        // Trim end
        const newEnd = Math.max(
          dragStartRef.current.start + 0.5,
          dragStartRef.current.end + deltaTime
        );
        onUpdate({ end: newEnd });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, onUpdate]);

  return (
    <div
      className={`absolute h-10 rounded flex items-center cursor-grab active:cursor-grabbing transition-shadow ${
        isSelected ? 'ring-2 ring-primary ring-offset-1 z-10' : ''
      } ${isActive ? 'ring-2 ring-green-400 ring-offset-1 z-10' : ''} ${isDragging ? 'opacity-80 z-20' : ''}`}
      style={{
        left: `${clipLeft}px`,
        width: `${clipWidth}px`,
        backgroundColor: bgColor,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('trim-handle')) {
          handleMouseDown(e, 'move');
        }
      }}
    >
      {/* Active clip indicator */}
      {isActive && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}
      {/* Left trim handle */}
      {canTrim && (
        <div
          className="trim-handle absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-l flex items-center justify-center transition-colors z-20"
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <GripVertical className="h-4 w-4 text-white/70 pointer-events-none" />
        </div>
      )}
      
      {/* Clip label */}
      <span className="text-xs text-white px-4 truncate flex-1 select-none pointer-events-none">
        {label}
      </span>
      
      {/* Delete button (visible when selected) */}
      {isSelected && canDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mr-1 hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3 text-white" />
        </Button>
      )}

      {/* Right trim handle */}
      {canTrim && (
        <div
          className="trim-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-white/30 hover:bg-white/60 rounded-r flex items-center justify-center transition-colors z-20"
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <GripVertical className="h-4 w-4 text-white/70 pointer-events-none" />
        </div>
      )}
    </div>
  );
}
