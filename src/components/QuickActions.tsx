import { Button } from "@/components/ui/button";
import { MessageCircle, Instagram, MapPin } from "lucide-react";

export const QuickActions = () => {
  return (
    <section className="py-10 sm:py-14 bg-secondary/30 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
          <a
            href="https://wa.me/5583986567915?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">WhatsApp</p>
              <p className="text-xs text-muted-foreground">(83) 98656-7915</p>
            </div>
          </a>

          <a
            href="https://www.instagram.com/marielaloja_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 group-hover:bg-pink-500/20 transition-colors">
              <Instagram className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Instagram</p>
              <p className="text-xs text-muted-foreground">@marielaloja_</p>
            </div>
          </a>

          <a
            href="https://www.google.com/maps/place/MARIELA/data=!4m2!3m1!1s0x0:0x13f9e970f142a4ed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Localização</p>
              <p className="text-xs text-muted-foreground">Campina Grande, PB</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};
