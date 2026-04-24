/**
 * Formatador único de preço BRL — usado em toda a vitrine, WhatsApp, carrinho e SEO.
 * Mantém o mesmo estilo "R$ 1.234,56" usado historicamente nos componentes,
 * com 2 casas decimais e arredondamento padrão do JS (banker's via toFixed).
 */
export function formatBRL(value: number | null | undefined): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `R$ ${safe.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/, ".")}`;
}

/**
 * Retorna o preço efetivo exibido na vitrine para um produto, seguindo
 * exatamente as regras do mapper da API:
 * - precoAtual quando disponível
 * - senão precoPromocional (se em promoção)
 * - senão precoVenda
 */
export function getDisplayPrice(produto: {
  precoAtual?: number;
  precoPromocional?: number;
  precoVenda: number;
  emPromocao?: boolean;
}): number {
  if (produto.precoAtual && produto.precoAtual > 0) return produto.precoAtual;
  if (produto.emPromocao && produto.precoPromocional && produto.precoPromocional > 0) {
    return produto.precoPromocional;
  }
  return produto.precoVenda || 0;
}