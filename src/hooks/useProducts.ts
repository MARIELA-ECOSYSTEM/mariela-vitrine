import { useProductsContext } from "@/contexts/ProductsContext";

export function useProducts() {
  const context = useProductsContext();
  return {
    produtos: context.produtos,
    loading: context.loading,
    error: context.error,
    isFromCache: context.isFromCache,
    cacheAge: context.cacheAge,
    refreshProducts: context.refreshProducts,
    forceRefresh: context.forceRefresh,
  };
}
