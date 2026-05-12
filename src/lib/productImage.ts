import type { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";

export interface ProductImageResult {
  src: string;
  alt: string;
  origin?: "card" | "look" | "cor" | "principal" | "none";
}

/**
 * Fonte única de verdade para imagem por cor + alt acessível.
 *
 * IMPORTANTE: A regra de imagem genérica/placeholder agora é centralizada
 * no PDV e entregue pela vitrine-api. A Vitrine NÃO inventa fallback de
 * imagem genérica — apenas consome o que veio resolvido pela API.
 *
 * Prioridade da imagem (somente o que a API entregou):
 *   1. produto.cores[].imagem_full / imagem_thumb / imagens[0]
 *   2. produto.imagens[0]
 *   3. string vazia (deixa o <img onError> aplicar fallback extremo local)
 *
 * Alt:
 *   - com cor:  "{nome} — cor {cor}"
 *   - sem cor:  "{nome}"
 */
export function getProductImageByColor(
  produto: Produto | null | undefined,
  corSelecionada?: string | null,
): ProductImageResult {
  if (!produto) {
    return { src: "", alt: "Produto", origin: "none" };
  }

  const nome = produto.nome ?? "Produto";
  const cor = corSelecionada?.trim() || "";
  const alt = cor ? `${nome} — cor ${cor}` : nome;

  // 1. Contrato novo: cores[] com imagem própria
  if (cor && Array.isArray(produto.cores) && produto.cores.length > 0) {
    const corMatch = produto.cores.find((c) => c?.cor === cor);
    const candidates = [
      corMatch?.imagem_full,
      corMatch?.imagem_thumb,
      corMatch?.imagens?.[0]?.url_full,
      corMatch?.imagens?.[0]?.url_thumb,
    ];
    const fromCor = candidates
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find((value) => value.length > 0);
    if (fromCor) return { src: fromCor, alt, origin: "cor" };
  }

  const imagens = produto.imagens ?? [];

  // 2. Primeira imagem do produto retornada pela API (já inclui a genérica
  //    quando o PDV decidir aplicá-la).
  if (imagens[0]) {
    return { src: imagens[0], alt, origin: "principal" };
  }

  // 3. Sem imagem da API — devolve string vazia. O onError do <img> vai
  //    aplicar o fallback extremo local (handleProductImageError) caso o
  //    navegador tente carregar e falhe. Isso evita "inventar" imagem
  //    genérica antes de saber se a API realmente não entregou nada.
  return { src: "", alt, origin: "none" };
}

/**
 * Resolve a imagem específica para o Card da Vitrine.
 * Prioridade: 1. imagem_card_url -> 2. getProductImageByColor
 */
export function getProductCardImage(
  produto: Produto | null | undefined,
  corSelecionada?: string | null,
): ProductImageResult {
  if (!produto) return { src: "", alt: "Produto", origin: "none" };

  const nome = produto.nome ?? "Produto";
  const cor = corSelecionada?.trim() || "";
  const alt = cor ? `${nome} — cor ${cor}` : nome;

  // 1. Tenta imagem de card (específica para vitrine)
  if (produto.imagem_card_url) {
    return { src: produto.imagem_card_url, alt, origin: "card" };
  }

  // 2. Fallback centralizado
  return getProductImageByColor(produto, corSelecionada);
}

/**
 * Resolve a imagem específica para o Monte Seu Look.
 * Prioridade: 1. imagem_look_url -> 2. imagem_card_url -> 3. getProductImageByColor
 */
export function getProductLookImage(
  produto: Produto | null | undefined,
  corSelecionada?: string | null,
): ProductImageResult {
  if (!produto) return { src: "", alt: "Produto", origin: "none" };

  const nome = produto.nome ?? "Produto";
  const cor = corSelecionada?.trim() || "";
  const alt = cor ? `${nome} — cor ${cor}` : nome;

  // 1. Tenta imagem editorial de look
  if (produto.imagem_look_url) {
    return { src: produto.imagem_look_url, alt, origin: "look" };
  }

  // 2. Tenta imagem de card como fallback editorial
  if (produto.imagem_card_url) {
    return { src: produto.imagem_card_url, alt, origin: "card" };
  }

  // 3. Fallback centralizado
  return getProductImageByColor(produto, corSelecionada);
}

/**
 * Helper de diagnóstico para console (Dev only)
 */
export function debugProductImage(context: string, result: ProductImageResult) {
  if (import.meta.env.DEV) {
    const debugPDP = new URLSearchParams(window.location.search).get("debugPDP") === "1";
    const debugProducts = new URLSearchParams(window.location.search).get("debugProducts") === "1";
    const debugLooks = new URLSearchParams(window.location.search).get("debugLooks") === "1";

    if ((context === "PDP" && debugPDP) || (context === "Products" && debugProducts) || (context === "Looks" && debugLooks)) {
      console.group(`[debug-midia] ${context}`);
      console.info("Mídia usada:", result.src);
      console.info("Origem:", result.origin);
      console.info("Alt:", result.alt);
      console.groupEnd();
    }
  }
}

/**
 * Fallback extremo local — usado APENAS no onError do <img> quando a
 * imagem entregue pela API falhar ao carregar (rede/cache antigo/erro
 * inesperado). Não deve ser usado como regra de exibição padrão.
 */
export const PRODUCT_IMAGE_PLACEHOLDER = produtoGenerico;

/**
 * Handler de onError seguro: troca para fallback uma única vez,
 * evitando loop infinito caso o próprio fallback falhe.
 */
export function handleProductImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallback: string = produtoGenerico,
) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === "true") return;
  img.dataset.fallbackApplied = "true";
  img.src = fallback;
}