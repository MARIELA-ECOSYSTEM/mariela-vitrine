import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SITE_URL = "https://marielamf.lovable.app";
const API_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api/produtos";

function createProductSlug(nome = "") {
  return String(nome)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  return payload.items || payload.data || payload.produtos || payload.results || [];
}

async function fetchProdutos() {
  const all = [];
  const limit = 100;

  for (let offset = 0; offset < 1000; offset += limit) {
    const url = new URL(API_URL);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) break;

    const payload = await response.json();
    const items = unwrapList(payload);
    if (!items.length) break;

    all.push(...items);
    const total = Number(payload?.total || 0);
    const hasMore = Boolean(payload?.hasMore || payload?.has_more);
    if ((total && all.length >= total) || (!hasMore && items.length < limit)) break;
  }

  return all;
}

function urlEntry(loc, priority, changefreq = "weekly") {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  let produtos = [];
  try {
    produtos = await fetchProdutos();
  } catch (error) {
    console.warn("[sitemap] Não foi possível buscar produtos; sitemap básico será gerado.", error);
  }

  const productUrls = produtos
    .map((produto) => {
      const nome = produto?.nome || produto?.name || produto?.titulo || produto?.title || "";
      const id = produto?.id || produto?.produto_id || produto?.codigoProduto || produto?.codigo || "";
      const slug = createProductSlug(nome) || id;
      return slug ? `${SITE_URL}/produto/${slug}` : null;
    })
    .filter(Boolean);

  const urls = [
    urlEntry(`${SITE_URL}/`, "1.0", "daily"),
    urlEntry(`${SITE_URL}/catalogo`, "0.9", "daily"),
    ...Array.from(new Set(productUrls)).map((url) => urlEntry(url, "0.8")),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  const target = resolve("public/sitemap.xml");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, xml, "utf8");
  console.log(`[sitemap] Gerado com ${urls.length} URLs.`);
}

main();