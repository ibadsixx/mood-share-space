import React from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationData } from '@/hooks/useLocation';

interface LocationChipProps {
  location: LocationData;
  onRemove?: () => void;
  onClick?: () => void;
  removable?: boolean;
  className?: string;
}

export const LocationChip: React.FC<LocationChipProps> = ({
  location,
  onRemove,
  onClick,
  removable = true,
  className = ''
}) => {
  return (
    <div 
      className={`inline-flex items-center gap-2 bg-accent/50 hover:bg-accent/70 border border-border/50 rounded-full px-3 py-2 text-sm transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <MapPin className="w-4 h-4 text-primary" />
      <div className="flex flex-col">
        <span className="font-medium leading-none">{location.display_name || location.name}</span>
        {location.address && (
          <span className="text-xs text-muted-foreground leading-none mt-0.5">
            {location.address}
          </span>
        )}
      </div>
      
      {removable && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};