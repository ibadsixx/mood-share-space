import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Smile, Search, Loader2 } from 'lucide-react';
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

interface EmojiPickerProps {
  onSelect: (emoji: string, emojiUrl?: string) => void;
}

export function EmojiPickerSimple({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load emojis from local JSON on mount
  useEffect(() => {
    const loadEmojis = async () => {
      setLoading(true);
      setError(null);
      try {
        const allEmojis = await emojiService.getAllEmojis();
        console.log('[EmojiPickerSimple] ✅ Total emojis loaded from emoji.json:', allEmojis.length);
        setEmojis(allEmojis);
      } catch (err) {
        console.error('[EmojiPickerSimple] Failed to load emojis:', err);
        setError('Failed to load emojis');
      } finally {
        setLoading(false);
      }
    };
    loadEmojis();
  }, []);

  // Sort by CATEGORY_ORDER and filter by search - ONE SINGLE FLAT LIST
  const sortedEmojis = useMemo(() => {
    // Sort by category order (stable sort preserves original order within same category)
    const sorted = [...emojis].sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.category || '');
      const indexB = CATEGORY_ORDER.indexOf(b.category || '');
      const orderA = indexA === -1 ? CATEGORY_ORDER.length : indexA;
      const orderB = indexB === -1 ? CATEGORY_ORDER.length : indexB;
      return orderA - orderB;
    });

    if (!searchQuery.trim()) {
      return sorted;
    }

    const query = searchQuery.toLowerCase();
    return sorted.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.category?.toLowerCase().includes(query)
    );
  }, [emojis, searchQuery]);

  // PROOF: Log rendered count
  useEffect(() => {
    if (!loading && emojis.length > 0) {
      console.log('[EmojiPickerSimple] Rendered emojis count:', sortedEmojis.length);
    }
  }, [sortedEmojis.length, loading, emojis.length]);

  const handleSelect = (emoji: EmojiData) => {
    onSelect(emoji.url, emoji.url);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Smile className="h-4 w-4" />
          Add Emoji
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Search only - NO CATEGORY UI */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* ONE SINGLE FLAT EMOJI GRID - NO CATEGORIES, NO HEADERS, NO TABS */}
        <ScrollArea className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full py-8 text-destructive text-sm">
              {error}
            </div>
          ) : sortedEmojis.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8 text-muted-foreground text-sm">
              No emojis found
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1 p-2">
              {/* SINGLE .map() - ONE FLAT LIST */}
              {sortedEmojis.map((emoji, index) => (
                <button
                  key={`${emoji.emoji}-${index}`}
                  onClick={() => handleSelect(emoji)}
                  className="p-1 hover:bg-accent rounded flex items-center justify-center"
                  title={emoji.name}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.name}
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer with count */}
        <div className="px-2 py-1.5 border-t border-border text-xs text-muted-foreground">
          {sortedEmojis.length} emojis
        </div>
      </PopoverContent>
    </Popover>
  );
}
