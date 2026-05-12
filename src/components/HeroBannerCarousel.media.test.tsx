import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

async function renderFresh() {
  vi.resetModules();
  const mod = await import("./HeroBannerCarousel");
  return render(
    <MemoryRouter>
      <mod.HeroBannerCarousel />
    </MemoryRouter>
  );
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { 
    status: 200, 
    headers: { "content-type": "application/json" } 
  });
}

describe("HeroBannerCarousel — Novos tipos de mídia e fallbacks", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("Renderiza imagem quando home_destaque_tipo é 'image'", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      data: [{
        id: "1",
        nome: "Campanha Imagem",
        home_destaque_url: "https://example.com/banner.jpg",
        home_destaque_tipo: "image",
        destaque: true,
        ativo: true,
        quantidade_produtos: 5,
        ordem: 0
      }]
    }));

    await renderFresh();
    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Campanha Imagem/i });
      expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
    }, { timeout: 4000 });
  });

  it("Renderiza vídeo quando home_destaque_tipo é 'video'", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      data: [{
        id: "2",
        nome: "Campanha Vídeo",
        home_destaque_url: "https://example.com/video.mp4",
        home_destaque_tipo: "video",
        destaque: true,
        ativo: true,
        quantidade_produtos: 5,
        ordem: 0
      }]
    }));

    await renderFresh();
    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute("src", "https://example.com/video.mp4");
    }, { timeout: 4000 });
  });

  it("Aplica fallback para banner_url se home_destaque_url falhar", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      data: [{
        id: "3",
        nome: "Campanha Fallback",
        home_destaque_url: null,
        banner_url: "https://example.com/fallback.jpg",
        destaque: true,
        ativo: true,
        quantidade_produtos: 5,
        ordem: 0
      }]
    }));

    await renderFresh();
    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Campanha Fallback/i });
      expect(img).toHaveAttribute("src", "https://example.com/fallback.jpg");
    }, { timeout: 4000 });
  });

  it("FeaturedCollections não usa home_destaque_url (Teste de Regra de Negócio)", async () => {
    // Este teste valida que FeatureCollections usa banner_url mesmo que home_destaque_url exista
    vi.resetModules();
    const { FeaturedCollections } = await import("./FeaturedCollections");
    
    fetchSpy.mockResolvedValue(jsonResponse({
      data: [{
        id: "5",
        nome: "Coleção Mista",
        home_destaque_url: "https://example.com/hero.jpg",
        banner_url: "https://example.com/card.jpg",
        destaque: true,
        ativo: true,
        quantidade_produtos: 5,
        ordem: 0
      }]
    }));

    render(
      <MemoryRouter>
        <FeaturedCollections />
      </MemoryRouter>
    );

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /Coleção Mista/i });
      expect(img).toHaveAttribute("src", "https://example.com/card.jpg");
      expect(img).not.toHaveAttribute("src", "https://example.com/hero.jpg");
    }, { timeout: 4000 });
  });
});
