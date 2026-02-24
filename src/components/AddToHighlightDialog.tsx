import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStoryHighlights } from '@/hooks/useStoryHighlights';
import { Plus, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddToHighlightDialogProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddToHighlightDialog = ({ storyId, open, onOpenChange }: AddToHighlightDialogProps) => {
  const { highlights, createHighlight, addStoryToHighlight } = useStoryHighlights();
  const [newHighlightName, setNewHighlightName] = useState('');
  const [showNewHighlight, setShowNewHighlight] = useState(false);

  const handleCreateAndAdd = async () => {
    if (!newHighlightName.trim()) return;
    
    const highlight = await createHighlight(newHighlightName);
    if (highlight) {
      await addStoryToHighlight(highlight.id, storyId);
      setNewHighlightName('');
      setShowNewHighlight(false);
      onOpenChange(false);
    }
  };

  const handleAddToExisting = async (highlightId: string) => {
    await addStoryToHighlight(highlightId, storyId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Highlight</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {/* Create new highlight */}
            {!showNewHighlight ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowNewHighlight(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Highlight
              </Button>
            ) : (
              <div className="flex gap-2 p-2 border rounded-lg">
                <Input
                  placeholder="Highlight name"
                  value={newHighlightName}
                  onChange={(e) => setNewHighlightName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                />
                <Button onClick={handleCreateAndAdd} size="icon">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Existing highlights */}
            {highlights.map((highlight) => (
              <Button
                key={highlight.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddToExisting(highlight.id)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 mr-3 flex-shrink-0" 
                  style={{ 
                    backgroundImage: highlight.cover_image ? `url(${highlight.cover_image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <span className="truncate">{highlight.title}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddToHighlightDialog;
