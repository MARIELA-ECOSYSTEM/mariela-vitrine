const DEFAULT_TITLE = "Mariela Moda Feminina | Moda Feminina";
const DEFAULT_DESCRIPTION = "Moda feminina com peças selecionadas, novidades e coleções especiais.";
const DEFAULT_IMAGE = `${window.location.origin}/placeholder.svg`;

type SeoOptions = {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
  type?: "website" | "product";
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

function absoluteUrl(value?: string | null): string {
  if (!value) return DEFAULT_IMAGE;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return DEFAULT_IMAGE;
  }
}

export function updateSeo({ title, description, image, url = window.location.href, type = "website" }: SeoOptions): void {
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
}