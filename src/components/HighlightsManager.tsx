import { useState } from 'react';
import { useStoryHighlights } from '@/hooks/useStoryHighlights';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HighlightsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HighlightsManager = ({ open, onOpenChange }: HighlightsManagerProps) => {
  const { highlights, createHighlight, updateHighlight, deleteHighlight } = useStoryHighlights();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async (id: string) => {
    if (editTitle.trim()) {
      await updateHighlight(id, editTitle);
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this highlight? Stories will not be deleted.')) {
      await deleteHighlight(id);
    }
  };

  const handleCreate = async () => {
    if (newTitle.trim()) {
      await createHighlight(newTitle);
      setNewTitle('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Highlights</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New highlight name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {highlights.map((highlight) => (
                <Card key={highlight.id} className="p-3">
                  {editingId === highlight.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(highlight.id)}
                      />
                      <Button onClick={() => handleSaveEdit(highlight.id)} size="sm">
                        Save
                      </Button>
                      <Button onClick={() => setEditingId(null)} variant="ghost" size="sm">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50"
                          style={{
                            backgroundImage: highlight.cover_image || highlight.items?.[0]?.story?.media_url
                              ? `url(${highlight.cover_image || highlight.items[0].story.media_url})`
                              : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                        <div>
                          <p className="font-semibold">{highlight.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {highlight.items?.length || 0} stories
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(highlight.id, highlight.title)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(highlight.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighlightsManager;
