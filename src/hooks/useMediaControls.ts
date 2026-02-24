import { useState, useEffect, useCallback } from 'react';

export interface MediaControlsSettings {
  speed: number;
  muted: boolean;
  loop: boolean;
  autoReplay: boolean;
  showControls: boolean;
  quality: 'auto' | '360p' | '720p' | '1080p';
}

const DEFAULT_SETTINGS: MediaControlsSettings = {
  speed: 1,
  muted: false,
  loop: false,
  autoReplay: false,
  showControls: true,
  quality: 'auto'
};

const STORAGE_KEY = 'media-controls-settings';

export const useMediaControls = () => {
  const [settings, setSettings] = useState<MediaControlsSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setSettings(prev => ({ ...prev, muted: !prev.muted }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setSettings(prev => ({ ...prev, speed }));
  }, []);

  const setQuality = useCallback((quality: MediaControlsSettings['quality']) => {
    setSettings(prev => ({ ...prev, quality }));
  }, []);

  const toggleLoop = useCallback(() => {
    setSettings(prev => ({ ...prev, loop: !prev.loop }));
  }, []);

  const toggleAutoReplay = useCallback(() => {
    setSettings(prev => ({ ...prev, autoReplay: !prev.autoReplay }));
  }, []);

  const toggleShowControls = useCallback(() => {
    setSettings(prev => ({ ...prev, showControls: !prev.showControls }));
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return {
    settings,
    isPlaying,
    isSettingsOpen,
    togglePlay,
    toggleMute,
    setSpeed,
    setQuality,
    toggleLoop,
    toggleAutoReplay,
    toggleShowControls,
    openSettings,
    closeSettings,
    setIsPlaying
  };
};
