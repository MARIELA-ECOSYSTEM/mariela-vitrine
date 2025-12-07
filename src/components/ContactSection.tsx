import { Instagram, MapPin, MessageCircle } from "lucide-react";

export const ContactSection = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-soft">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="animate-fade-in mb-12">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Contato
            </h2>
            <p className="text-muted-foreground text-lg">
              Entre em contato conosco
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <a
              href="https://www.instagram.com/marielaloja_/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-xl hover:bg-background/50 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-full">
                <Instagram className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Instagram</p>
                <p className="font-medium text-foreground">@marielaloja_</p>
              </div>
            </a>

            <a
              href="https://wa.me/5583987373396?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20da%20Mariela%20Style%20Shop%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-xl hover:bg-background/50 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-full">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">WhatsApp</p>
                <p className="font-medium text-foreground text-center px-2">Tem alguma dúvida ou quer ajuda pra escolher seu look Mariela?💜 Chama a gente no WhatsApp!📲</p>
              </div>
            </a>

            <div className="flex flex-col items-center gap-3 p-6 rounded-xl">
              <a
                href="https://www.google.com/maps/place/MARIELA/data=!4m2!3m1!1s0x0:0x13f9e970f142a4ed?sa=X&ved=1t:2428&hl=pt-BR&ictx=111"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3"
              >
                <div className="p-3 bg-primary/10 rounded-full">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Localização</p>
                  <p className="font-medium text-foreground">Campina Grande, PB</p>
                </div>
              </a>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
