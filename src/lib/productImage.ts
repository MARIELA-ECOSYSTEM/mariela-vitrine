import type { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";

export interface ProductImageResult {
  src: string;
  alt: string;
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
    if (fromCor) return { src: fromCor, alt };
  }

  const imagens = produto.imagens ?? [];

  // 2. Primeira imagem do produto retornada pela API (já inclui a genérica
  //    quando o PDV decidir aplicá-la).
  if (imagens[0]) {
    return { src: imagens[0], alt };
  }

  // 3. Sem imagem da API — devolve string vazia. O onError do <img> vai
  //    aplicar o fallback extremo local (handleProductImageError) caso o
  //    navegador tente carregar e falhe. Isso evita "inventar" imagem
  //    genérica antes de saber se a API realmente não entregou nada.
  return { src: "", alt };
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