import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MonteSeuLook from "@/pages/MonteSeuLook";
import { vitrineApiService } from "@/services/vitrineApiService";
import { getProductImageByColor } from "@/lib/productImage";

// Polyfills
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.play = vi.fn(async () => {});
window.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mocks
vi.mock("@/services/vitrineApiService", () => ({
  vitrineApiService: {
    getMonteSeuLookData: vi.fn(),
    getProdutos: vi.fn(),
    getDestaques: vi.fn(),
    getConfig: vi.fn(),
  }
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart: vi.fn(), cartCount: 0, items: [] }),
}));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    produtos: [
      { id: 1, produtoId: "P1", nome: "Blusa", categoria: "blusas", imagens: ["img1.jpg"], variants: [] },
      { id: 2, produtoId: "P2", nome: "Saia", categoria: "saias", imagens: ["img2.jpg"], variants: [] }
    ],
    loading: false
  })
}));

describe("Monte Seu Look - Editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vitrineApiService.getMonteSeuLookData as any).mockResolvedValue({
      sugestoes: [
        {
          id: "s1",
          titulo: "Look Verão",
          midia_url: "look-verao.mp4",
          midia_tipo: "video",
          produtos_vinculados: ["P1", "P2"],
          ordem: 0,
          ativo: true
        }
      ],
      looks_manuais: [
        {
          id: "m1",
          nome: "Look Noite",
          produtos_vinculados: ["P1"],
        }
      ]
    });
  });

  it("deve destacar produtos vinculados em looks manuais", async () => {
    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Verifica se o card do look "Look Noite" contém o link para o produto P1
      const lookCard = screen.getByText("Look Noite").closest(".group");
      expect(lookCard).toBeInTheDocument();
      // No mock de produtos P1 tem nome "Blusa"
      expect(screen.getByTitle("Blusa")).toBeInTheDocument();
    });
  });

  it("deve renderizar a seção de sugestões de looks", async () => {
    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sugestões de Looks")).toBeInTheDocument();
      expect(screen.getByText("Look Verão")).toBeInTheDocument();
    });
  });

  it("deve renderizar a seção de looks prontos", async () => {
    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Looks Prontos")).toBeInTheDocument();
      expect(screen.getByText("Look Noite")).toBeInTheDocument();
    });
  });

  it("deve disparar evento de seleção ao clicar em 'Ver Produtos'", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    
    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Ver Produtos"));
    fireEvent.click(screen.getByText("Ver Produtos"));

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: "monte-seu-look:select-products",
      detail: { products: ["P1", "P2"] }
    }));
  });

  it("deve respeitar a prioridade de fallback de imagem no Monte Seu Look", () => {
    const mockProduto = {
      id: 1,
      nome: "Teste",
      imagens: ["principal.jpg"],
      imagem_card_url: "card.jpg",
      imagem_look_url: null, // Testando fallback
    } as any;

    // Simula contexto de Monte Seu Look
    delete (window as any).location;
    (window as any).location = new URL("http://localhost/monte-seu-look");

    const result = getProductImageByColor(mockProduto);
    // Deve cair no fallback card.jpg pois look_url é null
    expect(result.src).toBe("card.jpg");
  });

  it("deve lidar corretamente com estado vazio de sugestões", async () => {
    (vitrineApiService.getMonteSeuLookData as any).mockResolvedValue({
      sugestoes: [],
      looks_manuais: []
    });

    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Sugestões de Looks")).not.toBeInTheDocument();
      expect(screen.queryByText("Looks Prontos")).not.toBeInTheDocument();
      // Builder ainda deve estar lá
      expect(screen.getByText("Monte Seu Look")).toBeInTheDocument();
    });
  });

  it("deve navegar por teclado nos cards de looks", async () => {
    render(
      <MemoryRouter>
        <MonteSeuLook />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Look Verão"));
    
    const suggestionCard = screen.getByText("Look Verão").closest("[tabindex='0']");
    expect(suggestionCard).toHaveAttribute("tabindex", "0");
    
    const manualCard = screen.getByText("Look Noite").closest("[tabindex='0']");
    expect(manualCard).toHaveAttribute("tabindex", "0");
  });
});