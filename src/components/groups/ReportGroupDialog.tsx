import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReportGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous organizations' },
  { value: 'harassment', label: 'Bullying or harassment' },
  { value: 'hate_speech', label: 'Hate speech or symbols' },
  { value: 'false_info', label: 'False information' },
  { value: 'other', label: 'Something else' }
];

const ReportGroupDialog = ({ open, onOpenChange, groupName }: ReportGroupDialogProps) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Error",
        description: "Please select a reason for reporting",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe"
      });
      onOpenChange(false);
      setReason('');
      setDetails('');
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Group</DialogTitle>
          <DialogDescription>
            Help us understand what's happening with {groupName ? `"${groupName}"` : 'this group'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map((item) => (
              <div key={item.value} className="flex items-center space-x-2">
                <RadioGroupItem value={item.value} id={`group-report-${item.value}`} />
                <Label htmlFor={`group-report-${item.value}`} className="cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Additional details (optional)"
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGroupDialog;
