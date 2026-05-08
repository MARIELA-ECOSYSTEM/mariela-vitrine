import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
async function renderFresh(props: { colecoes?: any; loading?: boolean } = {}) {
  vi.resetModules();
  const mod = await import("./HeroBannerCarousel");
  return render(
    <MemoryRouter>
      <mod.HeroBannerCarousel colecoes={props.colecoes ?? null} loading={props.loading} />
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

  it("Estado de loading=true → renderiza skeleton", async () => {
    await renderFresh({ loading: true });
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("Lista vazia → não renderiza nada", async () => {
    const { container } = await renderFresh({ colecoes: [] });
    expect(container.firstChild).toBeNull();
  });

  it("Dados válidos → renderiza slides", async () => {
    const colecoes = [
      {
        id: "col-123",
        nome: "Coleção de Inverno",
        descricao: "Moda fria",
        imagem_capa_url: "https://example.com/winter.jpg",
        destaque: true,
        ordem: 0,
      },
    ];

    await renderFresh({ colecoes });

    expect(screen.getByText("Coleção de Inverno")).toBeInTheDocument();
    expect(screen.getByText("Moda fria")).toBeInTheDocument();

    const section = document.getElementById("home");
    expect(section).toBeInTheDocument();
    const img = screen.getByRole("img", { name: /Coleção de Inverno/i });
    expect(img).toHaveAttribute("src", "https://example.com/winter.jpg");
  });
});