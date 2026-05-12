import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "./Index";
import { vitrineApiService } from "@/services/vitrineApiService";

// Mock components to simplify testing
vi.mock("@/components/Header", () => ({ Header: () => <div data-testid="header" /> }));
vi.mock("@/components/HeroBannerCarousel", () => ({ HeroBannerCarousel: () => <div data-testid="hero" /> }));
vi.mock("@/components/Footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("@/components/WelcomeDialog", () => ({ WelcomeDialog: () => <div data-testid="welcome-dialog" /> }));
vi.mock("@/components/LoadingOverlay", () => ({ LoadingOverlay: () => <div data-testid="loading-overlay" /> }));
vi.mock("@/components/QuickActions", () => ({ QuickActions: () => <div data-testid="quick-actions" /> }));

vi.mock("@/hooks/useProducts", () => {
  const base = {
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
  return {
    useProducts: vi.fn().mockReturnValue({ 
      loading: false, 
      produtos: [
        { id: 1, nome: "Produto Novidade", ...base },
        { id: 2, nome: "Produto Promo", ...base, emPromocao: true, isNovidade: false }
      ] 
    }),
  };
});

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
      getColecoesDestaque: vi.fn().mockResolvedValue([]),
    },
  };
});

describe("Index Dynamic Blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
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

  it("is silent in production for missing media and autoplay", async () => {
    const mockBlocks = [
      {
        id: "banner-invalid",
        tipo: "banner",
        titulo: "Banner Invisivel",
        prioridade: 1,
        config: {}, 
      },
      {
        id: "video-fail",
        tipo: "banner",
        titulo: "Video Fail",
        prioridade: 2,
        config: { mediaUrl: "fail.mp4", mediaType: "video" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');
    const errorSpy = vi.spyOn(console, 'error');
    const debugSpy = vi.spyOn(console, 'debug');

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Index renders header, hero, dynamic renderer. If blocks are omitted, we check what's left.
      // We expect no console output.
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("supports video with posterUrl", async () => {
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

  it("applies fetchPriority high ONLY to top media", async () => {
    const mockBlocks = [
      {
        id: "top-banner",
        tipo: "banner",
        titulo: "Top",
        prioridade: 1,
        config: { mediaUrl: "top.jpg", mediaType: "image" },
      },
      {
        id: "bottom-banner",
        tipo: "banner",
        titulo: "Bottom",
        prioridade: 2,
        config: { mediaUrl: "bottom.jpg", mediaType: "image" },
      },
    ];
    (vitrineApiService.getHomeBlocks as any).mockResolvedValue(mockBlocks);

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    await waitFor(() => {
      const images = document.querySelectorAll('img[src$=".jpg"]');
      const topImg = Array.from(images).find(img => img.getAttribute('src') === "top.jpg");
      const bottomImg = Array.from(images).find(img => img.getAttribute('src') === "bottom.jpg");
      
      expect(topImg).toHaveAttribute('fetchPriority', 'high');
      expect(topImg).toHaveAttribute('loading', 'eager');
      
      expect(bottomImg).toHaveAttribute('fetchPriority', 'auto');
      expect(bottomImg).toHaveAttribute('loading', 'lazy');
    });
  });

  it("carrossel has accessibility attributes and keyboard support", async () => {
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
