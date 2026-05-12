 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const CORS_HEADERS = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-customer-id",
   "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
   "Access-Control-Max-Age": "86400",
 };
 
 const JSON_HEADER = { "Content-Type": "application/json; charset=utf-8" };
 
 function createResponse(data: unknown, status = 200) {
   return new Response(JSON.stringify(data), {
     status,
     headers: {
       ...CORS_HEADERS,
       ...JSON_HEADER,
     },
   });
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
   }
 
   const url = new URL(req.url);
    // Normalização robusta: remove prefixos de função e garante formato /path
    let pathname = url.pathname
      .replace("/functions/v1/vitrine-api", "")
      .replace("/vitrine-api", "");
    
    // Remove trailing slash para comparação exata
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    
    // Garante que comece com /
    if (!pathname.startsWith("/")) {
      pathname = "/" + pathname;
    }

    console.info(`[vitrine-api] Router: ${req.method} ${pathname} (Raw: ${url.pathname})`);
 
   try {
     // Rota: /home/blocks
      if (pathname === "/home/blocks") {
        const blocks = [
          {
            id: "banner-principal",
            tipo: "banner",
            titulo: null,
            subtitulo: null,
            prioridade: 0,
            config: {
              mediaUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1920",
              mediaType: "image",
              ctaLabel: "Ver Coleção",
              ctaUrl: "/products",
            }
          },
          {
            id: "sugestoes-look",
            tipo: "banner",
            titulo: "Monte Seu Look",
            subtitulo: "Sugestões editoriais",
            prioridade: 5,
            config: {
              sugestoes_monte_look: [
                {
                  id: "look-1",
                  titulo: "Look Noite Casual",
                  subtitulo: "Peças selecionadas para arrasar",
                  mediaUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
                  mediaType: "image",
                  produtos: ["1", "2", "3"],
                  ctaLabel: "Montar este Look"
                }
              ]
            }
          },
          {
            id: "novidades",
            tipo: "produtos",
            titulo: "Novidades",
            subtitulo: "Recém-chegadas à coleção",
            prioridade: 10,
            config: { filter: "novidades", limit: 6, linkLabel: "Ver todas as novidades", linkTo: "/products?filter=novidades" }
          }
        ];
        return createResponse({ data: blocks });
     }
 
     // Rota: /config
      if (pathname === "/config") {
        return createResponse({
         data: {
           nome_loja: "Mariela Moda Feminina",
           logo_url: null,
           favicon_url: null,
           cor_primaria: "#D946EF",
           cor_secundaria: "#F97316",
           whatsapp: "5511999999999",
           instagram: "marielamoda",
         }
        });
     }
 
     // Rota: /destaques
      if (pathname === "/destaques") {
        return createResponse({ items: [] });
     }
 
     // Rota: /colecoes
      if (pathname === "/colecoes") {
        return createResponse({ data: [] });
     }
 
     // Rota: /categorias
      if (pathname === "/categorias") {
        return createResponse({ data: ["Blusas", "Vestidos", "Calças", "Acessórios"] });
     }
 
     // Rota: /produtos
      if (pathname === "/produtos") {
        return createResponse({ data: [], total: 0, limit: 20, offset: 0, hasMore: false });
     }
 
     // Fallback para rotas não encontradas
      return createResponse({ error: "Rota não encontrada", path: pathname }, 404);
 
   } catch (error) {
     console.error(`[vitrine-api] Error:`, error);
      return createResponse({ error: error.message }, 500);
   }
 });