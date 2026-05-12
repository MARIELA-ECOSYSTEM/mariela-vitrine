
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

  // Imagens
  const hasImages = (Array.isArray(produto.imagens) && produto.imagens.length > 0 && produto.imagens.some((img: any) => typeof img === 'string' && img.length > 0)) ||
                    (typeof produto.imagem_principal === 'string' && produto.imagem_principal.length > 0) ||
                    (typeof produto.imagem_thumb === 'string' && produto.imagem_thumb.length > 0);

  if (!hasImages) {
    motivos.push(ProdutoExclusionReason.SEM_IMAGEM);
  }

  // Preço - aceitamos precoVenda, preco_venda ou precoAtual
  const precoVenda = produto.precoVenda ?? produto.preco_venda ?? produto.precoAtual ?? 0;
  if (typeof precoVenda !== 'number' || precoVenda <= 0) {
    motivos.push(ProdutoExclusionReason.PRECO_INVALIDO);
  }

  // Variantes / Estoque - relaxado: se não houver variants mas tiver dados básicos, permitimos
  // mas registramos como motivo se quisermos filtrar depois. 
  // Para a Vitrine Mariela, a regra é: sem variant = não vende, mas o usuário pediu para não descartar se tiver dados básicos.
  const variants = (produto.variants || []) as VarianteProduto[];
  const hasValidVariants = variants.length > 0 && variants.some(v => v.disponibilidade > 0);
  
  // Se o produto for de catálogo público (tem ID, nome, preço e imagem), permitimos exibir mesmo sem grade explícita
  const isBasicValid = produto.id && produto.nome && precoVenda > 0 && hasImages;
  
  if (!hasValidVariants && !isBasicValid) {
    motivos.push(ProdutoExclusionReason.SEM_VARIANTE);
  }

  return {
    publicavel: motivos.length === 0,
    motivos
  };
}