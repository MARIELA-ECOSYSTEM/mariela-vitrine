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
  const path = url.pathname.replace(/\/functions\/v1\/blocks/, '');

  console.log(`[blocks] Request: ${req.method} ${path}`);

  // Simula o mesmo comportamento do vitrine-api para manter consistência
  if (path === '/home/blocks' || path === '/home/blocks/' || path === '/') {
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
    JSON.stringify({ error: "Rota não encontrada no alias blocks" }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});