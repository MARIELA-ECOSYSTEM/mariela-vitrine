import { Instagram, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ContactSection = () => {
  return (
    <section id="contact" className="py-16 sm:py-20 bg-gradient-to-b from-background via-secondary/10 to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-14 animate-fade-in">
            <span className="inline-block text-primary font-medium text-sm uppercase tracking-wider mb-3">
              Fale Conosco
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Contato
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Estamos prontas para ajudar você a encontrar o look perfeito
            </p>
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Instagram Card */}
            <a
              href="https://www.instagram.com/marielaloja_/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 touch-feedback"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Instagram className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Instagram</h3>
                  <p className="text-primary text-sm font-medium">@marielaloja_</p>
                </div>
              </div>
            </a>

            {/* WhatsApp Card */}
            <a
              href="https://wa.me/5583986567915?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card hover:bg-green-500/5 border border-border hover:border-green-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 touch-feedback"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                  <p className="text-green-600 text-sm font-medium">(83) 98656-7915</p>
                </div>
              </div>
            </a>

            {/* Location Card */}
            <a
              href="https://www.google.com/maps/place/MARIELA/data=!4m2!3m1!1s0x0:0x13f9e970f142a4ed?sa=X&ved=1t:2428&hl=pt-BR&ictx=111"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl p-6 sm:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 touch-feedback"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Localização</h3>
                  <p className="text-muted-foreground text-sm">Campina Grande, PB</p>
                </div>
              </div>
            </a>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-10 sm:mt-12 animate-fade-in">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white gap-2 h-12 sm:h-14 px-8 touch-feedback shadow-lg hover:shadow-xl transition-all"
              asChild
            >
              <a
                href="https://wa.me/5583986567915?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
                Iniciar Conversa no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
