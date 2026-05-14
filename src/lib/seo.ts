export const DEFAULT_TITLE = "Mariela Moda Feminina | Moda Feminina em Campina Grande";
export const DEFAULT_DESCRIPTION = "Loja de roupas femininas em Campina Grande. Confira vestidos, conjuntos, blusas e novidades da coleção.";
export const DEFAULT_IMAGE_PATH = "/placeholder.svg";

export type SeoOptions = {
  title?: string;
  description?: string;
  image?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  url?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
};

export function absoluteUrl(value?: string | null): string {
  if (typeof window === "undefined") return value || "";
  const toHttps = (u: string): string =>
    window.location.protocol === "https:" && u.startsWith("http://")
      ? u.replace(/^http:\/\//, "https://")
      : u;
  const fallback = toHttps(new URL(DEFAULT_IMAGE_PATH, window.location.origin).toString());
  if (!value) return fallback;
  try {
    return toHttps(new URL(value, window.location.origin).toString());
  } catch {
    return fallback;
  }
}

/**
 * LEGACY: Mantido para compatibilidade enquanto migramos para <SEOMeta />
 * com react-helmet-async. Não use em novos componentes.
 */
export function updateSeo(options: SeoOptions): void {
  if (typeof window === "undefined") return;
  // Implementação básica para evitar quebra de código legado
  const title = options.title || DEFAULT_TITLE;
  document.title = title;
}