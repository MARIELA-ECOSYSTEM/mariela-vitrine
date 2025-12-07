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

// Interface para a API externa
interface ExternalProduct {
  _id: string;
  codigoProduto: string;
  nome: string;
  descricao: string;
  categoria: string;
  precoVenda: number;
  precoPromocional?: number | null;
  variantes: Array<{
    cor: string;
    quantidade: number;
    tamanhos: Array<{
      tamanho: string;
      quantidade: number;
      _id: string;
    }>;
    imagens: string[];
  }>;
  statusProduct: string;
  totalAvailable: number;
  isOnSale: boolean;
  isNew: boolean;
  updatedAt: string;
}

// Mapear categorias da API externa para categorias do sistema
function mapearCategoria(categoria: string): Produto['categoria'] {
  const mapa: Record<string, Produto['categoria']> = {
    'Calça': 'calças',
    'Calças': 'calças',
    'Saia': 'saias',
    'Saias': 'saias',
    'Vestido': 'vestidos',
    'Vestidos': 'vestidos',
    'Blusa': 'blusas',
    'Blusas': 'blusas',
    'Bolsa': 'bolsas',
    'Bolsas': 'bolsas',
    'Acessório': 'acessorios',
    'Acessórios': 'acessorios',
    'Short-Saia': 'short-saias',
    'Short-Saias': 'short-saias',
    'Short': 'shorts',
    'Shorts': 'shorts',
    'Conjunto': 'conjuntos',
    'Conjuntos': 'conjuntos',
    'Outro': 'outros',
    'Outros': 'outros',
  };
  
  return mapa[categoria] || 'outros'; // Default para outros se não encontrar
}

// Converter produto da API externa para formato interno
function converterProduto(produtoExterno: ExternalProduct): Produto {
  // Extrair todas as imagens de todas as variantes
  const todasImagens = produtoExterno.variantes.flatMap(v => v.imagens || []);
  
  // Criar lista de variants (um para cada combinação de cor e tamanho)
  const variants: VarianteProduto[] = [];
  produtoExterno.variantes.forEach(variante => {
    variante.tamanhos.forEach(tamanhoInfo => {
      variants.push({
        tamanho: tamanhoInfo.tamanho,
        cor: variante.cor,
        disponibilidade: tamanhoInfo.quantidade
      });
    });
  });

  return {
    id: parseInt(produtoExterno._id.slice(-8), 16), // Usar parte do _id como número
    codigoProduto: produtoExterno.codigoProduto,
    nome: produtoExterno.nome,
    descricao: produtoExterno.descricao || `Produto ${produtoExterno.nome}`,
    categoria: mapearCategoria(produtoExterno.categoria),
    imagens: todasImagens.length > 0 ? todasImagens : [],
    variants: variants,
    precoCusto: produtoExterno.precoVenda * 0.6, // Estimativa de 60% do preço de venda
    precoVenda: produtoExterno.precoVenda, // Sempre o preço original
    precoPromocional: produtoExterno.isOnSale && produtoExterno.precoPromocional 
      ? produtoExterno.precoPromocional 
      : undefined,
    emPromocao: produtoExterno.isOnSale && !!produtoExterno.precoPromocional,
    isNovidade: produtoExterno.isNew
  };
}

// Função para buscar produtos da API externa diretamente
export async function fetchProdutos(): Promise<Produto[]> {
  try {
    const response = await fetch('https://mariela-pdv-backend.onrender.com/api/vitrine');
    
    if (!response.ok) {
      console.error('Erro ao buscar produtos da API:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data)) {
      console.error('Resposta inválida da API:', data);
      return [];
    }
    
    // Converter produtos da API externa para formato interno
    const produtos = data.map((produto: ExternalProduct) => converterProduto(produto));
    console.log('Produtos carregados:', produtos.length);
    
    return produtos;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}
