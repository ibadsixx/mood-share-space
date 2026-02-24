// Types for video editing preview and transfer

export interface VideoEditLayer {
  id: string;
  type: 'emoji' | 'gif' | 'text' | 'sticker';
  content: string; // emoji character, gif url, or text
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface VideoFilter {
  brightness: number; // 0-200, default 100
  contrast: number; // 0-200, default 100
  saturation: number; // 0-200, default 100
  temperature: number; // -100 to 100, default 0
  blur: number; // 0-20, default 0
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnailUrl?: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  volume: number; // 0-100
}

export interface VideoTrim {
  startTime: number;
  endTime: number;
}

export interface VideoEdits {
  layers: VideoEditLayer[];
  filter: VideoFilter;
  music: MusicTrack | null;
  videoVolume: number; // 0-100
  trim: VideoTrim;
}

export interface VideoUploadData {
  dataUrl: string; // Primary video URL (should be permanent public URL)
  file: {
    name: string;
    type: string;
    size: number;
  };
  metadata: {
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
  contentType: 'story' | 'reel';
  edits?: VideoEdits;
}

export const defaultVideoFilter: VideoFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  blur: 0,
};

export const defaultVideoEdits: VideoEdits = {
  layers: [],
  filter: defaultVideoFilter,
  music: null,
  videoVolume: 100,
  trim: { startTime: 0, endTime: 0 },
};
