// Centralized Playback Sequencer for Multi-Clip Video Editor
// Single source of truth for all playback operations
// No blob URLs stored - uses permanent Supabase storage URLs only

import { VideoLayer } from '@/types/editor';

export type PlayerEvent = 'timeupdate' | 'clipchange' | 'cliploaded' | 'error' | 'statechange' | 'durationchange' | 'ready' | 'play' | 'pause' | 'ended';

export interface PlayerState {
  isPlaying: boolean;
  globalTime: number;
  currentClipIndex: number;
  totalDuration: number;
  isLoading: boolean;
  isScrubbing: boolean;
  error: string | null;
}

type EventHandler = (data?: any) => void;

export class VideoPlayer {
  private videoElement: HTMLVideoElement | null = null;
  private clips: VideoLayer[] = [];
  private currentClipIndex = 0;
  private globalTime = 0;
  private isPlaying = false;
  private isLoading = false;
  private isScrubbing = false;
  private animationFrameId: number | null = null;
  private eventListeners: Map<PlayerEvent, Set<EventHandler>> = new Map();
  private lastTimeUpdate = 0;
  private pendingSeek: number | null = null;
  private wasPlayingBeforeScrub = false;
  private preloadedClips: Map<number, HTMLVideoElement> = new Map();
  private preloadQueue: number[] = [];
  private isDestroyed = false;
  private isTransitioning = false;
  private clipBoundaries: { start: number; end: number; duration: number }[] = [];

  private boundHandlers = {
    canplaythrough: null as (() => void) | null,
    ended: null as (() => void) | null,
    error: null as (() => void) | null,
    waiting: null as (() => void) | null,
    stalled: null as (() => void) | null,
    play: null as (() => void) | null,
    pause: null as (() => void) | null,
    timeupdate: null as (() => void) | null,
  };

  constructor() {
    const events: PlayerEvent[] = ['timeupdate', 'clipchange', 'cliploaded', 'error', 'statechange', 'durationchange', 'ready', 'play', 'pause', 'ended'];
    events.forEach(event => this.eventListeners.set(event, new Set()));
    console.log('[PLAYER] ✅ Created new VideoPlayer instance');
  }

  init(videoElement: HTMLVideoElement, clips: VideoLayer[]): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] init: ${clips.length} clips`);
    
    if (this.videoElement && this.videoElement !== videoElement) {
      this.detachVideoListeners();
    }
    
    this.videoElement = videoElement;
    videoElement.loop = false;
    
    this.setClips(clips);
    this.attachVideoListeners();
    
    if (this.clips.length > 0) {
      console.log(`[PLAYER] [${timestamp}] init: totalDuration=${this.getTotalDuration().toFixed(2)}s`);
      this.loadClip(0);
      this.emit('ready', { clips: this.clips.length, duration: this.getTotalDuration() });
    }
  }

  setClips(clips: VideoLayer[]): void {
    this.clips = this.computeClipBoundaries([...clips]);
    
    if (this.clips.length > 0) {
      console.log('[PLAYER] ======= CLIPS =======');
      this.clips.forEach((c, i) => {
        console.log(`[PLAYER] Clip ${i}: "${c.fileName}" | ${c.start.toFixed(2)}s - ${c.end.toFixed(2)}s (dur: ${(c.end - c.start).toFixed(2)}s)`);
      });
      console.log(`[PLAYER] totalDuration=${this.getTotalDuration().toFixed(2)}s`);
      console.log('[PLAYER] ====================');
    }
    
    this.emit('durationchange', { duration: this.getTotalDuration() });
  }

  private computeClipBoundaries(clips: VideoLayer[]): VideoLayer[] {
    clips.sort((a, b) => a.start - b.start);
    
    let cumulativeTime = 0;
    this.clipBoundaries = [];
    
    return clips.map(clip => {
      const duration = clip.duration || (clip.end - clip.start) || 5;
      const boundary = {
        start: cumulativeTime,
        end: cumulativeTime + duration,
        duration,
      };
      this.clipBoundaries.push(boundary);
      
      const updatedClip = {
        ...clip,
        start: cumulativeTime,
        end: cumulativeTime + duration,
        duration,
      };
      cumulativeTime += duration;
      return updatedClip;
    });
  }

  getTotalDuration(): number {
    if (this.clips.length === 0) return 0;
    return Math.max(...this.clips.map(c => c.end));
  }

  getGlobalCurrentTime(): number {
    return this.globalTime;
  }

  getCurrentClipIndex(): number {
    return this.currentClipIndex;
  }

  getClips(): VideoLayer[] {
    return this.clips;
  }

  private async validateUrl(url: string): Promise<{ valid: boolean; error?: string; status?: number }> {
    try {
      console.log(`[PLAYER] HEAD check: ${url.slice(0, 80)}...`);
      const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
      
      const contentType = response.headers.get('content-type') || '';
      const isVideo = contentType.startsWith('video/');
      
      console.log(`[PLAYER] HEAD response: ${response.status} ${response.statusText}, Content-Type: ${contentType}`);
      
      if (!response.ok) {
        console.warn(`[PLAYER] HEAD check failed: ${response.status}`);
        return { valid: false, error: `HTTP ${response.status}`, status: response.status };
      }

      if (!isVideo) {
        console.warn(`[PLAYER] Not video content-type: ${contentType}`);
      }

      return { valid: true, status: response.status };
    } catch (error) {
      console.warn('[PLAYER] HEAD check error (likely CORS):', error);
      return { valid: true };
    }
  }

  private async fetchAsBlobFallback(url: string): Promise<string | null> {
    try {
      console.log('[PLAYER] ⚠️ FALLBACK: Fetching as blob...');
      const response = await fetch(url, { mode: 'cors' });
      
      if (!response.ok) {
        console.error(`[PLAYER] Blob fetch failed: ${response.status}`);
        return null;
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      console.log('[PLAYER] ⚠️ FALLBACK: Created temporary blob URL (will not persist)');
      return blobUrl;
    } catch (error) {
      console.error('[PLAYER] Blob fallback failed:', error);
      return null;
    }
  }

  async loadClip(index: number, seekToLocalTime: number = 0): Promise<void> {
    const timestamp = new Date().toISOString().slice(11, 23);
    const clip = this.clips[index];
    if (!clip) {
      console.warn(`[PLAYER] [${timestamp}] No clip at index ${index}`);
      return;
    }

    const video = this.videoElement;
    if (!video) {
      console.error(`[PLAYER] [${timestamp}] No video element`);
      return;
    }

    console.log(`[PLAYER] [${timestamp}] ▶ loadClip(${index})`);
    console.log(`[PLAYER] [${timestamp}]   Clip: "${clip.fileName}"`);
    console.log(`[PLAYER] [${timestamp}]   Range: ${clip.start.toFixed(2)}s - ${clip.end.toFixed(2)}s`);
    console.log(`[PLAYER] [${timestamp}]   SeekTo: ${seekToLocalTime.toFixed(2)}s`);
    console.log(`[PLAYER] [${timestamp}]   URL: ${clip.src?.slice(0, 60)}...`);

    this.isLoading = true;
    this.pendingSeek = seekToLocalTime;
    
    const previousIndex = this.currentClipIndex;
    this.currentClipIndex = index;
    
    this.emit('statechange', this.getState());

    const validation = await this.validateUrl(clip.src);
    
    let srcToUse = clip.src;
    if (!validation.valid && validation.status && validation.status >= 400) {
      console.log(`[PLAYER] [${timestamp}] ⚠️ HEAD FAILED → attempting blob fallback`);
      const blobUrl = await this.fetchAsBlobFallback(clip.src);
      if (blobUrl) {
        srcToUse = blobUrl;
        console.log(`[PLAYER] [${timestamp}] ✅ Blob fallback succeeded`);
      } else {
        this.emit('error', { message: `Failed to load clip: ${validation.error}` });
        this.isLoading = false;
        return;
      }
    } else {
      console.log(`[PLAYER] [${timestamp}] ✅ HEAD OK`);
    }

    const currentSrcBase = video.src?.split('?')[0] || '';
    const newSrcBase = srcToUse?.split('?')[0] || '';
    const isSameSource = currentSrcBase === newSrcBase && currentSrcBase !== '';

    if (!isSameSource) {
      console.log(`[PLAYER] [${timestamp}] Setting video.src`);
      video.src = srcToUse;
      video.load();
    } else {
      console.log(`[PLAYER] [${timestamp}] Same src, seeking to: ${seekToLocalTime.toFixed(2)}s`);
      video.currentTime = seekToLocalTime;
      this.isLoading = false;
      this.pendingSeek = null;
      this.emit('cliploaded', { index, clip });
      
      if (this.isPlaying && !this.isScrubbing) {
        this.playVideoElement();
      }
    }

    if (previousIndex !== index) {
      console.log(`[PLAYER] [${timestamp}] 🔄 clipchange ${previousIndex} → ${index}`);
      this.emit('clipchange', { index, clip, previousIndex });
    }

    this.preloadClips(index);
  }

  private playVideoElement(): void {
    if (!this.videoElement) return;
    
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] 🎬 playVideoElement()`);
    
    this.videoElement.play().then(() => {
      console.log(`[PLAYER] [${timestamp}] ✅ Video playing`);
      this.startTimeUpdateLoop();
    }).catch(err => {
      console.error(`[PLAYER] [${timestamp}] ❌ Play failed:`, err);
      if (err.name === 'NotAllowedError') {
        console.log(`[PLAYER] [${timestamp}] Autoplay blocked - waiting for user interaction`);
        this.isPlaying = false;
        this.emit('statechange', this.getState());
      } else {
        this.emit('error', { message: err.message });
      }
    });
  }

  async playClip(index: number): Promise<void> {
    console.log(`[PLAYER] playClip(${index})`);
    this.isPlaying = true;
    await this.loadClip(index, 0);
  }

  private preloadClips(currentIndex: number): void {
    if (this.isDestroyed) return;
    
    const timestamp = new Date().toISOString().slice(11, 23);
    
    this.preloadQueue = [];
    
    if (currentIndex + 1 < this.clips.length) {
      this.preloadQueue.push(currentIndex + 1);
    }
    if (currentIndex - 1 >= 0) {
      this.preloadQueue.push(currentIndex - 1);
    }
    if (currentIndex + 2 < this.clips.length) {
      this.preloadQueue.push(currentIndex + 2);
    }
    
    this.preloadQueue.forEach(idx => {
      if (this.preloadedClips.has(idx)) return;
      
      const clip = this.clips[idx];
      if (!clip?.src) return;

      console.log(`[PLAYER] [${timestamp}] 📥 Preloading clip ${idx}: ${clip.fileName}`);
      
      const preloader = document.createElement('video');
      preloader.preload = 'auto';
      preloader.muted = true;
      preloader.playsInline = true;
      
      this.validateUrl(clip.src).then(validation => {
        if (this.isDestroyed) {
          preloader.src = '';
          return;
        }
        
        if (validation.valid) {
          preloader.src = clip.src;
          preloader.load();
          
          preloader.addEventListener('canplaythrough', () => {
            console.log(`[PLAYER] [${new Date().toISOString().slice(11, 23)}] ✅ Preloaded clip ${idx}`);
          }, { once: true });
          
          preloader.addEventListener('error', () => {
            console.warn(`[PLAYER] Preload failed for clip ${idx}`);
            this.preloadedClips.delete(idx);
          }, { once: true });
          
          this.preloadedClips.set(idx, preloader);
        }
      });
    });
  }
  
  private cleanupPreloadedClips(): void {
    this.preloadedClips.forEach((video, idx) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      console.log(`[PLAYER] 🧹 Cleaned up preloaded clip ${idx}`);
    });
    this.preloadedClips.clear();
    this.preloadQueue = [];
  }

  play(): void {
    if (!this.videoElement) return;
    
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] ▶ play()`);
    this.isPlaying = true;
    this.isScrubbing = false;
    
    this.playVideoElement();
    
    this.emit('play', { time: this.globalTime, clipIndex: this.currentClipIndex });
    this.emit('statechange', this.getState());
  }

  pause(): void {
    if (!this.videoElement) return;
    
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] ⏸ pause()`);
    this.isPlaying = false;
    this.videoElement.pause();
    
    this.stopTimeUpdateLoop();
    this.emit('pause', { time: this.globalTime, clipIndex: this.currentClipIndex });
    this.emit('statechange', this.getState());
  }

  startScrub(): void {
    console.log('[PLAYER] startScrub()');
    this.wasPlayingBeforeScrub = this.isPlaying;
    this.isScrubbing = true;
    
    if (this.videoElement) {
      this.videoElement.pause();
    }
    
    this.stopTimeUpdateLoop();
    this.emit('statechange', this.getState());
  }

  endScrub(): void {
    console.log('[PLAYER] endScrub()');
    this.isScrubbing = false;
    
    if (this.wasPlayingBeforeScrub && this.videoElement) {
      this.play();
    }
    
    this.emit('statechange', this.getState());
  }

  async seekGlobalTime(time: number): Promise<void> {
    const timestamp = new Date().toISOString().slice(11, 23);
    const clampedTime = Math.max(0, Math.min(time, this.getTotalDuration()));
    console.log(`[PLAYER] [${timestamp}] 🎯 seekGlobalTime(${clampedTime.toFixed(2)})`);
    
    const clipInfo = this.globalTimeToClipTime(clampedTime);
    
    if (!clipInfo.clip) {
      console.warn(`[PLAYER] [${timestamp}] No clip found for time: ${clampedTime}`);
      return;
    }

    this.globalTime = clampedTime;
    console.log(`[PLAYER] [${timestamp}]   Target clip: ${clipInfo.clipIndex}, local: ${clipInfo.localTime.toFixed(2)}s`);

    if (clipInfo.clipIndex !== this.currentClipIndex) {
      console.log(`[PLAYER] [${timestamp}]   Switching to clip ${clipInfo.clipIndex}: ${clipInfo.clip.fileName}`);
      await this.loadClip(clipInfo.clipIndex, clipInfo.localTime);
    } else if (this.videoElement) {
      console.log(`[PLAYER] [${timestamp}]   Seeking within clip to: ${clipInfo.localTime.toFixed(2)}s`);
      this.videoElement.currentTime = clipInfo.localTime;
    }

    this.emit('timeupdate', { time: this.globalTime, clipIndex: this.currentClipIndex });
  }

  globalTimeToClipTime(globalTime: number): { clipIndex: number; clip: VideoLayer | null; localTime: number } {
    if (this.clips.length === 0) {
      return { clipIndex: -1, clip: null, localTime: 0 };
    }

    const clampedTime = Math.max(0, Math.min(globalTime, this.getTotalDuration()));

    for (let i = 0; i < this.clips.length; i++) {
      const clip = this.clips[i];
      if (clampedTime >= clip.start && clampedTime < clip.end) {
        const localTime = clampedTime - clip.start;
        return { clipIndex: i, clip, localTime };
      }
    }

    const lastClip = this.clips[this.clips.length - 1];
    if (clampedTime >= lastClip.end) {
      return { 
        clipIndex: this.clips.length - 1, 
        clip: lastClip, 
        localTime: lastClip.end - lastClip.start 
      };
    }

    return { clipIndex: 0, clip: this.clips[0], localTime: 0 };
  }

  clipTimeToGlobalTime(clipIndex: number, localTime: number): number {
    if (clipIndex < 0 || clipIndex >= this.clips.length) return 0;
    const clip = this.clips[clipIndex];
    return clip.start + localTime;
  }

  on(event: PlayerEvent, handler: EventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  off(event: PlayerEvent, handler: EventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: PlayerEvent, data?: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[PLAYER] Error in ${event} handler:`, err);
        }
      });
    }
  }

  getState(): PlayerState {
    return {
      isPlaying: this.isPlaying,
      globalTime: this.globalTime,
      currentClipIndex: this.currentClipIndex,
      totalDuration: this.getTotalDuration(),
      isLoading: this.isLoading,
      isScrubbing: this.isScrubbing,
      error: null,
    };
  }

  destroy(): void {
    console.log('[PLAYER] 🧹 destroy() - Full cleanup starting...');
    
    this.isDestroyed = true;
    
    this.stopTimeUpdateLoop();
    this.detachVideoListeners();
    this.cleanupPreloadedClips();
    
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = null;
    }
    
    this.eventListeners.forEach(handlers => handlers.clear());
    
    this.clips = [];
    this.clipBoundaries = [];
    this.currentClipIndex = 0;
    this.globalTime = 0;
    this.isPlaying = false;
    this.isLoading = false;
    this.isScrubbing = false;
    this.pendingSeek = null;
    this.isTransitioning = false;
    
    console.log('[PLAYER] 🧹 destroy() - Complete');
  }

  private attachVideoListeners(): void {
    const video = this.videoElement;
    if (!video) return;

    this.boundHandlers.canplaythrough = this.handleCanPlayThrough;
    this.boundHandlers.ended = this.handleEnded;
    this.boundHandlers.error = this.handleError;
    this.boundHandlers.waiting = this.handleWaiting;
    this.boundHandlers.stalled = this.handleStalled;
    this.boundHandlers.play = this.handleVideoPlay;
    this.boundHandlers.pause = this.handleVideoPause;
    this.boundHandlers.timeupdate = this.handleVideoTimeUpdate;

    video.addEventListener('canplaythrough', this.boundHandlers.canplaythrough);
    video.addEventListener('ended', this.boundHandlers.ended);
    video.addEventListener('error', this.boundHandlers.error);
    video.addEventListener('waiting', this.boundHandlers.waiting);
    video.addEventListener('stalled', this.boundHandlers.stalled);
    video.addEventListener('play', this.boundHandlers.play);
    video.addEventListener('pause', this.boundHandlers.pause);
    video.addEventListener('timeupdate', this.boundHandlers.timeupdate);
    
    console.log('[PLAYER] ✅ Attached video event listeners');
  }

  private detachVideoListeners(): void {
    const video = this.videoElement;
    if (!video) return;

    if (this.boundHandlers.canplaythrough) {
      video.removeEventListener('canplaythrough', this.boundHandlers.canplaythrough);
    }
    if (this.boundHandlers.ended) {
      video.removeEventListener('ended', this.boundHandlers.ended);
    }
    if (this.boundHandlers.error) {
      video.removeEventListener('error', this.boundHandlers.error);
    }
    if (this.boundHandlers.waiting) {
      video.removeEventListener('waiting', this.boundHandlers.waiting);
    }
    if (this.boundHandlers.stalled) {
      video.removeEventListener('stalled', this.boundHandlers.stalled);
    }
    if (this.boundHandlers.play) {
      video.removeEventListener('play', this.boundHandlers.play);
    }
    if (this.boundHandlers.pause) {
      video.removeEventListener('pause', this.boundHandlers.pause);
    }
    if (this.boundHandlers.timeupdate) {
      video.removeEventListener('timeupdate', this.boundHandlers.timeupdate);
    }
    
    this.boundHandlers = {
      canplaythrough: null,
      ended: null,
      error: null,
      waiting: null,
      stalled: null,
      play: null,
      pause: null,
      timeupdate: null,
    };
    
    console.log('[PLAYER] 🧹 Detached video event listeners');
  }

  private handleVideoTimeUpdate = (): void => {
    if (!this.videoElement) return;
    
    // Skip if loading, scrubbing, or transitioning
    if (this.isLoading || this.isScrubbing || this.isTransitioning) return;
    
    const localTime = this.videoElement.currentTime;
    const clip = this.clips[this.currentClipIndex];
    
    if (clip && this.isPlaying) {
      const clipDuration = clip.duration || (clip.end - clip.start);
      // Check if we're near the end of the clip (within 0.15s to catch edge cases)
      if (localTime >= clipDuration - 0.15) {
        console.log(`[PLAYER] 📍 Near clip end: localTime=${localTime.toFixed(2)}, clipDuration=${clipDuration.toFixed(2)}`);
        this.handleClipEnd();
      }
    }
  };

  private handleClipEnd(): void {
    if (this.isTransitioning) {
      console.log('[PLAYER] ⏳ Already transitioning, skipping handleClipEnd');
      return;
    }
    
    const nextIndex = this.currentClipIndex + 1;
    const timestamp = new Date().toISOString().slice(11, 23);
    
    if (nextIndex < this.clips.length) {
      // Mark as transitioning to prevent duplicate calls
      this.isTransitioning = true;
      
      const nextClip = this.clips[nextIndex];
      console.log(`[PLAYER] [${timestamp}] ➡️ AUTO-ADVANCING: clip ${this.currentClipIndex} → ${nextIndex} (${nextClip.fileName})`);
      
      // Update global time to start of next clip
      this.globalTime = nextClip.start;
      this.emit('timeupdate', { time: this.globalTime, clipIndex: nextIndex });
      
      // Load next clip at time 0
      this.loadClip(nextIndex, 0).then(() => {
        console.log(`[PLAYER] [${new Date().toISOString().slice(11, 23)}] ✅ Clip ${nextIndex} loaded, starting playback`);
        this.isTransitioning = false;
        
        // Ensure playback continues
        if (this.isPlaying && this.videoElement && !this.isScrubbing) {
          this.playVideoElement();
        }
      }).catch(err => {
        console.error(`[PLAYER] ❌ Failed to load clip ${nextIndex}:`, err);
        this.isTransitioning = false;
      });
    } else {
      // Reached end of all clips
      console.log(`[PLAYER] [${timestamp}] 🏁 Reached end of all ${this.clips.length} clips`);
      this.isPlaying = false;
      this.globalTime = this.getTotalDuration();
      this.emit('ended', { totalDuration: this.getTotalDuration() });
      this.emit('statechange', this.getState());
      
      // Optionally loop back to start
      // Uncomment below to enable looping:
      // this.globalTime = 0;
      // this.loadClip(0, 0);
    }
  }

  private handleCanPlayThrough = (): void => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const clip = this.clips[this.currentClipIndex];
    console.log(`[PLAYER] [${timestamp}] ✅ canplaythrough clip ${this.currentClipIndex}: ${clip?.fileName}`);
    
    this.isLoading = false;
    
    if (this.pendingSeek !== null && this.videoElement) {
      console.log(`[PLAYER] [${timestamp}] Applying pending seek: ${this.pendingSeek.toFixed(2)}s`);
      this.videoElement.currentTime = this.pendingSeek;
      this.pendingSeek = null;
    }

    this.emit('cliploaded', { index: this.currentClipIndex, clip });
    this.emit('statechange', this.getState());

    // Auto-play if we're supposed to be playing (including after transition)
    if (this.isPlaying && !this.isScrubbing && this.videoElement) {
      console.log(`[PLAYER] [${timestamp}] Auto-playing after load (isTransitioning=${this.isTransitioning})`);
      this.playVideoElement();
    }
  };

  private handleEnded = (): void => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const clip = this.clips[this.currentClipIndex];
    console.log(`[PLAYER] [${timestamp}] 🔚 'ended' event on clip ${this.currentClipIndex}: ${clip?.fileName}`);
    
    if (this.isTransitioning) {
      console.log(`[PLAYER] [${timestamp}]   Ignoring 'ended' - already transitioning`);
      return;
    }
    
    // Only advance if we're supposed to be playing
    if (this.isPlaying) {
      this.handleClipEnd();
    }
  };

  private handleVideoPlay = (): void => {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] 🎬 Video element 'play' event`);
  };

  private handleVideoPause = (): void => {
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(`[PLAYER] [${timestamp}] ⏸ Video element 'pause' event`);
  };

  private handleError = (): void => {
    const video = this.videoElement;
    const errorMsg = video?.error?.message || 'Unknown video error';
    console.error(`[PLAYER] Video error: ${errorMsg}`);
    
    this.isLoading = false;
    this.isTransitioning = false;
    this.emit('error', { message: errorMsg });
    this.emit('statechange', this.getState());
  };

  private handleWaiting = (): void => {
    console.log('[PLAYER] Video waiting (buffering)...');
    this.isLoading = true;
    this.emit('statechange', this.getState());
  };

  private handleStalled = (): void => {
    console.warn('[PLAYER] Video stalled - network issue?');
    this.emit('statechange', this.getState());
  };

  private startTimeUpdateLoop(): void {
    if (this.animationFrameId !== null) return;

    const update = () => {
      if (this.isDestroyed) return;
      
      if (this.isPlaying && this.videoElement && !this.isLoading && !this.isScrubbing) {
        const now = performance.now();
        if (now - this.lastTimeUpdate >= 16) {
          const localTime = this.videoElement.currentTime;
          this.globalTime = this.clipTimeToGlobalTime(this.currentClipIndex, localTime);
          this.emit('timeupdate', { time: this.globalTime, clipIndex: this.currentClipIndex });
          this.lastTimeUpdate = now;
        }
      }
      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopTimeUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

let playerInstance: VideoPlayer | null = null;

export function getPlayer(): VideoPlayer {
  if (!playerInstance) {
    playerInstance = new VideoPlayer();
  }
  return playerInstance;
}

export function createPlayer(): VideoPlayer {
  return new VideoPlayer();
}

export function destroyPlayer(): void {
  if (playerInstance) {
    playerInstance.destroy();
    playerInstance = null;
  }
}
