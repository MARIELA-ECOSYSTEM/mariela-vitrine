import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, Heart, Download, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "@/assets/logo-full.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const WelcomeDialog = () => {
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Mostra o pop-up apenas em acesso direto/refresh, não em navegação interna
    const hasSeenInSession = sessionStorage.getItem("mariela-welcome-shown");
    if (!hasSeenInSession) {
      setOpen(true);
      sessionStorage.setItem("mariela-welcome-shown", "true");
    }

    // Listen for install prompt
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background border-primary/20">
        <DialogHeader className="space-y-3 sm:space-y-4">
          <div className="flex justify-center animate-fade-in">
            <img 
              src={logoFull} 
              alt="Site Mariela" 
              className="h-20 sm:h-32"
            />
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl font-serif animate-slide-down">
            Bem-vinda ao Site Mariela! 💜
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 sm:space-y-4 text-sm sm:text-base animate-fade-in">
            <p className="text-foreground/90">
              Que bom te ver por aqui! ✨
            </p>
            
            <div className="space-y-2.5 sm:space-y-3 text-left">
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
                <p className="text-foreground/80 text-sm sm:text-base">
                  Nossa vitrine virtual traz todas as peças em estoque. 🛍️
                </p>
              </div>
              
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
                <p className="text-foreground/80 text-sm sm:text-base">
                  Use o <span className="font-semibold text-primary">Monte Seu Look</span> para criar combinações! 🤩
                </p>
              </div>
              
              <div className="flex gap-2.5 sm:gap-3 items-start">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
                <p className="text-foreground/80 text-sm sm:text-base">
                  Chame no WhatsApp para finalizar seu pedido! 💬
                </p>
              </div>
            </div>

            {/* PWA Install Option - Mobile Only */}
            {!isInstalled && deferredPrompt && (
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl p-3 sm:p-4 border border-primary/20 animate-pop-in">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 rounded-full p-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground text-sm">Instale o App!</p>
                    <p className="text-xs text-muted-foreground">Tenha acesso rápido pelo celular</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    className="gap-1.5 pwa-install-glow"
                  >
                    <Download className="h-4 w-4" />
                    Instalar
                  </Button>
                </div>
              </div>
            )}

            <p className="text-foreground/90 font-medium pt-1 sm:pt-2 text-sm sm:text-base">
              Aproveite e monte o look dos seus sonhos! 💕
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-3 sm:mt-4">
          <Button
            onClick={() => setOpen(false)}
            className="flex-1 bg-primary hover:bg-primary-dark h-11 sm:h-10 touch-feedback"
          >
            Explorar Produtos
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10 h-11 sm:h-10 touch-feedback"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link to="/monte-seu-look">
              <Sparkles className="h-4 w-4 mr-2" />
              Monte Seu Look
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};