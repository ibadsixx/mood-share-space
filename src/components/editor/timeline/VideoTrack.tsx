// VideoTrack - Video clips track with active clip highlighting and inline volume control
import { useState } from 'react';
import { Video, Upload, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { TimelineClip } from './TimelineClip';
import { TimelineAddClipButton } from './TimelineAddClipButton';
import { VideoLayer, ImageLayer } from '@/types/editor';
import { getAudioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

interface VideoTrackProps {
  videoLayers: VideoLayer[];
  pixelsPerSecond: number;
  selectedLayerId: string | null;
  onLayerSelect: (type: string, id: string) => void;
  onLayerUpdate: (type: string, id: string, updates: any) => void;
  onLayerDelete: (type: string, id: string) => void;
  onAddVideoClip?: (clip: Omit<VideoLayer, 'id'>) => void;
  onAddImageClip?: (clip: Omit<ImageLayer, 'id'>) => void;
  trackLabelWidth: number;
  isDragOver?: boolean;
  currentClipIndex?: number;
  // Volume control props - REQUIRED for inline volume
  videoVolume?: number;
  isVideoMuted?: boolean;
  onVideoVolumeChange?: (volume: number) => void;
  onVideoMutedChange?: (muted: boolean) => void;
}

export function VideoTrack({
  videoLayers,
  pixelsPerSecond,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onAddVideoClip,
  onAddImageClip,
  trackLabelWidth,
  isDragOver,
  currentClipIndex = 0,
  videoVolume = 100,
  isVideoMuted = false,
  onVideoVolumeChange,
  onVideoMutedChange,
}: VideoTrackProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Sort clips by start time for correct display
  const sortedLayers = [...videoLayers].sort((a, b) => a.start - b.start);
  
  // Calculate position for the "+" button (end of last clip)
  const lastClipEnd = sortedLayers.reduce((max, layer) => Math.max(max, layer.end), 0);
  const addButtonPosition = lastClipEnd * pixelsPerSecond + 8;

  // Toggle mute - binds to AudioEngine
  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isVideoMuted;
    onVideoMutedChange?.(newMuted);
    
    // MANDATORY: Resume AudioContext and bind to AudioEngine
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    
    const effectiveVolume = newMuted ? 0 : videoVolume;
    audioEngine.setVideoVolume(effectiveVolume);
    
    console.log(`[AUDIO_ENGINE] video mute toggled -> muted=${newMuted}, gain=${(effectiveVolume / 100).toFixed(2)}`);
  };

  // Handle volume change - binds to AudioEngine
  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    onVideoVolumeChange?.(newVolume);
    
    // MANDATORY: Resume AudioContext and bind to AudioEngine
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    audioEngine.setVideoVolume(newVolume);
    
    console.log(`[AUDIO_ENGINE] video gain applied -> ${(newVolume / 100).toFixed(2)}`);
  };

  // Toggle volume slider visibility
  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVolumeSlider(!showVolumeSlider);
    console.log('[TIMELINE] video volume slider opened');
  };

  return (
    <div className="flex items-center h-12 px-2">
      {/* Track Label with INLINE VOLUME CONTROL */}
      <div 
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Video className="h-4 w-4 text-blue-500" />
        <span className="font-medium">Video</span>
        {sortedLayers.length > 1 && (
          <span className="text-[10px] bg-muted px-1 rounded">
            {sortedLayers.length}
          </span>
        )}
        
        {/* INLINE VOLUME CONTROL - Volume icon visible in track label */}
        {sortedLayers.length > 0 && (
          <div className="relative ml-auto flex items-center">
            <button
              className={cn(
                "p-1 rounded hover:bg-muted/60 transition-colors flex items-center gap-0.5",
                showVolumeSlider && "bg-muted/60"
              )}
              onClick={handleVolumeIconClick}
              title={isVideoMuted ? "Unmute video audio" : "Mute video audio"}
            >
              {isVideoMuted || videoVolume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-blue-500" />
              )}
            </button>
            
            {/* INLINE VOLUME SLIDER - appears on click, NOT in a modal */}
            {showVolumeSlider && (
              <div 
                className="absolute left-0 top-full mt-1 z-50 p-2 bg-popover border border-border rounded-md shadow-lg min-w-[130px]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <button
                    className="p-0.5 rounded hover:bg-muted/60"
                    onClick={handleToggleMute}
                  >
                    {isVideoMuted || videoVolume === 0 ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </button>
                  <span className="text-[10px] text-muted-foreground">Video Audio</span>
                  <span className="text-[10px] font-medium ml-auto tabular-nums">
                    {isVideoMuted ? 0 : Math.round(videoVolume)}%
                  </span>
                </div>
                <Slider
                  value={[isVideoMuted ? 0 : videoVolume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={`flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50 ${
        isDragOver ? 'border-primary bg-primary/10' : ''
      }`}>
        {sortedLayers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground gap-1">
            {isDragOver ? (
              <>
                <Upload className="h-4 w-4 animate-bounce" />
                <span>Drop to add video</span>
              </>
            ) : (
              <span>Drop video here or click + to add</span>
            )}
          </div>
        )}
        
        {sortedLayers.map((layer, index) => (
          <TimelineClip
            key={layer.id}
            id={layer.id}
            type="video"
            label={layer.fileName}
            start={layer.start}
            end={layer.end}
            bgColor={index === currentClipIndex ? 'rgb(34 197 94 / 0.9)' : 'rgb(59 130 246 / 0.9)'}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedLayerId === layer.id}
            isActive={index === currentClipIndex}
            canTrim={true}
            canDelete={true}
            onSelect={() => onLayerSelect('video', layer.id)}
            onUpdate={(updates) => onLayerUpdate('video', layer.id, updates)}
            onDelete={() => onLayerDelete('video', layer.id)}
          />
        ))}

        {/* Add Clip Button - appears at end of last clip */}
        {onAddVideoClip && onAddImageClip && (
          <TimelineAddClipButton
            position={addButtonPosition}
            onAddVideoClip={onAddVideoClip}
            onAddImageClip={onAddImageClip}
            lastClipEnd={lastClipEnd}
          />
        )}
      </div>
    </div>
  );
}
