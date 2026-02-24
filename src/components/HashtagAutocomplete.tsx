import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp } from 'lucide-react';
import { useHashtagSearch } from '@/hooks/useHashtagSearch';
import { useNavigate } from 'react-router-dom';

interface HashtagAutocompleteProps {
  onSelect?: (tag: string) => void;
}

export const HashtagAutocomplete = ({ onSelect }: HashtagAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { results, loading } = useHashtagSearch(search);
  const navigate = useNavigate();

  const handleSelect = (tag: string) => {
    if (onSelect) {
      onSelect(tag);
    } else {
      navigate(`/hashtag/${tag}`);
    }
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Hash className="h-4 w-4" />
          Search Hashtags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search hashtags..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Searching...' : 'No hashtags found.'}
            </CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Hashtags">
                {results.map((hashtag) => (
                  <CommandItem
                    key={hashtag.id}
                    value={hashtag.tag}
                    onSelect={() => handleSelect(hashtag.tag)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span>#{hashtag.tag}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {hashtag.follower_count || 0}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
