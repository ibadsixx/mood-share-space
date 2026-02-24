export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
}

export const loadVideoMetadata = (url: string): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      const aspectRatio = width / height > 1 ? '16:9' : '9:16';
      
      URL.revokeObjectURL(video.src);
      
      resolve({
        duration,
        width,
        height,
        aspectRatio
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = url;
  });
};
