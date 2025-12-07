import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Produto } from "@/data/products";
import { 
  saveCartToStorage, 
  loadCartFromStorage, 
  isOnline as checkOnline,
  setupNetworkListeners 
} from "@/lib/offlineCart";
import { toast } from "sonner";

interface CartItem {
  product: Produto;
  size: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Produto, size: string) => void;
  removeFromCart: (productId: number, size: string) => void;
  clearCart: () => void;
  getTotalValue: () => number;
  isOffline: boolean;
  syncCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Sync cart to localStorage whenever items change
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  // Setup network listeners
  useEffect(() => {
    const cleanup = setupNetworkListeners(
      () => {
        setIsOffline(false);
        toast.success("Conexão restaurada! Carrinho sincronizado.");
      },
      () => {
        setIsOffline(true);
        toast.info("Sem conexão. Carrinho salvo localmente.");
      }
    );

    return cleanup;
  }, []);

  const addToCart = (product: Produto, size: string) => {
    setItems((prev) => [...prev, { product, size }]);
    if (isOffline) {
      toast.info("Item adicionado (offline) - será sincronizado quando voltar online");
    }
  };

  const removeFromCart = (productId: number, size: string) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (item) => item.product.id === productId && item.size === size
      );
      if (index !== -1) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return prev;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const syncCart = () => {
    // Re-load from storage and merge if needed
    const storedItems = loadCartFromStorage();
    if (storedItems.length > 0 && storedItems !== items) {
      setItems(storedItems);
    }
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => {
      const preco = item.product.emPromocao && item.product.precoPromocional 
        ? item.product.precoPromocional 
        : item.product.precoVenda;
      return total + preco;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, clearCart, getTotalValue, isOffline, syncCart }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
