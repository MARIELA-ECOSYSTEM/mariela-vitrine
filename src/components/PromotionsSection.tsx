import { useState, useEffect, useMemo } from "react";
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

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Reset index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [categoriaFiltro]);

  // Não renderiza a seção se não houver promoções no total
  if (!loading && produtos.filter(p => p.emPromocao).length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-destructive/10 rounded-full">
            <Tag className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-semibold">Ofertas Especiais</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Produtos em Promoção
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Aproveite descontos exclusivos em peças selecionadas
          </p>
        </div>

        {/* Filtros de Categoria */}
        {!loading && produtos.filter(p => p.emPromocao).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 animate-fade-in">
            {categoriasComProdutos.map((cat) => (
              <Button
                key={cat.value}
                variant={categoriaFiltro === cat.value ? "destructive" : "outline"}
                onClick={() => setCategoriaFiltro(cat.value)}
                size="sm"
                className="gap-2 transition-all duration-300 hover:scale-105"
              >
                {cat.label}
                <Badge 
                  variant={categoriaFiltro === cat.value ? "secondary" : "outline"}
                  className="transition-all duration-300"
                >
                  {categoriasCount[cat.value]}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Carousel */}
        <div className="max-w-6xl mx-auto mb-12 relative">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : produtosExibidos.length > 0 ? (
            <div className="relative">
              {/* Navigation Arrows */}
              {produtosExibidos.length > itemsPerView && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className={cn(
                      "absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg transition-all duration-300",
                      "hover:scale-110 hover:bg-destructive hover:text-destructive-foreground",
                      currentIndex === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex >= maxIndex}
                    className={cn(
                      "absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg transition-all duration-300",
                      "hover:scale-110 hover:bg-destructive hover:text-destructive-foreground",
                      currentIndex >= maxIndex && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Products Grid */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-out"
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

        {/* Indicadores (Dots) */}
        {!loading && produtosExibidos.length > itemsPerView && (
          <div className="flex justify-center gap-2 mb-12">
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
                className="gap-2 px-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Tag className="w-5 h-5" />
                Ver Todas as Promoções
                {produtosPromocao.length > 6 && (
                  <Badge variant="secondary" className="ml-2">
                    +{produtosPromocao.length - 6}
                  </Badge>
                )}
                <span className="text-lg">→</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
