import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Produto, fetchProdutos } from "@/data/products";

interface ProductsContextType {
  produtos: Produto[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<boolean>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProdutos();
      setProdutos(data);
      return true;
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProducts = useCallback(async (): Promise<boolean> => {
    return await loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{ produtos, loading, error, refreshProducts }}>
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
