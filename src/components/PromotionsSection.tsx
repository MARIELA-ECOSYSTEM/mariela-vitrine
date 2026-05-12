import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIAS_DB } from "@/data/categories";

export const PromotionsSection = () => {
  const { produtos, loading } = useProducts();
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Filtrar promoções por categoria
  const produtosPromocao = useMemo(() => {
    const promocoes = produtos.filter(p => p.emPromocao);
    if (categoriaFiltro === "todas") {
      return promocoes;
    }
    return promocoes.filter(p => p.categoria === categoriaFiltro);
  }, [produtos, categoriaFiltro]);

  // Contador de produtos por categoria (apenas promoções)
  const categoriasCount = useMemo(() => {
    const promocoes = produtos.filter(p => p.emPromocao);
    const counts: Record<string, number> = {};
    
    CATEGORIAS_DB.forEach(cat => {
      counts[cat.value] = 0;
    });
    counts.todas = promocoes.length;
    
    promocoes.forEach(p => {
      if (counts[p.categoria] !== undefined) {
        counts[p.categoria]++;
      }
    });
    
    return counts;
  }, [produtos]);

  // Filtrar categorias que têm produtos
  const categoriasComProdutos = useMemo(() => {
    return CATEGORIAS_DB.filter(cat => 
      cat.value === "todas" || categoriasCount[cat.value] > 0
    );
  }, [categoriasCount]);

  // Limitar a 6 produtos
  const produtosExibidos = produtosPromocao.slice(0, 6);
  const itemsPerView = 3;
  const maxIndex = Math.max(0, produtosExibidos.length - itemsPerView);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  // Reset index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [categoriaFiltro]);

  // Autoplay
  useEffect(() => {
    if (isPaused || produtosExibidos.length <= itemsPerView) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= maxIndex) return 0;
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, maxIndex, produtosExibidos.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && currentIndex < maxIndex) {
        handleNext();
      } else if (diff < 0 && currentIndex > 0) {
        handlePrev();
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const hasPromotions = useMemo(() => produtos.some(p => p.emPromocao), [produtos]);
  if (!loading && !hasPromotions) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-destructive/10 rounded-full">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
            <span className="text-destructive font-semibold text-xs sm:text-sm">Ofertas Especiais</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-foreground">
            Produtos em Promoção
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
            Aproveite descontos exclusivos em peças selecionadas
          </p>
        </div>

        {/* Filtros de Categoria - Badge style com scroll horizontal em mobile */}
        {!loading && produtos.filter(p => p.emPromocao).length > 0 && (
          <div className="mb-6 sm:mb-10 animate-fade-in">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-center px-1">
              {categoriasComProdutos.map((cat) => (
                <Button
                  key={cat.value}
                  variant={categoriaFiltro === cat.value ? "destructive" : "outline"}
                  onClick={() => setCategoriaFiltro(cat.value)}
                  size="sm"
                  className={cn(
                    "gap-1.5 transition-all duration-300 hover:scale-105 rounded-full px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm touch-feedback whitespace-nowrap shrink-0",
                    categoriaFiltro === cat.value && "shadow-md"
                  )}
                >
                  {cat.label}
                  <Badge 
                    variant={categoriaFiltro === cat.value ? "secondary" : "outline"}
                    className="transition-all duration-300 h-5 px-1.5 text-[10px] sm:text-xs"
                  >
                    {categoriasCount[cat.value]}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Carousel */}
        <div 
          className="max-w-6xl mx-auto mb-8 sm:mb-12 relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : produtosExibidos.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows - Hidden on mobile */}
              {produtosExibidos.length > itemsPerView && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className={cn(
                      "absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg transition-all duration-300 hidden md:flex",
                      "hover:scale-110 hover:bg-destructive hover:text-destructive-foreground",
                      currentIndex === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex >= maxIndex}
                    className={cn(
                      "absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg transition-all duration-300 hidden md:flex",
                      "hover:scale-110 hover:bg-destructive hover:text-destructive-foreground",
                      currentIndex >= maxIndex && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </>
              )}

              {/* Products Grid with Touch Support - Mobile shows 2 columns */}
              <div 
                ref={containerRef}
                className="overflow-hidden touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Mobile: Grid layout */}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  {produtosExibidos.slice(0, 6).map((produto, index) => (
                    <div 
                      key={produto.id} 
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <ProductCard produto={produto} />
                    </div>
                  ))}
                </div>
                
                {/* Desktop: Carousel */}
                <div 
                  className="hidden sm:flex transition-transform duration-500 ease-out"
                  style={{ 
                    transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` 
                  }}
                >
                  {produtosExibidos.map((produto, index) => (
                    <div 
                      key={produto.id} 
                      className="w-full md:w-1/2 lg:w-1/3 flex-shrink-0 px-3 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <ProductCard produto={produto} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <p className="text-muted-foreground text-lg">
                Nenhuma promoção encontrada nesta categoria.
              </p>
            </div>
          )}
        </div>

        {/* Indicadores (Dots) - Desktop only */}
        {!loading && produtosExibidos.length > itemsPerView && (
          <div className="hidden sm:flex justify-center gap-2 mb-8 sm:mb-12">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 hover:scale-110",
                  currentIndex === index 
                    ? "w-8 bg-destructive shadow-lg shadow-destructive/50" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Ver Todas as Promoções Button */}
        {!loading && produtosExibidos.length > 0 && (
          <div className="text-center animate-fade-in">
            <Link to="/products?filter=promocoes">
              <Button 
                size="lg" 
                variant="destructive"
                className="gap-2 px-6 sm:px-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 h-11 sm:h-14 text-sm sm:text-base touch-feedback"
              >
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                Ver Todas as Promoções
                {produtosPromocao.length > 6 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2">
                    +{produtosPromocao.length - 6}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
