import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "./Index";
import { vitrineApiService } from "@/services/vitrineApiService";
import { Produto } from "@/data/products";

// Mock components to simplify testing
vi.mock("@/components/Header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/components/HeroBannerCarousel", () => ({ HeroBannerCarousel: () => <div data-testid="hero" /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/components/WelcomeDialog", () => ({ WelcomeDialog: () => <div data-testid="welcome-dialog" /> }));
vi.mock("@/components/LoadingOverlay", () => ({ LoadingOverlay: () => <div data-testid="loading-overlay" /> }));
vi.mock("@/components/QuickActions", () => ({ QuickActions: () => <div data-testid="quick-actions" /> }));

const mockProdutoBase: Partial<Produto> = {
  codigoProduto: "TEST-01",
  descricao: "Descricao teste",
  categoria: "vestidos",
  precoCusto: 50,
  imagens: ["img.jpg"],
  precoVenda: 100,
  emPromocao: false,
  isNovidade: true,
  variants: [{ disponibilidade: 1, tamanho: "P", cor: "Preto" }]
};

vi.mock("@/hooks/useProducts", () => ({
  useProducts: vi.fn().mockReturnValue({ 
    loading: false, 
    produtos: [
      { id: 1, nome: "Produto Novidade", ...mockProdutoBase },
      { id: 2, nome: "Produto Promo", ...mockProdutoBase, emPromocao: true, isNovidade: false }
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
    cleanup();
    // Default to production environment for most tests to check silent behavior
    vi.stubGlobal("import.meta", { env: { DEV: false } });
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

  it("is silent in production for missing media", async () => {
    const mockBlocks = [
      {
        id: "banner-invalid",
        tipo: "banner",
        titulo: "Banner Invisivel",
        prioridade: 1,
        config: {}, // Missing mediaUrl
      },
      {
        id: "block-next",
        tipo: "produtos",
        titulo: "Proximo Bloco",
        prioridade: 2,
        config: { filter: "novidades" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');
    const errorSpy = vi.spyOn(console, 'error');

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Proximo Bloco")).toBeInTheDocument();
    });

    expect(screen.queryByText("Banner Invisivel")).not.toBeInTheDocument();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("supports video with poster_url", async () => {
    const mockBlocks = [
      {
        id: "video-block",
        tipo: "banner",
        titulo: "Video Promo",
        prioridade: 1,
        config: { 
          mediaUrl: "video.mp4", 
          mediaType: "video",
          posterUrl: "poster.jpg"
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
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video?.getAttribute('poster')).toBe("poster.jpg");
    });
  });

  it("carrossel has accessibility attributes", async () => {
    const mockBlocks = [
      {
        id: "block-carrossel",
        tipo: "produtos",
        titulo: "Acessibilidade",
        prioridade: 1,
        config: { filter: "novidades", estilo: "carrossel" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      const carousel = screen.getByRole('region', { name: /Carrossel de Acessibilidade/i });
      expect(carousel).toBeInTheDocument();
      expect(carousel).toHaveAttribute('tabIndex', '0');
    });
  });

  it("shows debug info ONLY in DEV", async () => {
    const mockBlocks = [{ id: "dbg", tipo: "banner", titulo: "D", prioridade: 1, config: { mediaUrl: "b.jpg" } }];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    // Mock DEV mode
    vi.stubGlobal("import.meta", { env: { DEV: true } });

    render(
      <MemoryRouter initialEntries={["/?debugHome=1"]}>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/\[DEBUG\]/)).toBeInTheDocument();
    });

    cleanup();
    // Production mode
    vi.stubGlobal("import.meta", { env: { DEV: false } });

    render(
      <MemoryRouter initialEntries={["/?debugHome=1"]}>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/\[DEBUG\]/)).not.toBeInTheDocument();
    });
  });
});
