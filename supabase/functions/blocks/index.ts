 // Esta função atua como um redirecionamento ou proxy para vitrine-api/home/blocks
 // para satisfazer chamadas que esperam a função "blocks" diretamente.
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const CORS_HEADERS = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-customer-id",
   "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
   "Access-Control-Max-Age": "86400",
 };
 
 const JSON_HEADER = { "Content-Type": "application/json; charset=utf-8" };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
   }
 
   console.log(`[blocks] Redirecting to vitrine-api/home/blocks`);
 
    try {
      // Proxy limpo: evita repassar headers de controle que podem quebrar a requisição interna
      const headers = new Headers();
      headers.set("Accept", "application/json");
      
      // Usa variável de ambiente para garantir que aponte para o projeto correto
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://zbmdrncgsuvjexpiezbr.supabase.co";
      const response = await fetch(`${supabaseUrl}/functions/v1/vitrine-api/home/blocks`, {
        method: "GET",
        headers,
      });
 
      const data = await response.json();
      console.log(`[blocks] vitrine-api responded with status ${response.status}`);

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...CORS_HEADERS, ...JSON_HEADER },
      });
   } catch (error) {
      return new Response(JSON.stringify({ error: "Falha ao redirecionar para vitrine-api" }), {
        status: 500,
        headers: { ...CORS_HEADERS, ...JSON_HEADER },
      });
   }
 });