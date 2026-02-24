import { useState, useRef, useEffect } from 'react';
import { Video, Trash2, Volume2, VolumeX, GripVertical } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { VideoLayer } from '@/types/editor';
import { getAudioEngine } from '@/lib/audioEngine';

interface VideoTimelineTrackProps {
  videoLayers: VideoLayer[];
  duration: number;
  pixelsPerSecond: number;
  selectedLayerId: string | null;
  onLayerSelect: (type: string, id: string) => void;
  onLayerUpdate: (type: string, id: string, updates: Partial<VideoLayer>) => void;
  onLayerDelete: (type: string, id: string) => void;
  videoVolume: number;
  onVideoVolumeChange: (volume: number) => void;
  isVideoMuted: boolean;
  onVideoMutedChange: (muted: boolean) => void;
  trackLabelWidth: number;
}

export function VideoTimelineTrack({
  videoLayers,
  duration,
  pixelsPerSecond,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  videoVolume,
  onVideoVolumeChange,
  isVideoMuted,
  onVideoMutedChange,
  trackLabelWidth,
}: VideoTimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialValues, setInitialValues] = useState({ start: 0, end: 0 });

  // Handle mouse down on clip
  const handleClipMouseDown = (
    e: React.MouseEvent,
    layerId: string,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    const layer = videoLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setDragType(type);
    setDragLayerId(layerId);
    setDragStartX(e.clientX);
    setInitialValues({ start: layer.start, end: layer.end });
    onLayerSelect('video', layerId);
  };

  // Handle drag
  useEffect(() => {
    if (!dragType || !dragLayerId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const layer = videoLayers.find(l => l.id === dragLayerId);
      if (!layer) return;

      if (dragType === 'move') {
        const clipDuration = initialValues.end - initialValues.start;
        let newStart = Math.max(0, initialValues.start + deltaTime);
        let newEnd = newStart + clipDuration;

        if (newEnd > duration + 10) {
          newEnd = duration + 10;
          newStart = newEnd - clipDuration;
        }

        onLayerUpdate('video', dragLayerId, { start: newStart, end: newEnd });
      } else if (dragType === 'resize-start') {
        const newStart = Math.max(0, Math.min(initialValues.end - 0.5, initialValues.start + deltaTime));
        onLayerUpdate('video', dragLayerId, { start: newStart });
      } else if (dragType === 'resize-end') {
        const newEnd = Math.max(initialValues.start + 0.5, initialValues.end + deltaTime);
        onLayerUpdate('video', dragLayerId, { end: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDragType(null);
      setDragLayerId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragType, dragLayerId, dragStartX, initialValues, pixelsPerSecond, duration, videoLayers, onLayerUpdate]);

  // Handle volume toggle - binds to AudioEngine
  const toggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isVideoMuted;
    onVideoMutedChange(newMuted);
    
    // MANDATORY: Resume AudioContext (required after user gesture) and bind to AudioEngine
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    
    const effectiveVolume = newMuted ? 0 : videoVolume;
    audioEngine.setVideoVolume(effectiveVolume);
    
    console.log(`[AUDIO_ENGINE] video mute toggled -> muted=${newMuted}, gain=${(effectiveVolume / 100).toFixed(2)}`);
  };

  // Handle volume change - binds to AudioEngine
  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    onVideoVolumeChange(newVolume);
    
    // MANDATORY: Resume AudioContext and bind to AudioEngine - this directly controls audio output
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    audioEngine.setVideoVolume(newVolume);
    
    console.log(`[AUDIO_ENGINE] video gain applied -> ${(newVolume / 100).toFixed(2)}`);
  };

  // Toggle inline volume slider visibility
  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVolumeSlider(!showVolumeSlider);
    console.log('[TIMELINE] video volume slider opened');
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

  return (
    <div className="flex items-center h-14 px-2">
      {/* Track label with INLINE VOLUME CONTROL - CapCut style */}
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 volume-control-container"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Video className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="font-medium shrink-0">Video</span>
        
        {/* ===== INLINE VOLUME CONTROL - Visible in track label ===== */}
        <div className="relative ml-auto flex items-center gap-1.5">
          {/* Mute/unmute button */}
          <button
            className={cn(
              "p-1 rounded hover:bg-muted/60 transition-colors shrink-0",
              (isVideoMuted || videoVolume === 0) && "text-muted-foreground"
            )}
            onClick={toggleMute}
            title={isVideoMuted ? "Unmute video" : "Mute video"}
          >
            {isVideoMuted || videoVolume === 0 ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-blue-500" />
            )}
          </button>
          
          {/* ===== INLINE HORIZONTAL SLIDER - Always visible option ===== */}
          {showVolumeSlider ? (
            <div 
              className="flex items-center gap-2 bg-popover border border-border rounded-md px-2 py-1 shadow-md"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Slider
                value={[isVideoMuted ? 0 : videoVolume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
              />
              <span className="text-[10px] font-medium min-w-[28px] text-right">
                {isVideoMuted ? 0 : Math.round(videoVolume)}%
              </span>
            </div>
          ) : (
            /* Collapsed state - show percentage as clickable button */
            <button
              className="text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-muted/60 transition-colors min-w-[32px] text-center"
              onClick={handleVolumeIconClick}
              title="Click to adjust volume"
            >
              {isVideoMuted ? 0 : Math.round(videoVolume)}%
            </button>
          )}
        </div>
      </div>

      {/* Track content area */}
      <div
        ref={trackRef}
        className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50"
      >
        {videoLayers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Drop video here or use Media panel
          </div>
        )}

        {videoLayers.map((layer) => {
          const clipWidth = Math.max((layer.end - layer.start) * pixelsPerSecond, 40);
          const clipLeft = layer.start * pixelsPerSecond;
          const isSelected = selectedLayerId === layer.id;
          const isDragging = dragLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={cn(
                'absolute h-full rounded flex items-center cursor-grab active:cursor-grabbing transition-all group',
                isSelected ? 'ring-2 ring-blue-400 z-10' : 'hover:ring-1 hover:ring-blue-300',
                isDragging && 'opacity-75 z-20'
              )}
              style={{
                left: `${clipLeft}px`,
                width: `${clipWidth}px`,
                backgroundColor: 'rgb(59 130 246 / 0.85)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onLayerSelect('video', layer.id);
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('.resize-handle')) return;
                handleClipMouseDown(e, layer.id, 'move');
              }}
            >
              {/* Resize handle - start */}
              <div
                className="resize-handle absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-white/20 hover:bg-white/50 rounded-l flex items-center justify-center transition-colors"
                onMouseDown={(e) => handleClipMouseDown(e, layer.id, 'resize-start')}
              >
                <GripVertical className="h-3 w-3 text-white/60" />
              </div>

              {/* Clip content */}
              <div className="flex-1 flex items-center justify-center px-3 overflow-hidden">
                <span className="text-xs text-white truncate select-none">
                  {layer.fileName}
                </span>
              </div>

              {/* Delete button - visible on select/hover */}
              {isSelected && (
                <button
                  className="absolute right-8 p-1 hover:bg-white/20 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete('video', layer.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-white" />
                </button>
              )}

              {/* Resize handle - end */}
              <div
                className="resize-handle absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-white/20 hover:bg-white/50 rounded-r flex items-center justify-center transition-colors"
                onMouseDown={(e) => handleClipMouseDown(e, layer.id, 'resize-end')}
              >
                <GripVertical className="h-3 w-3 text-white/60" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}