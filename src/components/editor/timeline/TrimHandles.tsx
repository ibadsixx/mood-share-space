// TrimHandles - Draggable handles for trimming video playback range
import { useCallback, useState, useEffect, useRef } from 'react';

interface TrimHandlesProps {
  clipStart: number;
  clipEnd: number;
  duration: number;
  pixelsPerSecond: number;
  trackLabelWidth: number;
  onTrimStartChange: (start: number) => void;
  onTrimEndChange: (end: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function TrimHandles({
  clipStart,
  clipEnd,
  duration,
  pixelsPerSecond,
  trackLabelWidth,
  onTrimStartChange,
  onTrimEndChange,
  containerRef,
}: TrimHandlesProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; value: number } | null>(null);

  const startX = clipStart * pixelsPerSecond + trackLabelWidth;
  const endX = clipEnd * pixelsPerSecond + trackLabelWidth;

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(handle);
    dragStartRef.current = {
      mouseX: e.clientX,
      value: handle === 'start' ? clipStart : clipEnd,
    };
  }, [clipStart, clipEnd]);

  useEffect(() => {
    if (!isDragging || !dragStartRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newValue = dragStartRef.current.value + deltaTime;

      if (isDragging === 'start') {
        const clampedStart = Math.max(0, Math.min(newValue, clipEnd - 0.5));
        onTrimStartChange(clampedStart);
      } else {
        const clampedEnd = Math.max(clipStart + 0.5, Math.min(newValue, duration));
        onTrimEndChange(clampedEnd);
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
  }, [isDragging, pixelsPerSecond, clipStart, clipEnd, duration, containerRef, onTrimStartChange, onTrimEndChange]);

  return (
    <>
      {/* Dimmed area before trim start */}
      {clipStart > 0 && (
        <div
          className="absolute top-7 bottom-0 bg-black/40 z-10 pointer-events-none"
          style={{
            left: `${trackLabelWidth}px`,
            width: `${clipStart * pixelsPerSecond}px`,
          }}
        />
      )}

      {/* Dimmed area after trim end */}
      {clipEnd < duration && (
        <div
          className="absolute top-7 bottom-0 bg-black/40 z-10 pointer-events-none"
          style={{
            left: `${endX}px`,
            width: `${(duration - clipEnd) * pixelsPerSecond}px`,
          }}
        />
      )}

      {/* Start trim handle */}
      <div
        className={`absolute top-7 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center transition-colors ${
          isDragging === 'start' ? 'bg-yellow-500' : 'bg-yellow-500/70 hover:bg-yellow-500'
        }`}
        style={{ left: `${startX - 4}px` }}
        onMouseDown={(e) => handleMouseDown(e, 'start')}
      >
        <div className="w-0.5 h-8 bg-white/50 rounded" />
      </div>

      {/* End trim handle */}
      <div
        className={`absolute top-7 bottom-0 w-2 cursor-ew-resize z-20 flex items-center justify-center transition-colors ${
          isDragging === 'end' ? 'bg-yellow-500' : 'bg-yellow-500/70 hover:bg-yellow-500'
        }`}
        style={{ left: `${endX - 4}px` }}
        onMouseDown={(e) => handleMouseDown(e, 'end')}
      >
        <div className="w-0.5 h-8 bg-white/50 rounded" />
      </div>

      {/* Trim range indicator */}
      <div
        className="absolute top-5 h-1 bg-yellow-500/50 z-5 pointer-events-none"
        style={{
          left: `${startX}px`,
          width: `${(clipEnd - clipStart) * pixelsPerSecond}px`,
        }}
      />
    </>
  );
}
