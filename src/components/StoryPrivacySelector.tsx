import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Users, Lock, UserCheck } from 'lucide-react';

export type StoryPrivacy = "public" | "friends" | "close_friends" | "private";

interface StoryPrivacySelectorProps {
  value: StoryPrivacy;
  onChange: (value: StoryPrivacy) => void;
  className?: string;
}

const privacyOptions = [
  { 
    value: "public" as const, 
    label: "Public", 
    icon: Globe, 
    description: "Anyone can see this story" 
  },
  { 
    value: "friends" as const, 
    label: "Friends", 
    icon: Users, 
    description: "Only your friends can see this" 
  },
  { 
    value: "close_friends" as const, 
    label: "Close Friends", 
    icon: UserCheck, 
    description: "Only your close friends can see this" 
  },
  { 
    value: "private" as const, 
    label: "Only Me", 
    icon: Lock, 
    description: "Only you can see this" 
  }
];

export const StoryPrivacySelector = ({ 
  value, 
  onChange, 
  className 
}: StoryPrivacySelectorProps) => {
  const selectedOption = privacyOptions.find(option => option.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as StoryPrivacy)}>
      <SelectTrigger className={className}>
        <SelectValue>
          {selectedOption && (
            <div className="flex items-center gap-2">
              <selectedOption.icon className="h-4 w-4" />
              <span>{selectedOption.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {privacyOptions.map(option => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
