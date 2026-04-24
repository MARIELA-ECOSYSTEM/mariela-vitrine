import type { Produto } from "@/data/products";

export const NOVIDADES_LIMIT = 12;
export const HOME_NOVIDADES_LIMIT = 6;
const NOVIDADE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/** Verifica se o produto é "novidade" — flag explícita ou criado nos últimos 14 dias */
export function isProductNovidade(p: Pick<Produto, "isNovidade" | "createdAt">): boolean {
  if (p.isNovidade) return true;
  const ts = parseTimestamp(p.createdAt);
  return ts !== null && Date.now() - ts <= NOVIDADE_WINDOW_MS;
}

const idDesc = (a: Produto, b: Produto) => Number(b.id) - Number(a.id);

/** Seleciona N produtos mais recentes — createdAt desc com fallback determinístico por id desc */
export function selectNovidades(produtos: Produto[], limit = NOVIDADES_LIMIT): Produto[] {
  const comData = produtos
    .map((p) => ({ p, ts: parseTimestamp(p.createdAt) }))
    .filter((entry): entry is { p: Produto; ts: number } => entry.ts !== null);

  if (comData.length > 0) {
    comData.sort((a, b) => (b.ts - a.ts) || idDesc(a.p, b.p));
    return comData.slice(0, limit).map((e) => e.p);
  }

  const flagged = produtos.filter((p) => p.isNovidade);
  const fallback = flagged.length > 0 ? flagged : produtos;
  return [...fallback].sort(idDesc).slice(0, limit);
}

/** Conjunto de IDs de novidades (útil para filtragem) */
export function selectNovidadesIds(produtos: Produto[], limit = NOVIDADES_LIMIT): Set<number> {
  return new Set(selectNovidades(produtos, limit).map((p) => p.id));
}
