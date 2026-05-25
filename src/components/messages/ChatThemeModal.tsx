import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_OPTIONS } from './chatThemeOptions';

interface ChatThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTheme?: string;
  onSelectTheme: (themeId: string) => void;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  open,
  onOpenChange,
  currentTheme = 'default',
  onSelectTheme,
}) => {
  const [selected, setSelected] = useState(currentTheme);

  useEffect(() => {
    if (open) setSelected(currentTheme);
  }, [open, currentTheme, setSelected]);

  const handleApply = () => {
    onSelectTheme(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a theme</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 py-4">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelected(theme.id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 ring-offset-2 transition-all',
                  theme.gradient,
                  selected === theme.id
                    ? 'ring-primary'
                    : 'ring-transparent group-hover:ring-muted-foreground/30'
                )}
              >
                {selected === theme.id && (
                  <Check className="h-5 w-5 text-white drop-shadow" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{theme.name}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
