import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to your domains
const ALLOWED_ORIGINS = [
  'https://marielamf.lovable.app',
  'https://id-preview--f70ee5b8-3a6f-4919-a8a4-dc79965fd7d7.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Block requests from non-allowed origins
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    console.warn('Blocked request from unauthorized origin:', origin);
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Fetching products from external API...');
    
    const response = await fetch('https://mariela-pdv-backend.onrender.com/api/vitrine', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('External API error:', response.status, response.statusText);
      throw new Error(`External API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('Products fetched successfully:', data?.length || 0, 'products');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-products function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
