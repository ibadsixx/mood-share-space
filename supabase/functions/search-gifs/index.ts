import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const giphyApiKey = Deno.env.get('GIPHY_API_KEY');
    if (!giphyApiKey) {
      throw new Error('GIPHY_API_KEY is not configured');
    }

    const { query, trending, limit = 20 } = await req.json();

    let apiUrl: string;
    if (trending) {
      apiUrl = `https://api.giphy.com/v1/gifs/trending?api_key=${giphyApiKey}&limit=${limit}&rating=pg-13`;
    } else if (query) {
      apiUrl = `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg-13`;
    } else {
      throw new Error('Either query or trending must be specified');
    }

    console.log('Fetching GIFs from:', apiUrl.replace(giphyApiKey, '[REDACTED]'));

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ 
        gifs: data.data,
        pagination: data.pagination 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in search-gifs function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to search GIFs'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});