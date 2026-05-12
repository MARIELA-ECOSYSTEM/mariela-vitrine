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

  console.log(`[vitrine-api] Request: ${req.method} ${path}`);

  /**
   * Função 'vitrine-api' (Preview).
   * Esta função foi detectada como causa de regressão ao tentar mockar dados de catálogo.
   * Restauramos para um comportamento neutro: se for uma rota editorial nova, 
   * retorna vazio. Se for catálogo, retorna erro para forçar o frontend a usar
   * o endpoint de produção real configurado no vitrineApiService.ts.
   */
  try {
    const editorialPaths = ['/home/blocks', '/monte-seu-look', '/config'];
    if (editorialPaths.some(p => path === p || path === `${p}/`)) {
      return new Response(
        JSON.stringify({ 
          data: path.includes('blocks') ? [] : { sugestoes: [], looks_manuais: [] },
          status: "preview_mode" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Não mockamos /produtos nem /colecoes aqui para não quebrar a vitrine de produção.
    return new Response(
      JSON.stringify({ error: `Recurso não implementado no mock: ${path}. Use o endpoint de produção.` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});