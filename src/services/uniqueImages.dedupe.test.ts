import { describe, it, expect } from "vitest";
import { uniqueImages } from "./vitrineApiService";

/**
 * Regressão crítica: o dedupe por URL normalizada (thumb_/full_, ?w=, ?q=)
 * NÃO pode reduzir o conjunto de imagens reais que o PDV expôs como
 * fontes distintas. Se isso acontecer, o ProductCard exibirá MENOS fotos
 * do que a vitrine-api forneceu — regressão pior do que a "imagem fantasma".
 *
 * Estes testes travam ambos os lados:
 *  1. fotos REALMENTE diferentes (UUIDs distintos) NUNCA colapsam.
 *  2. variações puramente de tamanho (mesmo arquivo base) colapsam.
 */

function fail(msg: string): never {
  throw new Error(msg);
}

describe("uniqueImages — dedupe seguro thumb/full", () => {
  it("colapsa thumb_<uuid>/full_<uuid> da MESMA foto (mesmo UUID)", () => {
    const base =
      "https://cdn.api/produtos/p1/cores/c1/galeria/";
    const uuid = "ba92960b-289e-4938-9abb-550bbc150e78";
    const input = [
      `${base}full_${uuid}.webp`,
      `${base}thumb_${uuid}.webp`,
    ];
    const out = uniqueImages(input);
    expect(out).toHaveLength(1);
    // Preserva a 1ª ocorrência (preferimos full, que vem antes na ordem).
    expect(out[0]).toBe(input[0]);
  });

  it("PRESERVA fotos com UUIDs diferentes mesmo com prefixo igual (anti-regressão)", () => {
    const base = "https://cdn.api/produtos/p1/cores/c1/galeria/";
    const a = "a1111111-1111-1111-1111-111111111111";
    const b = "b2222222-2222-2222-2222-222222222222";
    const c = "c3333333-3333-3333-3333-333333333333";
    const input = [
      `${base}full_${a}.webp`,
      `${base}full_${b}.webp`,
      `${base}full_${c}.webp`,
    ];
    const out = uniqueImages(input);
    if (out.length !== 3) {
      fail(
        [
          "❌ REGRESSÃO no dedupe: o ProductCard mostraria MENOS imagens",
          "   do que a vitrine-api forneceu.",
          "",
          "   Entrada (3 fotos com UUIDs distintos):",
          ...input.map((u) => "     - " + u),
          "",
          "   Saída (esperado 3, recebido " + out.length + "):",
          ...out.map((u) => "     - " + u),
          "",
          "   Onde investigar: src/services/vitrineApiService.ts → uniqueImages",
          "   (regex SIZE_FILENAME_PREFIX não pode capturar parte do UUID,",
          "   e RESIZE_PARAMS não pode remover identificadores).",
        ].join("\n"),
      );
    }
    expect(out).toEqual(input);
  });

  it("PRESERVA cores diferentes do mesmo produto (paths distintos)", () => {
    // Cenário real: produto tem cor Preto e cor Azul. Ambas têm
    // arquivos `full_<uuid>.webp` em pastas distintas. NUNCA podem
    // colapsar — caso contrário, o card perde a variação.
    const input = [
      "https://cdn.api/produtos/p1/cores/preto/galeria/full_aaa.webp",
      "https://cdn.api/produtos/p1/cores/azul/galeria/full_bbb.webp",
    ];
    const out = uniqueImages(input);
    if (out.length !== 2) {
      fail(
        "❌ REGRESSÃO: cores diferentes colapsadas. Esperado 2, recebido " +
          out.length +
          ". Saída: " +
          JSON.stringify(out),
      );
    }
    expect(out).toEqual(input);
  });

  it("colapsa apenas variantes de redimensionamento (?w=300 vs ?w=800) do MESMO arquivo", () => {
    const url = "https://cdn.api/produtos/p1/galeria/full_x.webp";
    const input = [`${url}?w=800`, `${url}?w=300&q=80`];
    const out = uniqueImages(input);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(input[0]);
  });

  it("cenário Vestido teste: principal + 3 cores não pode virar menos que 3 únicos", () => {
    // Reproduz o payload real: imagem_principal == cor[0].imagem_full,
    // imagem_thumb == thumb_ da mesma foto. Esperamos exatamente 3 únicos
    // (um por cor), nunca menos.
    const baseP = "https://cdn.api/produtos/p1/cores/preto/galeria/";
    const baseA = "https://cdn.api/produtos/p1/cores/azul/galeria/";
    const baseV = "https://cdn.api/produtos/p1/cores/verde/galeria/";
    const input = [
      `${baseP}full_uuidP.webp`, // principal (= cor Preto full)
      `${baseP}full_uuidP.webp`, // cor Preto full (duplicata exata)
      `${baseA}full_uuidA.webp`, // cor Azul full
      `${baseV}full_uuidV.webp`, // cor Verde full
      `${baseP}thumb_uuidP.webp`, // thumb produto (mesma foto Preto) → fantasma
    ];
    const out = uniqueImages(input);
    if (out.length < 3) {
      fail(
        "❌ REGRESSÃO crítica: dedupe consumiu cores reais. Esperado >=3, recebido " +
          out.length +
          ". Saída: " +
          JSON.stringify(out, null, 2),
      );
    }
    expect(out.length).toBe(3);
  });
});