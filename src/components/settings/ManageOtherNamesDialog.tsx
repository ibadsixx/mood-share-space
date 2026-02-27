import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOtherNames } from '@/hooks/useOtherNames';

interface ManageOtherNamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
}

const NAME_TYPES = [
  'Nickname',
  'Maiden name',
  'Birth name',
  'Name with title',
  'Other',
];

const ManageOtherNamesDialog: React.FC<ManageOtherNamesDialogProps> = ({ open, onOpenChange, onBack }) => {
  const { user } = useAuth();
  const { otherNames, createOtherName, deleteOtherName } = useOtherNames(user?.id);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState('Nickname');
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!user?.id || !newName.trim()) return;
    const result = await createOtherName({
      user_id: user.id,
      type: newType,
      name: newName.trim(),
      show_at_top: false,
      visibility: 'public',
    });
    if (result.success) {
      setNewName('');
      setAdding(false);
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
            <DialogTitle>Other names</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {otherNames.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-4">No other names added yet.</p>
          )}

          {otherNames.map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-border/50 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.type}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteOtherName(item.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}

          {adding ? (
            <div className="space-y-3 border border-border/50 rounded-lg p-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NAME_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add other name
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageOtherNamesDialog;
