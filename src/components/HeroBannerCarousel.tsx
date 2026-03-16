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
    image: bannerNovidades,
    title: "Nova Coleção",
    subtitle: "Peças exclusivas para todos os estilos",
    cta: "Ver Novidades",
    link: "/products?filter=novidades",
  },
  {
    id: 2,
    image: bannerPromocoes,
    title: "Promoções Imperdíveis",
    subtitle: "Até 50% de desconto em peças selecionadas",
    cta: "Aproveitar",
    link: "/products?filter=promocoes",
  },
  {
    id: 3,
    image: bannerLooks,
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
    <section className="relative w-full h-[25vh] sm:h-[34vh] md:h-[42vh] lg:h-[48vh] overflow-hidden mt-[52px] sm:mt-[64px]">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          <div className="absolute inset-0 flex items-end z-20">
            <div className="container mx-auto px-4 sm:px-6 pb-6 sm:pb-10 md:pb-14">
              <div
                className={cn(
                  "transition-all duration-700 delay-200",
                  index === current ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                )}
              >
                <Button
                  size="sm"
                  className="bg-white text-foreground hover:bg-white/90 h-8 sm:h-10 px-4 sm:px-6 text-xs sm:text-sm font-medium rounded-none shadow-lg"
                  asChild
                >
                  <Link to={banner.link}>{banner.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation arrows - smaller on mobile */}
      <button
        onClick={prev}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-all rounded-full"
        aria-label="Banner anterior"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-all rounded-full"
        aria-label="Próximo banner"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              "h-1 sm:h-1.5 rounded-full transition-all duration-300",
              index === current ? "w-6 sm:w-8 bg-white" : "w-1 sm:w-1.5 bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Ir para banner ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
