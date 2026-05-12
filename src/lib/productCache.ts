import { Produto } from "@/data/products";

const CACHE_KEY = "mariela_products_cache_v10";
const CACHE_TIMESTAMP_KEY = "mariela_products_cache_timestamp_v10";

/**
 * Limpa todos os caches de versões anteriores para garantir que
 * nenhum dado mockado ou inconsistente permaneça no navegador.
 */
if (typeof localStorage !== 'undefined') {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("mariela_") && key !== CACHE_KEY && key !== CACHE_TIMESTAMP_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface CacheData {
  produtos: Produto[];
  timestamp: number;
}

// Salvar produtos no cache local
export function saveToCache(produtos: Produto[]): void {
  try {
    const cacheData: CacheData = {
      produtos,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log(`Cache salvo: ${produtos.length} produtos`);
  } catch (error) {
    console.warn("Erro ao salvar cache:", error);
  }
}

// Carregar produtos do cache local
export function loadFromCache(): Produto[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);
    console.log(`Cache carregado: ${cacheData.produtos.length} produtos`);
    return cacheData.produtos;
  } catch (error) {
    console.warn("Erro ao carregar cache:", error);
    return null;
  }
}

// Verificar se o cache ainda é válido
export function isCacheValid(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const cacheData: CacheData = JSON.parse(cached);
    const now = Date.now();
    const isValid = now - cacheData.timestamp < CACHE_DURATION;
    
    if (!isValid) {
      console.log("Cache expirado");
    }
    
    return isValid;
  } catch (error) {
    return false;
  }
}

// Limpar cache
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log("Cache limpo");
  } catch (error) {
    console.warn("Erro ao limpar cache:", error);
  }
}

// Obter idade do cache em segundos
export function getCacheAge(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cacheData: CacheData = JSON.parse(cached);
    return Math.floor((Date.now() - cacheData.timestamp) / 1000);
  } catch (error) {
    return null;
  }
}
