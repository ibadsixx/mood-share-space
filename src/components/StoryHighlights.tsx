import { useState } from 'react';
import { useStoryHighlights } from '@/hooks/useStoryHighlights';
import { Card } from '@/components/ui/card';
import { Plus, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import StoryViewer from './StoryViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import HighlightsManager from './HighlightsManager';

interface StoryHighlightsProps {
  userId?: string;
}

const StoryHighlights = ({ userId }: StoryHighlightsProps) => {
  const { highlights, createHighlight, loading } = useStoryHighlights(userId);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [newHighlightName, setNewHighlightName] = useState('');

  const handleCreateHighlight = async () => {
    if (!newHighlightName.trim()) return;
    
    await createHighlight(newHighlightName);
    setNewHighlightName('');
    setCreateDialogOpen(false);
  };

  const handleHighlightClick = (highlight: any) => {
    if (highlight.items && highlight.items.length > 0) {
      setSelectedHighlight(highlight);
      setViewerOpen(true);
    }
  };

  if (loading || highlights.length === 0) return null;

  return (
    <>
      <div className="w-full py-4 border-b border-border">
        <div className="px-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Story Highlights</h3>
            {!userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManageDialogOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {/* Create highlight button (only for own profile) */}
            {!userId && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Card className="w-20 h-20 rounded-full flex items-center justify-center bg-accent hover:bg-accent/80 transition-colors">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                      </Card>
                      <span className="text-xs text-center max-w-[80px] truncate">New</span>
                    </div>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Create Highlight</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Highlight name"
                      value={newHighlightName}
                      onChange={(e) => setNewHighlightName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateHighlight()}
                    />
                    <Button onClick={handleCreateHighlight} className="w-full">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Highlight circles */}
            {highlights.map((highlight) => (
              <motion.div
                key={highlight.id}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 cursor-pointer"
                onClick={() => handleHighlightClick(highlight)}
              >
                <div className="flex flex-col items-center gap-2">
                  <Card className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary p-0.5">
                    <div 
                      className="w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/50"
                      style={{
                        backgroundImage: highlight.cover_image || highlight.items?.[0]?.story?.media_url
                          ? `url(${highlight.cover_image || highlight.items[0].story.media_url})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  </Card>
                  <span className="text-xs text-center max-w-[80px] truncate">{highlight.title}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Viewer for highlights */}
      {selectedHighlight && selectedHighlight.items && (
        <StoryViewer
          stories={selectedHighlight.items.map((item: any) => ({
            id: item.story_id,
            user_id: selectedHighlight.user_id,
            media_url: item.story.media_url,
            media_type: item.story.media_type,
            caption: item.story.caption,
            created_at: item.story.created_at,
            expires_at: null,
            views: 0,
            viewed_by: []
          }))}
          username=""
          displayName={selectedHighlight.title}
          profilePic={selectedHighlight.cover_image}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          onView={() => {}}
        />
      )}
      
      {/* Highlights Manager */}
      <HighlightsManager
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
      />
    </>
  );
};

export default StoryHighlights;
