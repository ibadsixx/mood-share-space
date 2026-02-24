import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image, Video, Plus, Upload } from 'lucide-react';
import { ImageLayer, VideoLayer } from '@/types/editor';
import { loadVideoMetadata } from '@/utils/videoMetadata';

interface MediaPanelProps {
  onAddImage: (image: Omit<ImageLayer, 'id'>) => void;
  onAddVideo: (video: Omit<VideoLayer, 'id'>) => void;
  videoDuration: number;
}

export function MediaPanel({ onAddImage, onAddVideo, videoDuration }: MediaPanelProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onAddImage({
        type: 'image',
        src: dataUrl,
        fileName: file.name,
        start: 0,
        end: videoDuration,
        position: { x: 50, y: 50 },
        scale: 0.5,
        rotation: 0,
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      
      try {
        const metadata = await loadVideoMetadata(dataUrl);
        onAddVideo({
          type: 'video',
          src: dataUrl,
          fileName: file.name,
          start: 0,
          end: Math.min(metadata.duration, videoDuration),
          duration: metadata.duration,
          volume: 0.5,
          position: { x: 50, y: 50 },
          scale: 0.5,
          rotation: 0,
        });
      } catch (error) {
        console.error('Failed to load video metadata:', error);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Image className="h-4 w-4" />
        <span>Media</span>
      </div>

      <div className="space-y-3">
        {/* Add Image */}
        <div className="space-y-2">
          <Label className="text-xs">Add Image Overlay</Label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => imageInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {/* Add Video */}
        <div className="space-y-2">
          <Label className="text-xs">Add Video Overlay</Label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => videoInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Tips:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Images will be added as overlays</li>
          <li>Videos will play alongside main video</li>
          <li>Drag to reposition on canvas</li>
          <li>Use timeline to adjust duration</li>
        </ul>
      </div>
    </div>
  );
}
