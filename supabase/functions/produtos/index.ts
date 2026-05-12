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
  
  // Consolidamos tudo na vitrine-api. Esta função 'produtos' é mantida apenas por retrocompatibilidade
  // caso algum link antigo ou cache de browser ainda a utilize.
  console.log(`[produtos-proxy] Forwarding to vitrine-api/produtos${queryParams}`);
  
  try {
    // Usamos a URL interna do Supabase se disponível, ou o hostname atual
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || url.origin;
    const targetUrl = `${supabaseUrl}/functions/v1/vitrine-api/produtos${queryParams}`;
    
    // Repassamos a requisição para a vitrine-api que já possui a lógica de resiliência
    return await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'apikey': req.headers.get('apikey') || '',
        'Authorization': req.headers.get('authorization') || ''
      }
    });
  } catch (error) {
    console.error(`[produtos-proxy] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ items: [], total: 0, limit: 12, offset: 0, hasMore: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
