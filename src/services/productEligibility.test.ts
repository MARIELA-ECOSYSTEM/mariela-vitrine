 import { describe, it, expect } from "vitest";
 import { isProdutoPublicavel, ProdutoExclusionReason } from "@/lib/productEligibility";
 
 describe("isProdutoPublicavel", () => {
   it("deve aceitar produto completo e ativo", () => {
     const result = isProdutoPublicavel({
       id: "1",
       nome: "Produto Teste",
       ativo: true,
       variants: [{ disponibilidade: 10 }],
       imagens: ["img1.jpg"],
       precoVenda: 100
     });
     expect(result.publicavel).toBe(true);
     expect(result.motivos).toHaveLength(0);
   });
 
   it("deve rejeitar produto inativo", () => {
     const result = isProdutoPublicavel({
       id: "2",
       nome: "Produto Inativo",
       ativo: false
     });
     expect(result.publicavel).toBe(false);
     expect(result.motivos).toContain(ProdutoExclusionReason.INATIVO);
   });
 
   it("deve rejeitar produto sem estoque/variante", () => {
     const result = isProdutoPublicavel({
       id: "3",
       nome: "Produto Sem Estoque",
       variants: []
     });
     expect(result.publicavel).toBe(false);
     expect(result.motivos).toContain(ProdutoExclusionReason.SEM_VARIANTE);
   });
 
   it("deve rejeitar produto sem imagem", () => {
     const result = isProdutoPublicavel({
       id: "4",
       nome: "Produto Sem Imagem",
       variants: [{ disponibilidade: 1 }],
       imagens: []
     });
     expect(result.publicavel).toBe(false);
     expect(result.motivos).toContain(ProdutoExclusionReason.SEM_IMAGEM);
   });
 
   it("deve rejeitar produto com preço inválido", () => {
     const result = isProdutoPublicavel({
       id: "5",
       nome: "Produto Grátis",
       variants: [{ disponibilidade: 1 }],
       imagens: ["img.jpg"],
       precoVenda: 0
     });
     expect(result.publicavel).toBe(false);
     expect(result.motivos).toContain(ProdutoExclusionReason.PRECO_INVALIDO);
   });
 });