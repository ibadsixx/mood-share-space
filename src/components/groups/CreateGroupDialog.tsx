import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface CreateGroupDialogProps {
  onCreateGroup: (name: string, description: string) => Promise<any>;
}

export const CreateGroupDialog = ({ onCreateGroup }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreateGroup(name.trim(), description.trim());
      setName('');
      setDescription('');
      setOpen(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your group..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};