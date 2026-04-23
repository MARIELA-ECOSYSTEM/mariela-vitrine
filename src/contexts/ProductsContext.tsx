import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Produto, fetchProdutos } from "@/data/products";
import { saveToCache, loadFromCache, isCacheValid, getCacheAge } from "@/lib/productCache";
import { vitrineApiService } from "@/services/vitrineApiService";

interface ProductsContextType {
  produtos: Produto[];
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  cacheAge: number | null;
  refreshProducts: () => Promise<boolean>;
  forceRefresh: () => Promise<boolean>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // Carregar produtos da API com cache
  const loadProducts = useCallback(async (forceNetwork = false): Promise<boolean> => {
    try {
      // Primeiro, tentar carregar do cache para exibição rápida
      if (!forceNetwork) {
        const cachedProducts = loadFromCache();
        if (cachedProducts && cachedProducts.length > 0) {
          setProdutos(cachedProducts);
          setIsFromCache(true);
          setCacheAge(getCacheAge());
          setLoading(false);
          
          // Se o cache ainda é válido, não buscar da rede
          if (isCacheValid()) {
            console.log("Usando cache válido");
            return true;
          }
          
          // Cache expirado, buscar em background
          console.log("Cache expirado, buscando em background...");
        }
      }

      // Buscar da API
      setError(null);
      
      // Só mostrar loading se não temos dados ainda
      const hasData = produtos.length > 0;
      if (!hasData && !forceNetwork) {
        setLoading(true);
      }

      const data = await fetchProdutos();
      
      if (data && data.length > 0) {
        setProdutos(data);
        saveToCache(data);
        setIsFromCache(false);
        setCacheAge(null);
        setLoading(false);
        return true;
      } else if (produtos.length === 0) {
        // Se não temos cache e a API falhou
        setError("Não foi possível carregar os produtos");
        setLoading(false);
        return false;
      }
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      
      // Se temos cache, continuar usando
      if (produtos.length > 0) {
        console.log("Erro na API, mantendo cache");
        setLoading(false);
        return true;
      }
      
      setError('Erro ao carregar produtos');
      setLoading(false);
      return false;
    }
  }, [produtos.length]);

  // Refresh normal (usa cache se válido)
  const refreshProducts = useCallback(async (): Promise<boolean> => {
    return await loadProducts(false);
  }, [loadProducts]);

  // Force refresh (ignora cache)
  const forceRefresh = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setIsFromCache(false);
    return await loadProducts(true);
  }, [loadProducts]);

  useEffect(() => {
    loadProducts(false);

    vitrineApiService.getConfig().then((config) => {
      document.title = config.nomeLoja;

      if (config.faviconUrl) {
        const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (favicon) {
          favicon.href = config.faviconUrl;
        }
      }

      if (config.corPrimaria) {
        document.documentElement.style.setProperty("--vitrine-primary", config.corPrimaria);
      }

      if (config.corSecundaria) {
        document.documentElement.style.setProperty("--vitrine-secondary", config.corSecundaria);
      }
    });
  }, []);

  return (
    <ProductsContext.Provider value={{ 
      produtos, 
      loading, 
      error, 
      isFromCache, 
      cacheAge,
      refreshProducts,
      forceRefresh 
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProductsContext must be used within a ProductsProvider');
  }
  return context;
}
