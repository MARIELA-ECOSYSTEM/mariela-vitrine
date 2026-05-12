 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   const url = new URL(req.url);
   const pathname = url.pathname;
 
   console.log(`[vitrine-api] Request: ${req.method} ${pathname}`);
 
   try {
     // Rota: /home/blocks
     if (pathname.endsWith("/home/blocks") || pathname.endsWith("/home/blocks/")) {
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
       return new Response(JSON.stringify({ data: blocks }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Rota: /config
     if (pathname.endsWith("/config") || pathname.endsWith("/config/")) {
       return new Response(JSON.stringify({
         data: {
           nome_loja: "Mariela Moda Feminina",
           logo_url: null,
           favicon_url: null,
           cor_primaria: "#D946EF",
           cor_secundaria: "#F97316",
           whatsapp: "5511999999999",
           instagram: "marielamoda",
         }
       }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Rota: /destaques
     if (pathname.endsWith("/destaques") || pathname.endsWith("/destaques/")) {
       return new Response(JSON.stringify({ items: [] }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Rota: /colecoes
     if (pathname.endsWith("/colecoes") || pathname.endsWith("/colecoes/")) {
       return new Response(JSON.stringify({ data: [] }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Rota: /categorias
     if (pathname.endsWith("/categorias") || pathname.endsWith("/categorias/")) {
       return new Response(JSON.stringify({ data: ["Blusas", "Vestidos", "Calças", "Acessórios"] }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Rota: /produtos
     if (pathname.endsWith("/produtos") || pathname.endsWith("/produtos/")) {
       return new Response(JSON.stringify({ data: [], total: 0, limit: 20, offset: 0, hasMore: false }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Fallback para rotas não encontradas
     return new Response(JSON.stringify({ error: "Rota não encontrada", path: pathname }), {
       status: 404,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
 
   } catch (error) {
     console.error(`[vitrine-api] Error:`, error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });