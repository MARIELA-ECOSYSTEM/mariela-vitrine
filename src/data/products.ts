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

export interface ProdutoMidia {
  /** Identificador da mídia na vitrine-api. */
  id?: string;
  /** URL principal da mídia (imagem ou vídeo). */
  url: string;
  /** Tipo da mídia: image ou video. */
  tipo: "image" | "video";
  /** URL da miniatura (300px) se for imagem. */
  url_thumb?: string | null;
  /** URL da versão grande (800px) se for imagem. */
  url_full?: string | null;
  /** URL do poster se for vídeo. */
  poster_url?: string | null;
  /** Marca a mídia principal (deve aparecer primeiro). */
  principal?: boolean;
  /** Ordem de exibição (asc). */
  ordem?: number;
}

/** @deprecated Usar ProdutoMidia para suporte híbrido. */
export type ProdutoCorImagem = ProdutoMidia;

export interface ProdutoCor {
  produto_cor_id: string;
  cor: string;
  imagem_thumb: string | null;
  imagem_full: string | null;
  /** Mídia específica para cards/vitrines (prioritária). */
  imagem_card_url?: string | null;
  /** Vídeo específico para cards (autoplay no hover). */
  video_card_url?: string | null;
  /** Poster do vídeo do card. */
  poster_url?: string | null;
  /** Mídia específica para o Monte Seu Look (editorial). */
  imagem_look_url?: string | null;
  tamanhos: ProdutoCorTamanho[];
  /**
   * Galeria completa da cor — vem somente no endpoint de detalhe
   * (`/vitrine-api/produto/{id}`). Pode estar ausente na listagem.
   * Quando presente, é a fonte canônica da galeria por cor:
   * ordene por `principal` desc → `ordem` asc → estável.
   */
  imagens?: ProdutoCorImagem[];
  /** Galeria híbrida (fotos + vídeos) da cor. */
  galeria_midia?: ProdutoMidia[];
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
  /** URL da mídia específica para o card (nível produto). */
  imagem_card_url?: string | null;
  /** Vídeo específico para o card (autoplay no hover). */
  video_card_url?: string | null;
  /** Poster do vídeo do card. */
  poster_url?: string | null;
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

export interface LookSuggestion {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  midia_url: string;
  midia_tipo: "image" | "gif" | "video";
  poster_url?: string | null;
  produtos_vinculados: string[]; // IDs de produtos
  ordem: number;
  ativo: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
}

export interface LookManual {
  id: string;
  nome: string;
  midia_editorial_url?: string | null;
  midia_editorial_tipo?: "image" | "gif" | "video" | null;
  produtos_vinculados: string[]; // IDs de produtos
}

export interface MonteSeuLookData {
  sugestoes: LookSuggestion[];
  looks_manuais: LookManual[];
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
