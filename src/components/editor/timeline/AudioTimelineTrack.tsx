import { useState, useRef, useEffect } from 'react';
import { Music, Trash2, Volume2, VolumeX, GripVertical } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AudioTrack } from '@/types/editor';
import { getAudioEngine } from '@/lib/audioEngine';

interface AudioTimelineTrackProps {
  audioTrack: AudioTrack | null;
  duration: number;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<AudioTrack>) => void;
  onDelete: () => void;
  trackLabelWidth: number;
}

export function AudioTimelineTrack({
  audioTrack,
  duration,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  trackLabelWidth,
}: AudioTimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialValues, setInitialValues] = useState({ startAt: 0, endAt: 0 });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Handle mouse down for dragging
  const handleMouseDown = (
    e: React.MouseEvent,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    if (!audioTrack) return;
    e.preventDefault();
    e.stopPropagation();

    setDragType(type);
    setDragStartX(e.clientX);
    setInitialValues({ startAt: audioTrack.startAt, endAt: audioTrack.endAt });
    onSelect();
  };

  // Handle mouse move for dragging
  useEffect(() => {
    if (!dragType || !audioTrack) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (dragType === 'move') {
        const trackDuration = initialValues.endAt - initialValues.startAt;
        let newStart = Math.max(0, initialValues.startAt + deltaTime);
        let newEnd = newStart + trackDuration;

        if (newEnd > duration) {
          newEnd = duration;
          newStart = newEnd - trackDuration;
        }

        onUpdate({ startAt: newStart, endAt: newEnd });
      } else if (dragType === 'resize-start') {
        const newStart = Math.max(0, Math.min(initialValues.endAt - 0.5, initialValues.startAt + deltaTime));
        onUpdate({ startAt: newStart });
      } else if (dragType === 'resize-end') {
        const newEnd = Math.max(initialValues.startAt + 0.5, Math.min(duration, initialValues.endAt + deltaTime));
        onUpdate({ endAt: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDragType(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragType, dragStartX, initialValues, pixelsPerSecond, duration, audioTrack, onUpdate]);

  // Toggle mute - binds to AudioEngine
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioTrack) return;
    
    const newMuted = !audioTrack.muted;
    onUpdate({ muted: newMuted });
    
    // MANDATORY: Bind to AudioEngine
    const audioEngine = getAudioEngine();
    audioEngine.setTrackVolume(audioTrack.id, newMuted ? 0 : audioTrack.volume);
    
    console.log(`[TIMELINE] track mute toggled -> trackId=${audioTrack.id} muted=${newMuted}`);
  };

  // Handle volume change - binds to AudioEngine
  const handleVolumeChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const newVolume = value[0];
    onUpdate({ volume: newVolume, muted: false });
    
    // MANDATORY: Bind to AudioEngine - this directly controls audio output
    const audioEngine = getAudioEngine();
    audioEngine.setTrackVolume(audioTrack.id, newVolume);
    
    console.log(`[TIMELINE] track volume changed -> trackId=${audioTrack.id} value=${(newVolume / 100).toFixed(2)}`);
    console.log('[AUTOSAVE] persisted timeline volume change');
  };

  // Toggle volume slider visibility
  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVolumeSlider(!showVolumeSlider);
    console.log('[TIMELINE] audio volume slider opened');
  };

  // Close slider when clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.volume-control-container')) {
        setShowVolumeSlider(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeSlider]);

  // Calculate clip position
  const getClipStyle = () => {
    if (!audioTrack) return {};
    const left = (audioTrack.startAt / duration) * 100;
    const width = ((audioTrack.endAt - audioTrack.startAt) / duration) * 100;
    return {
      left: `${left}%`,
      width: `${Math.max(width, 5)}%`,
      minWidth: '60px',
    };
  };

  const currentVolume = audioTrack?.muted ? 0 : (audioTrack?.volume ?? 100);

  return (
    <div className="flex items-center h-14 px-2">
      {/* Track label with INLINE VOLUME CONTROL - CapCut style */}
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 volume-control-container"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Music className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="font-medium shrink-0">Music</span>
        
        {/* ===== INLINE VOLUME CONTROL - Always visible in track label ===== */}
        {audioTrack && (
          <div className="relative ml-auto flex items-center gap-1.5">
            {/* Mute/unmute button */}
            <button
              className={cn(
                "p-1 rounded hover:bg-muted/60 transition-colors shrink-0",
                (audioTrack.muted || audioTrack.volume === 0) && "text-muted-foreground"
              )}
              onClick={toggleMute}
              title={audioTrack.muted ? "Unmute track" : "Mute track"}
            >
              {audioTrack.muted || audioTrack.volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </button>
            
            {/* ===== INLINE HORIZONTAL SLIDER - Expands on click ===== */}
            {showVolumeSlider ? (
              <div 
                className="flex items-center gap-2 bg-popover border border-border rounded-md px-2 py-1 shadow-md"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Slider
                  value={[currentVolume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
                <span className="text-[10px] font-medium min-w-[28px] text-right">
                  {Math.round(currentVolume)}%
                </span>
              </div>
            ) : (
              /* Collapsed state - show percentage as clickable button */
              <button
                className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors min-w-[32px] text-center"
                onClick={handleVolumeIconClick}
                title="Click to adjust volume"
              >
                {Math.round(currentVolume)}%
              </button>
            )}
          </div>
        )}
      </div>

      {/* Track content area */}
      <div
        ref={trackRef}
        className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50"
      >
        {!audioTrack && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Add music from Audio panel
          </div>
        )}

        {audioTrack && (
          <div
            className={cn(
              'absolute h-full rounded flex items-center cursor-move group transition-all',
              isSelected ? 'bg-emerald-500/90 ring-2 ring-emerald-400' : 'bg-emerald-500/70 hover:bg-emerald-500/80',
              audioTrack.muted && 'opacity-50'
            )}
            style={getClipStyle()}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('.resize-handle')) return;
              handleMouseDown(e, 'move');
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {/* Resize handle - start */}
            <div
              className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l"
              onMouseDown={(e) => handleMouseDown(e, 'resize-start')}
            />

            {/* Waveform visualization placeholder */}
            <div className="flex-1 flex items-center gap-0.5 h-5 overflow-hidden px-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-white/60 rounded-full"
                  style={{ height: `${20 + Math.random() * 80}%` }}
                />
              ))}
            </div>

            {/* Controls overlay - visible on hover */}
            <div className="absolute right-1 flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Inline quick volume display on the clip itself */}
              <div className="flex items-center gap-1 bg-black/30 rounded px-1 py-0.5">
                <button
                  className="p-0.5 hover:bg-white/20 rounded"
                  onClick={toggleMute}
                >
                  {audioTrack.muted ? (
                    <VolumeX className="h-3 w-3 text-white" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-white" />
                  )}
                </button>
                <span className="text-[10px] text-white/80 min-w-[24px]">
                  {Math.round(currentVolume)}%
                </span>
              </div>

              <button
                className="p-0.5 hover:bg-white/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3 text-white" />
              </button>
            </div>

            {/* Resize handle - end */}
            <div
              className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r"
              onMouseDown={(e) => handleMouseDown(e, 'resize-end')}
            />

            {/* Title */}
            <div className="absolute inset-x-0 -top-5 text-xs text-muted-foreground truncate px-1 pointer-events-none">
              {audioTrack.title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}