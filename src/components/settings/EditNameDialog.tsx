import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useOtherNames } from '@/hooks/useOtherNames';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ManageOtherNamesDialog from './ManageOtherNamesDialog';

interface EditNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

const EditNameDialog: React.FC<EditNameDialogProps> = ({ open, onOpenChange, onBack }) => {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [otherNamesOpen, setOtherNamesOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName((profile as any).first_name || profile.display_name?.split(' ')[0] || '');
      setMiddleName((profile as any).middle_name || '');
      setLastName((profile as any).last_name || profile.display_name?.split(' ').slice(1).join(' ') || '');
    }
  }, [profile, open]);

  const canChangeName = () => {
    const lastChanged = (profile as any)?.name_changed_at;
    if (!lastChanged) return true;
    const daysSince = (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 60;
  };

  const handleReviewChange = async () => {
    if (!user?.id || !firstName.trim()) return;

    if (!canChangeName()) {
      toast({
        title: 'Cannot change name',
        description: 'You can only change your name once every 60 days.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const displayName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim() || null,
          display_name: displayName,
          name_changed_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      await refetch();
      toast({ title: 'Success', description: 'Name updated successfully.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open && !otherNamesOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {onBack && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <DialogTitle>Name</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name" className="text-xs text-muted-foreground">First name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="middle-name" className="text-xs text-muted-foreground">Middle name</Label>
                <Input
                  id="middle-name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name" className="text-xs text-muted-foreground">Last name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              If you change your name, you can't change it again for 60 days. Don't add any unusual capitalization, punctuation, characters or random words.{' '}
              <span className="text-primary cursor-pointer hover:underline">Learn more</span>
            </p>

            <Separator />

            <div>
              <h3 className="font-semibold text-foreground text-sm">Other names</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Other names are always public and help people find you.
              </p>
            </div>

            <div className="border rounded-lg border-border/50 overflow-hidden">
              <button
                onClick={() => setOtherNamesOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <span className="font-medium text-foreground text-sm">Manage other names</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <Separator />
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <span className="font-medium text-foreground text-sm">Manage language-specific names</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <Button
              onClick={handleReviewChange}
              disabled={!firstName.trim() || saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Review change'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ManageOtherNamesDialog
        open={otherNamesOpen}
        onOpenChange={setOtherNamesOpen}
        onBack={() => setOtherNamesOpen(false)}
      />
    </>
  );
};

export default EditNameDialog;
