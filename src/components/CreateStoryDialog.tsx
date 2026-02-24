import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideo, getVideoMetadata } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateStoryDialog = ({ open, onOpenChange }: CreateStoryDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    // Validate file size (50MB max)
    if (selectedFile.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    // Only handle video files
    if (selectedFile.type.startsWith('video/')) {
      console.log('[CreateStoryDialog] 📁 FILE DETAILS:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });

      if (selectedFile.size === 0) {
        alert('Selected file is empty');
        return;
      }

      if (!user?.id) {
        console.error('[CreateStoryDialog] ❌ User not authenticated');
        alert('Please log in to create a story');
        return;
      }

      setUploading(true);
      setUploadProgress('Uploading to storage...');
      
      try {
        // Use shared upload utility
        const { publicUrl } = await uploadVideo(selectedFile, user.id);
        
        console.log('[CreateStoryDialog] ✅ UPLOAD COMPLETE:', publicUrl);

        // Get video metadata
        setUploadProgress('Loading metadata...');
        const metadata = await getVideoMetadata(publicUrl);

        // Create editor project in database
        setUploadProgress('Creating project...');
        
        const projectJson = {
          tracks: [
            {
              id: 'track-video',
              type: 'video',
              clips: [
                {
                  id: `video-${Date.now()}`,
                  type: 'video',
                  src: publicUrl,
                  fileName: selectedFile.name,
                  start: 0,
                  end: metadata.duration,
                  duration: metadata.duration,
                  volume: 1,
                }
              ]
            }
          ],
          settings: {
            duration: metadata.duration,
            fps: 30,
            resolution: { width: 1080, height: 1920 },
            contentType: 'story',
          }
        };
        
        const { data: projectData, error: projectError } = await supabase
          .from('editor_projects')
          .insert({
            owner_id: user.id,
            title: selectedFile.name.replace(/\.[^/.]+$/, ''),
            project_json: projectJson,
            status: 'draft',
          })
          .select()
          .single();

        if (projectError) {
          console.error('[CreateStoryDialog] ❌ Project creation failed:', projectError);
          throw new Error('Failed to create project');
        }

        console.log('[PROJECT] ========================================');
        console.log('[PROJECT] saved -> id:', projectData.id);
        console.log('[PROJECT] video URL:', publicUrl);
        console.log('[PROJECT] ========================================');
        
        toast({
          title: 'Video uploaded',
          description: 'Opening editor...',
        });

        onOpenChange(false);
        
        // Navigate with projectId
        navigate(`/editor?projectId=${projectData.id}`);
        
      } catch (error) {
        console.error('[CreateStoryDialog] ❌ Failed:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload video');
      } finally {
        setUploading(false);
        setUploadProgress('');
      }
    } else {
      // Images still use old flow (for now)
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleClose = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{uploadProgress || 'Processing...'}</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">Video (MAX. 50MB)</p>
                  <p className="text-xs text-primary mt-2">Add filters, stickers & music</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
