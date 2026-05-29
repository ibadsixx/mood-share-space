import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, BarChart3, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChannelPolls } from '@/hooks/useChannelPolls';

interface CreatePollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  currentUserId: string;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
}) => {
  const { toast } = useToast();
  const { createPoll, loading } = useChannelPolls(conversationId);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    if (open) {
      setQuestion('');
      setOptions(['', '']);
    }
  }, [open]);

  const addOption = () => {
    if (options.length >= 10) {
      toast({ title: 'Maximum 10 options', variant: 'destructive' });
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleCreate = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast({ title: 'Error', description: 'Please enter a poll question', variant: 'destructive' });
      return;
    }
    const trimmedOptions = options.map(o => o.trim()).filter(o => o);
    if (trimmedOptions.length < 2) {
      toast({ title: 'Error', description: 'Please enter at least 2 options', variant: 'destructive' });
      return;
    }

    const result = await createPoll(trimmedQuestion, trimmedOptions, currentUserId);
    if (result) {
      toast({ title: 'Poll created', description: 'Your poll has been posted' });
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: 'Failed to create poll', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Textarea
              id="poll-question"
              placeholder="Ask something..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Options ({options.length}/10)</Label>
            <div className="space-y-1.5">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      className="h-9 w-9 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="w-full gap-1 text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Post Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
