import type { Produto, ProdutoCor, ProdutoCorImagem, VarianteProduto } from "@/data/products";
import { isPublicProductBadgeType } from "@/services/productInsightsService";
 import { isValidSize, normalizeSizeLabel } from "@/lib/sizeUtils";
 import { isColecaoElegivelParaHome, type ColecaoElegibilidadeRaw, ColecaoExclusionReason } from "@/lib/colecaoEligibility";
 import { isProdutoPublicavel, ProdutoExclusionReason } from "@/lib/productEligibility";

 const VITRINE_API_PRODUCTION_URL = "https://pyqjzdtaljckwjscmdwp.supabase.co/functions/v1/vitrine-api";
 // Usamos o VITE_SUPABASE_URL do ambiente atual para recursos em desenvolvimento (editorial).
 // Em produção, ambos serão o mesmo projeto. Em preview, isso permite testar novos contratos.
 const VITRINE_API_LOCAL_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://zbmdrncgsuvjexpiezbr.supabase.co'}/functions/v1/vitrine-api`;
 
  const EDITORIAL_PATHS = ['/home/blocks', '/monte-seu-look', '/config', '/produtos'];
const API_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 800;
const MAX_CACHE_ITEMS = 40;
const LOCAL_STORAGE_CACHE_KEY = "mariela_vitrine_api_cache_v8";
const LEGACY_CACHE_KEYS = [
  "mariela_vitrine_api_cache_v6",
  "mariela_vitrine_api_cache_v5",
  "mariela_vitrine_api_cache_v4",
  "mariela_vitrine_api_cache_v3",
  "mariela_vitrine_api_cache_v2",
  "mariela_vitrine_api_cache_v1",
];

// Limpa caches antigos para forçar reload do novo contrato com `cores` na listagem.
if (typeof localStorage !== "undefined") {
  try {
    LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* cache opcional */
  }
}

const CACHE_TTL = {
  config: 5 * 60 * 1000,
  colecoes: 5 * 60 * 1000,
  categorias: 5 * 60 * 1000,
  produtos: 60 * 1000,
  produto: 2 * 60 * 1000,
   destaques: 5 * 60 * 1000,
   homeBlocks: 5 * 60 * 1000,
   monteLook: 5 * 60 * 1000,
} as const;

 const FALLBACK_STALE_WINDOW = 5 * 60 * 1000;
 /** Proteção contra stale eterno: se a entrada tiver mais de 12h, forçamos revalidação completa ignorando ETag. */
 const STALE_MAX_AGE = 12 * 60 * 60 * 1000;

// Mapa de requisições em andamento para deduplicar fetches concorrentes
const inflightRequests = new Map<string, Promise<unknown>>();

type QueryParams = Record<string, string | number | boolean | null | undefined>;
type ApiRecord = Record<string, unknown>;
type ResponseValidator<T> = (payload: unknown) => T;

export interface ConfigResponse {
  data: {
    nome_loja: string | null;
    logo_url: string | null;
    favicon_url: string | null;
    cor_primaria: string | null;
    cor_secundaria: string | null;
    whatsapp: string | null;
    instagram: string | null;
  };
}

export interface ProdutoListItem {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  colecao: string | null;
  preco_venda: number;
  imagem_thumb: string | null;
  imagem_principal: string | null;
}

export interface ProdutoVariantPublic {
  id: string;
  cor: string | null;
  tamanho: string | null;
  disponivel: boolean;
}

export interface ProdutoDetail extends ProdutoListItem {
  imagens: string[];
  variantes_disponiveis: ProdutoVariantPublic[];
}

export interface ProdutoDetailResponse {
  data: ProdutoDetail;
}

export interface CategoriaResponse {
  data: string[];
}

export interface ColecaoResponse {
  data: unknown[];
}

 export interface HomeBlock {
   id: string;
   tipo: "produtos" | "colecoes" | "banner" | "instagram";
   titulo: string | null;
   subtitulo: string | null;
   prioridade: number;
   config: {
     filter?: string;
     limit?: number;
     colecoes?: string[]; // IDs de coleções se tipo for "colecoes"
     produtos?: string[]; // IDs de produtos se tipo for "produtos" (manual)
     linkLabel?: string;
     linkTo?: string;
     estilo?: "grade" | "carrossel" | "lista";
   };
   validade?: {
     inicio: string | null;
     fim: string | null;
   };
 }
 
 export interface HomeBlocksResponse {
   data: HomeBlock[];
 }
 
/**
 * Coleção em destaque consumida da rota
 * `/colecoes?detalhes=1&destaque=1`. A Vitrine usa APENAS estes campos do
 * contrato — não depende de campos internos do PDV.
 */
 export interface ColecaoDestaque extends ColecaoElegibilidadeRaw {
   id: string;
   nome: string;
   descricao: string | null;
   /** URL da mídia otimizada para o banner principal da Home (campanhas). */
   home_destaque_url: string | null;
   /** Tipo da mídia: image, gif ou video. */
   home_destaque_tipo: "image" | "gif" | "video" | null;
   /** Banner institucional da coleção (formato paisagem). */
   banner_url: string | null;
   imagem_capa_url: string | null;
   destaque: boolean;
   ordem: number;
   /** Hex (#rrggbb) opcional, usado como acento visual no banner. */
   cor_destaque: string | null;
 }

export interface FilterOption {
  value: string;
  label: string;
}

export interface PaginationResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ProdutosPage {
  items: Produto[];
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ProdutoDestaquePublico {
  produto_id: string;
  badge: string;
  prioridade: number;
}

export interface RespostaDestaques {
  items: ProdutoDestaquePublico[];
}

type CacheEntry<T> = {
  value: T;
  timestamp: number;
  etag?: string;
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

  const DEFAULT_HOME_BLOCKS: HomeBlock[] = [
    {
      id: "colecoes_destaque",
      tipo: "colecoes",
      titulo: "Coleções em Destaque",
      subtitulo: "Confira nossas últimas campanhas",
      prioridade: 5,
      config: { estilo: "grade" }
    },
    {
      id: "novidades",
      tipo: "produtos",
      titulo: "Novidades",
      subtitulo: "Recém-chegadas à coleção",
      prioridade: 10,
      config: { filter: "novidades", limit: 6, linkLabel: "Ver todas as novidades", linkTo: "/products?filter=novidades" }
    },
    {
      id: "em_alta",
      tipo: "produtos",
      titulo: "Em alta",
      subtitulo: "Peças em destaque na vitrine",
      prioridade: 20,
      config: { filter: "em_alta", limit: 4, linkLabel: "Ver produtos", linkTo: "/products?filter=em_alta" }
    },
    {
      id: "promocoes",
      tipo: "produtos",
      titulo: "Promoções",
      subtitulo: "Descontos em peças selecionadas",
      prioridade: 30,
      config: { filter: "promocoes", limit: 4, linkLabel: "Ver todas as promoções", linkTo: "/products?filter=promocoes" }
    }
  ];
 
const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightDestaques = new Map<string, Promise<ProdutoDestaquePublico[]>>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, params?: QueryParams): string {
   // Rotas editoriais novas usam o Supabase local (preview) para permitir testes sem quebrar o catálogo real.
   // Rotas de catálogo (produtos, colecoes) sempre usam a URL de produção para garantir dados reais.
   const isEditorial = EDITORIAL_PATHS.some(p => path === p || path.startsWith(`${p}/`));
   const baseUrl = isEditorial ? VITRINE_API_LOCAL_URL : VITRINE_API_PRODUCTION_URL;
   
   const url = new URL(`${baseUrl}${path}`);
  if (params) {
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function normalizeProdutosParams(params?: QueryParams): QueryParams | undefined {
  if (!params) return undefined;
  const allowedKeys = ["busca", "categoria", "colecao", "preco_min", "preco_max", "ordem", "limit", "offset"];
  const normalized: QueryParams = {};

  allowedKeys.forEach((key) => {
    normalized[key] = params[key];
  });

  (["preco_min", "preco_max", "limit", "offset"] as const).forEach((key) => {
    const value = normalized[key];
    if (value === null || value === undefined || value === "") return;
    const numeric = Number(value);
    normalized[key] = Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
  });

  const min = Number(normalized.preco_min);
  const max = Number(normalized.preco_max);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    normalized.preco_min = max;
    normalized.preco_max = min;
  }

  return normalized;
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
  const entry = getCachedEntry<T>(key, maxAge);
  return entry ? entry.value : null;
}

 function getCachedEntry<T>(key: string, maxAge: number): CacheEntry<T> | null {
   const now = Date.now();
   const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
   
   // Verifica TTL normal
   if (memoryEntry && now - memoryEntry.timestamp <= maxAge) return memoryEntry;
 
   const storageEntry = readLocalStorageCache()[key] as CacheEntry<T> | undefined;
   if (storageEntry) {
     // Proteção contra stale eterno
     if (now - storageEntry.timestamp > STALE_MAX_AGE) {
       return null;
     }
 
     if (now - storageEntry.timestamp <= maxAge) {
       memoryCache.set(key, storageEntry);
       return storageEntry;
     }
   }
 
   return null;
 }

function getStaleCachedEntry<T>(key: string): CacheEntry<T> | null {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry) return memoryEntry;
  const storageEntry = readLocalStorageCache()[key] as CacheEntry<T> | undefined;
  return storageEntry ?? null;
}

function setCached<T>(key: string, value: T, etag?: string): void {
  const entry: CacheEntry<T> = { value, timestamp: Date.now(), etag };
  memoryCache.set(key, entry);

  const cache = readLocalStorageCache();
  cache[key] = entry as CacheEntry<unknown>;
  writeLocalStorageCache(cache);
}

function refreshCachedTimestamp(key: string): void {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) memoryEntry.timestamp = Date.now();
  const cache = readLocalStorageCache();
  if (cache[key]) {
    cache[key].timestamp = Date.now();
    writeLocalStorageCache(cache);
  }
}

function stableParamsKey(params?: QueryParams): string {
  if (!params) return "";
  return JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
}

function createApiError(status: number, url?: string): VitrineApiError {
  if (status === 400) return new VitrineApiError("Parâmetros inválidos na consulta da vitrine.", status);
  
  if (status === 404) {
    // Se um recurso editorial novo falhar (blocks, monte-seu-look), retornamos um erro
    // específico que permite ao frontend ignorar a seção sem quebrar o resto.
    const isEditorial = url?.includes("/home/blocks") || url?.includes("/monte-seu-look");
    if (isEditorial) {
      return new VitrineApiError("Recurso editorial não disponível no ambiente atual.", 404);
    }
    return new VitrineApiError("Item não encontrado na vitrine.", 404);
  }
  
  if (status >= 500) return new VitrineApiError("A vitrine está temporariamente indisponível. Tente novamente em instantes.", status);
  return new VitrineApiError("Não foi possível carregar os dados da vitrine.", status);
}

function createInvalidPayloadError(context: string): VitrineApiError {
  return new VitrineApiError(`Resposta inválida da vitrine em ${context}.`);
}

function logVitrineWarning(message: string, details?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[vitrine-api] ${message}`, details ?? "");
    return;
  }
  // Produção: silêncio total. Falhas técnicas não devem poluir o
  // console do usuário final — a UI já trata via fallback silencioso.
}

export function getVitrineApiErrorMessage(error: unknown): string {
  if (error instanceof VitrineApiError) return error.friendlyMessage;
  return "Não foi possível carregar os dados da vitrine.";
}

type RequestResult<T> = { notModified: true } | { notModified: false; data: T; etag?: string };

async function requestJson<T>(url: string, ifNoneMatch?: string): Promise<RequestResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 304) {
        return { notModified: true };
      }

      if (!response.ok) {
        logVitrineWarning(`HTTP ${response.status} em ${url}`);
        throw createApiError(response.status, url);
      }

      const data = await response.json() as T;
      const etag = response.headers.get("ETag") ?? response.headers.get("etag") ?? undefined;
      return { notModified: false, data, etag };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new VitrineApiError("Erro desconhecido na vitrine.");

      if (error instanceof VitrineApiError && error.status && error.status < 500) {
        throw error;
      }

      if (!(error instanceof VitrineApiError)) {
        logVitrineWarning(`Falha de rede em ${url}`, error);
      }

      if (attempt < MAX_RETRIES) {
        // Backoff exponencial: 1x, 2x, 4x... — dá tempo para o runtime
        // do edge function se recuperar de instabilidades momentâneas (503).
        await delay(RETRY_DELAY * Math.pow(2, attempt - 1));
      }
    }
  }

  if (lastError instanceof VitrineApiError) throw lastError;
  throw new VitrineApiError("A vitrine está temporariamente indisponível. Tente novamente em instantes.");
}

 async function fetchCachedJson<T>(path: string, params: QueryParams | undefined, ttl: number, validate?: ResponseValidator<T>): Promise<T> {
   const url = buildUrl(path, params);
   const freshEntry = getCachedEntry<unknown>(url, ttl);
   if (freshEntry) {
     try {
       return validate ? validate(freshEntry.value) : (freshEntry.value as T);
     } catch (error) {
       logVitrineWarning(`Cache inválido em ${url}`, error);
     }
   }
 
   // Para revalidação condicional, considerar entrada stale com ETag salvo.
   const staleEntry = getStaleCachedEntry<unknown>(url);
   let ifNoneMatch = staleEntry?.etag;
 
   // Se o cache stale for antigo demais (STALE_MAX_AGE), ignoramos o ETag para forçar fetch full.
   if (staleEntry && (Date.now() - staleEntry.timestamp > STALE_MAX_AGE)) {
     ifNoneMatch = undefined;
   }
 
   // Dedupe de chamadas concorrentes para a mesma URL
   const existing = inflightRequests.get(url);
   const promise = existing ?? requestJson<unknown>(url, ifNoneMatch);
   if (!existing) inflightRequests.set(url, promise);
 
   try {
     const result = await promise as RequestResult<unknown>;
     if (result.notModified && staleEntry) {
       // Servidor confirmou que payload não mudou — reutiliza cache e renova timestamp.
       refreshCachedTimestamp(url);
       try {
         return validate ? validate(staleEntry.value) : (staleEntry.value as T);
       } catch (error) {
         logVitrineWarning(`Cache stale inválido após 304 em ${url}`, error);
         throw error;
       }
     }
     if (result.notModified) {
       // 304 sem entrada local — força nova requisição sem ETag.
       const retry = await requestJson<unknown>(url) as RequestResult<unknown>;
       if (retry.notModified === true) {
         throw new VitrineApiError("Resposta inesperada (304) sem cache local.");
       }
       const validatedRetry = validate ? validate(retry.data) : (retry.data as T);
       setCached(url, validatedRetry, retry.etag);
       return validatedRetry;
     }
     // result aqui é { notModified: false; data; etag? }
     const fresh = result as Extract<RequestResult<unknown>, { notModified: false }>;
     const validated = validate ? validate(fresh.data) : (fresh.data as T);
     setCached(url, validated, fresh.etag);
     return validated;
   } catch (error) {
     const fallback = getCached<unknown>(url, ttl + FALLBACK_STALE_WINDOW);
     if (fallback) {
       try {
         return validate ? validate(fallback) : fallback as T;
       } catch (fallbackError) {
         logVitrineWarning(`Fallback de cache inválido em ${url}`, fallbackError);
       }
     }
     throw error;
   } finally {
     if (inflightRequests.get(url) === promise) inflightRequests.delete(url);
   }
 }

import { LookSuggestion, LookManual, MonteSeuLookData } from "@/data/products";

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ApiRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readOptionalString(source: ApiRecord, keys: string[]): string | null {
  const value = readString(source, keys);
  return value || null;
}

function readString(source: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return sanitizeString(value);
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function toFilterOption(value: unknown): FilterOption | null {
  if (typeof value === "string") {
    const label = sanitizeString(value);
    return label ? { value: label, label } : null;
  }

  const record = asRecord(value);
  const label = readString(record, ["label", "nome", "name", "titulo", "title", "descricao"]);
  const optionValue = readString(record, ["value", "slug", "id", "codigo", "nome", "name"], label);
  return label && optionValue ? { value: optionValue, label } : null;
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

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function uniqueImages(images: string[]): string[] {
  // Deduplica ignorando parâmetros de redimensionamento/qualidade
  // (ex.: `?w=300` vs `?w=800` da MESMA foto). Sem isso, o serviço agrega
  // a `imagem_thumb` e a `imagem_full` da mesma cor como se fossem fotos
  // diferentes — fenômeno relatado como "3ª imagem fantasma" em
  // ProductCard, MonteSeuLook etc.
  const RESIZE_PARAMS = ["w", "h", "q", "width", "height", "quality", "fit", "auto", "dpr", "format"];
  // Prefixos de tamanho aplicados pelo PDV no NOME do arquivo
  // (ex.: `thumb_<uuid>.webp` vs `full_<uuid>.webp` para a MESMA foto).
  // Sem essa normalização, a listagem agrega `imagem_thumb` e `imagem_full`
  // de uma cor como duas imagens distintas — gerando a "imagem fantasma"
  // observada no ProductCard (ex.: produto com 3 fotos exibindo 4).
  const SIZE_FILENAME_PREFIX = /^(?:thumb|full|sm|md|lg|xl|xs|preview|original|orig)_/i;
  const normalize = (url: string): string => {
    try {
      const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://placeholder.local");
      RESIZE_PARAMS.forEach((k) => u.searchParams.delete(k));
      const search = u.searchParams.toString();
      // Normaliza o último segmento removendo o prefixo de tamanho do
      // arquivo. Mantém o resto do path inalterado para não colidir
      // arquivos diferentes que compartilham apenas o sufixo (UUID).
      const segments = u.pathname.split("/");
      const last = segments[segments.length - 1] ?? "";
      const normalizedLast = last.replace(SIZE_FILENAME_PREFIX, "");
      segments[segments.length - 1] = normalizedLast;
      const normalizedPath = segments.join("/");
      return `${u.origin}${normalizedPath}${search ? `?${search}` : ""}`;
    } catch {
      return url.split("?")[0];
    }
  };
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of images) {
    if (typeof url !== "string" || !isValidImageUrl(url)) continue;
    const key = normalize(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
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

/**
 * Lê o array de cores no novo modelo produto → cor → tamanho.
 * Compatível com payloads que ainda não expõem `cores`.
 */
function getCorRecords(product: ApiRecord): ApiRecord[] {
  return asArray(
    product.cores ?? product.produto_cores ?? product.produtoCores ?? product.colors,
  ).map(asRecord);
}

function readCorImagem(cor: ApiRecord, prefer: "full" | "thumb"): string {
  const fullKeys = ["imagem_full", "imagemFull", "imagem_principal", "imagemPrincipal", "imagem", "image", "foto", "foto_url"];
  const thumbKeys = ["imagem_thumb", "imagemThumb", "thumb", "thumbnail"];
  const ordered = prefer === "full" ? [...fullKeys, ...thumbKeys] : [...thumbKeys, ...fullKeys];
  return readString(cor, ordered);
}

function extractImages(
  product: ApiRecord,
  variantRecords: ApiRecord[],
  corRecords: ApiRecord[] = getCorRecords(product),
  corOrder: string[] = [],
): string[] {
  // Imagem principal do produto (catálogo/detalhe)
  const principal = readString(product, ["imagem_principal", "imagemPrincipal", "imagem", "image", "foto", "foto_url"]);
  const thumb = readString(product, ["imagem_thumb", "imagemThumb", "thumb", "thumbnail"]);

  // Mapa cor → imagem (preferindo imagem_full p/ detalhe; thumb como fallback)
  const corImageByName = new Map<string, string>();
  corRecords.forEach((cor) => {
    const nome = readString(cor, ["cor", "nome", "color", "name"], "");
    if (!nome) return;
    const img = readCorImagem(cor, "full");
    if (img && !corImageByName.has(nome)) corImageByName.set(nome, img);
  });

  // Sequência alinhada à ordem das cores em `variants` (índice N = cor N)
  const orderedCorImages = corOrder.map((cor) => corImageByName.get(cor)).filter((url): url is string => Boolean(url));

  // Fallback: primeira cor com imagem (para o card quando não há imagem principal)
  const primeiraCorImagem = corRecords
    .map((cor) => readCorImagem(cor, "thumb"))
    .find((url) => Boolean(url)) || "";

  // Imagens legadas em variantes nível tamanho (compatibilidade)
  const legacyVariantImages = variantRecords.flatMap((variant) => [
    readString(variant, ["imagem", "image", "imagem_principal", "imagemPrincipal"]),
    ...asArray(variant.imagens).filter((item): item is string => typeof item === "string"),
    ...asArray(variant.images).filter((item): item is string => typeof item === "string"),
  ]);

  // Imagens diretas/legadas no produto
  const legacyProductImages = [
    ...asArray(product.imagens).filter((item): item is string => typeof item === "string"),
    ...asArray(product.images).filter((item): item is string => typeof item === "string"),
  ];

  // Ordem final: principal → imagens por cor (alinhadas) → demais cores → legacy → thumb
  const all = [
    principal,
    ...orderedCorImages,
    primeiraCorImagem,
    ...legacyProductImages,
    ...legacyVariantImages,
    thumb,
  ];

  return uniqueImages(all);
}

function extractVariants(product: ApiRecord): VarianteProduto[] {
  const variants: VarianteProduto[] = [];

  // Novo modelo: produto → cores[] → tamanhos[]
  const corRecords = getCorRecords(product);
  if (corRecords.length > 0) {
    corRecords.forEach((corRec) => {
      // Sem fallback "Única" quando há cores reais — usamos string vazia para descartar entradas inválidas.
      const cor = readString(corRec, ["cor", "nome", "color", "name"], "");
      if (!cor) return;
      const tamanhos = asArray(corRec.tamanhos ?? corRec.sizes ?? corRec.grade).map(asRecord);
      if (tamanhos.length > 0) {
        tamanhos.forEach((tam) => {
          const quantidade = readNumber(tam, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
          const disponivel = readBoolean(tam, ["disponivel", "available", "ativo"], quantidade > 0);
          if (quantidade > 0 || disponivel) {
            variants.push({
              tamanho: readString(tam, ["tamanho", "size", "nome"], "U"),
              cor,
              disponibilidade: Math.max(quantidade, 1),
            });
          }
        });
      } else {
        // Cor sem grade (típico da listagem `/vitrine-api/produtos`).
        // Default `disponivel = true` quando o campo não existe, para não filtrar a cor.
        const quantidade = readNumber(corRec, ["quantidade", "disponibilidade", "estoque"], 0);
        const disponivel = readBoolean(corRec, ["disponivel", "available", "ativo"], true);
        if (quantidade > 0 || disponivel) {
          variants.push({
            tamanho: readString(corRec, ["tamanho", "size"], "U"),
            cor,
            disponibilidade: Math.max(quantidade, 1),
          });
        }
      }
    });
    if (variants.length > 0) return variants;
  }

  const variantRecords = asArray(product.variantes_disponiveis ?? product.variantesDisponiveis ?? product.variantes ?? product.variants).map(asRecord);

  variantRecords.forEach((variant) => {
    // NÃO inventar cor: descartamos a variant se a API não enviar cor real.
    const cor = readString(variant, ["cor", "color", "nome_cor", "nomeCor"], "");
    if (!cor) return;
    const corLower = cor.trim().toLowerCase();
    if (!corLower || corLower === "única" || corLower === "unica") return;
    const sizeRecords = asArray(variant.tamanhos ?? variant.sizes ?? variant.grade);

    if (sizeRecords.length > 0) {
      sizeRecords.map(asRecord).forEach((sizeInfo) => {
        const quantidade = readNumber(sizeInfo, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
        const tamanho = readString(sizeInfo, ["tamanho", "size", "nome"], "");
        if (quantidade > 0 && tamanho) {
          variants.push({
            tamanho,
            cor,
            disponibilidade: quantidade,
          });
        }
      });
      return;
    }

    const quantidade = readNumber(variant, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
    const disponivel = readBoolean(variant, ["disponivel", "available", "ativo"], false);
    const tamanho = readString(variant, ["tamanho", "size"], "");
    if ((quantidade > 0 || disponivel) && tamanho) {
      variants.push({
        tamanho,
        cor,
        disponibilidade: Math.max(quantidade, 1),
      });
    }
  });

  if (variants.length === 0) {
    const disponibilidade = readNumber(product, ["disponibilidade", "totalAvailable", "estoque", "quantidade", "available"], 0);
    const hasExplicitAvailability = disponibilidade > 0 || readBoolean(product, ["disponivel", "available", "ativo"], false);
    const isListItemFromPublicCatalog = Boolean(product.id && product.nome && product.preco_venda !== undefined);

    // NUNCA inventar cor/tamanho. Só registramos a variant raiz quando a API
    // explicitamente fornecer ambos (cor + tamanho). Isso elimina os fallbacks
    // "Única"/"U" que apareciam em listagens sem grade real.
    const corRaiz = readString(product, ["cor", "color"], "");
    const tamanhoRaiz = readString(product, ["tamanho", "size"], "");
    if ((hasExplicitAvailability || isListItemFromPublicCatalog) && corRaiz && tamanhoRaiz) {
      variants.push({
        tamanho: tamanhoRaiz,
        cor: corRaiz,
        disponibilidade: Math.max(disponibilidade, 1),
      });
    }
  }

  return variants;
}

/**
 * Mapeia o array `cores` do contrato novo para o tipo `ProdutoCor`.
 * Retorna `undefined` quando não há cores reais (mantém retrocompatibilidade).
 */
function extractCores(product: ApiRecord): ProdutoCor[] | undefined {
  const corRecords = getCorRecords(product);
  if (corRecords.length === 0) return undefined;

  const cores: ProdutoCor[] = [];
  corRecords.forEach((corRec, index) => {
    const nome = readString(corRec, ["cor", "nome", "color", "name"], "");
    // Descarta cores sem nome real ou com fallback legado "Única"/"Unica".
    if (!nome) return;
    const nomeLower = nome.trim().toLowerCase();
    if (!nomeLower || nomeLower === "única" || nomeLower === "unica") return;
    const produtoCorId = readString(
      corRec,
      ["produto_cor_id", "produtoCorId", "id", "cor_id", "corId"],
      `${nome}-${index}`,
    );
    if (!produtoCorId) return;
    const corDisponivel = readBoolean(corRec, ["disponivel", "available", "ativo"], true);
    const tamanhosArray = asArray(corRec.tamanhos ?? corRec.sizes ?? corRec.grade);
    const tamanhos = tamanhosArray
      .map(asRecord)
      .map((tam) => {
        const quantidade = readNumber(tam, ["quantidade", "disponibilidade", "estoque", "available", "qty"], 0);
        const disponivel = readBoolean(tam, ["disponivel", "available", "ativo"], quantidade > 0);
        const tamanhoRaw = readString(tam, ["tamanho", "size", "nome"], "");
        const tamanho = isValidSize(tamanhoRaw) ? normalizeSizeLabel(tamanhoRaw) : "";
        if (!isValidSize(tamanho)) return null;
        return {
          tamanho,
          disponibilidade: quantidade > 0 ? quantidade : disponivel ? 1 : 0,
        };
      })
      .filter((t): t is { tamanho: string; disponibilidade: number } => !!t && t.disponibilidade > 0);

    // Listagem (`/vitrine-api/produtos`) pode não enviar `tamanhos` por cor.
    // Nesse caso, NÃO inventamos tamanho ("U") — mantemos a cor com `tamanhos`
    // vazio. A grade real só aparece no detalhe (`/produto/{id}`); a UI de card
    // não exige tamanho para listar a cor. Se a cor não estiver disponível e
    // não houver grade, descartamos.
    if (tamanhos.length === 0 && !corDisponivel) return;

    cores.push({
      produto_cor_id: produtoCorId,
      cor: nome,
      imagem_thumb: readCorImagem(corRec, "thumb") || null,
      imagem_full: readCorImagem(corRec, "full") || null,
      imagem_card_url: readString(corRec, ["imagem_card_url", "imagemCardUrl", "card_url", "midia_card"]),
      imagem_look_url: readString(corRec, ["imagem_look_url", "imagemLookUrl", "look_url", "midia_look"]),
      tamanhos,
      imagens: extractCorImagens(corRec),
    });
  });

  return cores.length > 0 ? cores : undefined;
}

/**
 * Extrai `cores[].imagens[]` (galeria por cor — só vem no detalhe do produto).
 * Aceita variações de nomenclatura: `url_thumb/url_full`, `imagem_thumb/imagem_full`,
 * `thumb/full`. Filtra entradas inválidas (sem nenhuma URL utilizável) e ordena
 * por `principal` desc → `ordem` asc, mantendo estabilidade.
 */
function extractCorImagens(corRec: ApiRecord): ProdutoCorImagem[] | undefined {
  const arr = asArray(corRec.imagens ?? corRec.fotos ?? corRec.images);
  if (arr.length === 0) return undefined;

  const mapped: ProdutoCorImagem[] = arr
    .map(asRecord)
    .map((rec, idx): ProdutoCorImagem | null => {
      const urlFull = readString(rec, ["url_full", "imagem_full", "full", "url", "src"]) || null;
      const urlThumb = readString(rec, ["url_thumb", "imagem_thumb", "thumb", "thumbnail"]) || urlFull;
      if (!urlFull && !urlThumb) return null;
      return {
        id: readString(rec, ["id", "uuid"]) || undefined,
        url_thumb: urlThumb && isValidImageUrl(urlThumb) ? urlThumb : null,
        url_full: urlFull && isValidImageUrl(urlFull) ? urlFull : (urlThumb && isValidImageUrl(urlThumb) ? urlThumb : null),
        principal: readBoolean(rec, ["principal", "main", "primary"], false),
        ordem: readNumber(rec, ["ordem", "order", "posicao", "position"], idx),
      };
    })
    .filter((img): img is ProdutoCorImagem => !!img && (!!img.url_full || !!img.url_thumb));

  if (mapped.length === 0) return undefined;

  return mapped.sort((a, b) => {
    if (!!b.principal !== !!a.principal) return (b.principal ? 1 : 0) - (a.principal ? 1 : 0);
    return (a.ordem ?? 0) - (b.ordem ?? 0);
  });
}

function unwrapList(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  const data = asRecord(response);
  return asArray(data.items ?? data.data ?? data.produtos ?? data.results);
}

function validateMonteSeuLookResponse(payload: unknown): MonteSeuLookData {
  const data = asRecord(asRecord(payload).data ?? payload);
  const sugestoesRaw = asArray(data.sugestoes ?? data.sugestoes_monte_look);
  const looksManuaisRaw = asArray(data.looks_manuais ?? data.looksManuais);

  const sugestoes = sugestoesRaw.map(asRecord).map((item, idx): LookSuggestion | null => {
    const id = readString(item, ["id", "uuid"]);
    const titulo = readString(item, ["titulo", "title"]);
    const midia_url = readString(item, ["midia_url", "midiaUrl", "url", "midia"]);
    if (!id || !titulo || !midia_url) return null;

    const midia_tipo_raw = readString(item, ["midia_tipo", "midiaTipo", "tipo"], "image").toLowerCase();
    const midia_tipo = (midia_tipo_raw === "video" || midia_tipo_raw === "gif") ? midia_tipo_raw : "image";

    return {
      id,
      titulo,
      subtitulo: readOptionalString(item, ["subtitulo", "subtitle"]),
      midia_url,
      midia_tipo: midia_tipo as "image" | "gif" | "video",
      poster_url: readOptionalString(item, ["poster_url", "posterUrl", "poster"]),
      produtos_vinculados: asArray(item.produtos_vinculados ?? item.produtosVinculados ?? item.produtos).map(p => String(p)),
      ordem: readNumber(item, ["ordem", "order"], idx),
      ativo: readBoolean(item, ["ativo", "active", "enabled"], true),
      data_inicio: readOptionalString(item, ["data_inicio", "dataInicio"]),
      data_fim: readOptionalString(item, ["data_fim", "dataFim"]),
    };
  }).filter((s): s is LookSuggestion => !!s && s.ativo);

  const looks_manuais = looksManuaisRaw.map(asRecord).map((item): LookManual | null => {
    const id = readString(item, ["id", "uuid"]);
    const nome = readString(item, ["nome", "name"]);
    if (!id || !nome) return null;

    const midia_editorial_tipo_raw = readString(item, ["midia_editorial_tipo", "midiaEditorialTipo"], null)?.toLowerCase();
    const midia_editorial_tipo = (midia_editorial_tipo_raw === "video" || midia_editorial_tipo_raw === "gif") ? midia_editorial_tipo_raw : (midia_editorial_tipo_raw === "image" ? "image" : null);

    return {
      id,
      nome,
      midia_editorial_url: readOptionalString(item, ["midia_editorial_url", "midiaEditorialUrl", "midia_url"]),
      midia_editorial_tipo: midia_editorial_tipo as "image" | "gif" | "video" | null,
      produtos_vinculados: asArray(item.produtos_vinculados ?? item.produtosVinculados ?? item.produtos).map(p => String(p)),
    };
  }).filter((l): l is LookManual => !!l);

  return {
    sugestoes: sugestoes.sort((a, b) => a.ordem - b.ordem),
    looks_manuais,
  };
}

function validateConfigResponse(payload: unknown): ConfigResponse {
  const data = asRecord(asRecord(payload).data ?? payload);
  if (Object.keys(data).length === 0) {
    logVitrineWarning("Payload de config vazio ou inválido", payload);
  }
  return { data: data as ConfigResponse["data"] };
}

function validatePaginationResponse(payload: unknown): PaginationResponse<ProdutoListItem> {
  const source = asRecord(payload);
  const items = unwrapList(payload).filter((item) => readString(asRecord(item), ["id", "produto_id", "produtoId", "_id", "codigoProduto", "codigo", "sku"]));
  if (!Array.isArray(payload) && !Array.isArray(source.items) && !Array.isArray(source.data) && !Array.isArray(source.produtos) && !Array.isArray(source.results)) {
    logVitrineWarning("Payload de produtos sem lista reconhecida", payload);
  }

  return {
    items: items as ProdutoListItem[],
    limit: readNumber(source, ["limit"], items.length),
    offset: readNumber(source, ["offset"], 0),
    total: readNumber(source, ["total"], items.length),
    hasMore: readBoolean(source, ["hasMore", "has_more"], false),
  };
}

function validateProdutoDetailResponse(payload: unknown): ProdutoDetailResponse {
  const data = asRecord(asRecord(payload).data ?? payload);
  if (!readString(data, ["id", "produto_id", "produtoId", "_id", "codigoProduto", "codigo", "sku"])) {
    logVitrineWarning("Payload de detalhe de produto inválido", payload);
    throw createInvalidPayloadError("produto detalhe");
  }
  return { data: data as unknown as ProdutoDetail };
}

function validateCategoriaResponse(payload: unknown): CategoriaResponse {
  const data = unwrapList(payload)
    .map(toFilterOption)
    .filter((categoria): categoria is FilterOption => Boolean(categoria))
    .map((categoria) => categoria.label);
  if (data.length === 0 && unwrapList(payload).length === 0) {
    logVitrineWarning("Payload de categorias vazio ou inválido", payload);
  }
  return { data };
}

function validateColecaoResponse(payload: unknown): ColecaoResponse {
  const data = unwrapList(payload).map(toFilterOption).filter((colecao): colecao is FilterOption => Boolean(colecao));
  if (data.length === 0 && !Array.isArray(payload) && Object.keys(asRecord(payload)).length === 0) {
    logVitrineWarning("Payload de coleções vazio ou inválido", payload);
  }
  return { data };
}

/**
 * Valida e normaliza a resposta de `/colecoes?detalhes=1&destaque=1`.
 *
 * Princípios (alinhados às regras de produção da vitrine):
 *  - ZERO fallback de dados: a vitrine não inventa coleção, imagem ou
 *    capa. Itens sem `id` ou `nome` são descartados silenciosamente.
 *  - Filtra fora coleções com `destaque !== true` (defesa em camadas
 *    caso o backend ignore o filtro `?destaque=1`).
 *  - Preserva apenas os campos do contrato público; nada mais.
 *  - Ordena por (`ordem` ASC, `nome` ASC) para layout estável.
 */
 /**
  * Valida e normaliza a resposta de `/colecoes?detalhes=1&destaque=1`.
  * Implementa diagnóstico seguro e robusto para rastreabilidade do fluxo.
  */
 function validateColecoesDestaqueResponse(payload: unknown): ColecaoDestaque[] {
   const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
   const isDev = import.meta.env.DEV;
   const isDebugEnabled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugColecoes") === "1";
 
   const rawItems = unwrapList(payload).map(asRecord);
 
   if (isDev && isDebugEnabled) {
     console.group("[ColecoesDebug] Diagnóstico de Coleções Recebidas");
     console.info(`Total de coleções no payload: ${rawItems.length}`);
   }
 
   const validatedItems = rawItems
     .map((item): ColecaoDestaque | null => {
       const id = readString(item, ["id", "colecao_id", "colecaoId", "_id"]);
       const nome = readString(item, ["nome", "name", "titulo", "title"]);
       
       if (!id || !nome) {
         if (isDev && isDebugEnabled) console.warn(`Excluída: ID (${id}) ou Nome (${nome}) inválidos`);
         return null;
       }
 
       const rawData: ColecaoElegibilidadeRaw = {
         id,
         nome,
         destaque: readBoolean(item, ["destaque", "em_destaque", "featured", "highlight"], false),
         ativo: readBoolean(item, ["ativo", "active", "enabled", "publicada"], true),
         data_inicio: readOptionalString(item, ["data_inicio", "dataInicio", "inicio", "start_date", "starts_at"]),
         data_fim: readOptionalString(item, ["data_fim", "dataFim", "fim", "end_date", "ends_at"]),
    quantidade_produtos: readNumber(item, ["quantidade_produtos", "total_produtos", "count", "quantidadeProdutos"], -1),
    imagem_capa_url: readOptionalString(item, [
      "imagem_capa_url",
      "imagemCapaUrl",
      "imagem_capa",
      "capa_url",
      "imagem_url",
      "imagem",
    ]),
       };
 
  const { elegivel, motivos, status } = isColecaoElegivelParaHome(rawData);
 
       if (!elegivel) {
         if (isDev && isDebugEnabled) {
           console.warn(`Excluída: "${nome}" (${id})`, { motivos, status, dados: rawData });
         }
         return null;
       }
 
        const homeDestaqueUrl = readOptionalString(item, ["home_destaque_url", "homeDestaqueUrl", "midia_home"]);
        const homeDestaqueTipoRaw = readString(item, ["home_destaque_tipo", "homeDestaqueTipo", "tipo_midia_home", "tipo_midia"], "image").toLowerCase();
        const homeDestaqueTipo = (homeDestaqueTipoRaw === "video" || homeDestaqueTipoRaw === "gif") ? homeDestaqueTipoRaw : "image";

        const bannerUrl = readOptionalString(item, ["banner_url", "bannerUrl", "imagem_banner"]);
        const imagemCapaValida = rawData.imagem_capa_url && isValidImageUrl(rawData.imagem_capa_url) ? rawData.imagem_capa_url : null;

        const finalHomeDestaqueUrl = homeDestaqueUrl && (isValidImageUrl(homeDestaqueUrl) || homeDestaqueTipo === "video") ? homeDestaqueUrl : null;
        const finalBannerUrl = bannerUrl && isValidImageUrl(bannerUrl) ? bannerUrl : null;
 
       const corDestaqueRaw = readOptionalString(item, [
         "cor_destaque",
         "corDestaque",
         "cor",
         "accent_color",
         "accentColor",
       ]);
       const corDestaque = corDestaqueRaw && HEX_RE.test(corDestaqueRaw) ? corDestaqueRaw : null;
 
       if (isDev && isDebugEnabled) {
         console.info(`✅ Elegível [${status}]: "${nome}"`, { id, destaque: rawData.destaque, ativo: rawData.ativo });
       }
 
       return {
         ...rawData,
         id,
         nome,
         descricao: readOptionalString(item, ["descricao", "description", "subtitulo", "subtitle"]),
          home_destaque_url: finalHomeDestaqueUrl,
          home_destaque_tipo: finalHomeDestaqueUrl ? (homeDestaqueTipo as "image" | "gif" | "video") : null,
          banner_url: finalBannerUrl,
          imagem_capa_url: imagemCapaValida,
         destaque: rawData.destaque!,
         ordem: readNumber(item, ["ordem", "order", "posicao", "position"], 0),
         cor_destaque: corDestaque,
       };
     })
     .filter((item): item is ColecaoDestaque => item !== null);
 
   if (isDev && isDebugEnabled) {
     console.info(`Total de coleções elegíveis: ${validatedItems.length}`);
     console.groupEnd();
   }
 
   validatedItems.sort((a, b) => {
     if (a.ordem !== b.ordem) return a.ordem - b.ordem;
     return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
   });
 
   return validatedItems;
 }

function validateDestaquesResponse(payload: unknown): RespostaDestaques {
  const items = unwrapList(payload)
    .map(asRecord)
    .map((item) => ({
      produto_id: readString(item, ["produto_id", "produtoId", "id", "codigoProduto", "codigo", "sku"]),
      badge: readString(item, ["badge", "tipo", "type"]),
      prioridade: readNumber(item, ["prioridade", "priority"], 0),
    }))
    .filter((item) => item.produto_id && isPublicProductBadgeType(item.badge));

  return { items };
}

function getProductHighlightKey(produto: Produto): string[] {
  return [produto.produtoId, produto.codigoProduto, String(produto.id)].filter((value): value is string => Boolean(value));
}

function applyDestaquesToProdutos(produtos: Produto[], destaques: ProdutoDestaquePublico[]): Produto[] {
  if (destaques.length === 0) return produtos;

  const destaqueMap = new Map<string, ProdutoDestaquePublico>();
  destaques
    .slice()
    .sort((a, b) => b.prioridade - a.prioridade)
    .forEach((destaque) => destaqueMap.set(destaque.produto_id, destaque));

  return produtos.map((produto) => {
    const destaque = getProductHighlightKey(produto).map((key) => destaqueMap.get(key)).find(Boolean);
    return destaque ? { ...produto, badgePublico: destaque.badge, publicBadge: destaque.badge } : produto;
  });
}

 function mapProduto(rawProduct: unknown): Produto | null {
   const product = asRecord(asRecord(rawProduct).data ?? rawProduct);
   const rawId = readString(product, ["id", "produto_id", "produtoId", "_id", "codigoProduto", "codigo", "sku"]);
   if (!rawId) return null;
 
   const variants = extractVariants(product);
   const variantRecords = asArray(product.variantes_disponiveis ?? product.variantesDisponiveis ?? product.variantes ?? product.variants).map(asRecord);
   const corRecords = getCorRecords(product);
   const cores = extractCores(product);
   const corOrder: string[] = [];
   variants.forEach((v) => {
     if (v.cor && !corOrder.includes(v.cor)) corOrder.push(v.cor);
   });
   const imagens = extractImages(product, variantRecords, corRecords, corOrder);
   const precoVenda = readNumber(product, ["preco", "precoVenda", "preco_venda", "valor", "price"], 0);
 
   // Validação de elegibilidade (isProdutoPublicavel)
   const { publicavel, motivos } = isProdutoPublicavel({
     id: rawId,
     nome: readString(product, ["nome", "name", "titulo", "title"]),
     ativo: readBoolean(product, ["ativo", "active", "enabled", "publicada"], true),
     arquivado: readBoolean(product, ["arquivado", "archived"], false),
     variants,
     imagens,
     precoVenda
   });
 
   if (!publicavel) {
     if (import.meta.env.DEV) {
       console.warn(`[vitrine-api] Produto ${rawId} não é publicável:`, motivos);
     }
     return null;
   }
  const precoPromocional = readNumber(product, ["precoPromocional", "preco_promocional", "preco_oferta", "sale_price"], 0);
  const nome = readString(product, ["nome", "name", "titulo", "title"], "Produto Mariela");

  // Campos públicos opcionais vindos diretamente do PDV (preferidos quando presentes)
  const precoAtualApi = readNumber(product, ["preco_atual", "precoAtual", "current_price"], 0);
  const economiaValorApi = readNumber(product, ["economia_valor", "economiaValor", "savings", "saving_amount"], 0);
  const economiaPercentualApi = readNumber(product, ["economia_percentual", "economiaPercentual", "discount_percent", "percent_off"], 0);
  const emPromocaoApi = readBoolean(product, ["emPromocao", "em_promocao", "isOnSale", "is_on_sale", "promocao"], false);
  const emPromocao = emPromocaoApi || (precoPromocional > 0 && precoPromocional < precoVenda) || (precoAtualApi > 0 && precoAtualApi < precoVenda);

  // Derivados (sem recalcular regras): apenas reaproveitar dados quando faltarem
  const precoPromocionalEfetivo = precoPromocional > 0 ? precoPromocional : (emPromocao && precoAtualApi > 0 && precoAtualApi < precoVenda ? precoAtualApi : 0);
  const precoAtual = precoAtualApi > 0 ? precoAtualApi : (precoPromocionalEfetivo > 0 ? precoPromocionalEfetivo : precoVenda);
  const economiaValor = economiaValorApi > 0 ? economiaValorApi : (emPromocao && precoVenda > precoAtual ? +(precoVenda - precoAtual).toFixed(2) : 0);
  const economiaPercentual = economiaPercentualApi > 0 ? economiaPercentualApi : (emPromocao && precoVenda > 0 && economiaValor > 0 ? Math.round((economiaValor / precoVenda) * 100) : 0);

  const createdAt = readOptionalString(product, ["created_at", "createdAt", "criado_em", "criadoEm", "data_cadastro", "dataCadastro"]);
  // Novidade vem exclusivamente da flag da API — sem derivação por data.
  const isNovidade = readBoolean(product, ["isNovidade", "is_novidade", "isNew", "is_new", "novidade", "lancamento"], false);

  return {
    id: stableNumericId(rawId),
    produtoId: rawId,
    codigoProduto: readString(product, ["codigoProduto", "codigo", "sku", "referencia"], rawId),
    nome,
    descricao: readString(product, ["descricao", "description", "detalhes"], `Produto ${nome}`),
    categoria: mapearCategoria(readString(product, ["categoria", "category", "categoria_nome", "categoriaNome"], "Outro")),
    colecao: readOptionalString(product, ["colecao", "colecao_nome", "colecaoNome", "collection", "collection_name"]),
    imagens,
    variants,
    cores,
    precoCusto: precoVenda * 0.6,
    precoVenda,
    precoPromocional: precoPromocionalEfetivo > 0 ? precoPromocionalEfetivo : undefined,
    emPromocao,
    precoAtual,
    economiaValor: economiaValor > 0 ? economiaValor : undefined,
    economiaPercentual: economiaPercentual > 0 ? economiaPercentual : undefined,
    isNovidade,
    imagem_card_url: readString(product, ["imagem_card_url", "imagemCardUrl", "card_url", "midia_card"]),
    imagem_look_url: readString(product, ["imagem_look_url", "imagemLookUrl", "look_url", "midia_look"]),
    badgePublico: readOptionalString(product, ["badgePublico", "badge_publico", "publicBadge", "public_badge"]),
    publicBadge: readOptionalString(product, ["publicBadge", "public_badge"]),
    destaque_publico: readOptionalString(product, ["destaque_publico", "destaquePublico"]),
    recomendacao_publica: readOptionalString(product, ["recomendacao_publica", "recomendacaoPublica"]),
    createdAt,
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
   /**
    * Busca os blocos dinâmicos da Home orientados pelo Motor de Campanhas.
    * Em caso de falha, retorna um conjunto padrão (fallback resiliente).
    */
   async getHomeBlocks(): Promise<HomeBlock[]> {
     try {
       const response = await fetchCachedJson<HomeBlocksResponse>(
         "/home/blocks",
         undefined,
         CACHE_TTL.homeBlocks
       );
       
       if (!response || !Array.isArray(response.data)) {
         throw createInvalidPayloadError("getHomeBlocks");
       }
 
        const sorted = response.data.sort((a, b) => a.prioridade - b.prioridade);
        return sorted;
     } catch (error) {
       logVitrineWarning("Falha ao carregar blocos dinâmicos da Home, usando fallback.", error);
       return DEFAULT_HOME_BLOCKS.sort((a, b) => a.prioridade - b.prioridade);
     }
    },
 
  /**
   * Busca os dados editoriais para o Monte Seu Look (sugestões e looks manuais).
   */
  async getMonteSeuLookData(): Promise<MonteSeuLookData> {
    try {
      return await fetchCachedJson<MonteSeuLookData>(
        "/monte-seu-look",
        undefined,
        CACHE_TTL.monteLook,
        validateMonteSeuLookResponse
      );
    } catch (error) {
      logVitrineWarning("Falha ao carregar dados do Monte Seu Look.", error);
      return { sugestoes: [], looks_manuais: [] };
    }
  },

  async getConfig(): Promise<VitrineConfig> {
    try {
      return mapConfig(await fetchCachedJson<ConfigResponse>("/config", undefined, CACHE_TTL.config, validateConfigResponse));
    } catch (error) {
      logVitrineWarning(getVitrineApiErrorMessage(error), error);
      return DEFAULT_CONFIG;
    }
  },

  async getProdutos(params?: QueryParams): Promise<Produto[]> {
    return (await this.getProdutosPage(params)).items;
  },

  async getDestaques(params?: QueryParams): Promise<ProdutoDestaquePublico[]> {
    const normalizedParams = { limit: 50, ...params };
    const key = stableParamsKey(normalizedParams);
    const inFlight = inFlightDestaques.get(key);
    if (inFlight) return inFlight;

    const request = fetchCachedJson<RespostaDestaques>("/destaques", normalizedParams, CACHE_TTL.destaques, validateDestaquesResponse)
      .then((response) => response.items)
      .catch((error) => {
        logVitrineWarning(getVitrineApiErrorMessage(error), error);
        return [];
      })
      .finally(() => {
        inFlightDestaques.delete(key);
      });

    inFlightDestaques.set(key, request);
    return request;
  },

  async attachDestaquesToProdutos(produtos: Produto[]): Promise<Produto[]> {
    try {
      return applyDestaquesToProdutos(produtos, await this.getDestaques());
    } catch (error) {
      logVitrineWarning(getVitrineApiErrorMessage(error), error);
      return produtos;
    }
  },

  async getProdutosPage(params?: QueryParams): Promise<ProdutosPage> {
    const [response, destaques] = await Promise.all([
      fetchCachedJson<PaginationResponse<ProdutoListItem>>("/produtos", normalizeProdutosParams(params), CACHE_TTL.produtos, validatePaginationResponse),
      this.getDestaques(),
    ]);
    const items = unwrapList(response)
      .map(mapProduto)
      .filter((produto): produto is Produto => Boolean(produto));

    return {
      items: applyDestaquesToProdutos(items, destaques),
      limit: response.limit,
      offset: response.offset,
      total: response.total || items.length,
      hasMore: response.hasMore,
    };
  },

  async getProdutoById(id: string | number): Promise<Produto | null> {
    const produto = mapProduto(await fetchCachedJson<ProdutoDetailResponse>(`/produto/${encodeURIComponent(String(id))}`, undefined, CACHE_TTL.produto, validateProdutoDetailResponse));
    if (!produto) return null;
    return (await this.attachDestaquesToProdutos([produto]))[0] ?? produto;
  },

   /**
    * Invalida o cache (memória + localStorage) do detalhe de um produto.
    */
   invalidateProdutoCache(id: string | number): void {
     const url = buildUrl(`/produto/${encodeURIComponent(String(id))}`);
     this._clearCacheKey(url);
   },
 
   /**
    * Invalida caches relacionados a coleções.
    */
   invalidateColecoesCache(): void {
     this._clearCacheKey(buildUrl("/colecoes", { detalhes: 1, destaque: 1 }));
     this._clearCacheKey(buildUrl("/colecoes"));
   },
 
   /**
    * Invalida caches relacionados a categorias.
    */
   invalidateCategoriasCache(): void {
     this._clearCacheKey(buildUrl("/categorias"));
   },
 
   _clearCacheKey(url: string): void {
     memoryCache.delete(url);
     inflightRequests.delete(url);
     try {
       const cache = readLocalStorageCache();
       if (cache[url]) {
         delete cache[url];
         writeLocalStorageCache(cache);
       }
     } catch {
       /* cache opcional */
     }
   },

  async getColecoes(): Promise<FilterOption[]> {
    const response = await fetchCachedJson<ColecaoResponse>("/colecoes", undefined, CACHE_TTL.colecoes, validateColecaoResponse);
    return unwrapList(response)
      .map(toFilterOption)
      .filter((colecao): colecao is FilterOption => Boolean(colecao));
  },

  /**
   * Lista de coleções marcadas como destaque no PDV. Consome
   * `/colecoes?detalhes=1&destaque=1` e devolve apenas os campos do
   * contrato público (id, nome, descricao, imagem_capa_url, destaque,
   * ordem). Já vem ordenada por (ordem ASC, nome ASC).
   *
   * Usa o mesmo cache memo/localStorage com ETag dos demais endpoints
   * (TTL = CACHE_TTL.colecoes), respeita Cache-Control do servidor via
   * revalidação condicional, e desduplica chamadas concorrentes.
   */
  async getColecoesDestaque(): Promise<ColecaoDestaque[]> {
    const params: QueryParams = { detalhes: 1, destaque: 1 };
    const response = await fetchCachedJson<unknown>(
      "/colecoes",
      params,
      CACHE_TTL.colecoes,
      validateColecoesDestaqueResponse,
    );
    return response as ColecaoDestaque[];
  },

  async getCategorias(): Promise<FilterOption[]> {
    const response = await fetchCachedJson<CategoriaResponse>("/categorias", undefined, CACHE_TTL.categorias, validateCategoriaResponse);
    return unwrapList(response)
      .map(toFilterOption)
      .filter((categoria): categoria is FilterOption => Boolean(categoria));
  },

   isValidBrandingUrl: isValidUrl,
 
   // Expõe diagnóstico no window para facilitar auditoria em tempo real (DEV ONLY)
   _setupDiagnostic(): void {
     if (import.meta.env.DEV && typeof window !== "undefined") {
       (window as any).diagnosticoVitrine = () => {
         console.info("Iniciando diagnóstico de coleções...");
         this.getDiagnosticColecoesDestaque().then(console.table);
       };
     }
   },
 
   /**
    * Endpoint de diagnóstico interno (DEV ONLY).
    * Retorna o status detalhado de todas as coleções candidatas a destaque.
    */
   async getDiagnosticColecoesDestaque(): Promise<unknown> {
     if (!import.meta.env.DEV) return { error: "Diagnostic only available in development mode" };
 
     const params: QueryParams = { detalhes: 1, destaque: 1 };
     const url = buildUrl("/colecoes", params);
     
     // Recupera info do cache para o diagnóstico
     const cacheEntry = getStaleCachedEntry<unknown>(url);
     const now = Date.now();
     const ttlRemaining = cacheEntry ? Math.max(0, (cacheEntry.timestamp + CACHE_TTL.colecoes) - now) : 0;
 
     const response = await fetch(url, { headers: { Accept: "application/json" } });
     const payload = await response.json();
     const rawItems = unwrapList(payload).map(asRecord);
     
     const diagnosis = rawItems.map((item) => {
       const id = readString(item, ["id", "colecao_id", "colecaoId", "_id"]);
       const nome = readString(item, ["nome", "name", "titulo", "title"]);
       const rawData: ColecaoElegibilidadeRaw = {
         id,
         nome,
         destaque: readBoolean(item, ["destaque", "em_destaque", "featured", "highlight"], false),
         ativo: readBoolean(item, ["ativo", "active", "enabled", "publicada"], true),
         data_inicio: readOptionalString(item, ["data_inicio", "dataInicio", "inicio", "start_date", "starts_at"]),
          data_fim: readOptionalString(item, ["data_fim", "dataFim", "fim", "end_date", "ends_at"]),
          quantidade_produtos: readNumber(item, ["quantidade_produtos", "total_produtos", "count", "quantidadeProdutos"], -1),
          home_destaque_url: readOptionalString(item, ["home_destaque_url", "homeDestaqueUrl", "midia_home"]),
          banner_url: readOptionalString(item, ["banner_url", "bannerUrl", "imagem_banner"]),
          imagem_capa_url: readOptionalString(item, [
            "imagem_capa_url",
            "imagemCapaUrl",
            "imagem_capa",
            "capa_url",
            "imagem_url",
            "imagem",
          ]),
        };
 
       const { elegivel, motivos, status } = isColecaoElegivelParaHome(rawData);
       
       return {
         colecao: nome,
         id,
         elegivel,
         health: status,
         motivos_exclusao: motivos,
         quantidade_produtos: rawData.quantidade_produtos,
         periodo_valido: !motivos.some(m => m === ColecaoExclusionReason.FORA_PERIODO),
         timestamp_validacao: new Date().toISOString()
       };
     });
 
     return {
       source_url: url,
       total_recebido: rawItems.length,
       total_elegivel: diagnosis.filter(d => d.elegivel).length,
       cache: {
         etag: cacheEntry?.etag || "None",
         ttl_restante_ms: ttlRemaining,
         timestamp_cache: cacheEntry ? new Date(cacheEntry.timestamp).toISOString() : "None",
         version: LOCAL_STORAGE_CACHE_KEY
       },
       items: diagnosis
     };
   }
 };
