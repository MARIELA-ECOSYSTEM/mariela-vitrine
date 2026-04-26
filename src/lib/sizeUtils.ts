/**
 * Utilitários para ordenação e normalização de tamanhos vindos da API.
 *
 * Regras (acordadas com o time):
 * - Tamanhos textuais conhecidos seguem ordem fixa: PP, P, M, G, GG, XG, XGG.
 * - Tamanhos numéricos vêm depois, em ordem crescente (34, 36, 38, ...).
 * - Demais tamanhos textuais (não previstos) entram após os numéricos, em
 *   ordem alfabética estável.
 * - Duplicados são removidos, mantendo a primeira ocorrência.
 * - Strings vazias e legados ("U", "Único", "Unica") são descartados — nunca
 *   inventamos tamanho.
 */

const TEXT_SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG"] as const;
const TEXT_ORDER_INDEX = new Map<string, number>(
  TEXT_SIZE_ORDER.map((size, idx) => [size, idx]),
);

const INVALID_SIZES = new Set(["", "U", "ÚNICO", "UNICO", "ÚNICA", "UNICA"]);

function normalizeSize(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSize(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const norm = normalizeSize(raw);
  if (norm === "") return false;
  return !INVALID_SIZES.has(norm);
}

/**
 * Ordena e remove duplicados de uma lista de tamanhos.
 * Aplica `trim()` na saída para garantir consistência (" 38" → "38").
 */
export function sortSizes(sizes: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  sizes.forEach((s) => {
    if (!isValidSize(s)) return;
    const trimmed = s.trim();
    const key = normalizeSize(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(trimmed);
  });

  return unique.sort((a, b) => {
    const na = normalizeSize(a);
    const nb = normalizeSize(b);
    const ta = TEXT_ORDER_INDEX.get(na);
    const tb = TEXT_ORDER_INDEX.get(nb);

    // Ambos textuais conhecidos
    if (ta !== undefined && tb !== undefined) return ta - tb;
    // Apenas um é textual conhecido — vem primeiro
    if (ta !== undefined) return -1;
    if (tb !== undefined) return 1;

    // Ambos numéricos
    const numA = Number(na);
    const numB = Number(nb);
    const isNumA = Number.isFinite(numA);
    const isNumB = Number.isFinite(numB);
    if (isNumA && isNumB) return numA - numB;
    if (isNumA) return -1;
    if (isNumB) return 1;

    // Ambos textuais desconhecidos — alfabético estável
    return na.localeCompare(nb);
  });
}