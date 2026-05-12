import type { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";

export interface ProductImageResult {
  src: string;
  alt: string;
}

export interface ProductVideoResult {
  url: string;
  poster: string | null;
}

/**
 * Resolve o vídeo do card por cor.
 * Regra: prioriza cores[].video_card_url -> produto.video_card_url.
 */
export function getProductVideoByColor(
  produto: Produto | null | undefined,
  corSelecionada?: string | null,
): ProductVideoResult | null {
  if (!produto) return null;
  const cor = corSelecionada?.trim() || "";
  
  let videoUrl = "";
  let posterUrl = "";
  
  if (cor && produto.cores) {
    const corMatch = produto.cores.find((c) => c.cor === cor);
    if (corMatch?.video_card_url) {
      videoUrl = corMatch.video_card_url;
      posterUrl = corMatch.poster_url || "";
    }
  }
  
  if (!videoUrl && produto.video_card_url) {
    videoUrl = produto.video_card_url;
    posterUrl = posterUrl || produto.poster_url || "";
  }
  
  return videoUrl ? { url: videoUrl, poster: posterUrl || null } : null;
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
    return { src: "", alt: "Produto" };
  }

  const nome = produto.nome ?? "Produto";
  const cor = corSelecionada?.trim() || "";
  const alt = cor ? `${nome} — cor ${cor}` : nome;

  const isDev = import.meta.env.DEV;
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isDebug = search.includes("debugPDP=1") || search.includes("debugProducts=1") || search.includes("debugLooks=1");

  // 1. Contexto Monte Seu Look (imagem_look_url)
  if (search.includes("debugLooks=1") || window.location.pathname === "/monte-seu-look") {
    let targetUrl = "";
    let origin = "";
    
    if (cor && produto.cores) {
      const corMatch = produto.cores.find((c) => c.cor === cor);
      if (corMatch?.imagem_look_url) {
        targetUrl = corMatch.imagem_look_url;
        origin = `cor (${cor}) look_url`;
      }
    }
    
    if (!targetUrl && produto.imagem_look_url) {
      targetUrl = produto.imagem_look_url;
      origin = "produto look_url";
    }
    
    // Fallback para card_url se look_url não existir (Regra PDV/Editorial)
    if (!targetUrl && cor && produto.cores) {
      const corMatch = produto.cores.find((c) => c.cor === cor);
      if (corMatch?.imagem_card_url) {
        targetUrl = corMatch.imagem_card_url;
        origin = `cor (${cor}) card_url (fallback look)`;
      }
    }

    if (!targetUrl && produto.imagem_card_url) {
      targetUrl = produto.imagem_card_url;
      origin = "produto card_url (fallback look)";
    }

    if (targetUrl) {
      if (isDev && isDebug) console.debug(`[ProductImage] Look: ${origin}`, { targetUrl });
      return { src: targetUrl, alt };
    }
  }

  // 2. Contexto Card/Vitrine (imagem_card_url)
  if (search.includes("debugProducts=1") || (!search.includes("debugPDP=1") && window.location.pathname !== `/products/${produto.id}` && !window.location.pathname.startsWith("/products/"))) {
    let cardUrl = "";
    let origin = "";

    if (cor && produto.cores) {
      const corMatch = produto.cores.find((c) => c.cor === cor);
      if (corMatch?.imagem_card_url) {
        cardUrl = corMatch.imagem_card_url;
        origin = `cor (${cor}) card_url`;
      }
    }

    if (!cardUrl && produto.imagem_card_url) {
      cardUrl = produto.imagem_card_url;
      origin = "produto card_url";
    }

    if (cardUrl) {
      if (isDev && isDebug) console.debug(`[ProductImage] Card: ${origin}`, { cardUrl });
      return { src: cardUrl, alt };
    }
  }

  // 3. Contrato novo: cores[] com imagem principal (fallback resolvido pela API)
  if (cor && Array.isArray(produto.cores)) {
    const corMatch = produto.cores.find((c) => c.cor === cor);
    const fromCor = [
      corMatch?.imagem_full,
      corMatch?.imagem_thumb,
      corMatch?.imagens?.[0]?.url_full,
      corMatch?.imagens?.[0]?.url_thumb,
    ].find((v) => typeof v === "string" && v.trim().length > 0);

    if (fromCor) {
      if (isDev && isDebug) console.debug(`[ProductImage] Cor: ${cor} fallback`, { fromCor });
      return { src: fromCor, alt };
    }
  }

  // 4. Fallback final resolvido pela API (imagens[0])
  const fallbackApi = (produto.imagens || [])[0] || "";
  if (isDev && isDebug) console.debug("[ProductImage] Fallback API", { fallbackApi });
  return { src: fallbackApi, alt };
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