const DEFAULT_TITLE = "Mariela Moda Feminina | Moda Feminina em Campina Grande";
const DEFAULT_DESCRIPTION = "Loja de roupas femininas em Campina Grande. Confira vestidos, conjuntos, blusas e novidades da coleção.";
const DEFAULT_IMAGE_PATH = "/placeholder.svg";

type SeoOptions = {
  title: string;
  description: string;
  image?: string | null;
  /** Largura recomendada para previews sociais (px). Default 1200. */
  imageWidth?: number;
  /** Altura recomendada para previews sociais (px). Default 1200. */
  imageHeight?: number;
  url?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function ensureMeta(selector: string, create: () => HTMLMetaElement): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) return existing;
  const meta = create();
  document.head.appendChild(meta);
  return meta;
}

function setMeta(name: string, content: string): void {
  const meta = ensureMeta(`meta[name="${name}"]`, () => {
    const element = document.createElement("meta");
    element.setAttribute("name", name);
    return element;
  });
  meta.setAttribute("content", content);
}

function setProperty(property: string, content: string): void {
  const meta = ensureMeta(`meta[property="${property}"]`, () => {
    const element = document.createElement("meta");
    element.setAttribute("property", property);
    return element;
  });
  meta.setAttribute("content", content);
}

function setCanonical(url: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function absoluteUrl(value?: string | null): string {
  const fallback = new URL(DEFAULT_IMAGE_PATH, window.location.origin).toString();
  if (!value) return fallback;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return fallback;
  }
}

function setJsonLd(data?: SeoOptions["jsonLd"]): void {
  const id = "page-json-ld";
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }

  const script = (existing || document.createElement("script")) as HTMLScriptElement;
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : data);
  if (!existing) document.head.appendChild(script);
}

export function updateSeo({
  title,
  description,
  image,
  imageWidth = 1200,
  imageHeight = 1200,
  url = window.location.href,
  type = "website",
  jsonLd,
}: SeoOptions): void {
  const safeTitle = title || DEFAULT_TITLE;
  const safeDescription = description || DEFAULT_DESCRIPTION;
  const safeUrl = absoluteUrl(url);
  const safeImage = absoluteUrl(image);
  // Garante https para og:image:secure_url (alguns crawlers exigem).
  const safeImageHttps = safeImage.startsWith("http://")
    ? safeImage.replace(/^http:\/\//, "https://")
    : safeImage;

  document.title = safeTitle;
  setMeta("description", safeDescription);
  setCanonical(safeUrl);
  setProperty("og:type", type);
  setProperty("og:locale", "pt_BR");
  setProperty("og:site_name", "Mariela Moda Feminina");
  setProperty("og:title", safeTitle);
  setProperty("og:description", safeDescription);
  setProperty("og:image", safeImage);
  setProperty("og:image:secure_url", safeImageHttps);
  setProperty("og:image:width", String(imageWidth));
  setProperty("og:image:height", String(imageHeight));
  setProperty("og:image:alt", safeTitle);
  setProperty("og:url", safeUrl);
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", safeTitle);
  setMeta("twitter:description", safeDescription);
  setMeta("twitter:image", safeImage);
  setMeta("twitter:image:alt", safeTitle);
  setJsonLd(jsonLd);
}