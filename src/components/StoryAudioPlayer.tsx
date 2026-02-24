import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { detectMusicUrl } from '@/utils/musicUrlDetector';

interface StoryAudioPlayerProps {
  musicUrl: string | null;
  musicTitle?: string | null;
  startAt?: number;
  duration?: number;
  sourceType?: string;
  videoId?: string | null;
  isActive: boolean;
  manualPause?: boolean;
  isMuted?: boolean;
  onError?: (error: string) => void;
  onAudioReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onBuffering?: () => void;
}

export interface StoryAudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  setMuted: (muted: boolean) => void;
}

const StoryAudioPlayer = forwardRef<StoryAudioPlayerRef, StoryAudioPlayerProps>(({
  musicUrl, 
  musicTitle, 
  startAt = 0, 
  duration = 15,
  sourceType,
  videoId,
  isActive,
  manualPause = false,
  isMuted: externalMuted,
  onError,
  onAudioReady,
  onPlay,
  onPause,
  onEnded,
  onBuffering
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(externalMuted || false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync external mute state
  useEffect(() => {
    if (externalMuted !== undefined) {
      setIsMuted(externalMuted);
      if (audioRef.current) {
        audioRef.current.muted = externalMuted;
      }
      if (youtubePlayerRef.current) {
        if (externalMuted) {
          youtubePlayerRef.current.mute();
        } else {
          youtubePlayerRef.current.unMute();
        }
      }
    }
  }, [externalMuted]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(time, true);
      }
    },
    play: () => {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.playVideo();
      }
    },
    pause: () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.pauseVideo();
      }
    },
    setMuted: (muted: boolean) => {
      setIsMuted(muted);
      if (audioRef.current) {
        audioRef.current.muted = muted;
      }
      if (youtubePlayerRef.current) {
        if (muted) {
          youtubePlayerRef.current.mute();
        } else {
          youtubePlayerRef.current.unMute();
        }
      }
    }
  }));

  useEffect(() => {
    if (!musicUrl || !isActive) {
      stopPlayback();
      return;
    }

    const urlInfo = detectMusicUrl(musicUrl);
    console.log('[Audio Player] Music URL detected:', urlInfo);

    if (!urlInfo.isValid) {
      console.error('[Audio Player] Invalid URL:', musicUrl);
      onError?.('music error - Invalid music URL');
      return;
    }

    console.log('[Audio Player] Starting playback for:', urlInfo.type);

    // Initialize YouTube player if needed
    if (urlInfo.type === 'youtube' && urlInfo.videoId) {
      // Load YouTube IFrame API if not loaded
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        
        (window as any).onYouTubeIframeAPIReady = () => {
          initYouTubePlayer(urlInfo.videoId!);
        };
      } else {
        initYouTubePlayer(urlInfo.videoId);
      }
    } else {
      // Start playback based on type with slight delay for sync
      const playbackTimer = setTimeout(() => {
        if (urlInfo.type === 'direct_audio' || urlInfo.type === 'direct_video') {
          playDirectAudio();
        } else if (urlInfo.type === 'soundcloud') {
          console.log('[Audio Player] SoundCloud detected - external playback only');
          setIsPlaying(true);
        } else if (urlInfo.type === 'spotify') {
          console.log('[Audio Player] Spotify detected - external playback only');
          setIsPlaying(true);
        }
      }, 50);

      return () => clearTimeout(playbackTimer);
    }

    return () => {
      stopPlayback();
    };
  }, [musicUrl, isActive]);

  const initYouTubePlayer = (videoId: string) => {
    if (!iframeRef.current) return;

    youtubePlayerRef.current = new (window as any).YT.Player(iframeRef.current, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        start: startAt,
        end: startAt + duration
      },
      events: {
        onReady: (event: any) => {
          console.log('[Audio Player] YouTube player ready');
          event.target.playVideo();
          if (isMuted) {
            event.target.mute();
          }
          setIsPlaying(true);
          onAudioReady?.();
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === (window as any).YT.PlayerState.PLAYING) {
            onPlay?.();
          } else if (state === (window as any).YT.PlayerState.PAUSED) {
            onPause?.();
          } else if (state === (window as any).YT.PlayerState.ENDED) {
            onEnded?.();
          } else if (state === (window as any).YT.PlayerState.BUFFERING) {
            onBuffering?.();
          }
        }
      }
    });
  };

  const playDirectAudio = async () => {
    if (!audioRef.current) return;

    try {
      console.log('[Audio Player] Attempting to play audio from:', startAt, 'for', duration, 'seconds');
      
      // Ensure audio is loaded first
      audioRef.current.currentTime = startAt;
      audioRef.current.volume = isMuted ? 0 : 1.0; // Full volume
      audioRef.current.muted = false; // Explicitly unmute
      
      // Small delay to ensure seek completes
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Audio Player] Audio playing successfully');
            setIsPlaying(true);
            setNeedsUserInteraction(false);
            onAudioReady?.(); // Notify parent that audio has started
            onPlay?.(); // Notify parent that playback started
            
            // Set up listener to stop at endAt
            const endAt = startAt + duration;
            const checkTime = () => {
              if (audioRef.current && audioRef.current.currentTime >= endAt) {
                audioRef.current.pause();
                onEnded?.(); // Notify parent that music ended
                audioRef.current.removeEventListener('timeupdate', checkTime);
              }
            };
            audioRef.current.addEventListener('timeupdate', checkTime);
          })
          .catch((error) => {
            console.error('[Audio Player] Autoplay prevented:', error);
            setNeedsUserInteraction(true);
            setIsPlaying(false);
            onError?.('Tap to play music');
          });
      }
    } catch (error) {
      console.error('[Audio Player] Error playing audio:', error);
      onError?.('Failed to play audio');
    }
  };

  // Handle manual pause/resume from user holding
  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;

    if (manualPause) {
      console.log('[Audio Player] Manual pause triggered');
      audioRef.current.pause();
    } else {
      console.log('[Audio Player] Manual resume triggered');
      audioRef.current.play().catch(console.error);
    }
  }, [manualPause, isPlaying]);

  // Setup audio event listeners for sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log('[Audio Player] Play event');
      onPlay?.();
    };

    const handlePause = () => {
      console.log('[Audio Player] Pause event');
      onPause?.();
    };

    const handleEnded = () => {
      console.log('[Audio Player] Ended event');
      onEnded?.();
    };

    const handleWaiting = () => {
      console.log('[Audio Player] Buffering...');
      onBuffering?.();
    };

    const handleCanPlay = () => {
      console.log('[Audio Player] Can play after buffering');
      if (!audio.paused) {
        onPlay?.();
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [onPlay, onPause, onEnded, onBuffering]);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleUserUnlock = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setNeedsUserInteraction(false);
        setIsPlaying(true);
        onAudioReady?.(); // Notify parent that audio has started
        onPlay?.(); // Notify parent that playback started
      });
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!musicUrl) return null;

  const urlInfo = detectMusicUrl(musicUrl);

  return (
    <div className="relative">
      {/* Direct audio/video playback */}
      {(urlInfo.type === 'direct_audio' || urlInfo.type === 'direct_video') && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop
          playsInline
          preload="auto"
          muted={false}
          className="hidden"
          onError={(e) => {
            console.error('Audio error:', e);
            onError?.('Failed to load audio');
          }}
          onLoadedData={() => console.log('Audio loaded successfully')}
        />
      )}

      {/* YouTube playback */}
      {urlInfo.type === 'youtube' && urlInfo.videoId && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="text-white text-xs mb-1 font-medium truncate">
            {musicTitle || 'Music Playing'}
          </div>
          <div
            ref={iframeRef}
            className="w-full h-16 rounded"
          />
        </div>
      )}

      {/* User interaction fallback */}
      {needsUserInteraction && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50">
          <Button
            onClick={handleUserUnlock}
            variant="secondary"
            className="gap-2"
          >
            <Volume2 className="w-5 h-5" />
            Tap to Enable Sound
          </Button>
        </div>
      )}

      {/* Mute toggle (only for direct audio) */}
      {isPlaying && (urlInfo.type === 'direct_audio' || urlInfo.type === 'direct_video') && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-40 text-white hover:bg-white/20"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      )}
    </div>
  );
});

StoryAudioPlayer.displayName = 'StoryAudioPlayer';

export default StoryAudioPlayer;
