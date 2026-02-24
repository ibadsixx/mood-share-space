import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Smile, Search } from 'lucide-react';
import { EmojiLayer } from '@/types/editor';
import { emojiService, EmojiData } from '@/services/emojiService';

// STRICT CATEGORY ORDER - used ONLY for sorting, NOT for UI grouping
const CATEGORY_ORDER = [
  "Smileys",
  "People",
  "Activities",
  "Animals",
  "Nature",
  "Food",
  "Travel",
  "Flags",
  "Objects",
  "Symbols",
];

interface StickersPanelProps {
  onAddEmoji: (emoji: Omit<EmojiLayer, 'id' | 'start' | 'end'>) => void;
  videoDuration: number;
}

export function StickersPanel({ onAddEmoji, videoDuration }: StickersPanelProps) {
  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmojis();
  }, []);

  const loadEmojis = async () => {
    setIsLoading(true);
    try {
      const data = await emojiService.getAllEmojis();
      console.log('[StickersPanel] ✅ Total emojis loaded from emoji.json:', data.length);
      setEmojis(data);
    } catch (error) {
      console.error('Failed to load emojis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort emojis by CATEGORY_ORDER while preserving original order within each category
  // Then filter by search query - ONE SINGLE FLAT LIST
  const sortedEmojis = useMemo(() => {
    // Sort by category order (stable sort preserves original order within same category)
    const sorted = [...emojis].sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.category || '');
      const indexB = CATEGORY_ORDER.indexOf(b.category || '');
      // If category not found, put at end
      const orderA = indexA === -1 ? CATEGORY_ORDER.length : indexA;
      const orderB = indexB === -1 ? CATEGORY_ORDER.length : indexB;
      return orderA - orderB;
    });

    // Apply search filter if any
    if (!searchQuery.trim()) {
      return sorted;
    }

    const query = searchQuery.toLowerCase();
    return sorted.filter(emoji =>
      emoji.name?.toLowerCase().includes(query) ||
      emoji.emoji?.toLowerCase().includes(query)
    );
  }, [emojis, searchQuery]);

  // PROOF: Log sorted count
  useEffect(() => {
    if (!isLoading && emojis.length > 0) {
      console.log('[StickersPanel] Rendered emojis count:', sortedEmojis.length);
    }
  }, [sortedEmojis.length, isLoading, emojis.length]);

  const handleEmojiClick = (emoji: EmojiData) => {
    const content = emoji.url || emoji.emoji || '';
    onAddEmoji({
      type: emoji.url ? 'sticker' : 'emoji',
      content,
      position: { x: 50, y: 50 },
      scale: 1,
      rotation: 0,
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 text-sm font-medium mb-3 shrink-0">
        <Smile className="h-4 w-4" />
        <span>Stickers & Emoji</span>
        {!isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {sortedEmojis.length} emojis
          </span>
        )}
      </div>

      {/* Search only - NO CATEGORY UI */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search emoji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 text-sm h-9"
        />
      </div>

      {/* ONE SINGLE FLAT EMOJI GRID - NO CATEGORIES, NO HEADERS, NO TABS */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading emojis...
          </div>
        ) : sortedEmojis.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No emojis found
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1 pb-4">
            {/* SINGLE .map() - ONE FLAT LIST */}
            {sortedEmojis.map((emoji, index) => (
              <button
                key={`${emoji.emoji}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className="aspect-square flex items-center justify-center rounded hover:bg-muted/50 transition-colors p-1"
                title={emoji.name}
              >
                {emoji.url ? (
                  <img 
                    src={emoji.url} 
                    alt={emoji.name || 'emoji'} 
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xl">{emoji.emoji}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2 shrink-0">
        Click an emoji to add it to your video.
      </p>
    </div>
  );
}
