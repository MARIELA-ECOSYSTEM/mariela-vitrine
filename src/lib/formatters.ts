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

/**
 * Helper único de promoção — fonte da verdade para vitrine, ProductCard,
 * ProductDetail e mensagem do WhatsApp. Garante consistência 100%
 * entre badge "Promoção"/"-X%" e texto "Economize R$ X" / "X% OFF".
 *
 * Regras (sempre baseadas nos campos da API, sem recálculo):
 * - isPromo: emPromocao === true E precoAtual < precoVenda
 * - precoAtual: vem do helper getDisplayPrice
 * - economiaValor / economiaPercentual: usados como vêm da API,
 *   com fallback derivado APENAS quando a API não enviou e há
 *   precoVenda válido para preservar consistência visual.
 * - badgeLabel: "-X%" quando há percentual, senão "Promoção".
 * - economiaTexto: "Economize R$ X (Y% OFF)" priorizando valor;
 *   "X% OFF" quando só houver percentual; vazio caso contrário.
 */
export interface PromoInfo {
  isPromo: boolean;
  precoAtual: number;
  precoVenda: number;
  economiaValor: number;
  economiaPercentual: number;
  badgeLabel: string;
  economiaTexto: string;
}

export function getPromoInfo(produto: {
  precoAtual?: number;
  precoPromocional?: number;
  precoVenda: number;
  emPromocao?: boolean;
  economiaValor?: number;
  economiaPercentual?: number;
}): PromoInfo {
  const precoVenda = Number(produto.precoVenda) || 0;
  const precoAtual = getDisplayPrice(produto);
  const isPromo = !!produto.emPromocao && precoAtual > 0 && precoAtual < precoVenda;

  const apiValor = Number(produto.economiaValor) || 0;
  const apiPct = Number(produto.economiaPercentual) || 0;

  const economiaValor = isPromo
    ? apiValor > 0
      ? apiValor
      : Math.max(0, precoVenda - precoAtual)
    : 0;

  const economiaPercentual = isPromo
    ? apiPct > 0
      ? apiPct
      : precoVenda > 0
        ? Math.round(((precoVenda - precoAtual) / precoVenda) * 100)
        : 0
    : 0;

  const badgeLabel = isPromo
    ? economiaPercentual > 0
      ? `-${economiaPercentual}%`
      : "Promoção"
    : "";

  let economiaTexto = "";
  if (isPromo) {
    if (economiaValor > 0) {
      economiaTexto = `Economize ${formatBRL(economiaValor)}${economiaPercentual > 0 ? ` (${economiaPercentual}% OFF)` : ""}`;
    } else if (economiaPercentual > 0) {
      economiaTexto = `${economiaPercentual}% OFF`;
    }
  }

  return {
    isPromo,
    precoAtual,
    precoVenda,
    economiaValor,
    economiaPercentual,
    badgeLabel,
    economiaTexto,
  };
}