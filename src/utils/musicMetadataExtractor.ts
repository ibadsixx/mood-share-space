import { detectMusicUrl } from './musicUrlDetector';

export interface MusicMetadata {
  title: string;
  artist: string;
  duration: number | null;
  thumbnail: string | null;
}

/**
 * Extract metadata from various music sources using oEmbed endpoints
 * No API keys required - uses public oEmbed APIs
 */
export const extractMusicMetadata = async (url: string): Promise<MusicMetadata> => {
  const urlInfo = detectMusicUrl(url);
  
  console.log('[Metadata] Extracting for:', urlInfo.type, url);

  try {
    // YouTube: Use oEmbed API (no API key required)
    if (urlInfo.type === 'youtube' && urlInfo.videoId) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${urlInfo.videoId}&format=json`;
        console.log('[Metadata] Fetching YouTube oEmbed:', oembedUrl);
        
        const response = await fetch(oembedUrl);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Metadata] YouTube oEmbed response:', data);
          
          // YouTube oEmbed returns: title, author_name, author_url, thumbnail_url, thumbnail_width, thumbnail_height
          return {
            title: data.title || 'YouTube Video',
            artist: data.author_name || 'YouTube',
            duration: null, // oEmbed doesn't provide duration
            thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${urlInfo.videoId}/hqdefault.jpg`,
          };
        } else {
          console.warn('[Metadata] YouTube oEmbed failed:', response.status);
        }
      } catch (ytError) {
        console.error('[Metadata] YouTube oEmbed error:', ytError);
      }
      
      // Fallback for YouTube: use thumbnail URL directly
      return {
        title: 'YouTube Video',
        artist: 'YouTube',
        duration: null,
        thumbnail: `https://img.youtube.com/vi/${urlInfo.videoId}/hqdefault.jpg`,
      };
    }
    
    // SoundCloud: Use oEmbed API (no API key required)
    if (urlInfo.type === 'soundcloud') {
      try {
        const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
        console.log('[Metadata] Fetching SoundCloud oEmbed:', oembedUrl);
        
        const response = await fetch(oembedUrl);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Metadata] SoundCloud oEmbed response:', data);
          
          // SoundCloud oEmbed returns: title, author_name, thumbnail_url
          return {
            title: data.title || 'SoundCloud Track',
            artist: data.author_name || 'SoundCloud',
            duration: null, // oEmbed doesn't provide duration
            thumbnail: data.thumbnail_url || null,
          };
        } else {
          console.warn('[Metadata] SoundCloud oEmbed failed:', response.status);
        }
      } catch (scError) {
        console.error('[Metadata] SoundCloud oEmbed error:', scError);
      }
      
      // Fallback for SoundCloud: extract from URL path
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return {
        title: parts.length >= 2 ? formatUrlSegment(parts[1]) : 'SoundCloud Track',
        artist: parts.length >= 1 ? formatUrlSegment(parts[0]) : 'SoundCloud',
        duration: null,
        thumbnail: null,
      };
    }
    
    // Spotify: Limited oEmbed support - just metadata display
    if (urlInfo.type === 'spotify') {
      // Spotify oEmbed requires API access for full metadata
      // Extract basic info from URL
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      
      return {
        title: parts.length >= 2 ? 'Spotify Track' : 'Spotify',
        artist: 'Spotify',
        duration: null,
        thumbnail: null, // Spotify thumbnails require API access
      };
    }
    
    // Direct audio file
    if (urlInfo.type === 'direct_audio' || urlInfo.type === 'direct_video') {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'audio';
      const cleanTitle = formatUrlSegment(filename.replace(/\.[^/.]+$/, ''));
      
      return {
        title: cleanTitle || 'Audio Track',
        artist: 'Direct Audio',
        duration: null,
        thumbnail: null,
      };
    }
    
    // Unknown type - try generic extraction
    console.log('[Metadata] Unknown type, using generic extraction');
    return {
      title: 'Music Track',
      artist: 'Unknown Artist',
      duration: null,
      thumbnail: null,
    };
  } catch (error) {
    console.error('[Metadata] Extraction failed:', error);
    return {
      title: 'Music Track',
      artist: 'Unknown Artist',
      duration: null,
      thumbnail: null,
    };
  }
};

/**
 * Format URL segments into readable titles
 * Converts "my-cool-track" or "my_cool_track" to "My Cool Track"
 */
function formatUrlSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}