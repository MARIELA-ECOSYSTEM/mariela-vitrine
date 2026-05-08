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
function clearVitrineCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("mariela_vitrine_api_cache")) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

function jsonResponse(body: unknown, init: ResponseInit & { etag?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.etag) headers.set("ETag", init.etag);
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

describe("HeroBannerCarousel — integridade e robustez", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearVitrineCache();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    // Não usamos fake timers por padrão para não travar microtasks do useEffect
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    clearVitrineCache();
  });

  it("Inicialmente renderiza estado de loading (skeleton)", async () => {
    fetchSpy.mockReturnValue(new Promise(() => {})); // Suspensa
    await renderFresh();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("API retorna lista vazia → não renderiza nada após carregar", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }, { etag: 'W/"empty"' }));
    const { container } = await renderFresh();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    // Aguarda o estado interno atualizar
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("API retorna erro → não renderiza nada e não quebra a Home", async () => {
    fetchSpy.mockResolvedValue(new Response("error", { status: 500 }));
    const { container } = await renderFresh();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("API retorna dados válidos → renderiza slides e link de navegação", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(
      {
        data: [
          {
            id: "col-123",
            nome: "Coleção de Inverno",
            descricao: "Moda fria",
            imagem_capa_url: "https://example.com/winter.jpg",
            destaque: true,
            ordem: 0,
          },
        ],
      },
      { etag: 'W/"ok"' }
    ));

    await renderFresh();

    await waitFor(() => {
      expect(screen.getByText("Coleção de Inverno")).toBeInTheDocument();
      expect(screen.getByText("Moda fria")).toBeInTheDocument();
    });

    const section = document.getElementById("home");
    expect(section).toBeInTheDocument();
    // Verifica se a imagem está presente
    const img = screen.getByRole("img", { name: /Coleção de Inverno/i });
    expect(img).toHaveAttribute("src", "https://example.com/winter.jpg");
  });
});