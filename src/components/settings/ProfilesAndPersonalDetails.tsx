import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, Plus, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type SubView = 'main' | 'contact' | 'birthday' | 'profile-detail';

const ProfilesAndPersonalDetails: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const { toast } = useToast();
  const [subView, setSubView] = useState<SubView>('main');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');

  useEffect(() => {
    if (user) setEmail(user.email || '');
    if (profile) setBirthday(profile.birthday || '');
  }, [user, profile]);

  const handleSaveContact = async () => {
    if (!user?.id) return;
    try {
      if (email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
      toast({ title: 'Success', description: 'Contact info updated.' });
      setSubView('main');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveBirthday = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ birthday })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Birthday updated.' });
      setSubView('main');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (subView === 'profile-detail') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSubView('main')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-semibold text-foreground">Profile details</h2>
        </div>

        <div className="flex flex-col items-center gap-2 py-4">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile?.profile_pic || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {profile?.display_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <p className="text-lg font-semibold text-foreground">{profile?.display_name || 'User'}</p>
          <p className="text-sm text-muted-foreground">Tone</p>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {[
              { label: 'Display name' },
              { label: 'Username' },
              { label: 'Profile picture' },
              { label: 'Bio' },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.label}>
                <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors text-left">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                {idx < arr.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4">
            <p className="font-medium text-foreground text-sm">Profile changes apply to this app only</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your display name and username are unique to this platform. You can update them at any time from your profile settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subView === 'contact') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSubView('main')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Contact info</h2>
            <p className="text-muted-foreground text-sm">Manage your email and phone number.</p>
          </div>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add phone number" />
            </div>
            <Button onClick={handleSaveContact}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subView === 'birthday') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSubView('main')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Birthday</h2>
            <p className="text-muted-foreground text-sm">Manage your date of birth.</p>
          </div>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Date of birth</Label>
              <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            <Button onClick={handleSaveBirthday}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Profiles and personal details</h2>
        <p className="text-muted-foreground">
          Review the profiles and personal details you've added to this account. Add more profiles by adding your accounts.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Profiles</h3>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => setSubView('profile-detail')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profile?.profile_pic || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{profile?.display_name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">Tone</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <Separator />
            <div className="px-4 py-3">
              <button className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add accounts
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Personal details</h3>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => setSubView('contact')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors text-left"
            >
              <div>
                <p className="font-medium text-foreground">Contact info</p>
                <p className="text-sm text-muted-foreground">{user?.email || 'No email set'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <Separator />
            <button
              onClick={() => setSubView('birthday')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent/50 transition-colors text-left"
            >
              <div>
                <p className="font-medium text-foreground">Birthday</p>
                <p className="text-sm text-muted-foreground">{formatBirthday(profile?.birthday || null)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilesAndPersonalDetails;
