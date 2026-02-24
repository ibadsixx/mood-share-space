// Playhead - Draggable scrubber that moves with currentTime
// Enhanced with smooth animations, touch support, and improved visual feedback

import { useRef, useEffect, useCallback, useState } from 'react';

interface PlayheadProps {
  currentTime: number;
  pixelsPerSecond: number;
  trackLabelWidth: number;
  isScrubbing: boolean;
  onScrubStart: () => void;
  onScrubUpdate: (time: number) => void;
  onScrubEnd: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  duration?: number;
}

export function Playhead({
  currentTime,
  pixelsPerSecond,
  trackLabelWidth,
  isScrubbing,
  onScrubStart,
  onScrubUpdate,
  onScrubEnd,
  containerRef,
  duration = Infinity,
}: PlayheadProps) {
  const isDraggingRef = useRef(false);
  const lastLogTimeRef = useRef(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Format time for tooltip
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Calculate time from position
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft - trackLabelWidth;
    const time = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    
    return time;
  }, [containerRef, trackLabelWidth, pixelsPerSecond, duration]);

  // Handle mouse down on playhead
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    console.log('[Playhead] Scrub start at:', currentTime.toFixed(2));
    onScrubStart();
  }, [currentTime, onScrubStart]);

  // Handle touch start on playhead
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    console.log('[Playhead] Touch scrub start at:', currentTime.toFixed(2));
    onScrubStart();
  }, [currentTime, onScrubStart]);

  // Handle mouse/touch move and up during scrub
  useEffect(() => {
    if (!isScrubbing) {
      isDraggingRef.current = false;
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const time = getTimeFromPosition(e.clientX);
      
      // Throttle logging
      const now = Date.now();
      if (now - lastLogTimeRef.current > 100) {
        console.log('[Playhead] Scrub update:', time.toFixed(2));
        lastLogTimeRef.current = now;
      }
      
      onScrubUpdate(time);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      
      const time = getTimeFromPosition(e.touches[0].clientX);
      
      const now = Date.now();
      if (now - lastLogTimeRef.current > 100) {
        console.log('[Playhead] Touch scrub update:', time.toFixed(2));
        lastLogTimeRef.current = now;
      }
      
      onScrubUpdate(time);
    };

    const handleEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        console.log('[Playhead] Scrub end at:', currentTime.toFixed(2));
        onScrubEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isScrubbing, currentTime, getTimeFromPosition, onScrubUpdate, onScrubEnd]);

  // PROFESSIONAL Auto-scroll when dragging near edges (20% margin, smooth pan)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const playheadX = currentTime * pixelsPerSecond + trackLabelWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // 20% edge margins
    const edgeMargin = containerWidth * 0.2;
    const rightThreshold = scrollLeft + containerWidth - edgeMargin;
    const leftThreshold = scrollLeft + edgeMargin;
    
    // Calculate max scroll for boundaries
    const maxScroll = Math.max(0, container.scrollWidth - containerWidth);
    
    // During scrubbing - immediate smooth scroll
    if (isScrubbing) {
      if (playheadX > rightThreshold) {
        const overshoot = playheadX - rightThreshold;
        const speed = Math.min(20, overshoot * 0.3); // Progressive speed
        const newScroll = Math.min(maxScroll, scrollLeft + speed);
        container.scrollLeft = newScroll;
      } else if (playheadX < leftThreshold && scrollLeft > 0) {
        const overshoot = leftThreshold - playheadX;
        const speed = Math.min(20, overshoot * 0.3);
        const newScroll = Math.max(0, scrollLeft - speed);
        container.scrollLeft = newScroll;
      }
    }
  }, [isScrubbing, currentTime, pixelsPerSecond, trackLabelWidth, containerRef]);
  
  // Auto-scroll during playback (non-scrubbing) - smooth continuous pan
  useEffect(() => {
    if (isScrubbing || !containerRef.current) return;

    const container = containerRef.current;
    const playheadX = currentTime * pixelsPerSecond + trackLabelWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // 15% right edge for playback auto-scroll
    const rightThreshold = scrollLeft + containerWidth - (containerWidth * 0.15);
    const maxScroll = Math.max(0, container.scrollWidth - containerWidth);
    
    // Auto-scroll when playhead approaches right edge during playback
    if (playheadX > rightThreshold && scrollLeft < maxScroll) {
      // Smooth scroll to center playhead
      const targetScroll = Math.min(maxScroll, playheadX - containerWidth / 2);
      container.scrollLeft = targetScroll;
    }
  }, [isScrubbing, currentTime, pixelsPerSecond, trackLabelWidth, containerRef]);

  // Calculate playhead position - smooth during playback, instant during scrub
  const playheadX = currentTime * pixelsPerSecond + trackLabelWidth;

  return (
    <div
      ref={playheadRef}
      className={`absolute top-0 bottom-0 w-0.5 z-30 cursor-ew-resize pointer-events-auto
        ${isScrubbing ? 'bg-red-400' : 'bg-red-500'}
        ${!isScrubbing ? 'transition-[left] duration-[50ms] ease-linear' : ''}
      `}
      style={{ left: `${playheadX}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => !isScrubbing && setIsHovering(false)}
    >
      {/* Playhead handle at top - larger hit area for touch */}
      <div 
        className={`absolute -top-0.5 -ml-2.5 w-5 h-5 rounded-t-sm cursor-ew-resize shadow-lg transition-transform
          ${isScrubbing ? 'bg-red-400 scale-110' : 'bg-red-500'}
          ${isHovering && !isScrubbing ? 'scale-105' : ''}
        `}
      >
        {/* Triangle pointer */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 
          border-l-[5px] border-l-transparent 
          border-r-[5px] border-r-transparent 
          border-t-[6px] border-t-white/90" 
        />
      </div>
      
      {/* Time tooltip - shown during scrub or hover */}
      {(isScrubbing || isHovering) && (
        <div 
          className={`absolute -top-9 -ml-12 px-2.5 py-1 rounded text-xs whitespace-nowrap shadow-lg z-50
            transition-opacity duration-100
            ${isScrubbing ? 'bg-red-500 text-white' : 'bg-background/95 border border-border text-foreground'}
          `}
        >
          <span className="tabular-nums font-medium">{formatTime(currentTime)}</span>
        </div>
      )}
      
      {/* Glow effect during scrub */}
      {isScrubbing && (
        <div className="absolute inset-0 w-1 -ml-0.25 bg-red-400/30 blur-sm" />
      )}
    </div>
  );
}