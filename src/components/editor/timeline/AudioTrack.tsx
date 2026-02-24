// AudioTrack - Audio/music clips track with inline volume control
import { useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { TimelineClip } from './TimelineClip';
import { AudioTrack as AudioTrackType } from '@/types/editor';
import { getAudioEngine } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';

interface AudioTrackProps {
  audioTrack: AudioTrackType | null;
  pixelsPerSecond: number;
  selectedLayerId: string | null;
  onLayerSelect: (type: string, id: string) => void;
  onLayerUpdate: (type: string, id: string, updates: any) => void;
  onLayerDelete: (type: string, id: string) => void;
  trackLabelWidth: number;
}

export function AudioTrack({
  audioTrack,
  pixelsPerSecond,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  trackLabelWidth,
}: AudioTrackProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Toggle mute - binds to AudioEngine
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioTrack) return;
    
    const newMuted = !audioTrack.muted;
    onLayerUpdate('audio', audioTrack.id, { muted: newMuted });
    
    // MANDATORY: Bind to AudioEngine
    const audioEngine = getAudioEngine();
    audioEngine.setTrackVolume(audioTrack.id, newMuted ? 0 : audioTrack.volume);
    
    console.log(`[TIMELINE] track mute toggled -> trackId=${audioTrack.id} muted=${newMuted}`);
  };

  // Handle volume change - binds to AudioEngine
  const handleVolumeChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const newVolume = value[0];
    onLayerUpdate('audio', audioTrack.id, { volume: newVolume, muted: false });
    
    // MANDATORY: Bind to AudioEngine
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

  const effectiveVolume = audioTrack?.muted ? 0 : (audioTrack?.volume ?? 100);

  return (
    <div className="flex items-center h-12 px-2">
      {/* Track Label with INLINE VOLUME CONTROL */}
      <div 
        className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
        style={{ width: `${trackLabelWidth - 8}px` }}
      >
        <Music className="h-4 w-4 text-emerald-500" />
        <span className="font-medium">Audio</span>
        
        {/* INLINE VOLUME CONTROL - Volume icon visible in track label */}
        {audioTrack && (
          <div className="relative ml-auto flex items-center">
            <button
              className={cn(
                "p-1 rounded hover:bg-muted/60 transition-colors flex items-center gap-0.5",
                showVolumeSlider && "bg-muted/60"
              )}
              onClick={handleVolumeIconClick}
              title={audioTrack.muted ? "Unmute audio track" : "Mute audio track"}
            >
              {audioTrack.muted || audioTrack.volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
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
                    {audioTrack.muted || audioTrack.volume === 0 ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </button>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                    {audioTrack.title || 'Music'}
                  </span>
                  <span className="text-[10px] font-medium ml-auto tabular-nums">
                    {Math.round(effectiveVolume)}%
                  </span>
                </div>
                <Slider
                  value={[effectiveVolume]}
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
      
      <div className="flex-1 h-10 bg-muted/20 rounded relative ml-2 border border-border/50">
        {!audioTrack && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Add music from Audio panel
          </div>
        )}
        
        {audioTrack && (
          <TimelineClip
            id={audioTrack.id}
            type="audio"
            label={audioTrack.title || 'Audio'}
            start={audioTrack.startAt}
            end={audioTrack.endAt}
            bgColor={audioTrack.muted ? 'rgb(34 197 94 / 0.5)' : 'rgb(34 197 94 / 0.9)'}
            pixelsPerSecond={pixelsPerSecond}
            isSelected={selectedLayerId === audioTrack.id}
            canTrim={true}
            canDelete={true}
            onSelect={() => onLayerSelect('audio', audioTrack.id)}
            onUpdate={(updates) => {
              // Audio uses startAt/endAt instead of start/end
              const audioUpdates: any = {};
              if (updates.start !== undefined) audioUpdates.startAt = updates.start;
              if (updates.end !== undefined) audioUpdates.endAt = updates.end;
              onLayerUpdate('audio', audioTrack.id, audioUpdates);
            }}
            onDelete={() => onLayerDelete('audio', audioTrack.id)}
          />
        )}
      </div>
    </div>
  );
}
