import type { Produto } from "@/data/products";

export function createProductSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getProductPath(produto: Produto): string {
  return `/produto/${createProductSlug(produto.nome) || produto.id}`;
}

export function getTrackedProductUrl(produto: Produto): string {
  const url = new URL(getProductPath(produto), window.location.origin);
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "produto");
  url.searchParams.set("utm_content", String(produto.id));
  return url.toString();
}

export function matchesProductSlug(produto: Produto, value: string | undefined): boolean {
  if (!value) return false;
  return String(produto.id) === value || createProductSlug(produto.nome) === value;
}