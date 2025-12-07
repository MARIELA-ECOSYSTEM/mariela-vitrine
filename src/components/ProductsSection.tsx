import { useState, useEffect } from "react";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export const ProductsSection = () => {
  const { produtos, loading } = useProducts();
  const produtosDestaque = produtos.slice(0, 6);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section id="products" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Produtos em Destaque
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Descubra nossa coleção exclusiva de peças selecionadas
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-6xl mx-auto mb-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : (
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {produtosDestaque.map((produto, index) => (
                  <CarouselItem 
                    key={produto.id} 
                    className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ProductCard produto={produto} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12 hover:scale-110 transition-transform" />
              <CarouselNext className="hidden md:flex -right-12 hover:scale-110 transition-transform" />
            </Carousel>
          )}
        </div>

        {/* Indicadores (Dots) */}
        {!loading && produtosDestaque.length > 0 && (
          <div className="flex justify-center gap-2 mb-12">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 hover:scale-110",
                  current === index 
                    ? "w-8 bg-primary shadow-lg shadow-primary/50" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Ver Mais Button */}
        {!loading && (
          <div className="text-center animate-fade-in">
            <Link to="/products">
              <Button 
                size="lg" 
                className="gap-2 px-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Ver Todos os Produtos
                <span className="text-lg">→</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
