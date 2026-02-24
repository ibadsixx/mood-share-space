import { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ReelEmbedModalProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ReelEmbedModal = ({ reelId, isOpen, onClose }: ReelEmbedModalProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const baseUrl = window.location.origin;
  const embedCode = `<iframe src="${baseUrl}/reel/${reelId}" width="400" height="700" frameborder="0" allowfullscreen></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: 'Embed code copied',
        description: 'The embed code has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Failed to copy',
        description: 'Please try again or copy manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Code className="w-5 h-5 text-muted-foreground" />
            Embed this reel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Copy the code below to embed this reel on your website.
          </p>
          
          <div className="relative">
            <pre className="p-4 bg-secondary rounded-lg text-sm text-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono">
              {embedCode}
            </pre>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleCopy}
            className="flex-1 gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReelEmbedModal;
