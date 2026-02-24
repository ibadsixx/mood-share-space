import { Button } from '@/components/ui/button';
import { useStoryArchive } from '@/hooks/useStoryArchive';
import { Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface StoryArchiveButtonProps {
  storyId: string;
  mediaUrl: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const StoryArchiveButton = ({ storyId, mediaUrl, variant = 'ghost', size = 'sm' }: StoryArchiveButtonProps) => {
  const { downloading, downloadStory } = useStoryArchive();

  const handleDownload = () => {
    downloadStory(storyId, mediaUrl);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={downloading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {size !== 'icon' && 'Archive'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Download Story?</AlertDialogTitle>
          <AlertDialogDescription>
            This will save your story to your device. You'll be able to keep it even after it expires from Tonex.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Downloading...' : 'Download'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default StoryArchiveButton;
