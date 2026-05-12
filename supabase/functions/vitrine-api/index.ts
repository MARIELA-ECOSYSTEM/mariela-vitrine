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
      const PRODUCTION_API_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api";

      // Rota de Healthcheck
      if (path === '/health' || path === '/') {
        const healthData = {
          status: "ok",
          mode: "proxy",
          timestamp: new Date().toISOString(),
          target: PRODUCTION_API_URL,
          endpoints: [
            "/produtos",
            "/blocks",
            "/colecoes",
            "/promocoes",
            "/campanhas",
            "/categorias",
            "/monte-seu-look"
          ]
        };
        
        return new Response(
          JSON.stringify(healthData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // REGRAS ESPECIAIS DE ROTEAMENTO (Mapeamento Inteligente Real)
      if (path === '/home/blocks') {
        const [configResp, colecoesResp, destaquesResp] = await Promise.all([
          fetch(`${PRODUCTION_API_URL}/config`),
          fetch(`${PRODUCTION_API_URL}/colecoes`),
          fetch(`${PRODUCTION_API_URL}/destaques`)
        ]);

        const blocks = [];

        if (configResp.ok) {
          const configData = await configResp.json();
          const banners = configData.data?.banners || configData.banners || [];
          if (banners.length > 0) {
            blocks.push({
              id: "hero-carousel",
              tipo: "banner",
              prioridade: 0,
              config: { items: banners }
            });
          }
        }

        if (destaquesResp.ok) {
          const destaquesData = await destaquesResp.json();
          const items = destaquesData.items || destaquesData.data || [];
          if (items.length > 0) {
            blocks.push({
              id: "featured-products",
              tipo: "produtos",
              titulo: "Destaques",
              prioridade: 10,
              config: { filter: "destaques", limit: 8, estilo: "grade" }
            });
          } else {
            // Fallback para Lançamentos se não houver destaques manuais
            blocks.push({
              id: "latest-products",
              tipo: "produtos",
              titulo: "Lançamentos",
              prioridade: 10,
              config: { filter: "novidades", limit: 8, estilo: "grade" }
            });
          }
        }

        if (colecoesResp.ok) {
          const colecoesData = await colecoesResp.json();
          const items = colecoesData.data || colecoesData.items || [];
          if (items.length > 0) {
            blocks.push({
              id: "featured-collections",
              tipo: "colecoes",
              titulo: "Coleções",
              prioridade: 20,
              config: { estilo: "carrossel" }
            });
          }
        }

        return new Response(JSON.stringify({ data: blocks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Chamada padrão via Proxy
      const targetPath = path.startsWith('/') ? path : `/${path}`;
      const targetUrl = new URL(`${PRODUCTION_API_URL}${targetPath}${url.search}`);
      
      console.log(`[vitrine-api] Proxying to: ${targetUrl.toString()}`);

      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        let errorBody = "";
        try { errorBody = await response.text(); } catch { errorBody = "No body"; }
        
        console.error(`[vitrine-api] Production API error: ${response.status}`, errorBody);
        
        // Se a produção der 500 em produtos, tentamos fornecer uma mensagem técnica amigável
        if (response.status === 500 && path.includes('produtos')) {
          return new Response(
            JSON.stringify({ 
              error: "O catálogo está temporariamente indisponível (Erro 500 no PDV).", 
              status: 500,
              details: errorBody.slice(0, 100) 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Erro na API de Produção", status: response.status }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});