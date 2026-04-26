import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Produto } from "@/data/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDisplayPrice } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface RelatedProductsProps {
  currentProduct: Produto;
  allProducts: Produto[];
  title?: string;
  max?: number;
}

/**
 * Cache de preço numérico normalizado por produto.
 * Evita reformatar/reavaliar `getDisplayPrice` em cada render do sort.
 * `WeakMap` libera a entrada quando o produto é descartado.
 */
const priceCache = new WeakMap<Produto, number>();
function cachedPrice(p: Produto): number {
  const hit = priceCache.get(p);
  if (hit !== undefined) return hit;
  const v = Number(getDisplayPrice(p)) || 0;
  priceCache.set(p, v);
  return v;
}

/**
 * Heurística leve de upsell por categoria — define quais categorias combinam
 * com cada peça âncora. Mantém a ordem em que devem aparecer (asc = mais relevante).
 * Categorias seguem os `value` slugificados de `src/data/categories.ts`.
 */
const COMPLEMENTARES: Record<string, string[]> = {
  vestidos: ["bolsas", "acessorios"],
  blusas: ["calças", "saias", "short-saias", "shorts"],
  "calças": ["blusas"],
  saias: ["blusas"],
  "short-saias": ["blusas"],
  shorts: ["blusas"],
  conjuntos: ["bolsas", "acessorios"],
  bolsas: ["vestidos", "blusas"],
  acessorios: ["vestidos", "blusas"],
};

function categoryRank(currentCat: string | undefined, otherCat: string | undefined): number {
  if (!currentCat || !otherCat) return 99;
  const list = COMPLEMENTARES[currentCat];
  if (!list) return 99;
  const idx = list.indexOf(otherCat);
  return idx === -1 ? 99 : idx;
}

/**
 * Seção "Combine com / Complete o look".
 * Reutiliza o ProductCard padrão para manter consistência visual e cache.
 * Filtro: mesma coleção, exclui o produto atual, apenas com estoque disponível.
 */
export const RelatedProducts = ({
  currentProduct,
  allProducts,
  title = "Combine com",
  max = 6,
}: RelatedProductsProps) => {
  const isMobile = useIsMobile();
  // Mobile: 4, Desktop: até `max` (default 6).
  const limite = isMobile ? 4 : max;

  // Chaves estáveis para deps — evitam re-render quando a referência muda mas
  // os campos relevantes são os mesmos (ex.: novo array vindo do contexto).
  const currentKey = String(currentProduct.produtoId || currentProduct.id);
  const colecaoKey = currentProduct.colecao?.trim().toLowerCase() ?? "";
  const categoriaAtual = currentProduct.categoria;

  const relacionados = useMemo(() => {
    if (!colecaoKey) return [];

    const filtrados = allProducts
      .filter((p) => {
        if (!p.colecao) return false;
        if (p.colecao.trim().toLowerCase() !== colecaoKey) return false;
        const key = String(p.produtoId || p.id);
        if (key === currentKey) return false;
        // Apenas disponíveis
        const temEstoque = (p.variants || []).some((v) => v.disponibilidade > 0);
        return temEstoque;
      });

    // Ordenação comercial:
    // 1) categoria complementar à peça atual (rank menor = mais relevante)
    // 2) promoção
    // 3) novidade
    // 4) menor preço (cacheado)
    // 5) nome (pt-BR, determinístico)
    const score = (p: Produto) => {
      if (p.emPromocao) return 0;
      if (p.isNovidade) return 1;
      return 2;
    };
    return filtrados
      .slice()
      .sort((a, b) => {
        const dc = categoryRank(categoriaAtual, a.categoria) - categoryRank(categoriaAtual, b.categoria);
        if (dc !== 0) return dc;
        const ds = score(a) - score(b);
        if (ds !== 0) return ds;
        const dp = cachedPrice(a) - cachedPrice(b);
        if (dp !== 0) return dp;
        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, limite);
  }, [allProducts, colecaoKey, currentKey, categoriaAtual, limite]);

  if (relacionados.length < 2) return null;

  const [destaque, ...demais] = relacionados;

  return (
    <section className="mt-10 md:mt-16 animate-fade-in" aria-label="Produtos relacionados">
      <div className="flex items-end justify-between mb-4 md:mb-6">
        <div>
          <h2 className="font-serif text-xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" aria-hidden="true" />
            {title}
          </h2>
          {currentProduct.colecao && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Sugestões para combinar com este produto — coleção{" "}
              <span className="font-medium text-foreground">{currentProduct.colecao}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        {/* Primeiro item recebe destaque semântico — mesmo grid, só um label leve. */}
        <div className="relative">
          <Badge
            className="absolute -top-2 left-2 z-10 bg-primary text-primary-foreground shadow-sm text-[10px] sm:text-xs px-2 py-0.5"
            aria-label="Peça principal do look"
          >
            Peça principal
          </Badge>
          <ProductCard produto={destaque} />
        </div>
        {demais.map((p) => (
          <ProductCard key={p.id} produto={p} />
        ))}
      </div>
    </section>
  );
};