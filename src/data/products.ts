import { vitrineApiService } from "@/services/vitrineApiService";

export interface VarianteProduto {
  tamanho: string;
  cor: string;
  disponibilidade: number;
}

export interface Produto {
  id: number;
  codigoProduto: string;
  nome: string;
  descricao: string;
  categoria: string;
  imagens: string[];
  variants: VarianteProduto[];
  precoCusto: number;
  precoVenda: number;
  precoPromocional?: number;
  emPromocao: boolean;
  isNovidade: boolean;
}

export async function fetchProdutos(): Promise<Produto[]> {
  try {
    const produtos = await vitrineApiService.getProdutos({ limit: 100, offset: 0 });
    console.log(`Produtos carregados da vitrine-api: ${produtos.length}`);
    return produtos;
  } catch (error) {
    console.error("Falha ao buscar produtos na vitrine-api:", error);
    return [];
  }
}
