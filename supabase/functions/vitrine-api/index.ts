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
   const pathname = url.pathname;
 
   console.info(`[vitrine-api] Request: ${req.method} ${pathname}`);
 
   try {
     // Rota: /home/blocks
     if (pathname.includes("/home/blocks")) {
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
        return createResponse({ data: blocks });
     }
 
     // Rota: /config
     if (pathname.includes("/config")) {
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
     if (pathname.includes("/destaques")) {
        return createResponse({ items: [] });
     }
 
     // Rota: /colecoes
     if (pathname.includes("/colecoes")) {
        return createResponse({ data: [] });
     }
 
     // Rota: /categorias
     if (pathname.includes("/categorias")) {
        return createResponse({ data: ["Blusas", "Vestidos", "Calças", "Acessórios"] });
     }
 
     // Rota: /produtos
     if (pathname.includes("/produtos")) {
        return createResponse({ data: [], total: 0, limit: 20, offset: 0, hasMore: false });
     }
 
     // Fallback para rotas não encontradas
      return createResponse({ error: "Rota não encontrada", path: pathname }, 404);
 
   } catch (error) {
     console.error(`[vitrine-api] Error:`, error);
      return createResponse({ error: error.message }, 500);
   }
 });