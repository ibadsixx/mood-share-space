// VideoTimelineEngine - Core timeline state management
// Instagram/TikTok-style video editor timeline engine

import { useState, useCallback, useRef, useEffect } from 'react';
import { VideoLayer, AudioTrack, EmojiLayer, TextLayer, ImageLayer } from '@/types/editor';

export interface TimelineClip {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'emoji';
  start: number;
  end: number;
  trimmedStart: number; // In-point within media
  trimmedEnd: number;   // Out-point within media
  url?: string;
  content?: string;
  [key: string]: any;
}

export interface TimelineState {
  duration: number;
  zoomLevel: number; // 1-20, maps to pixels per second
  currentTime: number;
  isScrubbing: boolean;
  isPlaying: boolean;
  clipStart: number; // Trimmed playback start
  clipEnd: number;   // Trimmed playback end
  videoClips: TimelineClip[];
  audioClips: TimelineClip[];
  overlayClips: TimelineClip[];
}

export interface TimelineEngineCallbacks {
  onSeek: (time: number) => void;
  onTrim: (clipId: string, start: number, end: number) => void;
  onZoom: (level: number) => void;
  onLayerMove: (clipId: string, newStart: number) => void;
  onResizeClip: (clipId: string, handle: 'start' | 'end', delta: number) => void;
  onAddClip: (clip: Partial<TimelineClip>) => void;
  onDeleteClip: (clipId: string) => void;
  onPlayPause: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 20;
const BASE_PIXELS_PER_SECOND = 10;

export function useVideoTimelineEngine(
  videoRef: React.RefObject<HTMLVideoElement>,
  initialDuration: number = 30
) {
  // Core state
  const [state, setState] = useState<TimelineState>({
    duration: initialDuration,
    zoomLevel: 5, // Default zoom level
    currentTime: 0,
    isScrubbing: false,
    isPlaying: false,
    clipStart: 0,
    clipEnd: initialDuration,
    videoClips: [],
    audioClips: [],
    overlayClips: [],
  });

  // Refs for animation
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Computed values
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * state.zoomLevel;
  const timelineWidth = state.duration * pixelsPerSecond;

  // Sync video element with timeline state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (state.isScrubbing) return;
      
      const now = performance.now();
      if (now - lastUpdateRef.current < 16) return; // Throttle to ~60fps
      lastUpdateRef.current = now;

      setState(prev => {
        // Loop within trimmed region
        if (video.currentTime >= prev.clipEnd) {
          video.currentTime = prev.clipStart;
          return { ...prev, currentTime: prev.clipStart };
        }
        return { ...prev, currentTime: video.currentTime };
      });
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleLoadedMetadata = () => {
      const duration = video.duration || 30;
      setState(prev => ({
        ...prev,
        duration,
        clipEnd: prev.clipEnd === prev.duration ? duration : prev.clipEnd,
      }));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, state.isScrubbing, state.clipEnd, state.clipStart]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(state.duration, time));
    
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
    
    setState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [videoRef, state.duration]);

  // Start scrubbing
  const startScrub = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setState(prev => ({ ...prev, isScrubbing: true }));
  }, [videoRef]);

  // Update during scrub
  const updateScrub = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(state.duration, time));
    
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
    
    setState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [videoRef, state.duration]);

  // End scrubbing
  const endScrub = useCallback(() => {
    setState(prev => ({ ...prev, isScrubbing: false }));
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoomLevel: Math.min(MAX_ZOOM, prev.zoomLevel + 1),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoomLevel: Math.max(MIN_ZOOM, prev.zoomLevel - 1),
    }));
  }, []);

  const setZoom = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      zoomLevel: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level)),
    }));
  }, []);

  // Trim controls
  const setTrimStart = useCallback((start: number) => {
    setState(prev => ({
      ...prev,
      clipStart: Math.max(0, Math.min(start, prev.clipEnd - 0.5)),
    }));
  }, []);

  const setTrimEnd = useCallback((end: number) => {
    setState(prev => ({
      ...prev,
      clipEnd: Math.max(prev.clipStart + 0.5, Math.min(end, prev.duration)),
    }));
  }, []);

  // Play/Pause toggle
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // Start from clipStart if at clipEnd
      if (video.currentTime >= state.clipEnd) {
        video.currentTime = state.clipStart;
      }
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [videoRef, state.clipStart, state.clipEnd]);

  // Update duration
  const setDuration = useCallback((duration: number) => {
    setState(prev => ({
      ...prev,
      duration,
      clipEnd: Math.min(prev.clipEnd, duration),
    }));
  }, []);

  // Convert time to pixel position
  const timeToPixels = useCallback((time: number) => {
    return time * pixelsPerSecond;
  }, [pixelsPerSecond]);

  // Convert pixel position to time
  const pixelsToTime = useCallback((pixels: number) => {
    return pixels / pixelsPerSecond;
  }, [pixelsPerSecond]);

  return {
    state,
    setState,
    pixelsPerSecond,
    timelineWidth,
    
    // Playback controls
    seek,
    togglePlayPause,
    
    // Scrubbing
    startScrub,
    updateScrub,
    endScrub,
    
    // Zoom
    zoomIn,
    zoomOut,
    setZoom,
    
    // Trim
    setTrimStart,
    setTrimEnd,
    
    // Utilities
    setDuration,
    timeToPixels,
    pixelsToTime,
  };
}

export type VideoTimelineEngine = ReturnType<typeof useVideoTimelineEngine>;
