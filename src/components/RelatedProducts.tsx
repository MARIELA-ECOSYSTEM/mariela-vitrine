import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Produto } from "@/data/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDisplayPrice } from "@/lib/formatters";

interface RelatedProductsProps {
  currentProduct: Produto;
  allProducts: Produto[];
  title?: string;
  max?: number;
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

  const relacionados = useMemo(() => {
    const colecao = currentProduct.colecao?.trim();
    if (!colecao) return [];

    const currentKey = String(currentProduct.produtoId || currentProduct.id);

    const filtrados = allProducts
      .filter((p) => {
        if (!p.colecao) return false;
        if (p.colecao.trim().toLowerCase() !== colecao.toLowerCase()) return false;
        const key = String(p.produtoId || p.id);
        if (key === currentKey) return false;
        // Apenas disponíveis
        const temEstoque = (p.variants || []).some((v) => v.disponibilidade > 0);
        return temEstoque;
      });

    // Ordenação comercial: promoção → novidade → menor preço → nome (determinístico).
    const score = (p: Produto) => {
      if (p.emPromocao) return 0;
      if (p.isNovidade) return 1;
      return 2;
    };
    return filtrados
      .slice()
      .sort((a, b) => {
        const ds = score(a) - score(b);
        if (ds !== 0) return ds;
        const dp = getDisplayPrice(a) - getDisplayPrice(b);
        if (dp !== 0) return dp;
        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, limite);
  }, [currentProduct, allProducts, limite]);

  if (relacionados.length < 2) return null;

  return (
    <section className="mt-10 md:mt-16 animate-fade-in" aria-label="Produtos relacionados">
      <div className="flex items-end justify-between mb-4 md:mb-6">
        <div>
          <h2 className="font-serif text-xl md:text-3xl font-bold text-foreground">
            {title}
          </h2>
          {currentProduct.colecao && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Mais peças da coleção <span className="font-medium text-foreground">{currentProduct.colecao}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
        {relacionados.map((p) => (
          <ProductCard key={p.id} produto={p} />
        ))}
      </div>
    </section>
  );
};