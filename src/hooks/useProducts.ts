import { useProductsContext } from "@/contexts/ProductsContext";

export function useProducts() {
  return useProductsContext();
}
