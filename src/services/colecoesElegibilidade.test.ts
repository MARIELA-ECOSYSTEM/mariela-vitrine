 import { describe, it, expect } from "vitest";
 import { isColecaoElegivelParaHome } from "@/lib/colecaoEligibility";
 
 describe("isColecaoElegivelParaHome", () => {
   const now = new Date();
   const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
   const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
 
   it("deve aceitar coleção destaque válida", () => {
     const result = isColecaoElegivelParaHome({
       id: "1",
       nome: "Coleção Válida",
       destaque: true,
       ativo: true,
       quantidade_produtos: 5
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
     expect(result.motivos).toContainEqual(expect.stringContaining("Fora do período"));
   });
 
   it("deve rejeitar coleção fora do período (fim passado)", () => {
     const result = isColecaoElegivelParaHome({
       id: "3",
       nome: "Coleção Antiga",
       destaque: true,
       data_fim: yesterday
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContainEqual(expect.stringContaining("Fora do período"));
   });
 
   it("deve rejeitar coleção sem produtos", () => {
     const result = isColecaoElegivelParaHome({
       id: "4",
       nome: "Coleção Vazia",
       destaque: true,
       quantidade_produtos: 0
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain("Sem produtos disponíveis");
   });
 
   it("deve rejeitar coleção inativa", () => {
     const result = isColecaoElegivelParaHome({
       id: "5",
       nome: "Coleção Inativa",
       destaque: true,
       ativo: false
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain("Inativa (ativo = false)");
   });
 
   it("deve rejeitar coleção que não é destaque", () => {
     const result = isColecaoElegivelParaHome({
       id: "6",
       nome: "Coleção Comum",
       destaque: false
     });
     expect(result.elegivel).toBe(false);
     expect(result.motivos).toContain("Não é destaque (destaque != true)");
   });
 });