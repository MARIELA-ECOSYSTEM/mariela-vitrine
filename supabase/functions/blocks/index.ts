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
  let path = url.pathname
    .replace(/^\/functions\/v1\/blocks/, '')
    .replace(/^\/blocks/, '');
  
  path = path.split('?')[0].split('%3F')[0] || '/';

  console.log(`[blocks] Redirecting to vitrine-api: ${path}`);

  const PROJECT_URL = "https://zbmdrncgsuvjexpiezbr.supabase.co";
  const targetPath = (path === '/' || path === '') ? '/home/blocks' : path;
  const targetUrl = `${PROJECT_URL}/functions/v1/vitrine-api${targetPath}${url.search}`;

  return Response.redirect(targetUrl, 307);
});