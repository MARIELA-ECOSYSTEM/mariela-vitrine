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

        blocks.push({ id: "latest-products", tipo: "produtos", titulo: "Novidades", prioridade: 10, config: { filter: "novidades", limit: 8, estilo: "grade" } });

        return new Response(JSON.stringify({ data: blocks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 3. Proxy Padrão para Produção
      const targetPath = path.startsWith('/') ? path : `/${path}`;
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

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
