import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Search, Clock, Loader2, Trash2 } from 'lucide-react';
import { LocationData, PlaceResult, useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/use-toast';

interface LocationSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  selectedLocation?: LocationData;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedLocation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  
  const { loading, searchPlaces, getCurrentLocation, getRecentLocations, reverseGeocode, saveLocation, clearRecentLocations } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadRecentLocations();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchPlaces]);

  const loadRecentLocations = () => {
    const locations = getRecentLocations(20);
    setRecentLocations(locations);
  };

  const handleClearRecentLocations = () => {
    clearRecentLocations();
    setRecentLocations([]);
    toast({
      title: 'Recent Locations Cleared',
      description: 'All recent locations have been removed.',
    });
  };

  const handleLocationSelect = (location: LocationData) => {
    if (!location) return;

    // Save to recent locations first
    saveLocation(location);
    
    // Pass the full LocationData object to onSelect
    onSelect(location);
    onClose();
  };

  const handleCurrentLocationClick = async () => {
    try {
      const position = await getCurrentLocation();
      const locationData = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      
      if (locationData) {
        handleLocationSelect(locationData);
      } else {
        // Create a basic location from current coordinates if reverse geocoding fails
        const basicLocation: LocationData = {
          name: 'Current Location',
          display_name: 'Current Location',
          address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          provider: 'geolocation'
        };
        handleLocationSelect(basicLocation);
      }
    } catch (error) {
      // Error already handled in getCurrentLocation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Add Location
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Recent
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="search" className="mt-0 h-full overflow-hidden">
              <div className="space-y-4 h-full flex flex-col">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search for places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={handleCurrentLocationClick}
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {searchResults.map((place) => (
                    <Button
                      key={place.id}
                      variant="ghost"
                      onClick={() => handleLocationSelect(place)}
                      className="w-full justify-start h-auto p-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 mt-1 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{place.display_name || place.name}</div>
                          <div className="text-sm text-muted-foreground truncate">{place.address}</div>
                          {place.distance && (
                            <div className="text-xs text-muted-foreground">
                              {place.distance.toFixed(1)}km away
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recent" className="mt-0 h-full overflow-hidden">
              <div className="space-y-2 h-full flex flex-col">
                {recentLocations.length > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Recent locations</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearRecentLocations}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {recentLocations.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No recent locations</p>
                    </div>
                  ) : (
                    recentLocations.map((location, index) => (
                      <Button
                        key={`${location.provider_place_id || location.name}-${index}`}
                        variant="ghost"
                        onClick={() => handleLocationSelect(location)}
                        className="w-full justify-start h-auto p-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 mt-1 text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{location.display_name || location.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {location.address}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};