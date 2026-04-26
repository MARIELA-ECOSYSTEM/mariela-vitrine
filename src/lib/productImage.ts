import type { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";

export interface ProductImageResult {
  src: string;
  alt: string;
}

/**
 * Fonte única de verdade para imagem por cor + alt acessível.
 *
 * Prioridade da imagem:
 *   1. produto.cores[].imagem_full / imagem_thumb / imagens[0]
 *   2. fallback por índice em produto.imagens (ordem das cores únicas em variants)
 *   3. produto.imagens[0]
 *   4. placeholder oficial
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
    return { src: produtoGenerico, alt: "Produto" };
  }

  const nome = produto.nome ?? "Produto";
  const cor = corSelecionada?.trim() || "";
  const alt = cor ? `${nome} — cor ${cor}` : nome;

  // 1. Contrato novo: cores[] com imagem própria
  if (cor && produto.cores && produto.cores.length > 0) {
    const corMatch = produto.cores.find((c) => c.cor === cor);
    const fromCor =
      corMatch?.imagem_full ||
      corMatch?.imagem_thumb ||
      corMatch?.imagens?.[0]?.url_full ||
      corMatch?.imagens?.[0]?.url_thumb ||
      null;
    if (fromCor) return { src: fromCor, alt };
  }

  const imagens = produto.imagens ?? [];

  // 2. Fallback por índice (ordem das cores únicas)
  if (cor && imagens.length > 0 && produto.variants?.length) {
    const coresUnicas = Array.from(new Set(produto.variants.map((v) => v.cor)));
    const corIndex = coresUnicas.findIndex((c) => c === cor);
    if (corIndex >= 0 && imagens[corIndex]) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[productImage] fallback por índice.", {
          produto: nome,
          cor,
          origem: "imagens[index]",
        });
      }
      return { src: imagens[corIndex], alt };
    }
  }

  // 3. Primeira imagem disponível
  if (imagens[0]) {
    if (import.meta.env.DEV && cor) {
      // eslint-disable-next-line no-console
      console.warn("[productImage] cor sem imagem dedicada — usando imagens[0].", {
        produto: nome,
        cor,
        origem: "imagens[0]",
      });
    }
    return { src: imagens[0], alt };
  }

  // 4. Placeholder
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[productImage] sem imagens — usando placeholder.", {
      produto: nome,
      cor,
      origem: "placeholder",
    });
  }
  return { src: produtoGenerico, alt };
}

/** Placeholder oficial — exportado para uso em onError sem loop. */
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