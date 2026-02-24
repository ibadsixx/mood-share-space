import React from 'react';
import { MapPin, X } from 'lucide-react';
import { LocationData } from '@/hooks/useLocation';

interface LocationCardProps {
  location: LocationData;
  onRemove?: () => void;
  onClick?: () => void;
  showRemove?: boolean;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  onRemove,
  onClick,
  showRemove = true
}) => {
  return (
    <div 
      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-card-foreground truncate">
          {location.display_name || location.name}
        </div>
        {location.address && location.address !== location.display_name && (
          <div className="text-xs text-muted-foreground truncate">
            {location.address}
          </div>
        )}
      </div>

      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-destructive" />
        </button>
      )}
    </div>
  );
};