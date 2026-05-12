
import type { Produto, VarianteProduto } from "@/data/products";

export enum ProdutoExclusionReason {
  INATIVO = "PRODUTO_INATIVO",
  SEM_VARIANTE = "PRODUTO_SEM_VARIANTE",
  SEM_IMAGEM = "PRODUTO_SEM_IMAGEM",
  PRECO_INVALIDO = "PRODUTO_PRECO_INVALIDO",
  ARQUIVADO = "PRODUTO_ARQUIVADO",
  DADOS_INCOMPLETOS = "PRODUTO_DADOS_INCOMPLETOS"
}

export interface ProdutoElegibilidadeResult {
  publicavel: boolean;
  motivos: ProdutoExclusionReason[];
}

/**
 * Centraliza o conceito de "Produto Publicável".
 * Um produto só pode aparecer se: ativo, possui variantes, imagens e preço válido.
 */
export function isProdutoPublicavel(produto: Partial<Produto> | any): ProdutoElegibilidadeResult {
  const motivos: ProdutoExclusionReason[] = [];

  if (!produto.id || !produto.nome) {
    motivos.push(ProdutoExclusionReason.DADOS_INCOMPLETOS);
  }

  // Ativo/Inativo
  const ativo = produto.ativo ?? produto.active ?? produto.enabled ?? true;
  if (ativo === false) {
    motivos.push(ProdutoExclusionReason.INATIVO);
  }

  const arquivado = produto.arquivado ?? produto.archived ?? false;
  if (arquivado === true) {
    motivos.push(ProdutoExclusionReason.ARQUIVADO);
  }

  // Variantes / Estoque
  const variants = (produto.variants || []) as VarianteProduto[];
  const hasValidVariants = variants.length > 0 && variants.some(v => v.disponibilidade > 0);
  if (!hasValidVariants) {
    motivos.push(ProdutoExclusionReason.SEM_VARIANTE);
  }

  // Imagens
  const hasImages = Array.isArray(produto.imagens) && produto.imagens.length > 0 && produto.imagens.some(img => typeof img === 'string' && img.length > 0);
  if (!hasImages) {
    motivos.push(ProdutoExclusionReason.SEM_IMAGEM);
  }

  // Preço
  const precoVenda = produto.precoVenda ?? produto.preco_venda ?? 0;
  if (typeof precoVenda !== 'number' || precoVenda <= 0) {
    motivos.push(ProdutoExclusionReason.PRECO_INVALIDO);
  }

  return {
    publicavel: motivos.length === 0,
    motivos
  };
}