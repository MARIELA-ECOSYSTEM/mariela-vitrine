import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Importamos o service dinamicamente em cada teste (após `vi.resetModules`)
// para zerar `memoryCache` e `inflightRequests` que são módulo-level.
type Service = typeof import("./vitrineApiService").vitrineApiService;

/**
 * Verificação de performance / contrato de cache para
 * `getColecoesDestaque()` (rota `/colecoes?detalhes=1&destaque=1`).
 *
 * Estes testes travam três garantias críticas para produção:
 *
 *  1. DEDUPE: várias chamadas concorrentes na mesma renderização da Home
 *     resultam em UMA única requisição de rede.
 *
 *  2. CACHE QUENTE: dentro do TTL (5 min) chamadas subsequentes não vão
 *     à rede — são servidas do cache em memória/localStorage.
 *
 *  3. REVALIDAÇÃO CONDICIONAL: ao expirar o TTL, a próxima chamada envia
 *     `If-None-Match` com o ETag salvo. Em 304 reaproveita o payload do
 *     cache (zero parsing, zero alocação extra), respeitando o contrato
 *     de Cache-Control + ETag exposto pelo backend.
 *
 * Rodar: `bunx vitest run src/services/colecoesDestaque.perf.test.ts`
 */

const URL_RE = /\/vitrine-api\/colecoes\?/;

function jsonResponse(body: unknown, init: ResponseInit & { etag?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (init.etag) headers.set("ETag", init.etag);
  if (init.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  });
}

function fail(msg: string): never {
  throw new Error(msg);
}

/**
 * Reseta TODO o estado de cache do service entre testes — sem isso o
 * memo/localStorage de um teste contamina o próximo e os números ficam
 * sem sentido.
 */
function clearAllVitrineCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("mariela_vitrine_api_cache")) localStorage.removeItem(k);
    }
  } catch {
    /* jsdom: ignore */
  }
}

describe("getColecoesDestaque — performance & cache", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let vitrineApiService: Service;

  beforeEach(async () => {
    clearAllVitrineCache();
    vi.useRealTimers();
    vi.resetModules();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    const mod = await import("./vitrineApiService");
    vitrineApiService = mod.vitrineApiService;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
    clearAllVitrineCache();
  });

  it("DEDUPE: 5 chamadas concorrentes disparam apenas 1 requisição", async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (!URL_RE.test(u)) fail(`fetch inesperado: ${u}`);
      return jsonResponse({ data: [] }, { etag: 'W/"perf-1"' });
    });

    const results = await Promise.all([
      vitrineApiService.getColecoesDestaque(),
      vitrineApiService.getColecoesDestaque(),
      vitrineApiService.getColecoesDestaque(),
      vitrineApiService.getColecoesDestaque(),
      vitrineApiService.getColecoesDestaque(),
    ]);

    const calls = fetchSpy.mock.calls.filter((c) => URL_RE.test(String(c[0])));
    if (calls.length !== 1) {
      fail(
        `Esperado 1 fetch concorrente (dedupe), recebido ${calls.length}. ` +
          `URLs: ${calls.map((c) => String(c[0])).join(", ")}`,
      );
    }
    expect(results).toHaveLength(5);
    results.forEach((r) => expect(Array.isArray(r)).toBe(true));
  });

  it("CACHE QUENTE: chamada subsequente dentro do TTL não vai à rede", async () => {
    fetchSpy.mockImplementation(async () =>
      jsonResponse({ data: [] }, { etag: 'W/"perf-2"' }),
    );

    await vitrineApiService.getColecoesDestaque();
    await vitrineApiService.getColecoesDestaque();
    await vitrineApiService.getColecoesDestaque();

    const calls = fetchSpy.mock.calls.filter((c) => URL_RE.test(String(c[0])));
    if (calls.length !== 1) {
      fail(
        `Esperado 1 fetch (cache quente), recebido ${calls.length}. ` +
          `Cada navegação extra na Home dentro de 5 min NÃO pode bater na API.`,
      );
    }
  });

  it("REVALIDAÇÃO 304: após TTL expirar, envia If-None-Match e reaproveita cache", async () => {
    const ETAG = 'W/"perf-3-stable"';

    // 1ª chamada: 200 + ETag salvo no cache
    fetchSpy.mockImplementationOnce(async (_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (headers.get("If-None-Match")) {
        fail("Primeira chamada NÃO deve enviar If-None-Match (cache vazio).");
      }
      return jsonResponse({ data: [] }, { etag: ETAG });
    });

    await vitrineApiService.getColecoesDestaque();

    // Expira o TTL avançando APENAS `Date.now()` (TTL = 5 min).
    // Não usamos `vi.useFakeTimers()` porque isso bloqueia o `setTimeout`
    // de timeout do `requestJson` (15s), causando timeout no teste.
    const realDateNow = Date.now;
    const baseTs = realDateNow();
    vi.spyOn(Date, "now").mockImplementation(() => baseTs + 6 * 60 * 1000);

    // 2ª chamada: deve enviar If-None-Match com o ETag salvo. Backend
    // responde 304 (sem body). Service deve reaproveitar o cache.
    let sawConditional = false;
    fetchSpy.mockImplementationOnce(async (_input: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const inm = headers.get("If-None-Match");
      if (inm !== ETAG) {
        fail(
          `Revalidação condicional ausente: esperado If-None-Match=${ETAG}, ` +
            `recebido ${inm ?? "<vazio>"}.`,
        );
      }
      sawConditional = true;
      return new Response(null, { status: 304 });
    });

    const result = await vitrineApiService.getColecoesDestaque();
    expect(sawConditional).toBe(true);
    expect(Array.isArray(result)).toBe(true);

    // 3ª chamada imediatamente depois: timestamp do cache foi renovado
    // pela revalidação 304, portanto NÃO deve haver nova chamada de rede.
    const callsBefore = fetchSpy.mock.calls.length;
    await vitrineApiService.getColecoesDestaque();
    const callsAfter = fetchSpy.mock.calls.length;
    if (callsAfter !== callsBefore) {
      fail(
        `Após 304, o cache deve ser tratado como fresh por mais 1 TTL. ` +
          `Houve ${callsAfter - callsBefore} fetch(es) extra(s).`,
      );
    }
  });
});