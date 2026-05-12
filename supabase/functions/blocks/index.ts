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
   // Normalizamos o path para garantir que a comparação de rotas funcione
   let path = url.pathname
     .replace(/^\/functions\/v1\/blocks/, '')
     .replace(/^\/blocks/, '');
   
   path = path.split('?')[0].split('%3F')[0] || '/';
 
   console.log(`[blocks] Request: ${req.method} ${path}`);
 
   /**
    * Função 'blocks' (Preview).
    * Alias para compatibilidade com rotas que esperam o recurso 'blocks'.
    */
   try {
     const blocksData = [
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
     ];
 
     // Se o path for /home/blocks ou apenas /, retornamos os blocos.
     if (path === '/' || path === '/home/blocks' || path === '/home/blocks/') {
       return new Response(
         JSON.stringify({ data: blocksData, status: "preview_mode" }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     return new Response(
       JSON.stringify({ error: `Rota '${path}' não encontrada na função blocks.` }),
       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     return new Response(
       JSON.stringify({ error: error.message }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
});