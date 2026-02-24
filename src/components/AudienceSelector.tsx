import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Globe, Users, Lock, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudienceSelection {
  type: 'public' | 'friends' | 'friends_except' | 'specific' | 'only_me' | 'custom_list';
  userIds?: string[];
  excludedUserIds?: string[];
  listId?: string;
  customListId?: string;
}

interface AudienceSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSelection: AudienceSelection;
  onSelect: (selection: AudienceSelection) => void;
}

interface AudienceSummaryProps {
  audience: AudienceSelection;
  className?: string;
  onClick?: () => void;
}

const audienceOptions = [
  { 
    type: 'public' as const, 
    label: 'Public', 
    description: 'Anyone on Tone',
    icon: Globe 
  },
  { 
    type: 'friends' as const, 
    label: 'Friends', 
    description: 'Your friends on Tone',
    icon: Users 
  },
  { 
    type: 'only_me' as const, 
    label: 'Only me', 
    description: 'Only you can see this',
    icon: Lock 
  },
  { 
    type: 'specific' as const, 
    label: 'Specific friends', 
    description: 'Choose specific friends',
    icon: Settings 
  }
];

export const AudienceSelector = ({ open, onOpenChange, currentSelection, onSelect }: AudienceSelectorProps) => {
  const handleSelect = (type: AudienceSelection['type']) => {
    onSelect({ type });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose audience</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {audienceOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = currentSelection.type === option.type;
            
            return (
              <button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="p-2 rounded-full bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AudienceSummary = ({ audience, className, onClick }: AudienceSummaryProps) => {
  const option = audienceOptions.find(opt => opt.type === audience.type);
  const Icon = option?.icon || Globe;
  
  return (
    <div 
      className={cn("flex items-center gap-1 text-muted-foreground", className)}
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs">{option?.label || 'Public'}</span>
    </div>
  );
};