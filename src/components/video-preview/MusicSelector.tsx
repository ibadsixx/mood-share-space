import { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '@/types/videoEditing';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Music, Play, Pause, X, Search } from 'lucide-react';
import { useMusicLibrary } from '@/hooks/useMusicLibrary';

interface MusicSelectorProps {
  music: MusicTrack | null;
  videoDuration: number;
  onMusicChange: (music: MusicTrack | null) => void;
}

export function MusicSelector({ music, videoDuration, onMusicChange }: MusicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { tracks, isLoading } = useMusicLibrary();

  const filteredTracks = tracks?.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectTrack = (track: any) => {
    const newMusic: MusicTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist || 'Unknown',
      url: track.url,
      thumbnailUrl: track.thumbnail_url,
      startTime: 0,
      endTime: Math.min(track.duration || 30, videoDuration),
      volume: 80,
    };
    onMusicChange(newMusic);
    setOpen(false);
    setPlaying(null);
  };

  const handleRemoveMusic = () => {
    onMusicChange(null);
  };

  const handlePlayPreview = (url: string, id: string) => {
    if (playing === id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlaying(id);
      }
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <audio ref={audioRef} className="hidden" />
      
      {music ? (
        <div className="p-3 bg-accent/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{music.title}</p>
                <p className="text-xs text-muted-foreground">{music.artist}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemoveMusic}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">Start: {formatTime(music.startTime)}</Label>
              <Slider
                value={[music.startTime]}
                onValueChange={([v]) => onMusicChange({ ...music, startTime: v })}
                min={0}
                max={Math.max(0, music.endTime - 1)}
                step={0.1}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-20">End: {formatTime(music.endTime)}</Label>
              <Slider
                value={[music.endTime]}
                onValueChange={([v]) => onMusicChange({ ...music, endTime: v })}
                min={music.startTime + 1}
                max={videoDuration}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Music className="h-4 w-4" />
              Add Music
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Add Music</DialogTitle>
            </DialogHeader>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="overflow-y-auto max-h-96 space-y-2">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : filteredTracks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No tracks found</p>
              ) : (
                filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectTrack(track)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(track.url, track.id);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full"
                    >
                      {playing === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist || 'Unknown'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {track.duration ? formatTime(track.duration) : '--:--'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
