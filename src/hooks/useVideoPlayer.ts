// React hook for centralized video player
// Wraps the VideoPlayer class for React component usage

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoPlayer, PlayerState, PlayerEvent } from '@/lib/player';
import { VideoLayer } from '@/types/editor';

interface UseVideoPlayerOptions {
  clips: VideoLayer[];
  autoPlay?: boolean;
}

interface UseVideoPlayerReturn {
  player: VideoPlayer;
  state: PlayerState;
  isPlaying: boolean;
  globalTime: number;
  currentClipIndex: number;
  totalDuration: number;
  isLoading: boolean;
  
  // Methods
  init: (videoElement: HTMLVideoElement) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => Promise<void>;
  
  // Video element ref setter
  setVideoRef: (el: HTMLVideoElement | null) => void;
}

export function useVideoPlayer({ clips, autoPlay = true }: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const playerRef = useRef<VideoPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [state, setState] = useState<PlayerState>({
    isPlaying: autoPlay,
    globalTime: 0,
    currentClipIndex: 0,
    totalDuration: 0,
    isLoading: true,
    isScrubbing: false,
    error: null,
  });

  // Create player instance on mount
  useEffect(() => {
    if (!playerRef.current) {
      playerRef.current = new VideoPlayer();
      console.log('[useVideoPlayer] Created new player instance');
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        console.log('[useVideoPlayer] Destroyed player instance');
      }
    };
  }, []);

  // Update clips when they change
  useEffect(() => {
    if (playerRef.current && clips.length > 0) {
      playerRef.current.setClips(clips);
      
      // Re-init with video element if available
      if (videoRef.current) {
        playerRef.current.init(videoRef.current, clips);
      }
    }
  }, [clips]);

  // Subscribe to player events
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleTimeUpdate = (data: { time: number }) => {
      setState(prev => ({ ...prev, globalTime: data.time }));
    };

    const handleStateChange = (newState: PlayerState) => {
      setState(newState);
    };

    const handleClipLoaded = (data: { index: number }) => {
      console.log('[useVideoPlayer] Clip loaded:', data.index);
    };

    const handleClipEnded = (data: { index: number }) => {
      console.log('[useVideoPlayer] Clip ended:', data.index);
    };

    player.on('timeupdate', handleTimeUpdate);
    player.on('statechange', handleStateChange);
    player.on('cliploaded', handleClipLoaded);
    player.on('clipchange', handleClipEnded);

    return () => {
      player.off('timeupdate', handleTimeUpdate);
      player.off('statechange', handleStateChange);
      player.off('cliploaded', handleClipLoaded);
      player.off('clipchange', handleClipEnded);
    };
  }, []);

  // Initialize player with video element
  const init = useCallback((videoElement: HTMLVideoElement) => {
    if (!playerRef.current) return;
    
    videoRef.current = videoElement;
    playerRef.current.init(videoElement, clips);
    
    if (autoPlay) {
      playerRef.current.play();
    }
  }, [clips, autoPlay]);

  // Set video element ref
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && el !== videoRef.current) {
      videoRef.current = el;
      if (playerRef.current && clips.length > 0) {
        playerRef.current.init(el, clips);
        if (autoPlay) {
          playerRef.current.play();
        }
      }
    }
  }, [clips, autoPlay]);

  // Playback controls
  const play = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [state.isPlaying]);

  const seekTo = useCallback(async (time: number) => {
    await playerRef.current?.seekGlobalTime(time);
  }, []);

  return {
    player: playerRef.current!,
    state,
    isPlaying: state.isPlaying,
    globalTime: state.globalTime,
    currentClipIndex: state.currentClipIndex,
    totalDuration: state.totalDuration,
    isLoading: state.isLoading,
    
    init,
    play,
    pause,
    togglePlayPause,
    seekTo,
    setVideoRef,
  };
}
