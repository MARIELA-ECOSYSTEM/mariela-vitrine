const DEFAULT_TITLE = "Mariela Moda Feminina | Moda Feminina em Campina Grande";
const DEFAULT_DESCRIPTION = "Loja de roupas femininas em Campina Grande. Confira vestidos, conjuntos, blusas e novidades da coleção.";
const DEFAULT_IMAGE_PATH = "/placeholder.svg";

type SeoOptions = {
  title: string;
  description: string;
  image?: string | null;
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
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

export function updateSeo({ title, description, image, url = window.location.href, type = "website", jsonLd }: SeoOptions): void {
  const safeTitle = title || DEFAULT_TITLE;
  const safeDescription = description || DEFAULT_DESCRIPTION;
  const safeUrl = absoluteUrl(url);
  const safeImage = absoluteUrl(image);

  document.title = safeTitle;
  setMeta("description", safeDescription);
  setCanonical(safeUrl);
  setProperty("og:type", type);
  setProperty("og:title", safeTitle);
  setProperty("og:description", safeDescription);
  setProperty("og:image", safeImage);
  setProperty("og:url", safeUrl);
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", safeTitle);
  setMeta("twitter:description", safeDescription);
  setMeta("twitter:image", safeImage);
  setJsonLd(jsonLd);
}