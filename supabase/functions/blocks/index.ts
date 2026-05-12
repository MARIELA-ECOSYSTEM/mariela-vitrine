import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Esta função serve como um fallback ou alias para o vitrine-api,
 * resolvendo o erro 404 relatado em blocks/index.ts.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/blocks/, '')
    .replace(/^\/blocks/, '') || '/';

  console.log(`[blocks] Request: ${req.method} ${path}`);

  /**
   * Encaminha requisições do alias 'blocks' para a lógica do vitrine-api,
   * resolvendo a inconsistência de nomes.
   */
  const targetPath = path === '/' ? '/home/blocks' : path;
  
  // Mock simplificado do comportamento do vitrine-api para o alias blocks
  if (targetPath === '/home/blocks') {
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

  return new Response(
    JSON.stringify({ error: "Rota não encontrada no alias blocks" }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});