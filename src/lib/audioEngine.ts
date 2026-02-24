// Audio Engine v2 - WebAudio-based multi-source mixer
// CRITICAL: Only ONE MediaElementAudioSourceNode per video element EVER
// Supports independent volume control for video and audio tracks

import { AudioEffects, defaultAudioEffects } from '@/types/editor';

interface VideoConnection {
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  bassFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  pannerNode: StereoPannerNode;
  convolverNode: ConvolverNode;
  dryGainNode: GainNode;
  wetGainNode: GainNode;
}

export interface AudioTrackInfo {
  id: string;
  audioElement: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  volume: number; // 0-1
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  
  // CRITICAL: Store actual node references per element - not just a WeakSet flag
  // This allows us to reuse existing nodes and never recreate MediaElementSource
  private videoConnections: Map<HTMLVideoElement | HTMLAudioElement, VideoConnection> = new Map();
  
  // Master bus
  private masterGain: GainNode | null = null;
  
  private isInitialized = false;
  private currentVideoElement: HTMLVideoElement | HTMLAudioElement | null = null;
  private currentEffects: AudioEffects = defaultAudioEffects;
  private videoVolume: number = 1; // 0-1
  
  // Track-based management for audio tracks (music, voice-overs, etc.)
  private tracks: Map<string, AudioTrackInfo> = new Map();

  constructor() {
    console.log('[AUDIO] AudioEngine instance created');
  }

  /**
   * Get current video connection (helper for effect methods)
   */
  private getCurrentConnection(): VideoConnection | null {
    if (!this.currentVideoElement) return null;
    return this.videoConnections.get(this.currentVideoElement) || null;
  }

  /**
   * Ensure AudioContext exists and is running
   */
  private async ensureContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      console.log('[AUDIO] context state:', this.audioContext.state);
    }
    
    if (this.audioContext.state === 'suspended') {
      console.log('[AUDIO] Resuming suspended AudioContext...');
      await this.audioContext.resume();
      console.log('[AUDIO] context state:', this.audioContext.state);
    }
    
    return this.audioContext;
  }

  /**
   * Ensure master gain bus exists
   */
  private ensureMasterGain(): GainNode {
    if (!this.masterGain && this.audioContext) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      console.log('[AUDIO] Created master gain bus -> destination');
    }
    return this.masterGain!;
  }

  /**
   * Check if video element has a working WebAudio connection
   */
  isVideoConnected(videoElement: HTMLVideoElement | HTMLAudioElement): boolean {
    const conn = this.videoConnections.get(videoElement);
    return !!(conn && conn.gainNode && conn.sourceNode);
  }

  /**
   * Get the gain node for a connected video (for verification)
   */
  getVideoGainNode(videoElement: HTMLVideoElement | HTMLAudioElement): GainNode | null {
    return this.videoConnections.get(videoElement)?.gainNode || null;
  }

  /**
   * Connect a video element to the WebAudio graph
   * CRITICAL: createMediaElementSource can only be called ONCE per element
   * We store and reuse the connection if it already exists
   */
  async connectVideoElement(videoElement: HTMLVideoElement | HTMLAudioElement): Promise<boolean> {
    console.log('[AUDIO] ========================================');
    console.log('[AUDIO] connectVideoElement called');
    console.log('[AUDIO] context state:', this.audioContext?.state || 'null');
    
    // Check if we already have a valid connection for this element
    const existingConn = this.videoConnections.get(videoElement);
    if (existingConn && existingConn.gainNode) {
      console.log('[AUDIO] ✅ Video element already connected - reusing existing nodes');
      console.log('[AUDIO] source created once: YES (reusing)');
      this.currentVideoElement = videoElement;
      this.isInitialized = true;
      return true;
    }

    try {
      const ctx = await this.ensureContext();
      this.ensureMasterGain();
      
      // CRITICAL: Create source ONCE - this routes video audio through WebAudio
      console.log('[AUDIO] source created once: creating new MediaElementAudioSourceNode');
      const sourceNode = ctx.createMediaElementSource(videoElement);
      
      // Create gain node for volume control
      const gainNode = ctx.createGain();
      gainNode.gain.value = this.videoVolume;
      console.log(`[AUDIO] ✅ Video gain node created (volume=${this.videoVolume.toFixed(2)})`);
      
      // Create EQ and effects nodes
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3000;

      const pannerNode = ctx.createStereoPanner();

      const convolverNode = ctx.createConvolver();
      const dryGainNode = ctx.createGain();
      const wetGainNode = ctx.createGain();

      // Load reverb impulse
      await this.loadImpulseForConvolver(ctx, convolverNode);

      // Connect the full audio chain:
      // video -> gain -> bass -> treble -> panner -> (dry/wet) -> masterGain -> destination
      sourceNode.connect(gainNode);
      gainNode.connect(bassFilter);
      bassFilter.connect(trebleFilter);
      trebleFilter.connect(pannerNode);

      // Dry path (no reverb)
      pannerNode.connect(dryGainNode);
      dryGainNode.connect(this.masterGain!);

      // Wet path (with reverb)
      pannerNode.connect(convolverNode);
      convolverNode.connect(wetGainNode);
      wetGainNode.connect(this.masterGain!);

      // Store connection for this element
      const connection: VideoConnection = {
        sourceNode,
        gainNode,
        bassFilter,
        trebleFilter,
        pannerNode,
        convolverNode,
        dryGainNode,
        wetGainNode,
      };
      this.videoConnections.set(videoElement, connection);
      this.currentVideoElement = videoElement;
      this.isInitialized = true;
      
      console.log('[AUDIO] ========================================');
      console.log('[AUDIO] AUDIO CHAIN CONNECTED SUCCESSFULLY');
      console.log('[AUDIO] video -> gain -> EQ -> masterGain -> destination');
      console.log('[AUDIO] video muted AFTER routing: ready');
      console.log('[AUDIO] ========================================');

      return true;
    } catch (error) {
      // Handle the case where createMediaElementSource was already called elsewhere
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        console.warn('[AUDIO] ⚠️ Video element was already connected to a MediaElementSource elsewhere');
        return false;
      }
      console.error('[AUDIO] ❌ Failed to connect video element:', error);
      return false;
    }
  }

  private async loadImpulseForConvolver(ctx: AudioContext, convolver: ConvolverNode): Promise<void> {
    try {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2;
      const impulse = ctx.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
      }

      convolver.buffer = impulse;
      console.log('[AUDIO] Loaded synthetic reverb impulse');
    } catch (error) {
      console.warn('[AUDIO] Failed to create impulse response:', error);
    }
  }

  /**
   * Initialize the audio engine with a video element (legacy API)
   */
  async init(videoElement: HTMLVideoElement | HTMLAudioElement): Promise<boolean> {
    return this.connectVideoElement(videoElement);
  }

  /**
   * Set video volume (0-100)
   * CRITICAL: This MUST modify the GainNode value for audible effect
   */
  setVideoVolume(volume: number): void {
    const gainValue = Math.max(0, Math.min(1.5, volume / 100));
    this.videoVolume = gainValue;
    
    const conn = this.getCurrentConnection();
    
    if (conn?.gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      conn.gainNode.gain.cancelScheduledValues(currentTime);
      conn.gainNode.gain.setValueAtTime(conn.gainNode.gain.value, currentTime);
      conn.gainNode.gain.linearRampToValueAtTime(gainValue, currentTime + 0.05);
      
      console.log(`[AUDIO] video gain applied -> ${gainValue.toFixed(2)} (${Math.round(volume)}%)`);
    } else {
      console.warn(`[AUDIO] ⚠️ setVideoVolume called but no gain node available (volume=${gainValue.toFixed(2)} stored)`);
    }
    
    this.currentEffects.volume = volume;
  }

  /**
   * Get current video volume (0-100)
   */
  getVideoVolume(): number {
    return Math.round(this.videoVolume * 100);
  }

  /**
   * Attach an audio track (music, voice-over, etc.) to the engine
   */
  attachTrack(trackId: string, audioElement: HTMLAudioElement, initialVolume: number = 100): boolean {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    try {
      if (this.tracks.has(trackId)) {
        console.log(`[AUDIO] Track ${trackId} already attached, updating volume`);
        this.setTrackVolume(trackId, initialVolume);
        return true;
      }

      console.log(`[AUDIO] Attaching audio track: ${trackId}`);
      
      if (!this.masterGain) {
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
      }
      
      const sourceNode = this.audioContext.createMediaElementSource(audioElement);
      const gainNode = this.audioContext.createGain();
      
      const volumeValue = Math.max(0, Math.min(1.5, initialVolume / 100));
      gainNode.gain.value = volumeValue;
      
      sourceNode.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      this.tracks.set(trackId, {
        id: trackId,
        audioElement,
        sourceNode,
        gainNode,
        volume: volumeValue,
      });
      
      console.log(`[AUDIO] ✅ Track ${trackId} attached, gain=${volumeValue.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error(`[AUDIO] ❌ Failed to attach track ${trackId}:`, error);
      return false;
    }
  }

  /**
   * Detach an audio track from the engine
   */
  detachTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      try {
        track.sourceNode.disconnect();
        track.gainNode.disconnect();
        this.tracks.delete(trackId);
        console.log(`[AUDIO] Detached track: ${trackId}`);
      } catch (error) {
        console.error(`[AUDIO] Error detaching track ${trackId}:`, error);
      }
    }
  }

  /**
   * Set volume for a specific audio track (0-100)
   */
  setTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track || !this.audioContext) {
      console.warn(`[AUDIO] Track ${trackId} not found`);
      return;
    }
    
    const gainValue = Math.max(0, Math.min(1.5, volume / 100));
    track.gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
    track.volume = gainValue;
    console.log(`[AUDIO] ✅ Track volume applied -> trackId=${trackId} gain=${gainValue.toFixed(2)}`);
  }

  /**
   * Get volume for a specific audio track (0-100)
   */
  getTrackVolume(trackId: string): number {
    const track = this.tracks.get(trackId);
    return track ? Math.round(track.volume * 100) : 100;
  }

  /**
   * Update effect for a track (legacy API, maps to setTrackVolume for 'volume' effect)
   */
  updateEffect(trackId: string, effectName: string, value: number): void {
    if (effectName === 'volume') {
      this.setTrackVolume(trackId, value);
    } else {
      console.log(`[AUDIO] Unknown effect: ${effectName}`);
    }
  }

  /**
   * Apply audio effects to the video chain
   */
  applyEffects(effects: AudioEffects): void {
    if (!this.isInitialized) {
      console.warn('[AUDIO] Not initialized, cannot apply effects');
      return;
    }

    const conn = this.getCurrentConnection();
    if (!conn) {
      console.warn('[AUDIO] No current connection, cannot apply effects');
      return;
    }

    this.currentEffects = { ...effects };
    console.log('[AUDIO] Applying effects:', effects);

    // Volume (video)
    if (conn.gainNode && this.audioContext) {
      const gainValue = effects.volume / 100;
      conn.gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
      this.videoVolume = gainValue;
      console.log(`[AUDIO] video volume set -> ${gainValue.toFixed(2)}`);
    }

    // Bass
    if (conn.bassFilter && this.audioContext) {
      const bassDb = (effects.bass / 100) * 24;
      conn.bassFilter.gain.setValueAtTime(bassDb, this.audioContext.currentTime);
    }

    // Treble
    if (conn.trebleFilter && this.audioContext) {
      const trebleDb = (effects.treble / 100) * 24;
      conn.trebleFilter.gain.setValueAtTime(trebleDb, this.audioContext.currentTime);
    }

    // Pan
    if (conn.pannerNode && this.audioContext) {
      const panValue = effects.pan / 100;
      conn.pannerNode.pan.setValueAtTime(panValue, this.audioContext.currentTime);
    }

    // Reverb (dry/wet mix)
    if (conn.dryGainNode && conn.wetGainNode && this.audioContext) {
      const wetLevel = effects.reverb / 100;
      const dryLevel = 1 - wetLevel * 0.5;
      
      conn.dryGainNode.gain.setValueAtTime(dryLevel, this.audioContext.currentTime);
      conn.wetGainNode.gain.setValueAtTime(wetLevel * 0.5, this.audioContext.currentTime);
    }

    // Speed (applied to video element directly)
    if (this.currentVideoElement) {
      this.currentVideoElement.playbackRate = effects.speed;
    }
  }

  getCurrentEffects(): AudioEffects {
    return { ...this.currentEffects };
  }

  /**
   * Legacy volume setter (maps to video volume)
   */
  setVolume(volume: number): void {
    this.setVideoVolume(volume);
  }

  setBass(bass: number): void {
    const conn = this.getCurrentConnection();
    if (conn?.bassFilter && this.audioContext) {
      const bassDb = (bass / 100) * 24;
      conn.bassFilter.gain.setValueAtTime(bassDb, this.audioContext.currentTime);
      this.currentEffects.bass = bass;
    }
  }

  setTreble(treble: number): void {
    const conn = this.getCurrentConnection();
    if (conn?.trebleFilter && this.audioContext) {
      const trebleDb = (treble / 100) * 24;
      conn.trebleFilter.gain.setValueAtTime(trebleDb, this.audioContext.currentTime);
      this.currentEffects.treble = treble;
    }
  }

  setPan(pan: number): void {
    const conn = this.getCurrentConnection();
    if (conn?.pannerNode && this.audioContext) {
      const panValue = pan / 100;
      conn.pannerNode.pan.setValueAtTime(panValue, this.audioContext.currentTime);
      this.currentEffects.pan = pan;
    }
  }

  setReverb(reverb: number): void {
    const conn = this.getCurrentConnection();
    if (conn?.dryGainNode && conn?.wetGainNode && this.audioContext) {
      const wetLevel = reverb / 100;
      const dryLevel = 1 - wetLevel * 0.5;
      conn.dryGainNode.gain.setValueAtTime(dryLevel, this.audioContext.currentTime);
      conn.wetGainNode.gain.setValueAtTime(wetLevel * 0.5, this.audioContext.currentTime);
      this.currentEffects.reverb = reverb;
    }
  }

  setSpeed(speed: number): void {
    if (this.currentVideoElement) {
      this.currentVideoElement.playbackRate = speed;
      this.currentEffects.speed = speed;
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(volume / 100, this.audioContext.currentTime);
      console.log(`[AUDIO] Master volume set to ${volume}%`);
    }
  }

  getState(): AudioContextState | 'uninitialized' {
    if (!this.audioContext) return 'uninitialized';
    return this.audioContext.state;
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[AUDIO] Context resumed');
    }
  }

  // Note: cleanup() now does NOT clear videoConnections since we want to reuse them
  // Call destroy() for full cleanup
  cleanup(): void {
    console.log('[AUDIO] cleanup() called - keeping video connections for reuse');
    // We intentionally do NOT clear videoConnections here
    // This is the fix for the permanent mute bug
  }

  destroy(): void {
    console.log('[AUDIO] destroy() called - full cleanup');
    
    // Disconnect all video connections
    for (const [element, conn] of this.videoConnections) {
      try {
        conn.sourceNode.disconnect();
        conn.gainNode.disconnect();
        conn.bassFilter.disconnect();
        conn.trebleFilter.disconnect();
        conn.pannerNode.disconnect();
        conn.convolverNode.disconnect();
        conn.dryGainNode.disconnect();
        conn.wetGainNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    this.videoConnections.clear();
    
    // Detach all audio tracks
    for (const [trackId] of this.tracks) {
      this.detachTrack(trackId);
    }
    this.tracks.clear();

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (e) {}
      this.masterGain = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.currentVideoElement = null;

    console.log('[AUDIO] AudioEngine destroyed');
  }

  /**
   * Get the audio routing diagram for debugging
   */
  getRoutingDiagram(): string {
    const lines = [
      '┌─────────────────────────────────────────┐',
      '│         AUDIO ROUTING DIAGRAM           │',
      '├─────────────────────────────────────────┤',
      `│ VideoElement                            │`,
      `│   └── videoGainNode (${(this.videoVolume).toFixed(2)})              │`,
      '│         └── bassFilter                  │',
      '│             └── trebleFilter            │',
      '│                 └── pannerNode          │',
      '│                     ├── dryGain ──┐     │',
      '│                     └── convolver │     │',
      '│                         └── wetGain     │',
    ];
    
    for (const [id, track] of this.tracks) {
      lines.push(`│ AudioTrack[${id.slice(0, 10)}]                    │`);
      lines.push(`│   └── trackGainNode (${track.volume.toFixed(2)})            │`);
    }
    
    lines.push('│                             │           │');
    lines.push('│            ┌────────────────┘           │');
    lines.push('│            ▼                            │');
    lines.push('│     ┌──────────────┐                    │');
    lines.push('│     │  masterGain  │                    │');
    lines.push('│     └──────────────┘                    │');
    lines.push('│            │                            │');
    lines.push('│            ▼                            │');
    lines.push('│     ┌──────────────┐                    │');
    lines.push('│     │ destination  │                    │');
    lines.push('│     └──────────────┘                    │');
    lines.push('└─────────────────────────────────────────┘');
    
    return lines.join('\n');
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}

export function createAudioEngine(): AudioEngine {
  return new AudioEngine();
}

export function destroyAudioEngine(): void {
  if (audioEngineInstance) {
    audioEngineInstance.destroy();
    audioEngineInstance = null;
  }
}
