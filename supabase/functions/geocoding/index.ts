import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  provider: string;
  provider_place_id: string;
}

// Rate limiting: Map to store user request timestamps
const userRequestTimestamps = new Map<string, number[]>();

// Rate limit helper function (1 request per second per user)
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userTimestamps = userRequestTimestamps.get(userId) || [];
  
  // Remove timestamps older than 1 second
  const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < 1000);
  
  // Check if user has made a request in the last second
  if (recentTimestamps.length > 0) {
    return false;
  }
  
  // Add current timestamp
  recentTimestamps.push(now);
  userRequestTimestamps.set(userId, recentTimestamps);
  
  return true;
}

// Headers required by LocationIQ API
const locationIQHeaders = {
  'Accept': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const type = url.searchParams.get('type') || 'search'; // 'search' or 'reverse'
    
    // Get LocationIQ API key from secrets
    const locationIQApiKey = Deno.env.get('LOCATIONIQ_API_KEY');
    if (!locationIQApiKey) {
      throw new Error('LocationIQ API key not configured');
    }
    
    // Get user ID for rate limiting (using IP as fallback)
    const userId = req.headers.get('x-user-id') || req.headers.get('x-forwarded-for') || 'anonymous';
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please wait before making another request.',
        results: [] 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'reverse') {
      // Reverse geocoding - get place name from coordinates
      if (!lat || !lng) {
        throw new Error('Latitude and longitude required for reverse geocoding');
      }

      const reverseUrl = `https://us1.locationiq.com/v1/reverse.php?key=${locationIQApiKey}&lat=${lat}&lon=${lng}&format=json`;
      
      const response = await fetch(reverseUrl, {
        headers: locationIQHeaders
      });

      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || data.error) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Transform LocationIQ response to expected format
      const address = data.address || {};
      const displayName = data.display_name || 'Unknown Location';
      
      // Build formatted address and name with improved logic
      const locationParts = [];
      let primaryName = '';
      
      // Determine primary name (village, town, city, etc.)
      if (address.village) {
        primaryName = address.village;
        locationParts.push(address.village);
      } else if (address.town) {
        primaryName = address.town;
        locationParts.push(address.town);
      } else if (address.city) {
        primaryName = address.city;
        locationParts.push(address.city);
      } else if (address.municipality) {
        primaryName = address.municipality;
        locationParts.push(address.municipality);
      } else if (address.county) {
        primaryName = address.county;
        locationParts.push(address.county);
      } else if (address.state) {
        primaryName = address.state;
        locationParts.push(address.state);
      }
      
      // Add additional context
      if (address.city && !locationParts.includes(address.city)) locationParts.push(address.city);
      else if (address.state && !locationParts.includes(address.state)) locationParts.push(address.state);
      
      if (address.country) locationParts.push(address.country);
      
      const formattedAddress = locationParts.join(', ') || displayName;
      const finalName = primaryName || (address.road ? `${address.house_number ? address.house_number + ' ' : ''}${address.road}` : '') || 'Location';

      const result = {
        id: data.place_id?.toString() || `${lat},${lng}`,
        name: finalName,
        display_name: finalName,
        address: formattedAddress,
        lat: parseFloat(data.lat) || parseFloat(lat),
        lng: parseFloat(data.lon) || parseFloat(lng),
        city: address.city || address.town || address.village,
        region: address.state || address.region || address.county,
        country: address.country,
        country_code: address.country_code?.toUpperCase(),
        provider: 'locationiq',
        provider_place_id: data.place_id?.toString() || `${lat},${lng}`
      };

      return new Response(JSON.stringify({ results: [result] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Forward geocoding - search for places
      if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build search URL
      let searchUrl = `https://us1.locationiq.com/v1/search.php?key=${locationIQApiKey}&q=${encodeURIComponent(query)}&format=json&limit=10`;
      
      if (lat && lng) {
        // Add proximity for better results
        searchUrl += `&proximity=${lng},${lat}`;
      }

      const response = await fetch(searchUrl, {
        headers: locationIQHeaders
      });

      if (!response.ok) {
        throw new Error(`LocationIQ API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Transform LocationIQ results to expected format
      const results: PlaceResult[] = data.map((item: any) => {
        const address = item.address || {};
        const displayName = item.display_name || 'Unknown Location';
        
        // Build formatted address and name with improved logic
        const locationParts = [];
        let primaryName = '';
        
        // Determine primary name (village, town, city, etc.)
        if (address.village) {
          primaryName = address.village;
          locationParts.push(address.village);
        } else if (address.town) {
          primaryName = address.town;
          locationParts.push(address.town);
        } else if (address.city) {
          primaryName = address.city;
          locationParts.push(address.city);
        } else if (address.municipality) {
          primaryName = address.municipality;
          locationParts.push(address.municipality);
        } else if (address.county) {
          primaryName = address.county;
          locationParts.push(address.county);
        } else if (address.state) {
          primaryName = address.state;
          locationParts.push(address.state);
        }
        
        // Add additional context
        if (address.city && !locationParts.includes(address.city)) locationParts.push(address.city);
        else if (address.state && !locationParts.includes(address.state)) locationParts.push(address.state);
        
        if (address.country) locationParts.push(address.country);
        
        const formattedAddress = locationParts.join(', ') || displayName;
        const finalName = primaryName || (address.road ? `${address.house_number ? address.house_number + ' ' : ''}${address.road}` : '') || item.name || 'Location';

        return {
          id: item.place_id?.toString() || item.osm_id?.toString() || Math.random().toString(),
          name: finalName,
          display_name: finalName,
          address: formattedAddress,
          lat: parseFloat(item.lat) || 0,
          lng: parseFloat(item.lon) || 0,
          city: address.city || address.town || address.village,
          region: address.state || address.region || address.county,
          country: address.country,
          country_code: address.country_code?.toUpperCase(),
          provider: 'locationiq',
          provider_place_id: item.place_id?.toString() || item.osm_id?.toString() || ''
        };
      });

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error in geocoding function:', error);
    
    // Fallback response when LocationIQ is unreachable
    const fallbackMessage = error.message.includes('fetch') || error.message.includes('network') 
      ? 'Geocoding service temporarily unavailable. Please try again later.'
      : error.message;
    
    return new Response(JSON.stringify({ 
      error: fallbackMessage, 
      results: [] 
    }), {
      status: error.message.includes('required') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});