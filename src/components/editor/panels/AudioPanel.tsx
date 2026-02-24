import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Volume2, VolumeX, Plus, Trash2, ExternalLink, Mic, Waves, Link } from 'lucide-react';
import { AudioTrack, defaultAudioEffects } from '@/types/editor';
import { detectMusicUrl } from '@/utils/musicUrlDetector';
import { AudioRecorder } from '@/components/editor/audio/AudioRecorder';
import { AudioEffectsPanel } from '@/components/editor/audio/AudioEffectsPanel';

interface AudioPanelProps {
  audioTrack: AudioTrack | null;
  onAudioChange: (audio: AudioTrack | null) => void;
  maxDuration: number;
}

export function AudioPanel({ audioTrack, onAudioChange, maxDuration }: AudioPanelProps) {
  const [musicUrl, setMusicUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('url');
  const [showEffects, setShowEffects] = useState(false);

  const handleAddMusic = async () => {
    if (!musicUrl.trim()) return;
    
    setIsAdding(true);
    try {
      const urlInfo = detectMusicUrl(musicUrl);
      
      if (!urlInfo.isValid) {
        console.error('[AUDIO] Invalid music URL:', musicUrl);
        return;
      }
      
      // Extract filename from URL for title
      const urlPath = new URL(musicUrl).pathname;
      const fileName = urlPath.split('/').pop() || 'Audio Track';
      const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      
      const newTrack: AudioTrack = {
        id: `audio-${Date.now()}`,
        type: 'audio',
        url: musicUrl,
        sourceType: urlInfo.type === 'direct_audio' || urlInfo.type === 'direct_video' ? 'direct' : urlInfo.type as any,
        videoId: urlInfo.videoId,
        title: title || 'Music Track',
        artist: 'Added via URL',
        startAt: 0,
        endAt: Math.min(maxDuration, 30),
        duration: maxDuration,
        volume: 80,
        muted: false,
        effects: defaultAudioEffects,
      };
      
      console.log('[AUDIO] Added track via URL:', newTrack.id, 'url=', musicUrl);
      onAudioChange(newTrack);
      setMusicUrl('');
    } catch (error) {
      console.error('[AUDIO] Failed to add music:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRecordingComplete = (recording: { id: string; url: string; duration: number; title: string }) => {
    const newTrack: AudioTrack = {
      id: recording.id,
      type: 'audio',
      url: recording.url,
      sourceType: 'recorded',
      title: recording.title,
      startAt: 0,
      endAt: Math.min(recording.duration, maxDuration),
      duration: recording.duration,
      volume: 80,
      muted: false,
      effects: defaultAudioEffects,
    };
    
    console.log('[AUDIO] Recording added:', recording.id);
    onAudioChange(newTrack);
    setActiveTab('url');
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioTrack) {
      console.log('[AUDIO] Volume changed:', value[0], 'id=', audioTrack.id);
      onAudioChange({ ...audioTrack, volume: value[0] });
    }
  };

  const handleStartChange = (value: number[]) => {
    if (audioTrack) {
      const newStart = value[0];
      const newEnd = Math.max(newStart + 1, audioTrack.endAt);
      console.log('[AUDIO] Start time changed:', newStart, 'id=', audioTrack.id);
      onAudioChange({ ...audioTrack, startAt: newStart, endAt: Math.min(newEnd, maxDuration) });
    }
  };

  const handleEndChange = (value: number[]) => {
    if (audioTrack) {
      const newEnd = value[0];
      const newStart = Math.min(audioTrack.startAt, newEnd - 1);
      console.log('[AUDIO] End time changed:', newEnd, 'id=', audioTrack.id);
      onAudioChange({ ...audioTrack, startAt: Math.max(0, newStart), endAt: newEnd });
    }
  };

  const handleMuteToggle = () => {
    if (audioTrack) {
      console.log('[AUDIO] Mute toggled:', !audioTrack.muted, 'id=', audioTrack.id);
      onAudioChange({ ...audioTrack, muted: !audioTrack.muted });
    }
  };

  const handleRemove = () => {
    if (audioTrack) {
      console.log('[AUDIO] Removed track id=', audioTrack.id);
    }
    onAudioChange(null);
  };

  const handleEffectsChange = (effects: Partial<typeof defaultAudioEffects>) => {
    if (audioTrack) {
      const updatedEffects = { ...(audioTrack.effects || defaultAudioEffects), ...effects };
      console.log('[AUDIO] Effects changed:', effects, 'id=', audioTrack.id);
      onAudioChange({ ...audioTrack, effects: updatedEffects });
    }
  };

  if (showEffects && audioTrack) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowEffects(false)}
          className="mb-2"
        >
          ← Back to Audio
        </Button>
        <AudioEffectsPanel
          effects={audioTrack.effects || defaultAudioEffects}
          onEffectsChange={handleEffectsChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="h-4 w-4" />
        <span className="font-medium text-sm">Audio</span>
      </div>

      {!audioTrack ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="text-xs gap-1">
              <Link className="h-3 w-3" />
              URL
            </TabsTrigger>
            <TabsTrigger value="record" className="text-xs gap-1">
              <Mic className="h-3 w-3" />
              Record
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Paste a direct audio URL (mp3, wav, ogg, etc.)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/audio.mp3"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleAddMusic}
                  disabled={!musicUrl.trim() || isAdding}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Supported formats:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>MP3 (.mp3)</li>
                <li>WAV (.wav)</li>
                <li>OGG (.ogg)</li>
                <li>AAC (.aac)</li>
              </ul>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
              <p className="text-xs text-muted-foreground text-center">
                No audio tracks yet. Add audio via URL above.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="record" className="mt-3">
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onClose={() => setActiveTab('url')}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {/* Track Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{audioTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{audioTrack.artist}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{audioTrack.sourceType}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRemove}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Effects Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowEffects(true)}
          >
            <Waves className="h-4 w-4 mr-2" />
            Audio Effects
          </Button>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Volume</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleMuteToggle}
              >
                {audioTrack.muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Slider
              value={[audioTrack.muted ? 0 : audioTrack.volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              disabled={audioTrack.muted}
            />
            <span className="text-xs text-muted-foreground">{audioTrack.volume}%</span>
          </div>

          {/* Trim Controls */}
          <div className="space-y-3">
            <Label className="text-xs">Trim Audio</Label>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Start: {audioTrack.startAt.toFixed(1)}s</span>
              </div>
              <Slider
                value={[audioTrack.startAt]}
                onValueChange={handleStartChange}
                max={maxDuration - 1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>End: {audioTrack.endAt.toFixed(1)}s</span>
              </div>
              <Slider
                value={[audioTrack.endAt]}
                onValueChange={handleEndChange}
                min={1}
                max={maxDuration}
                step={0.1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
