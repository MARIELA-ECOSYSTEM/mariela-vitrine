import { createContext, useContext, useState, ReactNode } from "react";
import { Produto } from "@/data/products";

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Produto, size: string) => {
    setItems((prev) => [...prev, { product, size }]);
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
      value={{ items, addToCart, removeFromCart, clearCart, getTotalValue }}
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
