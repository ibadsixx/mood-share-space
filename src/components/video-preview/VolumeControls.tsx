import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Volume2, Music, VolumeX } from 'lucide-react';
import { getAudioEngine } from '@/lib/audioEngine';

interface VolumeControlsProps {
  videoVolume: number;
  musicVolume: number;
  hasMusic: boolean;
  onVideoVolumeChange: (volume: number) => void;
  onMusicVolumeChange: (volume: number) => void;
}

export function VolumeControls({
  videoVolume,
  musicVolume,
  hasMusic,
  onVideoVolumeChange,
  onMusicVolumeChange,
}: VolumeControlsProps) {
  
  // MANDATORY: Route volume changes through AudioEngine
  const handleVideoVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    onVideoVolumeChange(newVolume);
    
    // Resume AudioContext (required after user gesture) and apply gain
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    console.log('[AUDIO] context state:', audioEngine.getState());
    audioEngine.setVideoVolume(newVolume);
  };

  const handleMusicVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    onMusicVolumeChange(newVolume);
    
    // Music tracks use separate track volume control
    const audioEngine = getAudioEngine();
    await audioEngine.resume();
    audioEngine.setTrackVolume('music', newVolume);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {videoVolume === 0 ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          )}
          <Label className="text-xs">Video Volume</Label>
          <span className="ml-auto text-xs text-muted-foreground">{videoVolume}%</span>
        </div>
        <Slider
          value={[videoVolume]}
          onValueChange={handleVideoVolumeChange}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {hasMusic && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs">Music Volume</Label>
            <span className="ml-auto text-xs text-muted-foreground">{musicVolume}%</span>
          </div>
          <Slider
            value={[musicVolume]}
            onValueChange={handleMusicVolumeChange}
            min={0}
            max={100}
            step={1}
          />
        </div>
      )}
    </div>
  );
}
