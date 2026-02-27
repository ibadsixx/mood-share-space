import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EditUsernameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

const EditUsernameDialog: React.FC<EditUsernameDialogProps> = ({ open, onOpenChange, onBack }) => {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setUsername(profile.username || '');
    }
  }, [profile, open]);

  const handleClear = () => setUsername('');

  const handleDone = async () => {
    if (!user?.id || !username.trim()) return;

    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(trimmed)) {
      toast({
        title: 'Invalid username',
        description: 'Username must be 3-30 characters and can only contain letters, numbers, dots and underscores.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .neq('id', user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Username taken', description: 'This username is already in use.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id);

      if (error) throw error;

      await refetch();
      toast({ title: 'Success', description: 'Username updated.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>Username</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Changing your username will also change your profile URL.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs text-muted-foreground">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="bg-background pr-10"
              />
              {username && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <Button onClick={handleDone} disabled={!username.trim() || saving} className="w-full">
            {saving ? 'Saving...' : 'Done'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUsernameDialog;
