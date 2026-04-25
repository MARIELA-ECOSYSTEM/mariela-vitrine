import { vitrineApiService } from "@/services/vitrineApiService";

export interface VarianteProduto {
  tamanho: string;
  cor: string;
  disponibilidade: number;
}

export interface ProdutoCorTamanho {
  tamanho: string;
  disponibilidade: number;
}

export interface ProdutoCor {
  produto_cor_id: string;
  cor: string;
  imagem_thumb: string | null;
  imagem_full: string | null;
  tamanhos: ProdutoCorTamanho[];
}

export interface Produto {
  id: number;
  produtoId?: string;
  codigoProduto: string;
  nome: string;
  descricao: string;
  categoria: string;
  colecao?: string | null;
  imagens: string[];
  variants: VarianteProduto[];
  /** Novo contrato: cores do produto com tamanhos e imagens próprias. */
  cores?: ProdutoCor[];
  precoCusto: number;
  precoVenda: number;
  precoPromocional?: number;
  emPromocao: boolean;
  precoAtual?: number;
  economiaValor?: number;
  economiaPercentual?: number;
  isNovidade: boolean;
  badgePublico?: string | null;
  publicBadge?: string | null;
  destaque_publico?: string | null;
  recomendacao_publica?: string | null;
  createdAt?: string | null;
}

export async function fetchProdutos(params?: Record<string, string | number | boolean | null | undefined>): Promise<Produto[]> {
  try {
    const produtos = await vitrineApiService.getProdutos({ limit: 100, offset: 0, ...params });
    console.log(`Produtos carregados da vitrine-api: ${produtos.length}`);
    return produtos;
  } catch (error) {
    console.error("Falha ao buscar produtos na vitrine-api:", error);
    return [];
  }
}
