import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import bannerNovidades from "@/assets/banner-novidades.jpg";
import bannerPromocoes from "@/assets/banner-promocoes.jpg";
import bannerLooks from "@/assets/banner-looks.jpg";

interface Banner {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
}

const banners: Banner[] = [
  {
    id: 1,
    image: storeInterior,
    title: "Nova Coleção",
    subtitle: "Peças exclusivas para todos os estilos",
    cta: "Ver Novidades",
    link: "/products?filter=novidades",
  },
  {
    id: 2,
    image: heroClean,
    title: "Promoções Imperdíveis",
    subtitle: "Até 50% de desconto em peças selecionadas",
    cta: "Aproveitar",
    link: "/products?filter=promocoes",
  },
  {
    id: 3,
    image: heroBg,
    title: "Monte Seu Look",
    subtitle: "Combine peças e crie o visual perfeito",
    cta: "Começar",
    link: "/monte-seu-look",
  },
];

export const HeroBannerCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % banners.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + banners.length) % banners.length);
  }, [current, goTo]);

  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  return (
    <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden mt-14 sm:mt-16">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          <img
            src={banner.image}
            alt={banner.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
          
          <div className="absolute inset-0 flex items-end z-20">
            <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
              <div
                className={cn(
                  "max-w-lg transition-all duration-700 delay-200",
                  index === current ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                )}
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-2 sm:mb-3 leading-tight">
                  {banner.title}
                </h2>
                <p className="text-white/80 text-sm sm:text-base md:text-lg mb-4 sm:mb-6">
                  {banner.subtitle}
                </p>
                <Button
                  size="lg"
                  className="bg-white text-foreground hover:bg-white/90 h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-medium rounded-none"
                  asChild
                >
                  <Link to={banner.link}>{banner.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-all rounded-full"
        aria-label="Banner anterior"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-all rounded-full"
        aria-label="Próximo banner"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === current ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
