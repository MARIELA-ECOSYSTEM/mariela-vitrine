/**
 * Converte um texto em slug URL-friendly:
 *  - remove acentos
 *  - troca espaços/pontuação por hífen
 *  - colapsa hífens repetidos
 *  - lowercase
 */
export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Heurística simples para detectar IDs no formato UUID v4-ish. */
export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}