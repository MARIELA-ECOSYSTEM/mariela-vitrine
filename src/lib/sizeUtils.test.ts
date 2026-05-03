import { describe, it, expect } from "vitest";
import { isValidSize, normalizeSizeLabel, sortSizes } from "./sizeUtils";

describe("isValidSize", () => {
  it("rejeita string vazia e espaços", () => {
    expect(isValidSize("")).toBe(false);
    expect(isValidSize("   ")).toBe(false);
  });

  it("rejeita null/undefined/não-string", () => {
    expect(isValidSize(null)).toBe(false);
    expect(isValidSize(undefined)).toBe(false);
    expect(isValidSize(38 as unknown)).toBe(false);
  });

  it("aceita tamanho único (U, Único, Unico, única, Unica) em qualquer casing", () => {
    ["U", "u", "Único", "único", "UNICO", "Unico", "Unica", "única", "ÚNICA"].forEach((v) => {
      expect(isValidSize(v)).toBe(true);
    });
  });

  it("aceita tamanhos textuais e numéricos válidos", () => {
    ["PP", "P", "M", "G", "GG", "XG", "XGG", "34", "38", "44"].forEach((v) => {
      expect(isValidSize(v)).toBe(true);
    });
  });
});

describe("normalizeSizeLabel", () => {
  it("normaliza aliases de tamanho único para U", () => {
    ["U", "u", "Único", "unico", "ÚNICA", "Unica"].forEach((v) => {
      expect(normalizeSizeLabel(v)).toBe("U");
    });
  });
});

describe("sortSizes — ordenação", () => {
  it("ordena letras na sequência PP → XGG", () => {
    const out = sortSizes(["G", "PP", "XG", "M", "P", "GG", "XGG"]);
    expect(out).toEqual(["PP", "P", "M", "G", "GG", "XG", "XGG"]);
  });

  it("ordena numéricos crescente", () => {
    const out = sortSizes(["42", "34", "40", "36", "38"]);
    expect(out).toEqual(["34", "36", "38", "40", "42"]);
  });

  it("letras primeiro, depois numéricos", () => {
    const out = sortSizes(["38", "P", "36", "M"]);
    expect(out).toEqual(["P", "M", "36", "38"]);
  });

  it("normaliza espaços antes de ordenar (' 38 ' vira '38')", () => {
    const out = sortSizes([" 38 ", " P ", "M", "36"]);
    expect(out).toEqual(["P", "M", "36", "38"]);
  });
});

describe("sortSizes — deduplicação", () => {
  it("'38' e ' 38 ' aparecem uma única vez", () => {
    const out = sortSizes(["38", " 38 ", "38 "]);
    expect(out).toEqual(["38"]);
  });

  it("'P' e ' P ' aparecem uma única vez (case-insensitive)", () => {
    const out = sortSizes(["P", " P ", "p"]);
    expect(out).toEqual(["P"]);
  });

  it("mantém tamanho único normalizado junto com tamanhos válidos", () => {
    const out = sortSizes(["U", "Único", "P", "", "  ", "M"]);
    expect(out).toEqual(["P", "M", "U"]);
  });
});