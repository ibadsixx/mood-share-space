import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  id?: string;
  name: string;
  display_name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  provider: string;
  provider_place_id?: string;
}

export interface PlaceResult extends LocationData {
  distance?: number;
}

export const useLocation = () => {
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const { toast } = useToast();

  const searchPlaces = useCallback(async (query: string, userLat?: number, userLng?: number): Promise<PlaceResult[]> => {
    if (!query.trim() || query.trim().length < 2) {
      return [];
    }

    try {
      setLoading(true);
      
      // Use LocationIQ API
      const API_KEY = 'pk.f53d2c740bb67d77c8ba2fe3cec0d7fb';
      const searchUrl = `https://us1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=7`;

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      // Transform LocationIQ results to expected format
      const results: PlaceResult[] = data.map((item: any) => {
        const address = item.address || {};
        
        // Use display_name with fallbacks
        const displayName = item.display_name || 
                           address.city || 
                           address.town || 
                           address.county || 
                           address.state || 
                           address.country || 
                           'Location';
        
        // Extract main name from address components
        const mainName = address.amenity || 
                        address.shop || 
                        address.tourism ||
                        address.village || 
                        address.town || 
                        address.city || 
                        address.municipality || 
                        address.county || 
                        address.state ||
                        address.country || 
                        item.name || 
                        displayName;

        return {
          id: item.place_id?.toString() || Math.random().toString(),
          name: mainName,
          display_name: displayName,
          address: displayName,
          lat: parseFloat(item.lat) || 0,
          lng: parseFloat(item.lon) || 0,
          city: address.city || address.town || address.village,
          region: address.state || address.region || address.county,
          country: address.country,
          country_code: address.country_code?.toUpperCase(),
          provider: 'locationiq',
          provider_place_id: item.place_id?.toString() || ''
        };
      });

      return results;
    } catch (error: any) {
      console.error('Search places error:', error);
      toast({
        title: 'Search Error',
        description: error.message?.includes('Rate limit') 
          ? 'Too many requests. Please wait a moment and try again.'
          : error.message?.includes('temporarily unavailable')
          ? 'Location service temporarily unavailable. Please try again later.'
          : 'Failed to search places. Please try again.',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<PlaceResult | null> => {
    try {
      setLoading(true);
      
      // Use LocationIQ reverse geocoding
      const API_KEY = 'pk.f53d2c740bb67d77c8ba2fe3cec0d7fb';
      const reverseUrl = `https://us1.locationiq.com/v1/reverse.php?key=${API_KEY}&lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      
      const response = await fetch(reverseUrl);

      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.error) {
        return null;
      }

      // Transform LocationIQ response to expected format
      const address = data.address || {};
      const displayName = data.display_name || 
                         address.city || 
                         address.town || 
                         address.county || 
                         address.state || 
                         address.country || 
                         'Current Location';
      
      // Extract main name from address components
      const mainName = address.amenity || 
                      address.shop || 
                      address.tourism ||
                      address.village || 
                      address.town || 
                      address.city || 
                      address.municipality || 
                      address.county || 
                      address.state ||
                      address.country || 
                      data.name || 
                      'Current Location';

      const result = {
        id: data.place_id?.toString() || `${lat},${lng}`,
        name: mainName,
        display_name: displayName,
        address: displayName,
        lat: parseFloat(data.lat) || lat,
        lng: parseFloat(data.lon) || lng,
        city: address.city || address.town || address.village,
        region: address.state || address.region || address.county,
        country: address.country,
        country_code: address.country_code?.toUpperCase(),
        provider: 'locationiq',
        provider_place_id: data.place_id?.toString() || `${lat},${lng}`
      };

      return result;
    } catch (error: any) {
      console.error('Reverse geocode error:', error);
      toast({
        title: 'Location Error',
        description: error.message?.includes('Rate limit')
          ? 'Too many requests. Please wait a moment and try again.'
          : error.message?.includes('temporarily unavailable')
          ? 'Location service temporarily unavailable. Please try again later.'
          : 'Failed to get location details. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position);
          resolve(position);
        },
        (error) => {
          let message = 'Failed to get current location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          toast({
            title: 'Location Error',
            description: message,
            variant: 'destructive'
          });
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, [toast]);

  const saveLocation = useCallback((locationData: LocationData): void => {
    // Save to localStorage for recent locations
    const recentKey = 'tone_recent_locations';
    const existing = getRecentLocations();
    
    // Check for duplicates by provider_place_id or coordinates
    const isDuplicate = existing.some(loc => 
      (loc.provider_place_id && loc.provider_place_id === locationData.provider_place_id) ||
      (Math.abs(loc.lat - locationData.lat) < 0.0001 && Math.abs(loc.lng - locationData.lng) < 0.0001)
    );
    
    if (!isDuplicate) {
      const updated = [locationData, ...existing].slice(0, 20); // Keep max 20 recent locations
      localStorage.setItem(recentKey, JSON.stringify(updated));
    }
  }, []);

  const getRecentLocations = useCallback((limit = 20): LocationData[] => {
    try {
      const recentKey = 'tone_recent_locations';
      const stored = localStorage.getItem(recentKey);
      if (!stored) return [];
      
      const locations = JSON.parse(stored) as LocationData[];
      return locations.slice(0, limit);
    } catch (error: any) {
      console.error('Get recent locations error:', error);
      return [];
    }
  }, []);

  const clearRecentLocations = useCallback((): void => {
    const recentKey = 'tone_recent_locations';
    localStorage.removeItem(recentKey);
  }, []);

  return {
    loading,
    currentLocation,
    searchPlaces,
    reverseGeocode,
    getCurrentLocation,
    saveLocation,
    getRecentLocations,
    clearRecentLocations
  };
};