import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // In Supabase, the path might or might not include the function name depending on how it's called.
  // We normalize it to always start from the actual resource path.
  // Normalizamos o path para garantir que a comparação de rotas funcione
  // independente de como a Edge Function é invocada.
  let path = url.pathname
    .replace(/^\/functions\/v1\/vitrine-api/, '')
    .replace(/^\/vitrine-api/, '');
  
  // Removemos query strings codificadas que podem vir no pathname em alguns ambientes
  path = path.split('?')[0].split('%3F')[0] || '/';

    const queryParams = Object.fromEntries(url.searchParams.entries());
    console.log(`[vitrine-api] Forwarding to production: ${req.method} ${path}`, queryParams);

    try {
      // Rota de Healthcheck
      if (path === '/health' || path === '/') {
        return new Response(
          JSON.stringify({ status: "ok", mode: "proxy", timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const PRODUCTION_API_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api";
      const targetUrl = new URL(`${PRODUCTION_API_URL}${path}${url.search}`);
      
      console.log(`[vitrine-api] Proxying to: ${targetUrl.toString()}`);

      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: {
          'Accept': 'application/json',
          // Não repassamos autorização do ambiente local para produção para evitar conflitos de projeto
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[vitrine-api] Production API error: ${response.status}`, errorBody);
        return new Response(
          JSON.stringify({ 
            error: "Erro na API de Produção", 
            status: response.status,
            details: errorBody.slice(0, 200) 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});