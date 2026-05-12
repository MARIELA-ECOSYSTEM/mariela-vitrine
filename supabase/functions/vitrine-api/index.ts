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
     // Rota de Configurações
     if (path === '/config' || path === '/config/') {
       return new Response(
         JSON.stringify({ data: { nome: "Mariela Vitrine (Preview)", features: { monte_seu_look: true } } }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Rota de Blocos da Home
     if (path === '/home/blocks' || path === '/home/blocks/') {
       return new Response(
         JSON.stringify({
            data: [
              {
                id: "colecoes_destaque",
                tipo: "colecoes",
                titulo: "Coleções em Destaque",
                subtitulo: "Confira nossas últimas campanhas",
                prioridade: 5,
                config: { estilo: "grade" }
              },
              {
                id: "novidades",
                tipo: "produtos",
                titulo: "Novidades",
                subtitulo: "Recém-chegadas à coleção",
                prioridade: 10,
                config: { filter: "novidades", limit: 6, linkLabel: "Ver todas as novidades", linkTo: "/products?filter=novidades" }
              },
              {
                id: "promocoes",
                tipo: "produtos",
                titulo: "Promoções",
                subtitulo: "Peças com descontos especiais",
                prioridade: 20,
                config: { filter: "promocoes", limit: 4, linkLabel: "Ver todas as promoções", linkTo: "/products?filter=promocoes" }
              }
            ]
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Rota do Monte Seu Look
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
 
     // Catch-all para rotas não implementadas no mock
     return new Response(
       JSON.stringify({ 
         error: `Recurso '${path}' não implementado no mock local.`,
         hint: "Esta rota deve ser consumida do endpoint de produção." 
       }),
       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});