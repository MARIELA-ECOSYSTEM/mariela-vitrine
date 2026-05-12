import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { MobileLookBuilder } from "./MobileLookBuilder";
import { getProductImageByColor } from "@/lib/productImage";
import type { Produto } from "@/data/products";

// jsdom polyfills
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as any).IntersectionObserver = IOStub;

// Mocks
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({ produtos: [], loading: false }),
}));

const mockProduto: Produto = {
  id: 1,
  produtoId: "P1",
  codigoProduto: "P1",
  nome: "Produto Teste",
  descricao: "Desc",
  categoria: "blusas",
  imagens: ["img_default.jpg"],
  imagem_card_url: "img_card.jpg",
  imagem_look_url: "img_look.jpg",
  variants: [],
  cores: [
    {
      produto_cor_id: "c1",
      cor: "Preto",
      imagem_thumb: "img_preto_thumb.jpg",
      imagem_full: "img_preto_full.jpg",
      imagem_card_url: "img_preto_card.jpg",
      imagem_look_url: "img_preto_look.jpg",
      tamanhos: [{ tamanho: "M", disponibilidade: 10 }]
    }
  ],
  precoCusto: 50,
  precoVenda: 100,
  emPromocao: false,
  isNovidade: false
};

describe("Consolidação de Mídias por Contexto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset location
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/");
  });

  it("ProductCard deve usar imagem_card_url quando em contexto de vitrine", () => {
    // Simula contexto fora da PDP
    (window as any).location = new URL("http://localhost/products");
    
    const result = getProductImageByColor(mockProduto);
    expect(result.src).toBe("img_card.jpg");
  });

  it("ProductCard deve usar imagem_card_url da cor selecionada", () => {
    (window as any).location = new URL("http://localhost/products");
    
    const result = getProductImageByColor(mockProduto, "Preto");
    expect(result.src).toBe("img_preto_card.jpg");
  });

  it("MonteSeuLook deve usar imagem_look_url", () => {
    (window as any).location = new URL("http://localhost/monte-seu-look");
    
    const result = getProductImageByColor(mockProduto);
    expect(result.src).toBe("img_look.jpg");
  });

  it("MonteSeuLook deve usar imagem_look_url da cor selecionada", () => {
    (window as any).location = new URL("http://localhost/monte-seu-look");
    
    const result = getProductImageByColor(mockProduto, "Preto");
    expect(result.src).toBe("img_preto_look.jpg");
  });

  it("PDP não deve usar imagem_card_url nem imagem_look_url", () => {
    (window as any).location = new URL("http://localhost/products/P1");
    
    const result = getProductImageByColor(mockProduto, "Preto");
    // Deve cair no fallback de imagem_full/thumb da cor
    expect(result.src).toBe("img_preto_full.jpg");
  });

  it("Deve respeitar debug query strings", () => {
    (window as any).location = new URL("http://localhost/products/P1?debugProducts=1");
    const result = getProductImageByColor(mockProduto);
    expect(result.src).toBe("img_card.jpg");
  });
});