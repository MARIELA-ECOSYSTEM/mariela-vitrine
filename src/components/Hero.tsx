import { Button } from "@/components/ui/button";
import storeInterior from "@/assets/store-interior.jpg";
import { Link } from "react-router-dom";
import { Sparkles, MessageCircle, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const Hero = () => {
  const [scrollY, setScrollY] = useState(0);
  const isMobile = useIsMobile();

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
    <section id="home" className="relative min-h-[100svh] flex items-center justify-center bg-gradient-to-b from-background via-secondary/20 to-background pt-16 sm:pt-20 overflow-hidden">
      {/* Background gradient layer */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none"
        style={{ transform: isMobile ? 'none' : `translateY(${parallaxOffset * 0.5}px)` }}
      />
      
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      
      <div 
        className="container mx-auto px-4 sm:px-6 relative z-10"
        style={{ 
          transform: isMobile ? 'none' : `translateY(${parallaxOffset * 0.2}px)`,
          opacity: opacityFade 
        }}
      >
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text Content - Mobile optimized with centered logo text */}
          <div className="text-center md:text-left order-1 animate-fade-in">
            {/* Logo Text - Centered and Professional */}
            <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col items-center md:items-start">
              <h1 className="font-serif text-5xl xs:text-6xl sm:text-7xl md:text-8xl font-bold text-primary leading-none tracking-tight">
                Mariela
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase mt-1">
                Moda Feminina
              </p>
            </div>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground/80 mb-6 md:mb-8 font-serif italic">
              Elegância e estilo atemporal
            </p>
            
            {/* CTA Buttons - Mobile friendly with visible text */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-dark transition-all hover:scale-105 shadow-lg hover:shadow-xl h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg touch-feedback"
                asChild
              >
                <Link to="/products">Ver Produtos</Link>
              </Button>
              
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/50 text-primary hover:bg-primary/10 transition-all hover:scale-105 h-12 sm:h-14 px-4 sm:px-6 touch-feedback"
                  asChild
                >
                  <a 
                    href="https://wa.me/5583986567915?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    <span className="inline">WhatsApp</span>
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/50 text-primary hover:bg-primary/10 transition-all hover:scale-105 h-12 sm:h-14 px-4 sm:px-6 touch-feedback"
                  asChild
                >
                  <a 
                    href="https://www.instagram.com/marielaloja_/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Instagram className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Instagram</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Store Image with Monte Seu Look Button */}
          <div className="order-2 animate-fade-in space-y-4" style={{ animationDelay: '0.2s' }}>
            <div 
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group"
              style={{ transform: isMobile ? 'none' : `translateY(${-parallaxOffset * 0.15}px)` }}
            >
              <img 
                src={storeInterior} 
                alt="Interior da Loja Mariela" 
                className="w-full h-[280px] sm:h-[350px] md:h-[400px] lg:h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
              
              {/* Monte Seu Look Button - Overlayed */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm transition-all hover:scale-[1.02] shadow-xl h-12 sm:h-14 text-base sm:text-lg touch-feedback"
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
        </div>
      </div>
      
      {/* Scroll indicator - Mobile only */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:hidden animate-bounce opacity-50">
        <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};
