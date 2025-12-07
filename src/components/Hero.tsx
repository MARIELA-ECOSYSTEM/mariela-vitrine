import { Button } from "@/components/ui/button";
import logoFull from "@/assets/logo-full.png";
import heroClean from "@/assets/hero-clean.jpg";
import storeInterior from "@/assets/store-interior.jpg";
import { Link } from "react-router-dom";
import { Sparkles, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Hero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const parallaxOffset = scrollY * 0.3;
  const opacityFade = Math.max(0, 1 - scrollY / 600);

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center justify-center bg-gradient-soft pt-20 overflow-hidden">
      {/* Background parallax layer */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none"
        style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
      />
      
      <div 
        className="container mx-auto px-6"
        style={{ 
          transform: `translateY(${parallaxOffset * 0.2}px)`,
          opacity: opacityFade 
        }}
      >
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="animate-fade-in">
            <div className="mb-6 md:mb-8 animate-scale-in">
              <img src={logoFull} alt="Mariela - Moda Feminina" className="h-[10rem] sm:h-[12rem] md:h-[16rem] lg:h-[20rem] hover:scale-105 transition-transform duration-500 mx-auto md:mx-0" />
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-8 font-light animate-fade-in text-center md:text-left" style={{ animationDelay: '0.2s' }}>
              Elegância e estilo atemporal
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-dark transition-all hover:scale-105 hover:shadow-hover"
                asChild
              >
                <Link to="/products">Ver Produtos</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary/10 transition-all hover:scale-105"
                asChild
              >
                <a href="https://wa.me/5583987373396?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20da%20Mariela%20Style%20Shop%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary/10 transition-all hover:scale-105"
                asChild
              >
                <a href="https://www.instagram.com/marielaloja_/" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </Button>
            </div>
          </div>

          {/* Store Image with Button */}
          <div className="animate-fade-in space-y-6" style={{ animationDelay: '0.3s' }}>
            <div 
              className="relative rounded-xl overflow-hidden shadow-medium hover:shadow-hover transition-all duration-500 group"
              style={{ transform: `translateY(${-parallaxOffset * 0.15}px)` }}
            >
              <img 
                src={storeInterior} 
                alt="Interior da Loja Mariela" 
                className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ transform: `scale(1.1) translateY(${parallaxOffset * 0.1}px)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <Button
              size="lg"
              className="w-full gap-2 bg-primary hover:bg-primary-dark transition-all hover:scale-105 hover:shadow-hover"
              asChild
            >
              <Link to="/monte-seu-look">
                <Sparkles className="h-5 w-5 animate-pulse" />
                Monte Seu Look Mariela
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
