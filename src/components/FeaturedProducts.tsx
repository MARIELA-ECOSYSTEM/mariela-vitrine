 import { useMemo, useRef, useState, useEffect } from "react";
 import { ProductCard } from "./ProductCard";
 import { ProductSkeleton } from "./ProductSkeleton";
 import { useProducts } from "@/hooks/useProducts";
 import { Button } from "@/components/ui/button";
 import { Link } from "react-router-dom";
 import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Produto } from "@/data/products";
import { isProductNovidade } from "@/lib/novidades";

interface FeaturedProductsProps {
  title: string;
  subtitle?: string;
   filter: "novidades" | "promocoes" | "destaque" | "em_alta" | "mais_procurado" | "queridinho_loja" | "destaque_colecao" | "tendencia" | "novo" | "mais_vendido" | "estoque_baixo" | "alta_conversao";
  limit?: number;
  minItems?: number;
  forceLoading?: boolean;
  linkTo: string;
  linkLabel: string;
   products?: Produto[];
   layoutMode?: "grade" | "lista" | "carrossel";
 }

function getBadgeValue(produto: { badgePublico?: string | null; publicBadge?: string | null; destaque_publico?: string | null; recomendacao_publica?: string | null }) {
  return produto.badgePublico || produto.publicBadge || produto.destaque_publico || produto.recomendacao_publica || null;
}

 export const FeaturedProducts = ({ title, subtitle, filter, limit = 8, minItems = 1, forceLoading = false, linkTo, linkLabel, products, layoutMode = "grade" }: FeaturedProductsProps) => {
   const scrollContainerRef = useRef<HTMLDivElement>(null);
   const [canScrollLeft, setCanScrollLeft] = useState(false);
   const [canScrollRight, setCanScrollRight] = useState(false);
 
  const { produtos, loading } = useProducts();

  const filtered = useMemo(() => {
    if (products) return products;

    switch (filter) {
      case "novidades":
        return produtos.filter(isProductNovidade);
      case "promocoes":
        return produtos.filter(p => p.emPromocao);
      case "destaque":
        return produtos.slice(0, limit);
      case "em_alta":
      case "mais_procurado":
      case "queridinho_loja":
       case "destaque_colecao":
       case "tendencia":
       case "novo":
       case "mais_vendido":
       case "estoque_baixo":
       case "alta_conversao":
        return produtos.filter((p) => getBadgeValue(p) === filter);
    }
  }, [produtos, filter, limit, products]);

  const displayed = filtered.slice(0, limit);
  const isLoading = forceLoading || (loading && !products);

   const checkScroll = () => {
     if (scrollContainerRef.current) {
       const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
       setCanScrollLeft(scrollLeft > 0);
       setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
     }
   };
 
   useEffect(() => {
     if (layoutMode === "carrossel") {
       checkScroll();
       window.addEventListener("resize", checkScroll);
       return () => window.removeEventListener("resize", checkScroll);
     }
   }, [layoutMode, displayed.length]);
 
   const scroll = (direction: "left" | "right") => {
     if (scrollContainerRef.current) {
       const { clientWidth } = scrollContainerRef.current;
       const scrollAmount = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
       scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
     }
   };
 
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

        {/*
          Products Grid — container, classes e linhas idênticos entre loading/loaded.
          - auto-rows-fr garante que todas as linhas (skeleton ou card) tenham a mesma altura.
          - skeletonCount casa com o nº de cards reais quando já conhecidos, evitando reserva
            excessiva de slots e divergência de slots entre estados.
        */}
         {(() => {
           const skeletonCount = displayed.length > 0 ? displayed.length : limit;
           
           if (layoutMode === "lista") {
             return (
               <div className="flex flex-col gap-4">
                 {isLoading
                   ? Array.from({ length: skeletonCount }).map((_, i) => (
                       <ProductSkeleton key={`skeleton-${i}`} />
                     ))
                   : displayed.map((produto) => (
                       <ProductCard key={produto.id} produto={produto} layoutMode="lista" />
                     ))}
               </div>
             );
           }
 
            if (layoutMode === "carrossel") {
              return (
                <div className="relative group/carousel -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div 
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex gap-3 sm:gap-6 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {isLoading
                      ? Array.from({ length: skeletonCount }).map((_, i) => (
                          <div key={`skeleton-${i}`} className="min-w-[240px] sm:min-w-[280px] md:min-w-[320px] snap-start">
                            <ProductSkeleton />
                          </div>
                        ))
                      : displayed.map((produto) => (
                          <div key={produto.id} className="min-w-[240px] sm:min-w-[280px] md:min-w-[320px] snap-start">
                            <ProductCard produto={produto} layoutMode="grade" />
                          </div>
                        ))}
                  </div>
 
                  {/* Desktop Arrows */}
                  {!isLoading && (canScrollLeft || canScrollRight) && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "absolute left-4 top-[40%] -translate-y-1/2 z-10 rounded-full bg-background/80 shadow-md transition-opacity duration-300 hidden md:flex",
                          !canScrollLeft && "opacity-0 pointer-events-none"
                        )}
                        onClick={() => scroll("left")}
                        aria-label="Anterior"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "absolute right-4 top-[40%] -translate-y-1/2 z-10 rounded-full bg-background/80 shadow-md transition-opacity duration-300 hidden md:flex",
                          !canScrollRight && "opacity-0 pointer-events-none"
                        )}
                        onClick={() => scroll("right")}
                        aria-label="Próximo"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            }
 
           return (
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-fr gap-2.5 sm:gap-4 md:gap-5">
               {isLoading
                 ? Array.from({ length: skeletonCount }).map((_, i) => (
                     <ProductSkeleton key={`skeleton-${i}`} />
                   ))
                 : displayed.map((produto) => (
                     <ProductCard key={produto.id} produto={produto} layoutMode="grade" />
                   ))}
             </div>
           );
         })()}

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
