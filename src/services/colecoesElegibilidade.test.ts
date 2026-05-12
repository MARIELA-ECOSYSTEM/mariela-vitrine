 import { describe, it, expect } from "vitest";
 import { isColecaoElegivelParaHome, ColecaoExclusionReason, getSaoPauloNow } from "@/lib/colecaoEligibility";
 
 describe("isColecaoElegivelParaHome", () => {
   const now = getSaoPauloNow();
   const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
   const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString();
 
    it("deve aceitar coleção destaque válida com imagem", () => {
     const result = isColecaoElegivelParaHome({
       id: "1",
       nome: "Coleção Válida",
       destaque: true,
       ativo: true,
        quantidade_produtos: 5,
        imagem_capa_url: "https://example.com/banner.jpg"
     });
     expect(result.elegivel).toBe(true);
     expect(result.motivos).toHaveLength(0);
   });
 
   it("deve rejeitar coleção fora do período (início futuro)", () => {
     const result = isColecaoElegivelParaHome({
       id: "2",
       nome: "Coleção Futura",
       destaque: true,
       data_inicio: tomorrow
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain(ColecaoExclusionReason.FORA_PERIODO);
   });
 
   it("deve rejeitar coleção fora do período (fim passado)", () => {
     const result = isColecaoElegivelParaHome({
       id: "3",
       nome: "Coleção Antiga",
       destaque: true,
       data_fim: yesterday
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain(ColecaoExclusionReason.FORA_PERIODO);
   });
 
   it("deve rejeitar coleção sem produtos", () => {
     const result = isColecaoElegivelParaHome({
       id: "4",
       nome: "Coleção Vazia",
       destaque: true,
       quantidade_produtos: 0
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain(ColecaoExclusionReason.SEM_PRODUTOS);
   });
 
   it("deve rejeitar coleção inativa", () => {
     const result = isColecaoElegivelParaHome({
       id: "5",
       nome: "Coleção Inativa",
       destaque: true,
       ativo: false
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain(ColecaoExclusionReason.INATIVA);
   });
 
    it("deve rejeitar coleção sem imagem de capa", () => {
      const result = isColecaoElegivelParaHome({
        id: "7",
        nome: "Coleção Sem Banner",
        destaque: true,
        imagem_capa_url: null
      });
      expect(result.elegivel).toBe(false);
      expect(result.motivos).toContain(ColecaoExclusionReason.SEM_MIDIA);
    });

    it("deve rejeitar coleção que não é destaque", () => {
     const result = isColecaoElegivelParaHome({
       id: "6",
       nome: "Coleção Comum",
       destaque: false
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain(ColecaoExclusionReason.NAO_DESTAQUE);
   });
 });