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
  return `/products/${createProductSlug(produto.nome) || produto.id}`;
}

export function getProductPathWithSearch(produto: Produto, search = window.location.search): string {
  const params = new URLSearchParams(search);
  const queryString = params.toString();
  return `${getProductPath(produto)}${queryString ? `?${queryString}` : ""}`;
}

export function getTrackedProductUrl(produto: Produto, search = window.location.search): string {
  const url = new URL(getProductPath(produto), window.location.origin);
  const currentParams = new URLSearchParams(search);
  currentParams.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "produto");
  url.searchParams.set("utm_content", String(produto.id));
  return url.toString();
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getProductShareMessage(
  produto: Produto,
  options: { cor?: string; tamanho?: string; url?: string } = {}
): string {
  const details = [`produto ${produto.nome || "selecionado"}`];

  if (produto.colecao) details.push(`coleção ${produto.colecao}`);
  if (options.cor) details.push(`cor ${options.cor}`);
  if (options.tamanho) details.push(`tamanho ${options.tamanho}`);

  // Bloco de preço — usa exatamente os campos vindos da API (sem recalcular).
  // Fallback seguro: se a API não enviar preco_atual/economia_*, usa precoVenda.
  const precoVenda = Number(produto.precoVenda) || 0;
  const precoAtual = Number(produto.precoAtual) > 0 ? Number(produto.precoAtual) : precoVenda;
  const economiaValor = Number(produto.economiaValor) || 0;
  const economiaPercentual = Number(produto.economiaPercentual) || 0;

  const linhasPreco: string[] = [];
  if (produto.emPromocao && precoAtual > 0 && precoAtual < precoVenda) {
    linhasPreco.push(`💖 Promoção: ${formatBRL(precoAtual)}`);
    if (precoVenda > 0) linhasPreco.push(`De ${formatBRL(precoVenda)}`);
    if (economiaValor > 0) {
      linhasPreco.push(`Economize ${formatBRL(economiaValor)}${economiaPercentual > 0 ? ` (${economiaPercentual}% OFF)` : ""}`);
    } else if (economiaPercentual > 0) {
      linhasPreco.push(`${economiaPercentual}% OFF`);
    }
  } else if (precoAtual > 0) {
    linhasPreco.push(`Valor: ${formatBRL(precoAtual)}`);
  }

  const link = options.url || getTrackedProductUrl(produto);
  const precoBloco = linhasPreco.length > 0 ? `\n${linhasPreco.join("\n")}` : "";

  return `Olá! Tenho interesse no ${details.join(", ")}.${precoBloco}\nLink: ${link}`;
}

export function matchesProductSlug(produto: Produto, value: string | undefined): boolean {
  if (!value) return false;
  const normalizedValue = decodeURIComponent(value).trim();
  return (
    String(produto.id) === normalizedValue ||
    String(produto.codigoProduto) === normalizedValue ||
    createProductSlug(produto.nome) === normalizedValue
  );
}