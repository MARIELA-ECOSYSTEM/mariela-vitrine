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

export interface ProdutoCorImagem {
  /** Identificador da imagem na vitrine-api. */
  id?: string;
  /** URL da miniatura (300px). Pode ser null em casos legados. */
  url_thumb: string | null;
  /** URL da versão grande (800px). Pode ser null em casos legados. */
  url_full: string | null;
  /** Marca a imagem principal da cor (deve aparecer primeiro na galeria). */
  principal?: boolean;
  /** Ordem de exibição (asc). */
  ordem?: number;
}

export interface ProdutoCor {
  produto_cor_id: string;
  cor: string;
  imagem_thumb: string | null;
  imagem_full: string | null;
  tamanhos: ProdutoCorTamanho[];
  /**
   * Galeria completa da cor — vem somente no endpoint de detalhe
   * (`/vitrine-api/produto/{id}`). Pode estar ausente na listagem.
   * Quando presente, é a fonte canônica da galeria por cor:
   * ordene por `principal` desc → `ordem` asc → estável.
   */
  imagens?: ProdutoCorImagem[];
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
  /**
   * Novo contrato: cores do produto com tamanhos e imagens próprias.
   * imagem_card_url: Mídia específica para cards/vitrines (prioritária).
   * imagem_look_url: Mídia específica para o Monte Seu Look (editorial).
   */
  cores?: (ProdutoCor & {
    imagem_card_url?: string | null;
    imagem_look_url?: string | null;
  })[];
  /** URL da mídia específica para o card (nível produto). */
  imagem_card_url?: string | null;
  /** URL da mídia específica para o Monte Seu Look (editorial, nível produto). */
  imagem_look_url?: string | null;
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
