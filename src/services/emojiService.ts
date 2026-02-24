export interface EmojiData {
  emoji: string;
  name: string;
  category?: string;
  url: string;
  baseEmoji?: string; // For future skin tone support
}

class EmojiService {
  private cache: Map<string, EmojiData> = new Map();
  private allEmojis: EmojiData[] = [];
  private isLoading = false;
  private loadPromise: Promise<EmojiData[]> | null = null;

  private readonly EMOJI_JSON_URL = '/emoji/emoji.json';

  private sortEmojisByBaseCode = (a: EmojiData, b: EmojiData): number => {
    // Skin tone modifier suffixes in order
    const skinTones = ['-1f3fb', '-1f3fc', '-1f3fd', '-1f3fe', '-1f3ff'];
    
    // Extract base Unicode codes (remove skin tone modifiers)
    const getBaseCode = (emoji: string): string => {
      const lower = emoji.toLowerCase();
      for (const tone of skinTones) {
        if (lower.endsWith(tone)) {
          return lower.slice(0, -tone.length);
        }
      }
      return lower;
    };
    
    // Get skin tone priority (0 for base, 1-5 for skin tones)
    const getSkinTonePriority = (emoji: string): number => {
      const lower = emoji.toLowerCase();
      for (let i = 0; i < skinTones.length; i++) {
        if (lower.endsWith(skinTones[i])) {
          return i + 1;
        }
      }
      return 0; // Base emoji (no skin tone)
    };
    
    const baseA = getBaseCode(a.emoji);
    const baseB = getBaseCode(b.emoji);
    
    // First sort by base Unicode code
    const baseComparison = baseA.localeCompare(baseB);
    if (baseComparison !== 0) {
      return baseComparison;
    }
    
    // If same base code, sort by skin tone priority
    return getSkinTonePriority(a.emoji) - getSkinTonePriority(b.emoji);
  };

  async fetchAllEmojiUrls(): Promise<EmojiData[]> {
    console.log('🚀 Starting emoji fetch from local emoji.json...');
    
    const fetchFrom = async (url: string): Promise<EmojiData[] | null> => {
      try {
        console.log('🔄 Fetching emojis from:', url);
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });
        if (!response.ok) {
          console.error('❌ Failed to fetch emojis - Status:', response.status, 'URL:', url);
          return null;
        }
        const data: EmojiData[] = await response.json();
        console.log('✅ Successfully fetched data. Array length:', data?.length || 0);
        
        // Validate data structure
        if (!Array.isArray(data)) {
          console.error('❌ Response is not an array:', typeof data);
          return null;
        }
        
        // Normalize emoji codes to lowercase for consistent matching
        const normalizedData = data.map(emoji => ({
          ...emoji,
          emoji: emoji.emoji.toLowerCase()
        }));
        
        return normalizedData;
      } catch (err) {
        console.error('❌ Network error fetching emojis from:', url, err);
        return null;
      }
    };

    try {
      const emojis: EmojiData[] | null = await fetchFrom(this.EMOJI_JSON_URL);

      if (!emojis || emojis.length === 0) {
        console.error('❌ Failed to load emojis from local emoji.json');
        console.warn('⚠️ Please run: node scripts/generateEmojiJson.js');
        return [];
      }

      console.log('✅ Successfully loaded', emojis.length, 'emojis from local storage');

      // Sort by base Unicode code with skin tone grouping
      const sorted = emojis.sort(this.sortEmojisByBaseCode);
      console.log('✅ Emojis sorted successfully. Total count:', sorted.length);
      
      return sorted;
    } catch (error) {
      console.error('❌ Fatal error in fetchAllEmojiUrls:', error);
      return [];
    }
  }

  async getEmojiByCode(code: string): Promise<EmojiData | null> {
    // Check cache first (case-insensitive)
    const lowerCode = code.toLowerCase();
    if (this.cache.has(lowerCode)) {
      return this.cache.get(lowerCode)!;
    }

    // If not in cache, load all emojis and search (case-insensitive)
    const allEmojis = await this.getAllEmojis();
    const emoji = allEmojis.find(
      e => e.emoji.toLowerCase() === lowerCode ||
           e.name.toLowerCase() === lowerCode
    );
    
    if (emoji) {
      this.cache.set(lowerCode, emoji);
      return emoji;
    }

    return null;
  }

  async getAllEmojis(): Promise<EmojiData[]> {
    // Return cached data if available
    if (this.allEmojis.length > 0) {
      return this.allEmojis;
    }

    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.fetchAllEmojiUrls();
    
    try {
      const emojis = await this.loadPromise;
      this.allEmojis = emojis;
      
      // Cache individual emojis by both emoji code and name (lowercase for case-insensitive lookup)
      // Also calculate baseEmoji for skin tone support
      emojis.forEach(emoji => {
        this.cache.set(emoji.emoji.toLowerCase(), emoji);
        this.cache.set(emoji.name.toLowerCase(), emoji);
        
        // Extract base emoji (remove skin tone modifiers)
        const skinTones = ['-1f3fb', '-1f3fc', '-1f3fd', '-1f3fe', '-1f3ff'];
        let baseEmoji = emoji.emoji.toLowerCase();
        for (const tone of skinTones) {
          if (baseEmoji.endsWith(tone)) {
            baseEmoji = baseEmoji.slice(0, -tone.length);
            break;
          }
        }
        emoji.baseEmoji = baseEmoji;
      });
      
      return emojis;
    } finally {
      this.isLoading = false;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.allEmojis = [];
  }
}

// Export singleton instance
export const emojiService = new EmojiService();