import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const queryParams = url.search;
  
  // Em vez de redirect, fazemos o fetch direto para evitar problemas de roteamento/cors no browser
  // e permitir um controle melhor do erro.
  console.log(`[produtos-proxy] Fetching from vitrine-api: /produtos${queryParams}`);
  
  try {
    const PROJECT_URL = "https://zbmdrncgsuvjexpiezbr.supabase.co";
    const targetUrl = `${PROJECT_URL}/functions/v1/vitrine-api/produtos${queryParams}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[produtos-proxy] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: "Erro no proxy de produtos", details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
