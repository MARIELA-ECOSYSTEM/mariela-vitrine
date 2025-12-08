import { Instagram, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <footer className="bg-background border-t border-border py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* Main Footer Content */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
              <div className="text-center md:text-left">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-primary mb-1 sm:mb-2">
                  Mariela
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Moda feminina com elegância
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <a 
                  href="https://www.instagram.com/marielaloja_/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-foreground hover:text-primary transition-colors touch-feedback"
                >
                  <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">@marielaloja_</span>
                </a>
              </div>

              <div className="text-center md:text-right">
                <p className="text-muted-foreground text-xs sm:text-sm">
                  © {new Date().getFullYear()} Mariela
                </p>
              </div>
            </div>

            {/* PWA Install Section - Mobile Only */}
            {!isInstalled && deferredPrompt && (
              <div className="md:hidden bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl p-4 border border-primary/20 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 rounded-full p-2.5 shrink-0">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">Adicione à Tela Inicial</p>
                    <p className="text-xs text-muted-foreground">Acesse o Site Mariela como um app</p>
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
          </div>
        </div>
      </div>
    </footer>
  );
};
