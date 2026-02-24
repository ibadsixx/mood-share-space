// TimelineAddClipButton - "+" button at end of timeline to add new clips
import { useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { VideoLayer, ImageLayer } from '@/types/editor';
import { uploadVideo, getVideoMetadata } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_IMAGE_DURATION = 3; // seconds

interface TimelineAddClipButtonProps {
  position: number; // x position in pixels
  onAddVideoClip: (clip: Omit<VideoLayer, 'id'>) => void;
  onAddImageClip: (clip: Omit<ImageLayer, 'id'>) => void;
  lastClipEnd: number; // Time in seconds where the new clip should start
}

export function TimelineAddClipButton({
  position,
  onAddVideoClip,
  onAddImageClip,
  lastClipEnd,
}: TimelineAddClipButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleClick = () => {
    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to add clips.',
        variant: 'destructive',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to add clips.',
        variant: 'destructive',
      });
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a video or image file.',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 100MB for videos, 10MB for images)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${isVideo ? '100MB' : '10MB'}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('[TimelineAddClip] 📤 Uploading:', file.name);
      
      // Use shared upload utility
      const { publicUrl } = await uploadVideo(file, user.id, { folder: 'clips' });
      
      console.log('[TimelineAddClip] ✅ UPLOAD COMPLETE:', publicUrl);

      if (isVideo) {
        // Get video duration from uploaded URL
        const metadata = await getVideoMetadata(publicUrl);
        
        const videoClip: Omit<VideoLayer, 'id'> = {
          type: 'video',
          src: publicUrl,
          fileName: file.name,
          start: lastClipEnd,
          end: lastClipEnd + metadata.duration,
          duration: metadata.duration,
          volume: 1,
          position: { x: 50, y: 50 },
          scale: 1,
          rotation: 0,
          filter: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            temperature: 0,
            blur: 0,
          },
        };
        
        onAddVideoClip(videoClip);
        
        toast({
          title: 'Video added',
          description: `${file.name} added to timeline (${metadata.duration.toFixed(1)}s)`,
        });
      } else {
        // Image clip with default duration
        const imageClip: Omit<ImageLayer, 'id'> = {
          type: 'image',
          src: publicUrl,
          fileName: file.name,
          start: lastClipEnd,
          end: lastClipEnd + DEFAULT_IMAGE_DURATION,
          position: { x: 50, y: 50 },
          scale: 1,
          rotation: 0,
        };
        
        onAddImageClip(imageClip);
        
        toast({
          title: 'Image added',
          description: `${file.name} added to timeline (${DEFAULT_IMAGE_DURATION}s)`,
        });
      }
    } catch (error) {
      console.error('[TimelineAddClip] ❌ Error:', error);
      toast({
        title: 'Failed to add clip',
        description: error instanceof Error ? error.message : 'An error occurred while processing the file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div 
        className="absolute h-10 flex items-center justify-center"
        style={{ 
          left: `${position}px`,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all shadow-sm"
          onClick={handleClick}
          disabled={isUploading}
          title="Add video or image"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Plus className="h-4 w-4 text-primary" />
          )}
        </Button>
      </div>
    </>
  );
}
