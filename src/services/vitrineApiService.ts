import type { Produto, VarianteProduto } from "@/data/products";

const VITRINE_API_BASE_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api";
const API_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 800;
const LOCAL_STORAGE_CACHE_KEY = "mariela_vitrine_api_cache_v1";
const MAX_CACHE_ITEMS = 40;

const CACHE_TTL = {
  config: 5 * 60 * 1000,
  colecoes: 5 * 60 * 1000,
  categorias: 5 * 60 * 1000,
  produtos: 60 * 1000,
  produto: 2 * 60 * 1000,
} as const;

const FALLBACK_STALE_WINDOW = 5 * 60 * 1000;

type QueryParams = Record<string, string | number | boolean | null | undefined>;
type ApiRecord = Record<string, unknown>;

type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

export interface VitrineConfig {
  nomeLoja: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  whatsapp: string | null;
  instagram: string | null;
}

export class VitrineApiError extends Error {
  status?: number;
  friendlyMessage: string;

  constructor(friendlyMessage: string, status?: number) {
    super(friendlyMessage);
    this.name = "VitrineApiError";
    this.status = status;
    this.friendlyMessage = friendlyMessage;
  }
}

const DEFAULT_CONFIG: VitrineConfig = {
  nomeLoja: "Mariela Moda Feminina",
  logoUrl: null,
  faviconUrl: null,
  corPrimaria: null,
  corSecundaria: null,
  whatsapp: null,
  instagram: null,
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${VITRINE_API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function readLocalStorageCache(): Record<string, CacheEntry<unknown>> {
  if (typeof localStorage === "undefined") return {};

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalStorageCache(cache: Record<string, CacheEntry<unknown>>): void {
  if (typeof localStorage === "undefined") return;

  try {
    const entries = Object.entries(cache)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, MAX_CACHE_ITEMS);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Cache é opcional; falhas de armazenamento não devem afetar a vitrine.
  }
}

function getCached<T>(key: string, maxAge: number): T | null {
  const now = Date.now();
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry && now - memoryEntry.timestamp <= maxAge) return memoryEntry.value;

  const storageEntry = readLocalStorageCache()[key] as CacheEntry<T> | undefined;
  if (storageEntry && now - storageEntry.timestamp <= maxAge) {
    memoryCache.set(key, storageEntry);
    return storageEntry.value;
  }

  return null;
}

function setCached<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { value, timestamp: Date.now() };
  memoryCache.set(key, entry);

  const cache = readLocalStorageCache();
  cache[key] = entry as CacheEntry<unknown>;
  writeLocalStorageCache(cache);
}

function createApiError(status: number): VitrineApiError {
  if (status === 400) return new VitrineApiError("Parâmetros inválidos na consulta da vitrine.", status);
  if (status === 404) return new VitrineApiError("Item não encontrado na vitrine.", status);
  if (status >= 500) return new VitrineApiError("A vitrine está temporariamente indisponível. Tente novamente em instantes.", status);
  return new VitrineApiError("Não foi possível carregar os dados da vitrine.", status);
}

export function getVitrineApiErrorMessage(error: unknown): string {
  if (error instanceof VitrineApiError) return error.friendlyMessage;
  return "Não foi possível carregar os dados da vitrine.";
}

async function requestJson<T>(url: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createApiError(response.status);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new VitrineApiError("Erro desconhecido na vitrine.");

      if (error instanceof VitrineApiError && error.status && error.status < 500) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY);
      }
    }
  }

  if (lastError instanceof VitrineApiError) throw lastError;
  throw new VitrineApiError("A vitrine está temporariamente indisponível. Tente novamente em instantes.");
}

async function fetchCachedJson<T>(path: string, params: QueryParams | undefined, ttl: number): Promise<T> {
  const url = buildUrl(path, params);
  const cached = getCached<T>(url, ttl);
  if (cached) return cached;

  try {
    const data = await requestJson<T>(url);
    setCached(url, data);
    return data;
  } catch (error) {
    const fallback = getCached<T>(url, ttl + FALLBACK_STALE_WINDOW);
    if (fallback) return fallback;
    throw error;
  }
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ApiRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(source: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return sanitizeString(value);
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function readNumber(source: ApiRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace("R$", "").replace(".", "").replace(",", ".").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function readBoolean(source: ApiRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "sim", "yes"].includes(value.toLowerCase());
    if (typeof value === "number") return value > 0;
  }
  return fallback;
}

function sanitizeString(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function uniqueImages(images: string[]): string[] {
  return Array.from(new Set(images.filter((url) => typeof url === "string" && isValidImageUrl(url))));
}

function stableNumericId(value: string): number {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function mapearCategoria(categoria: string): Produto["categoria"] {
  const normalized = sanitizeString(categoria);
  const mapa: Record<string, Produto["categoria"]> = {
    "Calça": "calças",
    "Calças": "calças",
    "Saia": "saias",
    "Saias": "saias",
    "Vestido": "vestidos",
    "Vestidos": "vestidos",
    "Blusa": "blusas",
    "Blusas": "blusas",
    "Bolsa": "bolsas",
    "Bolsas": "bolsas",
    "Acessório": "acessorios",
    "Acessórios": "acessorios",
    "Acessorio": "acessorios",
    "Acessorios": "acessorios",
    "Short-Saia": "short-saias",
    "Short-Saias": "short-saias",
    "Short": "shorts",
    "Shorts": "shorts",
    "Conjunto": "conjuntos",
    "Conjuntos": "conjuntos",
    "Outro": "outros",
    "Outros": "outros",
  };

  return mapa[normalized] || "outros";
}

function extractImages(product: ApiRecord, variantRecords: ApiRecord[]): string[] {
  const directImages = [
    readString(product, ["imagem_thumb", "imagemThumb", "thumb", "thumbnail"]),
    readString(product, ["imagem_principal", "imagemPrincipal", "imagem", "image", "foto", "foto_url"]),
    ...asArray(product.imagens).filter((item): item is string => typeof item === "string"),
    ...asArray(product.images).filter((item): item is string => typeof item === "string"),
  ];

  const variantImages = variantRecords.flatMap((variant) => [
    readString(variant, ["imagem", "image", "imagem_principal", "imagemPrincipal"]),
    ...asArray(variant.imagens).filter((item): item is string => typeof item === "string"),
    ...asArray(variant.images).filter((item): item is string => typeof item === "string"),
  ]);

  return uniqueImages([...directImages, ...variantImages]);
}

function extractVariants(product: ApiRecord): VarianteProduto[] {
  const variantRecords = asArray(product.variantes_disponiveis ?? product.variantesDisponiveis ?? product.variantes ?? product.variants).map(asRecord);
  const variants: VarianteProduto[] = [];

  variantRecords.forEach((variant) => {
    const cor = readString(variant, ["cor", "color", "nome_cor", "nomeCor"], "Única");
    const sizeRecords = asArray(variant.tamanhos ?? variant.sizes ?? variant.grade);

    if (sizeRecords.length > 0) {
      sizeRecords.map(asRecord).forEach((sizeInfo) => {
        const quantidade = readNumber(sizeInfo, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
        if (quantidade > 0) {
          variants.push({
            tamanho: readString(sizeInfo, ["tamanho", "size", "nome"], "U"),
            cor,
            disponibilidade: quantidade,
          });
        }
      });
      return;
    }

    const quantidade = readNumber(variant, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
    const disponivel = readBoolean(variant, ["disponivel", "available", "ativo"], false);
    if (quantidade > 0 || disponivel) {
      variants.push({
        tamanho: readString(variant, ["tamanho", "size"], "U"),
        cor,
        disponibilidade: Math.max(quantidade, 1),
      });
    }
  });

  if (variants.length === 0) {
    const disponibilidade = readNumber(product, ["disponibilidade", "totalAvailable", "estoque", "quantidade", "available"], 0);
    if (disponibilidade > 0 || readBoolean(product, ["disponivel", "available", "ativo"], false)) {
      variants.push({
        tamanho: readString(product, ["tamanho", "size"], "U"),
        cor: readString(product, ["cor", "color"], "Única"),
        disponibilidade: Math.max(disponibilidade, 1),
      });
    }
  }

  return variants;
}

function unwrapList(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  const data = asRecord(response);
  return asArray(data.items ?? data.data ?? data.produtos ?? data.results);
}

function mapProduto(rawProduct: unknown): Produto | null {
  const product = asRecord(asRecord(rawProduct).data ?? rawProduct);
  const rawId = readString(product, ["id", "produto_id", "produtoId", "_id", "codigoProduto", "codigo", "sku"]);
  if (!rawId) return null;

  const variants = extractVariants(product);
  if (variants.length === 0) return null;

  const variantRecords = asArray(product.variantes_disponiveis ?? product.variantesDisponiveis ?? product.variantes ?? product.variants).map(asRecord);
  const precoVenda = readNumber(product, ["preco", "precoVenda", "preco_venda", "valor", "price"], 0);
  const precoPromocional = readNumber(product, ["precoPromocional", "preco_promocional", "preco_oferta", "sale_price"], 0);
  const nome = readString(product, ["nome", "name", "titulo", "title"], "Produto Mariela");

  return {
    id: stableNumericId(rawId),
    codigoProduto: readString(product, ["codigoProduto", "codigo", "sku", "referencia"], rawId),
    nome,
    descricao: readString(product, ["descricao", "description", "detalhes"], `Produto ${nome}`),
    categoria: mapearCategoria(readString(product, ["categoria", "category", "categoria_nome", "categoriaNome"], "Outro")),
    imagens: extractImages(product, variantRecords),
    variants,
    precoCusto: precoVenda * 0.6,
    precoVenda,
    precoPromocional: precoPromocional > 0 ? precoPromocional : undefined,
    emPromocao: readBoolean(product, ["emPromocao", "em_promocao", "isOnSale", "is_on_sale", "promocao"], false) || (precoPromocional > 0 && precoPromocional < precoVenda),
    isNovidade: readBoolean(product, ["isNovidade", "is_novidade", "isNew", "is_new", "novidade", "lancamento"], false),
  };
}

function mapConfig(response: unknown): VitrineConfig {
  const config = asRecord(asRecord(response).data ?? response);

  return {
    nomeLoja: readString(config, ["nome_loja", "nomeLoja", "nome", "store_name"], DEFAULT_CONFIG.nomeLoja),
    logoUrl: readString(config, ["logo_url", "logoUrl", "logo"]) || null,
    faviconUrl: readString(config, ["favicon_url", "faviconUrl", "favicon"]) || null,
    corPrimaria: readString(config, ["cor_primaria", "corPrimaria", "primary_color"]) || null,
    corSecundaria: readString(config, ["cor_secundaria", "corSecundaria", "secondary_color"]) || null,
    whatsapp: readString(config, ["whatsapp", "telefone_whatsapp", "phone"]) || null,
    instagram: readString(config, ["instagram", "instagram_url", "instagramUrl"]) || null,
  };
}

export const vitrineApiService = {
  async getConfig(): Promise<VitrineConfig> {
    try {
      return mapConfig(await fetchCachedJson<unknown>("/config", undefined, CACHE_TTL.config));
    } catch (error) {
      console.warn(getVitrineApiErrorMessage(error));
      return DEFAULT_CONFIG;
    }
  },

  async getProdutos(params?: QueryParams): Promise<Produto[]> {
    const response = await fetchCachedJson<unknown>("/produtos", params, CACHE_TTL.produtos);
    const mapped = unwrapList(response)
      .map(mapProduto)
      .filter((produto): produto is Produto => Boolean(produto));

    if (mapped.length > 0) return mapped;

    const summaries = unwrapList(response).map(asRecord);
    const detailed = await Promise.all(
      summaries.map((summary) => {
        const id = readString(summary, ["id", "produto_id", "produtoId", "_id"]);
        return id ? this.getProdutoById(id).catch(() => null) : Promise.resolve(null);
      })
    );

    return detailed.filter((produto): produto is Produto => Boolean(produto));
  },

  async getProdutoById(id: string | number): Promise<Produto | null> {
    return mapProduto(await fetchCachedJson<unknown>(`/produto/${encodeURIComponent(String(id))}`, undefined, CACHE_TTL.produto));
  },

  async getColecoes(): Promise<unknown[]> {
    const response = await fetchCachedJson<unknown>("/colecoes", undefined, CACHE_TTL.colecoes);
    return unwrapList(response);
  },

  async getCategorias(): Promise<string[]> {
    const response = await fetchCachedJson<unknown>("/categorias", undefined, CACHE_TTL.categorias);
    return unwrapList(response).filter((categoria): categoria is string => typeof categoria === "string");
  },
};
