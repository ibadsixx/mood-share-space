import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Users, Lock } from 'lucide-react';
import { OtherName } from '@/hooks/useOtherNames';

interface OtherNamesFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    type: string;
    name: string;
    show_at_top: boolean;
    visibility: string;
  }) => Promise<void>;
  initialData?: {
    type: string;
    name: string;
    show_at_top: boolean;
    visibility: string;
  };
  loading?: boolean;
}

const nameTypes = [
  { value: 'nickname', label: 'Nickname' },
  { value: 'birth_name', label: 'Birth name' },
  { value: 'married_name', label: 'Married name' },
  { value: 'other', label: 'Other' },
];

const visibilityOptions = [
  { value: 'public', label: 'Public', icon: Eye },
  { value: 'friends', label: 'Friends', icon: Users },
  { value: 'private', label: 'Private', icon: Lock },
];

export const OtherNamesForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  loading = false 
}: OtherNamesFormProps) => {
  const [type, setType] = useState(initialData?.type || '');
  const [name, setName] = useState(initialData?.name || '');
  const [showAtTop, setShowAtTop] = useState(initialData?.show_at_top || false);
  const [visibility, setVisibility] = useState(initialData?.visibility || 'public');

  const handleSave = async () => {
    if (!type || !name.trim()) {
      return;
    }

    await onSave({
      type,
      name: name.trim(),
      show_at_top: showAtTop,
      visibility
    });
  };

  const handleClose = () => {
    setType(initialData?.type || '');
    setName(initialData?.name || '');
    setShowAtTop(initialData?.show_at_top || false);
    setVisibility(initialData?.visibility || 'public');
    onClose();
  };

  const isValid = type && name.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Other Name' : 'Add Other Name'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select name type" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {nameTypes.map((nameType) => (
                  <SelectItem key={nameType.value} value={nameType.value}>
                    {nameType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              maxLength={100}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-at-top"
              checked={showAtTop}
              onCheckedChange={(checked) => setShowAtTop(!!checked)}
            />
            <Label 
              htmlFor="show-at-top" 
              className="text-sm font-normal cursor-pointer"
            >
              Show at top of profile
            </Label>
          </div>

          <div>
            <Label>Who can see this?</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !isValid}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};