import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Volume2, Music2, Waves, RotateCcw, 
  Gauge, AudioLines, PanelLeft, Video, Music, VolumeX
} from 'lucide-react';
import { AudioEffects, defaultAudioEffects } from '@/types/editor';

interface AudioEffectsPanelProps {
  effects: AudioEffects;
  onEffectsChange: (effects: AudioEffects) => void;
  audioElement?: HTMLAudioElement | null;
  // Per-source volume controls
  videoVolume?: number;
  onVideoVolumeChange?: (volume: number) => void;
  audioTrackVolume?: number;
  onAudioTrackVolumeChange?: (volume: number) => void;
  hasAudioTrack?: boolean;
  audioTrackName?: string;
}

export function AudioEffectsPanel({
  effects,
  onEffectsChange,
  audioElement,
  videoVolume = 100,
  onVideoVolumeChange,
  audioTrackVolume = 100,
  onAudioTrackVolumeChange,
  hasAudioTrack = false,
  audioTrackName = 'Music Track',
}: AudioEffectsPanelProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Initialize WebAudio nodes when audio element is provided
  useEffect(() => {
    if (!audioElement) return;

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Only create source node once per audio element
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioElement);
        
        // Create nodes
        gainNodeRef.current = ctx.createGain();
        bassFilterRef.current = ctx.createBiquadFilter();
        trebleFilterRef.current = ctx.createBiquadFilter();
        pannerNodeRef.current = ctx.createStereoPanner();

        // Configure filters
        bassFilterRef.current.type = 'lowshelf';
        bassFilterRef.current.frequency.value = 200;
        trebleFilterRef.current.type = 'highshelf';
        trebleFilterRef.current.frequency.value = 3000;

        // Connect chain: source -> bass -> treble -> panner -> gain -> destination
        sourceNodeRef.current
          .connect(bassFilterRef.current)
          .connect(trebleFilterRef.current)
          .connect(pannerNodeRef.current)
          .connect(gainNodeRef.current)
          .connect(ctx.destination);

        setIsConnected(true);
        console.log('[AudioEffects] WebAudio chain connected');
      }

      // Apply current effects
      applyEffects(effects);
    } catch (error) {
      console.error('[AudioEffects] Failed to initialize:', error);
    }

    return () => {
      // Don't disconnect on cleanup to avoid issues
    };
  }, [audioElement]);

  // Apply effects to WebAudio nodes
  const applyEffects = useCallback((newEffects: AudioEffects) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newEffects.volume / 100;
    }
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = newEffects.bass / 5; // Scale to reasonable dB range
    }
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = newEffects.treble / 5;
    }
    if (pannerNodeRef.current) {
      pannerNodeRef.current.pan.value = newEffects.pan / 100;
    }
  }, []);

  // Update effects when they change
  useEffect(() => {
    if (isConnected) {
      applyEffects(effects);
    }
  }, [effects, isConnected, applyEffects]);

  const handleEffectChange = (key: keyof AudioEffects, value: number) => {
    const newEffects = { ...effects, [key]: value };
    onEffectsChange(newEffects);
  };

  const handleReset = () => {
    onEffectsChange(defaultAudioEffects);
  };

  const handleVideoVolumeChange = (value: number[]) => {
    if (onVideoVolumeChange) {
      onVideoVolumeChange(value[0]);
      console.log(`[AUDIO] video volume set -> ${(value[0] / 100).toFixed(2)}`);
    }
  };

  const handleAudioTrackVolumeChange = (value: number[]) => {
    if (onAudioTrackVolumeChange) {
      onAudioTrackVolumeChange(value[0]);
      console.log(`[AUDIO] track volume set -> trackId=current value=${(value[0] / 100).toFixed(2)}`);
    }
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Waves className="h-4 w-4" />
          Audio Mixer
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Connection Status */}
      {audioElement && (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-muted-foreground">
            {isConnected ? 'WebAudio connected' : 'Connecting...'}
          </span>
        </div>
      )}

      {/* Per-Source Volume Controls */}
      <div className="space-y-4 p-3 bg-muted/30 rounded-lg border border-border">
        <Label className="text-xs font-semibold">Volume Mixer</Label>
        
        {/* Video Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Video Volume
            </Label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  setIsVideoMuted(!isVideoMuted);
                  if (onVideoVolumeChange) {
                    onVideoVolumeChange(isVideoMuted ? videoVolume : 0);
                  }
                }}
              >
                {isVideoMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {isVideoMuted ? 0 : videoVolume}%
              </span>
            </div>
          </div>
          <Slider
            value={[isVideoMuted ? 0 : videoVolume]}
            onValueChange={handleVideoVolumeChange}
            min={0}
            max={100}
            step={1}
            disabled={!onVideoVolumeChange}
          />
        </div>

        {/* Audio Track Volume */}
        {hasAudioTrack && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-primary" />
                Music Volume
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => {
                    setIsAudioMuted(!isAudioMuted);
                    if (onAudioTrackVolumeChange) {
                      onAudioTrackVolumeChange(isAudioMuted ? audioTrackVolume : 0);
                    }
                  }}
                >
                  {isAudioMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {isAudioMuted ? 0 : audioTrackVolume}%
                </span>
              </div>
            </div>
            <Slider
              value={[isAudioMuted ? 0 : audioTrackVolume]}
              onValueChange={handleAudioTrackVolumeChange}
              min={0}
              max={100}
              step={1}
              disabled={!onAudioTrackVolumeChange}
              className="[&_[role=slider]]:bg-primary"
            />
            <p className="text-[10px] text-muted-foreground truncate">{audioTrackName}</p>
          </div>
        )}

        {!hasAudioTrack && (
          <p className="text-xs text-muted-foreground italic">
            Add a music track to enable separate music volume control
          </p>
        )}
      </div>

      {/* Master Volume (Legacy - maps to video) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5" />
            Master Effects Volume
          </Label>
          <span className="text-xs text-muted-foreground">{effects.volume}%</span>
        </div>
        <Slider
          value={[effects.volume]}
          onValueChange={(v) => handleEffectChange('volume', v[0])}
          min={0}
          max={200}
          step={1}
        />
      </div>

      {/* Bass (Low Frequencies) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <AudioLines className="h-3.5 w-3.5" />
            Bass
          </Label>
          <span className="text-xs text-muted-foreground">
            {effects.bass > 0 ? '+' : ''}{effects.bass}
          </span>
        </div>
        <Slider
          value={[effects.bass]}
          onValueChange={(v) => handleEffectChange('bass', v[0])}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Treble (High Frequencies) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5" />
            Treble
          </Label>
          <span className="text-xs text-muted-foreground">
            {effects.treble > 0 ? '+' : ''}{effects.treble}
          </span>
        </div>
        <Slider
          value={[effects.treble]}
          onValueChange={(v) => handleEffectChange('treble', v[0])}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Reverb */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5" />
            Reverb
          </Label>
          <span className="text-xs text-muted-foreground">{effects.reverb}%</span>
        </div>
        <Slider
          value={[effects.reverb]}
          onValueChange={(v) => handleEffectChange('reverb', v[0])}
          min={0}
          max={100}
          step={1}
        />
        <p className="text-xs text-muted-foreground italic">
          Note: Reverb requires impulse response loading
        </p>
      </div>

      {/* Stereo Pan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <PanelLeft className="h-3.5 w-3.5" />
            Stereo Pan
          </Label>
          <span className="text-xs text-muted-foreground">
            {effects.pan === 0 ? 'Center' : effects.pan < 0 ? `L ${Math.abs(effects.pan)}` : `R ${effects.pan}`}
          </span>
        </div>
        <Slider
          value={[effects.pan]}
          onValueChange={(v) => handleEffectChange('pan', v[0])}
          min={-100}
          max={100}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Left</span>
          <span>Center</span>
          <span>Right</span>
        </div>
      </div>

      {/* Playback Speed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Speed
          </Label>
          <span className="text-xs text-muted-foreground">{effects.speed}x</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {speedOptions.map((speed) => (
            <Button
              key={speed}
              variant={effects.speed === speed ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleEffectChange('speed', speed)}
            >
              {speed}x
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Note: Speed changes video, not external music sources
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs">Quick Presets</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEffectsChange({ ...effects, bass: 30, treble: -10 })}
          >
            Bass Boost
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEffectsChange({ ...effects, bass: -20, treble: 40 })}
          >
            Bright
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEffectsChange({ ...effects, reverb: 50 })}
          >
            Echo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEffectsChange({ ...effects, bass: 20, treble: 20, reverb: 20 })}
          >
            Rich
          </Button>
        </div>
      </div>
    </div>
  );
}
