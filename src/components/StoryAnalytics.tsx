import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStoryAnalytics } from '@/hooks/useStoryAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StoryAnalyticsProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StoryAnalytics = ({ storyId, open, onOpenChange }: StoryAnalyticsProps) => {
  const { views, loading } = useStoryAnalytics(storyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Story Views ({views.length})
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : views.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No views yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {views.map((view) => (
                <div key={view.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={view.viewer?.profile_pic || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {view.viewer?.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {view.viewer?.display_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryAnalytics;
