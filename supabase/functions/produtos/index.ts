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
  console.log(`[produtos] Redirecting to vitrine-api/produtos: ${url.search}`);

  const PROJECT_URL = "https://zbmdrncgsuvjexpiezbr.supabase.co";
  const targetUrl = `${PROJECT_URL}/functions/v1/vitrine-api/produtos${url.search}`;

  return Response.redirect(targetUrl, 307);
});
