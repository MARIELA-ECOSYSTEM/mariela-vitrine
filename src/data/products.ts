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
    precoPromocional: produtoExterno.precoPromocional 
      ? produtoExterno.precoPromocional 
      : undefined,
    // Produto está em promoção se isOnSale=true OU se tem precoPromocional definido
    emPromocao: produtoExterno.isOnSale || (produtoExterno.precoPromocional !== null && produtoExterno.precoPromocional !== undefined && produtoExterno.precoPromocional > 0),
    isNovidade: produtoExterno.isNew
  };
}

// Configurações de timeout e retry
const API_TIMEOUT = 15000; // 15 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos entre tentativas

// Função para fazer fetch com timeout
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Função para aguardar um tempo
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para buscar produtos da API externa diretamente com retry
export async function fetchProdutos(): Promise<Produto[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Tentativa ${attempt}/${MAX_RETRIES} de buscar produtos...`);
      
      const response = await fetchWithTimeout(
        'https://mariela-pdv-backend.onrender.com/api/vitrine',
        API_TIMEOUT
      );
      
      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Resposta inválida da API');
      }
      
      // Converter produtos da API externa para formato interno
      // Filtrar produtos com quantidade 0 (esgotados)
      const produtos = data
        .filter((produto: ExternalProduct) => produto.totalAvailable > 0)
        .map((produto: ExternalProduct) => converterProduto(produto));
      
      console.log(`Produtos carregados com sucesso: ${produtos.length} (tentativa ${attempt})`);
      
      return produtos;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      console.error(`Erro na tentativa ${attempt}:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Aguardando ${RETRY_DELAY}ms antes da próxima tentativa...`);
        await delay(RETRY_DELAY);
      }
    }
  }
  
  console.error(`Falha ao buscar produtos após ${MAX_RETRIES} tentativas:`, lastError);
  return [];
}
