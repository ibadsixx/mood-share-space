import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Mail, Phone, Plus, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContactInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = 'list' | 'edit-email' | 'edit-phone' | 'add-contact';

const ContactInfoDialog: React.FC<ContactInfoDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('list');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (open) {
      setView('list');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
    }
  }, [open, user]);

  const handleSaveEmail = async () => {
    if (!user?.id) return;
    try {
      if (email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Email updated.' });
      setView('list');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSavePhone = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) throw error;
      toast({ title: 'Success', description: 'Phone number updated.' });
      setView('list');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (view === 'edit-email') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('list')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle>Edit email</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
            <Button onClick={handleSaveEmail} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (view === 'edit-phone') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('list')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle>Edit phone number</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            <Button onClick={handleSavePhone} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Contact information</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Manage your mobile numbers and emails, and who can see your contact info. Use any of them to access any profiles or devices in this Accounts Center.
        </p>

        <div className="border rounded-lg border-border/50 overflow-hidden">
          {user?.email && (
            <button
              onClick={() => setView('edit-email')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">{user.email}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {user?.phone && (
            <>
              <Separator />
              <button
                onClick={() => setView('edit-phone')}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{user.phone}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}

          <Separator />
          <div className="px-4 py-3">
            <button
              onClick={() => setView('add-contact')}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add new contact
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactInfoDialog;
