import type { Produto } from "@/data/products";

export const NOVIDADES_LIMIT = 12;
export const HOME_NOVIDADES_LIMIT = 6;

export function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/** Verifica se o produto é "novidade" — somente quando a API marcar isNovidade=true */
export function isProductNovidade(p: Pick<Produto, "isNovidade">): boolean {
  return !!p.isNovidade;
}

const idDesc = (a: Produto, b: Produto) => Number(b.id) - Number(a.id);

/** Seleciona N produtos marcados como novidade pela API, ordenados por id desc */
export function selectNovidades(produtos: Produto[], limit = NOVIDADES_LIMIT): Produto[] {
  return produtos.filter(isProductNovidade).sort(idDesc).slice(0, limit);
}

/** Conjunto de IDs de novidades (útil para filtragem) */
export function selectNovidadesIds(produtos: Produto[], limit = NOVIDADES_LIMIT): Set<number> {
  return new Set(selectNovidades(produtos, limit).map((p) => p.id));
}
