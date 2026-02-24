import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { useGifSearch, GifItem } from '@/hooks/useGifSearch';

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gif: GifItem) => void;
}

export const GifPicker = ({ open, onOpenChange, onSelectGif }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const { gifs, loading, error, searchGifs, fetchTrendingGifs } = useGifSearch();
  const debouncedSearchQuery = useDebounceValue(searchQuery, 500);

  // Load trending GIFs when component mounts or tab changes to trending
  useEffect(() => {
    if (open && activeTab === 'trending') {
      fetchTrendingGifs();
    }
  }, [open, activeTab, fetchTrendingGifs]);

  // Search GIFs when query changes
  useEffect(() => {
    if (activeTab === 'search' && debouncedSearchQuery) {
      searchGifs(debouncedSearchQuery);
    } else if (activeTab === 'search' && !debouncedSearchQuery) {
      // Clear results when search is empty
    }
  }, [activeTab, debouncedSearchQuery, searchGifs]);

  const handleGifSelect = (gif: GifItem) => {
    onSelectGif(gif);
    onOpenChange(false);
    setSearchQuery('');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'trending') {
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] !flex !flex-col !gap-0 !p-0 bg-background overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Choose a GIF</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trending" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 pt-4 shrink-0">
            {activeTab === 'search' ? (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for GIFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Popular GIFs right now
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="text-muted-foreground">
                  <p>Failed to load GIFs</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => activeTab === 'trending' ? fetchTrendingGifs() : searchGifs(searchQuery)}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : gifs.length === 0 && activeTab === 'search' && debouncedSearchQuery ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="text-muted-foreground">
                  <p>No GIFs found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleGifSelect(gif)}
                    className="group relative rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all aspect-square"
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Simple debouncing hook since we don't have it imported
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}