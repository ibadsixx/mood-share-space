import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';
import { emojiService, EmojiData } from '../services/emojiService';
import { Emoji } from './Emoji';

export interface FeelingData {
  type: string;
  emoji: string;
  text: string;
  targetText?: string;
  targetId?: string;
}

interface FeelingPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (feeling: FeelingData) => void;
  initialFeeling?: FeelingData | null;
}

const ACTIVITY_TYPES = [
  { value: 'feeling', label: 'feeling' },
  { value: 'watching', label: 'watching' },
  { value: 'listening', label: 'listening to' },
  { value: 'reading', label: 'reading' },
  { value: 'celebrating', label: 'celebrating' },
  { value: 'traveling', label: 'traveling to' },
  { value: 'working', label: 'working on' },
  { value: 'eating', label: 'eating' },
  { value: 'playing', label: 'playing' }
];

const FEELING_SUGGESTIONS = {
  'feeling': ['happy', 'excited', 'grateful', 'blessed', 'amazing', 'fantastic', 'wonderful', 'sad', 'tired', 'stressed'],
  'watching': ['a movie', 'Netflix', 'YouTube', 'TV series', 'documentary'],
  'listening': ['music', 'podcast', 'audio book', 'radio'],
  'reading': ['a book', 'news', 'article', 'magazine'],
  'celebrating': ['birthday', 'anniversary', 'achievement', 'milestone'],
  'traveling': ['vacation', 'business trip', 'adventure', 'city', 'country'],
  'working': ['project', 'assignment', 'presentation', 'coding'],
  'eating': ['dinner', 'lunch', 'breakfast', 'snack', 'dessert'],
  'playing': ['game', 'sport', 'music', 'video games']
};

export const FeelingPicker = ({ open, onOpenChange, onSave, initialFeeling }: FeelingPickerProps) => {
  const [selectedType, setSelectedType] = useState(initialFeeling?.type || 'feeling');
  const [selectedEmoji, setSelectedEmoji] = useState(initialFeeling?.emoji || '');
  const [feelingText, setFeelingText] = useState(initialFeeling?.text || '');
  const [targetText, setTargetText] = useState(initialFeeling?.targetText || '');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const [filteredEmojis, setFilteredEmojis] = useState<EmojiData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load emojis when dialog opens
  useEffect(() => {
    const loadEmojis = async () => {
      if (!open) return;
      
      setLoading(true);
      const allEmojis = await emojiService.getAllEmojis();
      setEmojis(allEmojis);
      
      // Filter to common feelings/emotions emojis
      const commonEmojis = allEmojis.filter(emoji => 
        emoji.name.includes('smile') ||
        emoji.name.includes('happy') ||
        emoji.name.includes('sad') ||
        emoji.name.includes('love') ||
        emoji.name.includes('heart') ||
        emoji.name.includes('laugh') ||
        emoji.name.includes('joy') ||
        emoji.name.includes('excited') ||
        emoji.name.includes('cool') ||
        emoji.name.includes('party') ||
        emoji.name.includes('fire') ||
        emoji.name.includes('star')
      ).slice(0, 50);
      
      setFilteredEmojis(commonEmojis);
      setLoading(false);
    };

    loadEmojis();
  }, [open]);

  // Filter emojis based on search
  useEffect(() => {
    if (!emojiSearch.trim()) {
      // Show common emojis when no search
      const commonEmojis = emojis.filter(emoji => 
        emoji.name.includes('smile') ||
        emoji.name.includes('happy') ||
        emoji.name.includes('sad') ||
        emoji.name.includes('love') ||
        emoji.name.includes('heart') ||
        emoji.name.includes('laugh') ||
        emoji.name.includes('joy') ||
        emoji.name.includes('excited') ||
        emoji.name.includes('cool') ||
        emoji.name.includes('party') ||
        emoji.name.includes('fire') ||
        emoji.name.includes('star')
      ).slice(0, 50);
      setFilteredEmojis(commonEmojis);
      return;
    }

    const filtered = emojis.filter(emoji =>
      emoji.name.toLowerCase().includes(emojiSearch.toLowerCase()) ||
      emoji.emoji.includes(emojiSearch)
    ).slice(0, 30);
    
    setFilteredEmojis(filtered);
  }, [emojiSearch, emojis]);

  const handleSave = () => {
    if (!selectedEmoji || !feelingText) return;

    const feeling: FeelingData = {
      type: selectedType,
      emoji: selectedEmoji,
      text: feelingText,
      targetText: targetText || undefined
    };

    onSave(feeling);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getPreviewText = () => {
    if (!selectedEmoji || !feelingText) return '';
    
    const typeLabel = ACTIVITY_TYPES.find(t => t.value === selectedType)?.label || selectedType;
    let preview = `${selectedEmoji} ${typeLabel} ${feelingText}`;
    
    if (targetText) {
      preview += ` ${targetText}`;
    }
    
    return preview;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How are you feeling?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <AnimatePresence>
            {getPreviewText() && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-muted rounded-lg"
              >
                <p className="text-sm text-muted-foreground">Preview:</p>
                <p className="font-medium">Your Name {getPreviewText()}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity Type */}
          <div className="space-y-2">
            <Label>Activity</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Emoji Search and Selection */}
          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emojis..."
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <ScrollArea className="h-48 w-full rounded-md border p-2">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-muted-foreground">Loading emojis...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-2">
                    {filteredEmojis.map((emojiData, index) => (
                      <Button
                        key={`${emojiData.emoji}-${index}`}
                        variant={selectedEmoji === emojiData.emoji ? "default" : "ghost"}
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setSelectedEmoji(emojiData.emoji)}
                        title={emojiData.name}
                      >
                        <Emoji
                          url={emojiData.url}
                          alt={emojiData.name}
                          size={20}
                        />
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Feeling Text */}
          <div className="space-y-2">
            <Label>
              {selectedType === 'feeling' ? 'How are you feeling?' : 
               selectedType === 'watching' ? 'What are you watching?' :
               selectedType === 'listening' ? 'What are you listening to?' :
               selectedType === 'reading' ? 'What are you reading?' :
               'What are you doing?'}
            </Label>
            <Input
              placeholder={`e.g., ${FEELING_SUGGESTIONS[selectedType as keyof typeof FEELING_SUGGESTIONS]?.[0] || 'great'}`}
              value={feelingText}
              onChange={(e) => setFeelingText(e.target.value)}
            />
            {FEELING_SUGGESTIONS[selectedType as keyof typeof FEELING_SUGGESTIONS] && (
              <div className="flex flex-wrap gap-1">
                {FEELING_SUGGESTIONS[selectedType as keyof typeof FEELING_SUGGESTIONS].slice(0, 5).map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setFeelingText(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Target Text (optional) */}
          {selectedType !== 'feeling' && (
            <div className="space-y-2">
              <Label>Specific item (optional)</Label>
              <Input
                placeholder={`e.g., "${selectedType === 'watching' ? 'Stranger Things' : 
                              selectedType === 'listening' ? 'Blinding Lights - The Weeknd' :
                              selectedType === 'reading' ? 'The Great Gatsby' :
                              'JavaScript'}"` }
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!selectedEmoji || !feelingText}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};