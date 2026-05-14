import { Instagram, Download, Smartphone, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Footer = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <footer className="bg-gradient-to-t from-secondary/30 via-background to-background border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto">
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
            {/* Brand Column */}
            <div className="text-center md:text-left">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-primary mb-2">
                Mariela
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Moda Feminina
              </p>
              <p className="text-muted-foreground text-sm italic">
                Elegância e estilo atemporal
              </p>
            </div>

            {/* Links Column */}
            <div className="text-center">
              <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                Navegação
              </h4>
              <nav className="flex flex-col gap-2" aria-label="Links Rápidos">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Início
                </Link>
                <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Produtos
                </Link>
                <Link to="/monte-seu-look" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center justify-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Monte Seu Look
                </Link>
                <Link to="/instalar" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center justify-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Instalar App
                </Link>
              </nav>
            </div>

            {/* Contact Column */}
            <div className="text-center md:text-right">
              <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                Contato
              </h4>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://www.instagram.com/marielaloja_/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center md:justify-end gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  <Instagram className="h-4 w-4" />
                  @marielaloja_
                </a>
                <a 
                  href="https://wa.me/5583986567915?text=Olá!%20Vi%20o%20site%20e%20quero%20saber%20mais!"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center md:justify-end gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  (83) 98656-7915
                </a>
                <p className="flex items-center justify-center md:justify-end gap-2 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4" />
                  Campina Grande, PB
                </p>
              </div>
            </div>
          </div>

          {/* PWA Install Section - Mobile Only */}
          {!isInstalled && deferredPrompt && (
            <div className="md:hidden bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 rounded-2xl p-4 border border-primary/20 mb-8 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 rounded-full p-3 shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">Adicione à Tela Inicial</p>
                  <p className="text-xs text-muted-foreground">Acesse como um aplicativo</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  className="gap-1.5 shrink-0 touch-feedback"
                >
                  <Download className="h-4 w-4" />
                  Instalar
                </Button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/50 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-xs sm:text-sm">
                © {new Date().getFullYear()} Mariela. Todos os direitos reservados.
              </p>
              <p className="text-muted-foreground/60 text-xs">
                Feito com 💜 em Campina Grande
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
