// Multi-clip playback engine - Handles sequential clip playback
// Converts global timeline time to clip-local time and vice versa
// Single source of truth for multi-clip timing calculations

import { useCallback, useMemo } from 'react';
import { VideoLayer } from '@/types/editor';

export interface ClipTimeInfo {
  clipIndex: number;
  clip: VideoLayer | null;
  localTime: number;  // Time within the current clip (video.currentTime)
  globalTime: number; // Time on the global timeline
}

export interface MultiClipPlaybackEngine {
  sortedClips: VideoLayer[];
  totalDuration: number;
  globalTimeToClipTime: (globalTime: number) => ClipTimeInfo;
  clipTimeToGlobalTime: (clipIndex: number, localTime: number) => number;
  getNextClip: (currentIndex: number) => { index: number; clip: VideoLayer } | null;
  getClipAtIndex: (index: number) => VideoLayer | null;
  computeClipStarts: () => VideoLayer[];
}

export function useMultiClipPlayback(videoLayers: VideoLayer[]): MultiClipPlaybackEngine {
  // Sort clips by start time
  const sortedClips = useMemo(() => {
    const sorted = [...videoLayers].sort((a, b) => a.start - b.start);
    if (sorted.length > 0) {
      console.log('[MultiClip] ======= CLIPS =======');
      sorted.forEach((c, i) => {
        console.log(`[MultiClip] Clip ${i}: "${c.fileName}" | ${c.start.toFixed(2)}s - ${c.end.toFixed(2)}s (duration: ${c.duration?.toFixed(2)}s)`);
      });
      console.log('[MultiClip] ======================');
    }
    return sorted;
  }, [videoLayers]);

  // Calculate total duration from all clips (max end time)
  const totalDuration = useMemo(() => {
    if (sortedClips.length === 0) return 0;
    const maxEnd = Math.max(...sortedClips.map(c => c.end));
    console.log('[MultiClip] Total duration:', maxEnd.toFixed(2), 's across', sortedClips.length, 'clips');
    return maxEnd;
  }, [sortedClips]);

  // Compute clip.start values based on sequential playback
  // This ensures clips are positioned correctly on the timeline
  const computeClipStarts = useCallback((): VideoLayer[] => {
    let cumulativeTime = 0;
    return sortedClips.map(clip => {
      const updatedClip = {
        ...clip,
        start: cumulativeTime,
        end: cumulativeTime + clip.duration,
      };
      cumulativeTime += clip.duration;
      return updatedClip;
    });
  }, [sortedClips]);

  // Convert global time to clip index and local time within that clip
  const globalTimeToClipTime = useCallback((globalTime: number): ClipTimeInfo => {
    if (sortedClips.length === 0) {
      return { clipIndex: -1, clip: null, localTime: 0, globalTime };
    }

    // Clamp global time
    const clampedTime = Math.max(0, Math.min(globalTime, totalDuration));

    // Find which clip contains this global time
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      // Check if time is within this clip's range
      if (clampedTime >= clip.start && clampedTime < clip.end) {
        // Calculate local time within the video file
        const localTime = clampedTime - clip.start;
        
        return {
          clipIndex: i,
          clip,
          localTime,
          globalTime: clampedTime,
        };
      }
    }

    // If time is at or past the end of the last clip
    const lastClip = sortedClips[sortedClips.length - 1];
    if (clampedTime >= lastClip.end) {
      const localTime = lastClip.end - lastClip.start;
      return {
        clipIndex: sortedClips.length - 1,
        clip: lastClip,
        localTime,
        globalTime: clampedTime,
      };
    }

    // If time is before first clip
    const firstClip = sortedClips[0];
    if (clampedTime < firstClip.start) {
      return {
        clipIndex: 0,
        clip: firstClip,
        localTime: 0,
        globalTime: firstClip.start,
      };
    }

    // Time is in a gap between clips - jump to next clip
    for (let i = 0; i < sortedClips.length - 1; i++) {
      const currentClip = sortedClips[i];
      const nextClip = sortedClips[i + 1];
      if (clampedTime >= currentClip.end && clampedTime < nextClip.start) {
        return {
          clipIndex: i + 1,
          clip: nextClip,
          localTime: 0,
          globalTime: nextClip.start,
        };
      }
    }

    // Fallback to first clip
    return { clipIndex: 0, clip: sortedClips[0], localTime: 0, globalTime: 0 };
  }, [sortedClips, totalDuration]);

  // Convert clip index and local time to global time
  const clipTimeToGlobalTime = useCallback((clipIndex: number, localTime: number): number => {
    if (clipIndex < 0 || clipIndex >= sortedClips.length) {
      return 0;
    }
    const clip = sortedClips[clipIndex];
    const globalTime = clip.start + localTime;
    return Math.min(globalTime, totalDuration);
  }, [sortedClips, totalDuration]);

  // Get the next clip after a given index
  const getNextClip = useCallback((currentIndex: number): { index: number; clip: VideoLayer } | null => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= sortedClips.length) {
      console.log('[MultiClip] 🔚 No more clips after index', currentIndex);
      return null; // No more clips
    }
    const nextClip = sortedClips[nextIndex];
    console.log(`[MultiClip] ▶️ Next clip: ${nextIndex} ("${nextClip.fileName}") starts at ${nextClip.start.toFixed(2)}s`);
    return { index: nextIndex, clip: nextClip };
  }, [sortedClips]);

  // Get clip at specific index
  const getClipAtIndex = useCallback((index: number): VideoLayer | null => {
    if (index < 0 || index >= sortedClips.length) {
      return null;
    }
    return sortedClips[index];
  }, [sortedClips]);

  return {
    sortedClips,
    totalDuration,
    globalTimeToClipTime,
    clipTimeToGlobalTime,
    getNextClip,
    getClipAtIndex,
    computeClipStarts,
  };
}
