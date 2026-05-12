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
  const path = url.pathname.replace(/\/functions\/v1\/vitrine-api/, '');

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

    // Fallback para outras rotas
    return new Response(
      JSON.stringify({ error: `Rota não encontrada: ${path}` }),
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