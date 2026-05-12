import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HeroBannerCarousel } from "./HeroBannerCarousel";
import { vitrineApiService } from "@/services/vitrineApiService";

vi.mock("@/services/vitrineApiService", () => ({
  vitrineApiService: {
    getColecoesDestaque: vi.fn(),
  },
}));

describe("HeroBannerCarousel — Novos tipos de mídia e fallbacks (Mocked Service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("Renderiza imagem quando home_destaque_tipo é 'image'", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "1",
      nome: "Campanha Imagem",
      home_destaque_url: "https://example.com/banner.jpg",
      home_destaque_tipo: "image",
      destaque: true,
      ativo: true,
      quantidade_produtos: 5,
      ordem: 0
    }]);

    render(
      <MemoryRouter>
        <HeroBannerCarousel />
      </MemoryRouter>
    );

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Campanha Imagem/i });
      expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
    });
  });

  it("Renderiza vídeo quando home_destaque_tipo é 'video'", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "2",
      nome: "Campanha Vídeo",
      home_destaque_url: "https://example.com/video.mp4",
      home_destaque_tipo: "video",
      destaque: true,
      ativo: true,
      quantidade_produtos: 5,
      ordem: 0
    }]);

    render(
      <MemoryRouter>
        <HeroBannerCarousel />
      </MemoryRouter>
    );

    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    });
  });

  it("Aplica fallback para banner_url se home_destaque_url falhar", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "3",
      nome: "Campanha Fallback",
      home_destaque_url: null,
      banner_url: "https://example.com/fallback.jpg",
      destaque: true,
      ativo: true,
      quantidade_produtos: 5,
      ordem: 0
    }]);

    render(
      <MemoryRouter>
        <HeroBannerCarousel />
      </MemoryRouter>
    );

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Campanha Fallback/i });
      expect(img).toHaveAttribute("src", "https://example.com/fallback.jpg");
    });
  });
});

describe("FeaturedCollections — Fallbacks de mídia", () => {
  it("Não usa home_destaque_url", async () => {
    const { FeaturedCollections } = await import("./FeaturedCollections");
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "5",
      nome: "Coleção Mista",
      home_destaque_url: "https://example.com/hero.jpg",
      banner_url: "https://example.com/card.jpg",
      destaque: true,
      ativo: true,
      quantidade_produtos: 5,
      ordem: 0
    }]);

    render(
      <MemoryRouter>
        <FeaturedCollections />
      </MemoryRouter>
    );

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Coleção Mista/i });
      expect(img).toHaveAttribute("src", "https://example.com/card.jpg");
      expect(img).not.toHaveAttribute("src", "https://example.com/hero.jpg");
    });
  });
});
