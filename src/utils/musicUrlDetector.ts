export type MusicSourceType = 'youtube' | 'soundcloud' | 'spotify' | 'direct_audio' | 'direct_video' | 'unknown';

export interface MusicUrlInfo {
  type: MusicSourceType;
  url: string;
  isValid: boolean;
  videoId?: string;
  error?: string;
}

/**
 * Detects the type of music URL and extracts relevant information
 */
export const detectMusicUrl = (url: string): MusicUrlInfo => {
  try {
    const urlObj = new URL(url);
    
    console.log('[Music URL Detection] Analyzing URL:', url);
    console.log('[Music URL Detection] Hostname:', urlObj.hostname);
    
    // YouTube detection
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId: string | null = null;
      
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1).split('?')[0];
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
        if (!videoId && urlObj.pathname.includes('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0];
        }
      }
      
      if (videoId) {
        console.log('[Music URL Detection] YouTube video detected:', videoId);
        return {
          type: 'youtube',
          url,
          videoId,
          isValid: true
        };
      }
    }
    
    // SoundCloud detection
    if (urlObj.hostname.includes('soundcloud.com')) {
      console.log('[Music URL Detection] SoundCloud URL detected');
      return {
        type: 'soundcloud',
        url,
        isValid: true
      };
    }
    
    // Spotify detection
    if (urlObj.hostname.includes('spotify.com') || urlObj.hostname.includes('spotify.link')) {
      console.log('[Music URL Detection] Spotify URL detected');
      return {
        type: 'spotify',
        url,
        isValid: true
      };
    }
    
    // Direct audio file detection
    const audioExtensions = ['.mp3', '.m4a', '.ogg', '.wav', '.aac', '.flac', '.opus'];
    const pathname = urlObj.pathname.toLowerCase();
    if (audioExtensions.some(ext => pathname.endsWith(ext))) {
      console.log('[Music URL Detection] Direct audio file detected');
      return {
        type: 'direct_audio',
        url,
        isValid: true
      };
    }
    
    // Direct video file detection (we'll extract audio)
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    if (videoExtensions.some(ext => pathname.endsWith(ext))) {
      console.log('[Music URL Detection] Direct video file detected');
      return {
        type: 'direct_video',
        url,
        isValid: true
      };
    }
    
    // If it's a valid URL but not recognized, accept it anyway
    console.log('[Music URL Detection] URL accepted as generic external link');
    return {
      type: 'direct_audio',
      url,
      isValid: true
    };
  } catch (error) {
    console.error('[Music URL Detection] Invalid URL:', error);
    return {
      type: 'unknown',
      url,
      isValid: false,
      error: 'Invalid URL format'
    };
  }
};

/**
 * Validates if a URL is a valid music source
 */
export const isValidMusicUrl = (url: string): boolean => {
  const info = detectMusicUrl(url);
  return info.isValid;
};
