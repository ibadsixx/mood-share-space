import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface CoverRepositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverUrl: string | null;
  currentPosition: number;
  onPositionSave: (position: number) => void;
}

const CoverRepositionModal = ({ 
  open, 
  onOpenChange, 
  coverUrl, 
  currentPosition, 
  onPositionSave 
}: CoverRepositionModalProps) => {
  const [position, setPosition] = useState(currentPosition);

  const handleSave = () => {
    onPositionSave(position);
  };

  const previewStyle = coverUrl ? {
    backgroundImage: `url(${coverUrl})`,
    backgroundPosition: `center ${position}px`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat'
  } : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reposition Cover Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div 
              className="w-full h-48 rounded-lg border overflow-hidden bg-muted"
              style={previewStyle}
            >
              {!coverUrl && (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No cover photo selected
                </div>
              )}
            </div>
          </div>

          {/* Position Control */}
          {coverUrl && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vertical Position: {position}px</Label>
                <Slider
                  value={[position]}
                  onValueChange={(value) => setPosition(value[0])}
                  min={-200}
                  max={200}
                  step={5}
                  className="w-full"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                Drag the slider to adjust the vertical position of your cover photo.
                Negative values move the image up, positive values move it down.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setPosition(currentPosition);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!coverUrl}
            >
              Save Position
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoverRepositionModal;