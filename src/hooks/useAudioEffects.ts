// useAudioEffects - React hook to integrate AudioEngine with playback
// Provides real-time audio effects during playback

import { useEffect, useRef, useCallback, useState } from 'react';
import { AudioEngine, getAudioEngine, destroyAudioEngine } from '@/lib/audioEngine';
import { AudioEffects, defaultAudioEffects } from '@/types/editor';

interface UseAudioEffectsOptions {
  audioElement?: HTMLAudioElement | null;
  effects?: AudioEffects;
  enabled?: boolean;
}

interface AudioEffectsState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: Error | null;
}

export function useAudioEffects(options: UseAudioEffectsOptions = {}) {
  const { audioElement, effects = defaultAudioEffects, enabled = true } = options;
  
  const [state, setState] = useState<AudioEffectsState>({
    isInitialized: false,
    isProcessing: false,
    error: null,
  });

  const engineRef = useRef<AudioEngine | null>(null);
  const currentEffectsRef = useRef<AudioEffects>(effects);

  // Initialize audio engine when audio element is ready
  useEffect(() => {
    if (!audioElement || !enabled) {
      return;
    }

    const initEngine = async () => {
      try {
        console.log('[useAudioEffects] Initializing audio engine...');
        setState(prev => ({ ...prev, isProcessing: true }));

        const engine = getAudioEngine();
        const success = await engine.init(audioElement);

        if (success) {
          engineRef.current = engine;
          // Apply current effects
          engine.applyEffects(currentEffectsRef.current);
          
          setState({
            isInitialized: true,
            isProcessing: false,
            error: null,
          });
          
          console.log('[useAudioEffects] ✅ Audio engine initialized');
        } else {
          throw new Error('Failed to initialize audio engine');
        }
      } catch (err) {
        console.error('[useAudioEffects] Initialization failed:', err);
        setState({
          isInitialized: false,
          isProcessing: false,
          error: err as Error,
        });
      }
    };

    initEngine();

    return () => {
      // Cleanup on unmount or audio element change
      if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
        setState({
          isInitialized: false,
          isProcessing: false,
          error: null,
        });
      }
    };
  }, [audioElement, enabled]);

  // Apply effects when they change
  useEffect(() => {
    currentEffectsRef.current = effects;
    
    if (engineRef.current && state.isInitialized) {
      console.log('[useAudioEffects] Applying effects update:', effects);
      engineRef.current.applyEffects(effects);
    }
  }, [effects, state.isInitialized]);

  // Resume audio context (needed after user interaction)
  const resume = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.resume();
    }
  }, []);

  // Get current audio context state
  const getState = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getState();
    }
    return 'uninitialized';
  }, []);

  // Apply effects immediately
  const applyEffects = useCallback((newEffects: AudioEffects) => {
    if (engineRef.current && state.isInitialized) {
      currentEffectsRef.current = newEffects;
      engineRef.current.applyEffects(newEffects);
      console.log('[useAudioEffects] Applied effects:', newEffects);
    }
  }, [state.isInitialized]);

  // Cleanup engine completely
  const destroy = useCallback(() => {
    destroyAudioEngine();
    engineRef.current = null;
    setState({
      isInitialized: false,
      isProcessing: false,
      error: null,
    });
  }, []);

  return {
    isInitialized: state.isInitialized,
    isProcessing: state.isProcessing,
    error: state.error,
    resume,
    getState,
    applyEffects,
    destroy,
  };
}
