import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Globe, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CreateGroupDialogProps {
  onCreateGroup: (name: string, description: string, privacy?: string, inviteFollowers?: boolean) => Promise<any>;
}

export const CreateGroupDialog = ({ onCreateGroup }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [inviteFollowers, setInviteFollowers] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreateGroup(name.trim(), '', privacy, inviteFollowers);
      setName('');
      setPrivacy('public');
      setInviteFollowers(true);
      setOpen(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-xl font-bold">Create group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Admin info */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>

          {/* Group name */}
          <div className="px-4 py-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="bg-muted/50 border-muted"
              required
            />
          </div>

          {/* Privacy selector */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                {privacy === 'public' ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Choose privacy</Label>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger className="h-7 border-0 p-0 shadow-none text-sm font-semibold focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {privacy === 'public'
                ? "Anyone can see who's in the group and what they post. You can change your group to private now or at a later time."
                : "Only members can see who's in the group and what they post. You can change your group to public later."}
            </p>
          </div>

          {/* Invite followers */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Invite followers</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send one-time group invites to current, active followers of your profile.
              </p>
            </div>
            <Switch checked={inviteFollowers} onCheckedChange={setInviteFollowers} />
          </div>

          {/* Create button */}
          <div className="p-4 pt-2 mt-auto">
            <Button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full"
              variant="secondary"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
