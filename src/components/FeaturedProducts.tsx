import { useMemo } from "react";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Produto } from "@/data/products";

interface FeaturedProductsProps {
  title: string;
  subtitle?: string;
  filter: "novidades" | "promocoes" | "destaque" | "em_alta" | "mais_procurado" | "queridinho_loja" | "destaque_colecao";
  limit?: number;
  minItems?: number;
  forceLoading?: boolean;
  linkTo: string;
  linkLabel: string;
  products?: Produto[];
}

function getBadgeValue(produto: { badgePublico?: string | null; publicBadge?: string | null; destaque_publico?: string | null; recomendacao_publica?: string | null }) {
  return produto.badgePublico || produto.publicBadge || produto.destaque_publico || produto.recomendacao_publica || null;
}

export const FeaturedProducts = ({ title, subtitle, filter, limit = 8, minItems = 1, forceLoading = false, linkTo, linkLabel, products }: FeaturedProductsProps) => {
  const { produtos, loading } = useProducts();

  const filtered = useMemo(() => {
    if (products) return products;

    switch (filter) {
      case "novidades":
        return produtos.filter(p => p.isNovidade);
      case "promocoes":
        return produtos.filter(p => p.emPromocao);
      case "destaque":
        return produtos.slice(0, limit);
      case "em_alta":
      case "mais_procurado":
      case "queridinho_loja":
      case "destaque_colecao":
        return produtos.filter((p) => getBadgeValue(p) === filter);
    }
  }, [produtos, filter, limit, products]);

  const displayed = filtered.slice(0, limit);
  const isLoading = forceLoading || (loading && !products);

  if (!isLoading && displayed.length < minItems) return null;

  return (
    <section className="py-6 sm:py-10 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <Link
            to={linkTo}
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors shrink-0"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
            {displayed.map((produto) => (
              <ProductCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-4 text-center sm:hidden">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none h-9 text-xs" asChild>
            <Link to={linkTo}>
              {linkLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
