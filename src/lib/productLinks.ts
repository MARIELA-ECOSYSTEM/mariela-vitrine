import type { Produto } from "@/data/products";
import { formatBRL, getPromoInfo } from "@/lib/formatters";

export function createProductSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getProductPath(produto: Produto): string {
  return `/products/${createProductSlug(produto.nome) || produto.id}`;
}

export function getProductPathWithSearch(produto: Produto, search = window.location.search): string {
  const params = new URLSearchParams(search);
  const queryString = params.toString();
  return `${getProductPath(produto)}${queryString ? `?${queryString}` : ""}`;
}

export function getTrackedProductUrl(produto: Produto, search = window.location.search): string {
  const url = new URL(getProductPath(produto), window.location.origin);
  const currentParams = new URLSearchParams(search);
  currentParams.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "produto");
  url.searchParams.set("utm_content", String(produto.id));
  return url.toString();
}

export function getProductShareMessage(
  produto: Produto,
  options: { cor?: string; tamanho?: string; url?: string } = {}
): string {
  // Filtra valores vazios, undefined e fallbacks legados ("Única", "Único", "U")
  // que NUNCA devem aparecer na mensagem do WhatsApp.
  const isReal = (v?: string) => {
    if (!v) return false;
    const t = v.trim();
    if (!t) return false;
    const lower = t.toLowerCase();
    return lower !== "única" && lower !== "unica" && lower !== "único" && lower !== "unico" && t !== "U";
  };

  const details: string[] = [];
  details.push(`produto ${produto.nome?.trim() || "selecionado"}`);
  if (produto.colecao) details.push(`coleção ${produto.colecao}`);
  if (isReal(options.cor)) details.push(`cor ${options.cor}`);
  if (isReal(options.tamanho)) details.push(`tamanho ${options.tamanho}`);

  // Fonte única da verdade: mesmo helper usado na vitrine.
  const promo = getPromoInfo(produto);
  const linhasPreco: string[] = [];

  if (promo.isPromo) {
    // Badge "Promoção" (ou "-X%") + preço atual, igual ao ProductCard
    linhasPreco.push(`🏷️ ${promo.badgeLabel || "Promoção"}: ${formatBRL(promo.precoAtual)}`);
    if (promo.precoVenda > 0) linhasPreco.push(`De ${formatBRL(promo.precoVenda)}`);
    if (promo.economiaTexto) linhasPreco.push(promo.economiaTexto);
  } else if (promo.precoAtual > 0) {
    linhasPreco.push(`Valor: ${formatBRL(promo.precoAtual)}`);
  }

  const link = options.url || getTrackedProductUrl(produto);
  const precoBloco = linhasPreco.length > 0 ? `\n${linhasPreco.join("\n")}` : "";

  return `Olá! Tenho interesse no ${details.join(", ")}.${precoBloco}\nLink: ${link}`;
}

export function matchesProductSlug(produto: Produto, value: string | undefined): boolean {
  if (!value) return false;
  const normalizedValue = decodeURIComponent(value).trim();
  return (
    String(produto.id) === normalizedValue ||
    String(produto.codigoProduto) === normalizedValue ||
    createProductSlug(produto.nome) === normalizedValue
  );
}