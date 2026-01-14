import { z } from 'zod';

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

// Schema Zod para validação dos dados da API externa
const TamanhoSchema = z.object({
  tamanho: z.string().max(20),
  quantidade: z.number().int().nonnegative(),
  _id: z.string()
});

const VarianteSchema = z.object({
  cor: z.string().max(50),
  quantidade: z.number().int().nonnegative(),
  tamanhos: z.array(TamanhoSchema),
  imagens: z.array(z.string()).default([])
});

const ExternalProductSchema = z.object({
  _id: z.string(),
  codigoProduto: z.string().max(100),
  nome: z.string().max(500),
  descricao: z.string().max(2000).default(''),
  categoria: z.string().max(100),
  precoVenda: z.number().positive(),
  precoPromocional: z.number().positive().nullable().optional(),
  variantes: z.array(VarianteSchema),
  statusProduct: z.string(),
  totalAvailable: z.number().int().nonnegative(),
  isOnSale: z.boolean(),
  isNew: z.boolean(),
  updatedAt: z.string()
});

const ExternalProductArraySchema = z.array(ExternalProductSchema);

type ExternalProduct = z.infer<typeof ExternalProductSchema>;

// Validar URL de imagem (aceitar HTTP/HTTPS válidos)
function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Aceitar HTTP e HTTPS (CDNs podem usar ambos protocolos)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Sanitizar string (remover caracteres potencialmente perigosos)
function sanitizeString(str: string): string {
  return str
    .replace(/<[^>]*>/g, '') // Remove tags HTML
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
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
  
  return mapa[categoria] || 'outros';
}

// Converter produto da API externa para formato interno
function converterProduto(produtoExterno: ExternalProduct): Produto {
  // Extrair imagens apenas de variantes com estoque disponível
  const todasImagens = produtoExterno.variantes
    .filter(v => v.quantidade > 0) // Apenas variantes com estoque
    .flatMap(v => v.imagens || [])
    .filter(url => isValidImageUrl(url));
  
  // Criar lista de variants (um para cada combinação de cor e tamanho)
  const variants: VarianteProduto[] = [];
  produtoExterno.variantes.forEach(variante => {
    variante.tamanhos.forEach(tamanhoInfo => {
      variants.push({
        tamanho: sanitizeString(tamanhoInfo.tamanho),
        cor: sanitizeString(variante.cor),
        disponibilidade: tamanhoInfo.quantidade
      });
    });
  });

  return {
    id: parseInt(produtoExterno._id.slice(-8), 16),
    codigoProduto: sanitizeString(produtoExterno.codigoProduto),
    nome: sanitizeString(produtoExterno.nome),
    descricao: sanitizeString(produtoExterno.descricao) || `Produto ${sanitizeString(produtoExterno.nome)}`,
    categoria: mapearCategoria(produtoExterno.categoria),
    imagens: todasImagens,
    variants: variants,
    precoCusto: produtoExterno.precoVenda * 0.6,
    precoVenda: produtoExterno.precoVenda,
    precoPromocional: produtoExterno.precoPromocional 
      ? produtoExterno.precoPromocional 
      : undefined,
    emPromocao: produtoExterno.isOnSale || (produtoExterno.precoPromocional !== null && produtoExterno.precoPromocional !== undefined && produtoExterno.precoPromocional > 0),
    isNovidade: produtoExterno.isNew
  };
}

// Configurações de timeout e retry
const API_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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

// Função para buscar produtos da API externa com validação
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
      
      const rawData = await response.json();
      
      if (!rawData || !Array.isArray(rawData)) {
        throw new Error('Resposta inválida da API');
      }
      
      // Validar dados com Zod (usando safeParse para não quebrar em dados inválidos)
      const validationResult = ExternalProductArraySchema.safeParse(rawData);
      
      let validProducts: ExternalProduct[];
      
      if (validationResult.success) {
        validProducts = validationResult.data;
      } else {
        // Log de erros de validação para debug (sem expor dados sensíveis)
        console.warn('Alguns produtos não passaram na validação:', validationResult.error.issues.length, 'erros');
        
        // Tentar validar produtos individualmente para recuperar os válidos
        validProducts = rawData
          .map((item: unknown) => ExternalProductSchema.safeParse(item))
          .filter((result: z.SafeParseReturnType<unknown, ExternalProduct>) => result.success)
          .map((result: z.SafeParseSuccess<ExternalProduct>) => result.data);
        
        console.log(`Recuperados ${validProducts.length} produtos válidos de ${rawData.length} total`);
      }
      
      // Converter produtos válidos para formato interno
      const produtos = validProducts
        .filter((produto) => produto.totalAvailable > 0)
        .map((produto) => converterProduto(produto));
      
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
