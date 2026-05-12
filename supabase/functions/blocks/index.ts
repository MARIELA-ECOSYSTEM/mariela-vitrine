 // Esta função atua como um redirecionamento ou proxy para vitrine-api/home/blocks
 // para satisfazer chamadas que esperam a função "blocks" diretamente.
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   console.log(`[blocks] Redirecting to vitrine-api/home/blocks`);
 
   try {
     const response = await fetch("https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/home/blocks", {
       method: req.method,
       headers: req.headers,
     });
 
     const data = await response.json();
     return new Response(JSON.stringify(data), {
       status: response.status,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     return new Response(JSON.stringify({ error: "Falha ao redirecionar para vitrine-api" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });