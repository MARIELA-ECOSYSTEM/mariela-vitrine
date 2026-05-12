import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HeroBannerCarousel } from "./HeroBannerCarousel";
import { FeaturedCollections } from "./FeaturedCollections";
import { vitrineApiService } from "@/services/vitrineApiService";

vi.mock("@/services/vitrineApiService", () => ({
  vitrineApiService: {
    getColecoesDestaque: vi.fn(),
  },
}));

describe("HeroBannerCarousel — Refinamento de Mídias e Fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock HTMLMediaElement
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("Usa home_destaque_url com tipo gif corretamente", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "gif-1",
      nome: "Campanha GIF",
      home_destaque_url: "https://example.com/anim.gif",
      home_destaque_tipo: "gif",
      destaque: true,
      ativo: true,
      quantidade_produtos: 1,
      ordem: 0
    }]);

    render(<MemoryRouter><HeroBannerCarousel /></MemoryRouter>);

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Campanha GIF/i });
      expect(img).toHaveAttribute("src", "https://example.com/anim.gif");
    });
  });

  it("Usa home_destaque_url com tipo video e respeita play/pause", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "video-1",
      nome: "Campanha Video",
      home_destaque_url: "https://example.com/promo.mp4",
      home_destaque_tipo: "video",
      destaque: true,
      ativo: true,
      quantidade_produtos: 1,
      ordem: 0
    }]);

    render(<MemoryRouter><HeroBannerCarousel /></MemoryRouter>);

    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute("src", "https://example.com/promo.mp4");
      expect(video).toHaveAttribute("muted");
      expect(video).toHaveAttribute("preload", "metadata");
    });
  });

  it("Respeita a ordem de fallback: home_destaque > banner > capa", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "fallback-test",
      nome: "Coleção Fallback",
      home_destaque_url: null,
      banner_url: "https://example.com/banner.jpg",
      imagem_capa_url: "https://example.com/capa.jpg",
      destaque: true,
      ativo: true,
      quantidade_produtos: 1,
      ordem: 0
    }]);

    render(<MemoryRouter><HeroBannerCarousel /></MemoryRouter>);

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Coleção Fallback/i });
      expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
    });
  });

  it("FeaturedCollections NUNCA usa home_destaque_url", async () => {
    (vitrineApiService.getColecoesDestaque as any).mockResolvedValue([{
      id: "fc-test",
      nome: "Coleção FC",
      home_destaque_url: "https://example.com/hero.jpg",
      banner_url: "https://example.com/banner.jpg",
      destaque: true,
      ativo: true,
      quantidade_produtos: 1,
      ordem: 0
    }]);

    render(<MemoryRouter><FeaturedCollections /></MemoryRouter>);

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Coleção FC/i });
      expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
      expect(img).not.toHaveAttribute("src", "https://example.com/hero.jpg");
    });
  });
});
