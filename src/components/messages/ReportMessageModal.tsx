import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReport: (reason: string, details?: string) => Promise<boolean>;
  userName?: string;
}

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'self_harm', label: 'Suicide or self-injury', hasSubcategories: true },
  { value: 'impersonation', label: 'Pretending to be someone else' },
  { value: 'violence', label: 'Violence or dangerous organizations' },
  { value: 'nudity', label: 'Nudity or sexual activity' },
  { value: 'illegal_goods', label: 'Selling or promoting restricted items' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
];

const SELF_HARM_SUBCATEGORIES = [
  { value: 'self_harm_suicide', label: 'Suicide or self-injury' },
  { value: 'self_harm_eating', label: 'Eating disorder' },
];

export const ReportMessageModal: React.FC<ReportMessageModalProps> = ({
  open,
  onOpenChange,
  onReport,
  userName,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [step, setStep] = useState<'reasons' | 'subcategory' | 'confirm'>('reasons');

  const handleClose = (val: boolean) => {
    if (!val) {
      setSelectedReason(null);
      setStep('reasons');
    }
    onOpenChange(val);
  };

  const handleReasonSelect = (value: string) => {
    const reason = REPORT_REASONS.find(r => r.value === value);
    if (reason?.hasSubcategories) {
      setStep('subcategory');
    } else {
      setSelectedReason(value);
      setStep('confirm');
    }
  };

  const handleSubcategorySelect = (value: string) => {
    setSelectedReason(value);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    const success = await onReport(selectedReason);
    setSubmitting(false);
    if (success) {
      setSelectedReason(null);
      setStep('reasons');
      onOpenChange(false);
    }
  };

  // Subcategory step (for self_harm)
  if (step === 'subcategory') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => setStep('reasons')}
              className="p-1 rounded-full hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          </div>
          <div className="px-6 pb-4">
            <DialogTitle className="text-lg font-bold text-foreground">
              Which best describes this problem?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              We won't let the person know who reported them.
            </DialogDescription>
          </div>
          <div className="flex flex-col pb-4">
            {SELF_HARM_SUBCATEGORIES.map((item) => (
              <button
                key={item.value}
                onClick={() => handleSubcategorySelect(item.value)}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-accent transition-colors text-left"
              >
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Confirmation step
  if (step === 'confirm') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={() => {
                setSelectedReason(null);
                setStep('reasons');
              }}
              className="p-1 rounded-full hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <DialogTitle className="text-base font-bold text-foreground">
              Submit report?
            </DialogTitle>
            <div className="w-7" />
          </div>

          <div className="p-6 space-y-3">
            <DialogDescription className="text-sm text-foreground">
              Send recent messages from this conversation to be reviewed.
            </DialogDescription>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-primary hover:underline"
            >
              Learn more about reporting.
            </a>
          </div>

          <div className="px-6 pb-6">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Reason selection step
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-bold text-foreground">
            Select a problem to report
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We won't let the person know who reported them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          {REPORT_REASONS.map((item) => (
            <button
              key={item.value}
              onClick={() => handleReasonSelect(item.value)}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-accent transition-colors text-left"
            >
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        <div className="mx-6 mb-6 mt-2 flex items-start gap-3 rounded-lg bg-muted p-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {userName || 'User'}, if someone is in immediate danger, call local emergency services. Don't wait.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
