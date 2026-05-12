import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Index from "./Index";
import { vitrineApiService } from "@/services/vitrineApiService";

// Mock components to simplify testing
vi.mock("@/components/Header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/components/HeroBannerCarousel", () => ({ HeroBannerCarousel: () => <div data-testid="hero" /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/components/WelcomeDialog", () => ({ WelcomeDialog: () => <div data-testid="welcome-dialog" /> }));
vi.mock("@/components/LoadingOverlay", () => ({ LoadingOverlay: () => <div data-testid="loading-overlay" /> }));
vi.mock("@/components/QuickActions", () => ({ QuickActions: () => <div data-testid="quick-actions" /> }));

vi.mock("@/hooks/useProducts", () => ({
  useProducts: vi.fn().mockReturnValue({ 
    loading: false, 
    produtos: [
      { id: 1, nome: "Produto Novidade", variants: [{ disponibilidade: 1, tamanho: "P", cor: "Preto" }], imagens: ["img.jpg"], precoVenda: 100, emPromocao: false, isNovidade: true },
      { id: 2, nome: "Produto Promo", variants: [{ disponibilidade: 1, tamanho: "P", cor: "Preto" }], imagens: ["img.jpg"], precoVenda: 100, emPromocao: true, isNovidade: false }
    ] 
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock vitrineApiService
vi.mock("@/services/vitrineApiService", async () => {
  const actual = await vi.importActual("@/services/vitrineApiService");
  return {
    ...actual,
    vitrineApiService: {
      getHomeBlocks: vi.fn().mockImplementation(async () => []),
      getConfig: vi.fn().mockResolvedValue({
        nomeLoja: "Mariela Teste",
        logoUrl: null,
        whatsapp: "5583999999999",
        instagram: "mariela",
      }),
      getProdutos: vi.fn().mockResolvedValue([]),
      getProdutosByIds: vi.fn().mockResolvedValue([]),
    },
  };
});

describe("Index Dynamic Blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dynamic blocks from API", async () => {
    const mockBlocks = [
      {
        id: "block-1",
        tipo: "produtos",
        titulo: "Bloco Dinamico 1",
        prioridade: 1,
        config: { filter: "novidades", limit: 4 },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue([...mockBlocks]);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Bloco Dinamico 1")).toBeInTheDocument();
    });
  });

  it("respects block priority", async () => {
    const mockBlocks = [
      {
        id: "block-later",
        tipo: "produtos",
        titulo: "Segundo Bloco",
        prioridade: 20,
        config: { filter: "promocoes" },
      },
      {
        id: "block-first",
        tipo: "produtos",
        titulo: "Primeiro Bloco",
        prioridade: 10,
        config: { filter: "novidades" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue([...mockBlocks].sort((a, b) => a.prioridade - b.prioridade));

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      const titles = screen.getAllByRole("heading", { level: 2 });
      const blockTitles = titles
        .map(t => t.textContent)
        .filter(t => t === "Primeiro Bloco" || t === "Segundo Bloco");
      
      expect(blockTitles[0]).toBe("Primeiro Bloco");
      expect(blockTitles[1]).toBe("Segundo Bloco");
    });
  });

  it("renders banner blocks with valid media", async () => {
    const mockBlocks = [
      {
        id: "banner-1",
        tipo: "banner",
        titulo: "Promocao de Verao",
        subtitulo: "Confira as ofertas",
        prioridade: 1,
        config: { 
          mediaUrl: "banner.jpg", 
          mediaType: "image",
          ctaLabel: "Ver Ofertas",
          ctaUrl: "/products?filter=promocoes"
        },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Promocao de Verao")).toBeInTheDocument();
      expect(screen.getByText("Ver Ofertas")).toBeInTheDocument();
    });
  });

  it("omits banner blocks without mediaUrl", async () => {
    const mockBlocks = [
      {
        id: "banner-invalid",
        tipo: "banner",
        titulo: "Banner Invalido",
        prioridade: 1,
        config: {},
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Banner Invalido")).not.toBeInTheDocument();
    });
  });

  it("renders instagram blocks with posts", async () => {
    const mockBlocks = [
      {
        id: "insta-1",
        tipo: "instagram",
        titulo: "Siga-nos",
        prioridade: 1,
        config: { 
          posts: [
            { id: "p1", url: "https://insta/p1", mediaUrl: "post1.jpg" }
          ]
        },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Siga-nos")).toBeInTheDocument();
    });
  });

  it("supports estilo 'carrossel' in FeaturedProducts", async () => {
    const mockBlocks = [
      {
        id: "block-carrossel",
        tipo: "produtos",
        titulo: "Carrossel de Produtos",
        prioridade: 1,
        config: { filter: "novidades", estilo: "carrossel" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    const { container } = render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Carrossel de Produtos")).toBeInTheDocument();
      const carousel = container.querySelector('.snap-x');
      expect(carousel).toBeInTheDocument();
    });
  });

  it("respects product limit from max_items", async () => {
    const mockBlocks = [
      {
        id: "block-limit",
        tipo: "produtos",
        titulo: "Produtos Limitados",
        prioridade: 1,
        config: { filter: "novidades", max_items: 1 },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Produtos Limitados")).toBeInTheDocument();
      const productCards = screen.getAllByText("Produto Novidade");
      expect(productCards.length).toBe(1);
    });
  });

  it("deduplicates simultaneous getProdutosByIds calls", async () => {
    const mockProduct = { id: 100, nome: "Manual", variants: [{ disponibilidade: 1, tamanho: "P", cor: "Preto" }], imagens: ["img.jpg"], precoVenda: 100, emPromocao: false, isNovidade: true };
    const mockBlocks = [
      {
        id: "block-manual",
        tipo: "produtos",
        titulo: "Produtos Manuais",
        prioridade: 1,
        config: { produtos: ["p1", "p2"] },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);
    
    const fetchSpy = vi.spyOn(vitrineApiService, 'getProdutosByIds').mockResolvedValue([mockProduct]);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Produtos Manuais")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("shows debug info ONLY when ?debugHome=1 is present in DEV", async () => {
    const mockBlocks = [
      {
        id: "debug-block",
        tipo: "banner",
        titulo: "Banner Debug",
        prioridade: 1,
        config: { mediaUrl: "b.jpg" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    vi.stubGlobal("import.meta", { env: { DEV: true } });

    const { rerender } = render(
      <MemoryRouter initialEntries={["/?debugHome=1"]}>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/\[DEBUG\] ID: debug-block/)).toBeInTheDocument();
    });

    // To test removal, we need a fresh render or a way to trigger location change that Index responds to.
    // In this component, it uses useLocation().search in a useMemo.
    
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
       // Should find the banner but NOT the debug info
       expect(screen.getByText("Banner Debug")).toBeInTheDocument();
       expect(screen.queryByText(/\[DEBUG\] ID: debug-block/)).not.toBeInTheDocument();
    });
  });
});
