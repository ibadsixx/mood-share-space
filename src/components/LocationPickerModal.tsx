import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Search, Clock, Loader2 } from 'lucide-react';
import { LocationData, useLocation } from '@/hooks/useLocation';
import { LocationCard } from './LocationCard';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  selectedLocations?: LocationData[];
  multiple?: boolean;
  title?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  open,
  onClose,
  onSelect,
  selectedLocations = [],
  multiple = false,
  title = "Add Location"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [selectedItems, setSelectedItems] = useState<LocationData[]>(selectedLocations);
  
  const { loading, searchPlaces, getCurrentLocation, getRecentLocations, reverseGeocode, saveLocation, clearRecentLocations } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadRecentLocations();
      setSelectedItems(selectedLocations);
      // Try to get user's current location for better search results
      getCurrentLocation()
        .then(position => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        })
        .catch(() => {
          // Silent fail - use default center
        });
    }
  }, [open, selectedLocations, getCurrentLocation]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const results = await searchPlaces(searchQuery, mapCenter[0], mapCenter[1]);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchPlaces, mapCenter]);

  const loadRecentLocations = () => {
    const locations = getRecentLocations(20);
    setRecentLocations(locations);
  };

  const handleLocationSelect = (location: LocationData) => {
    if (!location) return;

    // Check for duplicates
    const isDuplicate = selectedItems.some(item => 
      (item.provider_place_id && item.provider_place_id === location.provider_place_id) ||
      (Math.abs(item.lat - location.lat) < 0.0001 && Math.abs(item.lng - location.lng) < 0.0001)
    );

    if (isDuplicate) {
      toast({
        title: 'Location Already Selected',
        description: 'This location is already in your list.',
        variant: 'destructive'
      });
      return;
    }

    // Ensure display_name is properly set
    const locationWithDisplayName = {
      ...location,
      provider_place_id: location.provider_place_id || `${location.lat},${location.lng}`,
      display_name: location.display_name || location.name || 
                   (location.city ? `${location.city}${location.region ? `, ${location.region}` : ''}${location.country ? `, ${location.country}` : ''}` : 
                    location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`)
    };

    // Save to recent locations
    saveLocation(locationWithDisplayName);
    
    if (multiple) {
      setSelectedItems(prev => [...prev, locationWithDisplayName]);
    } else {
      onSelect(locationWithDisplayName);
      onClose();
    }
  };

  const handleCurrentLocationClick = async () => {
    try {
      const position = await getCurrentLocation();
      const locationData = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      
      if (locationData) {
        const processedLocation = {
          ...locationData,
          provider_place_id: locationData.provider_place_id || `${position.coords.latitude},${position.coords.longitude}`,
          display_name: locationData.display_name || locationData.name || 
                       (locationData.city ? `${locationData.city}${locationData.region ? `, ${locationData.region}` : ''}${locationData.country ? `, ${locationData.country}` : ''}` : 
                        locationData.address || `Current Location`)
        };
        handleLocationSelect(processedLocation);
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

  const removeSelectedItem = (location: LocationData) => {
    setSelectedItems(prev => prev.filter(item => 
      !(item.provider_place_id === location.provider_place_id ||
        (Math.abs(item.lat - location.lat) < 0.0001 && Math.abs(item.lng - location.lng) < 0.0001))
    ));
  };

  const handleDone = () => {
    if (multiple && selectedItems.length > 0) {
      selectedItems.forEach(item => onSelect(item));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Selected items for multiple mode */}
        {multiple && selectedItems.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto border-b border-border pb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Selected Locations ({selectedItems.length})</h4>
            <div className="space-y-2">
              {selectedItems.map((location, index) => (
                <LocationCard
                  key={`${location.provider_place_id || location.name}-${index}`}
                  location={location}
                  onRemove={() => removeSelectedItem(location)}
                  showRemove={true}
                />
              ))}
            </div>
          </div>
        )}

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
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  Use Current Location
                </Button>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {searchResults.map((place) => (
                    <LocationCard
                      key={place.id}
                      location={place}
                      onClick={() => handleLocationSelect(place)}
                      showRemove={false}
                    />
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
                      onClick={() => {
                        clearRecentLocations();
                        setRecentLocations([]);
                        toast({
                          title: 'Recent Locations Cleared',
                          description: 'All recent locations have been removed.',
                        });
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Clock className="w-3 h-3 mr-1" />
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
                      <LocationCard
                        key={`${location.provider_place_id || location.name}-${index}`}
                        location={location}
                        onClick={() => handleLocationSelect(location)}
                        showRemove={false}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer buttons for multiple mode */}
        {multiple && (
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} location{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleDone}
                disabled={selectedItems.length === 0}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};