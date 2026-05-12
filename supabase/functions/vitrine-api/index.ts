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

  try {
    // Rota: /home/blocks
    if (path === '/home/blocks' || path === '/home/blocks/') {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "novidades",
              tipo: "produtos",
              titulo: "Novidades",
              subtitulo: "Recém-chegadas à coleção",
              prioridade: 10,
              config: { filter: "novidades", limit: 6, linkLabel: "Ver todas as novidades", linkTo: "/products?filter=novidades" }
            },
            {
              id: "em_alta",
              tipo: "produtos",
              titulo: "Em alta",
              subtitulo: "Peças em destaque na vitrine",
              prioridade: 20,
              config: { filter: "em_alta", limit: 4, linkLabel: "Ver produtos", linkTo: "/products?filter=em_alta" }
            }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rota: /monte-seu-look
    if (path === '/monte-seu-look' || path === '/monte-seu-look/') {
      return new Response(
        JSON.stringify({
          data: {
            sugestoes: [],
            looks_manuais: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rota: /config
    if (path === '/config' || path === '/config/') {
      return new Response(
        JSON.stringify({
          data: {
            nome_loja: "Mariela Moda Feminina",
            logo_url: null,
            whatsapp: "5583986567915",
            instagram: "marielaloja_"
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback inteligente: se o path não for reconhecido, mas terminar em /blocks, retorna os blocos.
    // Isso ajuda com variações de roteamento entre ambientes.
    if (path.endsWith('/blocks') || path.endsWith('/blocks/')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "novidades",
              tipo: "produtos",
              titulo: "Novidades",
              subtitulo: "Recém-chegadas à coleção",
              prioridade: 10,
              config: { filter: "novidades", limit: 6, linkLabel: "Ver todas as novidades", linkTo: "/products?filter=novidades" }
            }
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Rota não encontrada no vitrine-api: ${path}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[vitrine-api] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});