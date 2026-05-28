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
  let path = url.pathname
    .replace(/^\/functions\/v1\/vitrine-api/, '')
    .replace(/^\/vitrine-api/, '');
  
  path = path.split('?')[0].split('%3F')[0] || '/';

    const PRODUCTION_API_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api";

    try {
      // 1. Healthcheck local
      if (path === '/health' || path === '/') {
        return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. Mapeamento Inteligente Real (Home Blocks)
      if (path === '/home/blocks' || path === '/blocks') {
        const [configResp, colecoesResp, destaquesResp, promocoesResp] = await Promise.all([
          fetch(`${PRODUCTION_API_URL}/config`),
          fetch(`${PRODUCTION_API_URL}/colecoes`),
          fetch(`${PRODUCTION_API_URL}/destaques`),
          fetch(`${PRODUCTION_API_URL}/produtos?limit=1&em_promocao=true`)
        ]);

        const blocks = [];
        if (configResp.ok) {
          const configData = await configResp.json();
          const banners = configData.data?.banners || configData.banners || [];
          if (banners.length > 0) {
            blocks.push({ id: "hero-carousel", tipo: "banner", prioridade: 0, config: { items: banners } });
          }
        }

        if (colecoesResp.ok) {
          const colecoesData = await colecoesResp.json();
          const items = colecoesData.data || colecoesData.items || [];
          if (items.length > 0) {
            blocks.push({ id: "featured-collections", tipo: "colecoes", titulo: "Nossas Coleções", prioridade: 20, config: { estilo: "carrossel" } });
          }
        }

        
        if (promocoesResp.ok) {
          const promocoesData = await promocoesResp.json();
          const items = promocoesData.data || promocoesData.items || [];
          if (items.length > 0) {
            blocks.push({ 
              id: "featured-promotions", 
              tipo: "produtos", 
              titulo: "Promoções Imperdíveis", 
              prioridade: 5, 
              config: { filter: "promocoes", limit: 4, estilo: "grade", linkLabel: "Ver todas as ofertas", linkTo: "/products?filter=promocoes" } 
            });
          }
        }

        blocks.push({ id: "latest-products", tipo: "produtos", titulo: "Novidades", prioridade: 10, config: { filter: "novidades", limit: 8, estilo: "grade", linkLabel: "Ver tudo", linkTo: "/products?filter=novidades" } });

        return new Response(JSON.stringify({ data: blocks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 3. Proxy Padrão para Produção
      let targetPath = path.startsWith('/') ? path : `/${path}`;
      // A API de produção expõe o detalhe em `/produtos/:id` (plural).
      // O cliente ainda chama `/produto/:id` (singular legado) — reescrevemos
      // aqui para evitar 404 "Rota não encontrada" no PDV.
      const singularMatch = targetPath.match(/^\/produto\/([^/?]+)\/?$/);
      if (singularMatch) {
        targetPath = `/produtos/${singularMatch[1]}`;
      }
      const targetUrl = new URL(`${PRODUCTION_API_URL}${targetPath}${url.search}`);
      
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      const incomingApikey = req.headers.get('apikey');
      const incomingAuth = req.headers.get('authorization');
      if (incomingApikey) headers['apikey'] = incomingApikey;
      if (incomingAuth) headers['authorization'] = incomingAuth;

      const response = await fetch(targetUrl.toString(), { method: req.method, headers: headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[vitrine-api] Production Error on ${path}: ${response.status}`, errorText);
        
        // Detalhe de produto: 404 retorna null silenciosamente (sem blank-screen no cliente)
        if (singularMatch || /^\/produtos\/[^/?]+\/?$/.test(targetPath)) {
          return new Response(JSON.stringify({ data: null }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Proteção para o catálogo: se der erro (PDV indisponível ou bug interno), retornamos estrutura vazia em vez de 500
        if (path.includes('produtos') || path.includes('destaques')) {
          return new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0, hasMore: false }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ error: "Erro no PDV", status: response.status, details: errorText.slice(0, 100) }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(`[vitrine-api] Invalid JSON from production on ${path}:`, jsonError.message);
        
        if (path.includes('produtos')) {
          return new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0, hasMore: false }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error("Resposta inválida do servidor de produção");
      }

      return new Response(JSON.stringify(data), { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      });

  } catch (error) {
    console.error(`[vitrine-api] Critical Error:`, error);
    
    // Fallback resiliente em caso de falha catastrófica
    if (path.includes('produtos')) {
        return new Response(JSON.stringify({ items: [], total: 0, limit: 20, offset: 0, hasMore: false }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: "Erro interno na Vitrine", details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
