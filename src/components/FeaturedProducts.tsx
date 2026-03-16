import { useMemo } from "react";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface FeaturedProductsProps {
  title: string;
  subtitle?: string;
  filter: "novidades" | "promocoes" | "destaque";
  limit?: number;
  linkTo: string;
  linkLabel: string;
}

export const FeaturedProducts = ({ title, subtitle, filter, limit = 8, linkTo, linkLabel }: FeaturedProductsProps) => {
  const { produtos, loading } = useProducts();

  const filtered = useMemo(() => {
    switch (filter) {
      case "novidades":
        return produtos.filter(p => p.isNovidade);
      case "promocoes":
        return produtos.filter(p => p.emPromocao);
      case "destaque":
        return produtos.slice(0, limit);
    }
  }, [produtos, filter, limit]);

  const displayed = filtered.slice(0, limit);

  if (!loading && displayed.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
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
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {displayed.map((produto) => (
              <ProductCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-6 text-center sm:hidden">
          <Button variant="outline" className="gap-2 rounded-none h-11" asChild>
            <Link to={linkTo}>
              {linkLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
