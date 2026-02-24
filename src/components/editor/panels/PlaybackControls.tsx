import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Settings, Music, Video } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  isLooping: boolean;
  onLoopToggle: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  // Audio track controls (separate from video)
  audioTrackVolume?: number;
  isAudioMuted?: boolean;
  onAudioVolumeChange?: (volume: number) => void;
  onAudioMuteToggle?: () => void;
  hasAudioTrack?: boolean;
}

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  isLooping,
  onLoopToggle,
  playbackSpeed,
  onSpeedChange,
  audioTrackVolume = 100,
  isAudioMuted = false,
  onAudioVolumeChange,
  onAudioMuteToggle,
  hasAudioTrack = false,
}: PlaybackControlsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipBackward = () => {
    onSeek(Math.max(0, currentTime - 5));
  };

  const skipForward = () => {
    onSeek(Math.min(duration, currentTime + 5));
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background border-t border-border">
      {/* Main Controls */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBackward}>
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onPlayPause}>
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward}>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Time Display */}
      <div className="text-xs text-muted-foreground min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 px-2">
        <Slider
          value={[currentTime]}
          onValueChange={(v) => onSeek(v[0])}
          max={duration}
          step={0.1}
          className="cursor-pointer"
        />
      </div>

      {/* Video Volume - Clear Label */}
      <div className="flex items-center gap-1 border-l border-border pl-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={onMuteToggle}
            title="Video Volume"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Video className="h-4 w-4" />
            )}
          </Button>
          <span className="text-[10px] text-muted-foreground w-6 text-center">
            {isMuted ? 0 : volume}%
          </span>
        </div>
        <div className="w-16">
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={(v) => onVolumeChange(v[0])}
            max={100}
            step={1}
          />
        </div>
      </div>

      {/* Audio Track Volume - Clear Label (shown when audio track exists) */}
      {hasAudioTrack && onAudioVolumeChange && onAudioMuteToggle && (
        <div className="flex items-center gap-1 border-l border-border pl-2">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onAudioMuteToggle}
              title="Music Volume"
            >
              {isAudioMuted || audioTrackVolume === 0 ? (
                <VolumeX className="h-4 w-4 text-primary" />
              ) : (
                <Music className="h-4 w-4 text-primary" />
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground w-6 text-center">
              {isAudioMuted ? 0 : audioTrackVolume}%
            </span>
          </div>
          <div className="w-16">
            <Slider
              value={[isAudioMuted ? 0 : audioTrackVolume]}
              onValueChange={(v) => onAudioVolumeChange(v[0])}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-primary"
            />
          </div>
        </div>
      )}

      {/* Loop Toggle */}
      <Button
        variant={isLooping ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={onLoopToggle}
      >
        <Repeat className="h-4 w-4" />
      </Button>

      {/* Settings Popover with full volume controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Playback Speed</Label>
              <Select value={playbackSpeed.toString()} onValueChange={(v) => onSpeedChange(parseFloat(v))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25">0.25x</SelectItem>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x (Normal)</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Loop Video</Label>
              <Switch checked={isLooping} onCheckedChange={onLoopToggle} />
            </div>

            {/* Volume Controls Section */}
            <div className="space-y-4 pt-3 border-t border-border">
              <Label className="text-xs font-semibold">Audio Mixing</Label>
              
              {/* Video Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-2">
                    <Video className="h-3 w-3" />
                    Video Volume
                  </Label>
                  <span className="text-xs text-muted-foreground">{isMuted ? 0 : volume}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 shrink-0"
                    onClick={onMuteToggle}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-3 w-3" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(v) => onVolumeChange(v[0])}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Music Volume */}
              {hasAudioTrack && onAudioVolumeChange && onAudioMuteToggle && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-2">
                      <Music className="h-3 w-3" />
                      Music Volume
                    </Label>
                    <span className="text-xs text-muted-foreground">{isAudioMuted ? 0 : audioTrackVolume}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0"
                      onClick={onAudioMuteToggle}
                    >
                      {isAudioMuted || audioTrackVolume === 0 ? (
                        <VolumeX className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                    <Slider
                      value={[isAudioMuted ? 0 : audioTrackVolume]}
                      onValueChange={(v) => onAudioVolumeChange(v[0])}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {!hasAudioTrack && (
                <p className="text-xs text-muted-foreground italic">
                  Add a music track to enable separate music volume control
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
