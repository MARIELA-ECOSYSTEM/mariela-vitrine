import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Robustez de produção do `FeaturedCollections`.
 *
 * Estes testes travam o contrato:
 *  - Em erro de API → componente NÃO renderiza nada (sem espaço em branco).
 *  - Em lista vazia → idem.
 *  - Em payload inválido / itens incompletos → o validador descarta
 *    silenciosamente e o componente NÃO renderiza nada.
 *  - Em produção (DEV=false) → falha NÃO emite warnings/erros no console.
 *  - Em payload válido → renderiza a seção com o nome da coleção.
 */

function clearVitrineCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("mariela_vitrine_api_cache")) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

async function renderFresh() {
  vi.resetModules();
  const mod = await import("./FeaturedCollections");
  return render(
    <MemoryRouter>
      <mod.FeaturedCollections />
    </MemoryRouter>,
  );
}

function jsonResponse(body: unknown, init: ResponseInit & { etag?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.etag) headers.set("ETag", init.etag);
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

describe("FeaturedCollections — robustez de produção", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearVitrineCache();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    clearVitrineCache();
  });

  it("API retorna erro 500 → não renderiza nada (sem espaço em branco)", async () => {
    fetchSpy.mockResolvedValue(new Response("fail", { status: 500 }));

    const { container } = await renderFresh();
    // Aguarda o useEffect resolver a Promise rejeitada.
    await waitFor(() => {
      // `fetch` foi chamado
      expect(fetchSpy).toHaveBeenCalled();
    });
    // Após resolver, container deve continuar vazio.
    await waitFor(() => {
      expect(container.querySelector("section")).toBeNull();
    });
  });

  it("API responde 200 com lista vazia → não renderiza nada", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ data: [] }, { etag: 'W/"empty"' }));

    const { container } = await renderFresh();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("section")).toBeNull();
  });

  it("API responde com itens incompletos (sem id/nome) → descarta e não renderiza", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(
        {
          data: [
            { destaque: true }, // sem id, sem nome
            { id: "x" }, // sem nome
            { nome: "Sem id" }, // sem id
            { id: "y", nome: "Sem destaque", destaque: false },
          ],
        },
        { etag: 'W/"partial"' },
      ),
    );

    const { container } = await renderFresh();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("section")).toBeNull();
  });

  it("Falha de rede em produção (DEV=false) NÃO loga no console", async () => {
    const env = import.meta.env as Record<string, unknown>;
    const originalDev = env.DEV;
    env.DEV = false;

    fetchSpy.mockRejectedValue(new TypeError("network down"));

    try {
      await renderFresh();
      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 50));

      const noisyWarns = warnSpy.mock.calls.filter((c) =>
        String(c[0] ?? "").includes("[vitrine-api]"),
      );
      const noisyErrors = errorSpy.mock.calls.filter((c) =>
        String(c[0] ?? "").includes("[vitrine-api]"),
      );
      expect(noisyWarns).toHaveLength(0);
      expect(noisyErrors).toHaveLength(0);
    } finally {
      env.DEV = originalDev;
    }
  });

  it("Payload válido → renderiza a seção com o nome da coleção", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(
        {
          data: [
            {
              id: "col-1",
              nome: "Verão 2026",
              descricao: "Peças leves",
              imagem_capa_url: "https://cdn.example/cover.webp",
              destaque: true,
              ordem: 0,
            },
          ],
        },
        { etag: 'W/"ok"' },
      ),
    );

    await renderFresh();
    await waitFor(() => {
      expect(screen.getByText("Verão 2026")).toBeInTheDocument();
    });
  });
});