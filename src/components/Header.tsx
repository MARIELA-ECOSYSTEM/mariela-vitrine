import { Instagram, Menu, ShoppingCart, MessageCircle, RefreshCw, Check, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoText from "@/assets/logo-text.png";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const { items } = useCart();
  const { refreshProducts } = useProducts();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (refreshState === 'success') {
      const timer = setTimeout(() => setRefreshState('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [refreshState]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    const dismissedAt = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone && daysSinceDismissed > 3) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleLogoClick = async () => {
    if (refreshState === 'loading') return;
    
    setRefreshState('loading');
    const success = await refreshProducts();
    
    if (success) {
      setRefreshState('success');
      navigate("/");
      setTimeout(() => {
        document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setRefreshState('idle');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  return (
    <>
      {/* Install Banner for Mobile */}
      {showInstallBanner && isMobile && deferredPrompt && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground px-4 py-2.5 animate-slide-up">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Download className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate">Instale o App Mariela!</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="h-7 text-xs px-3"
              >
                Instalar
              </Button>
              <button onClick={dismissBanner} className="p-1 hover:bg-white/10 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <header className={`fixed left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 animate-fade-in-down ${showInstallBanner && isMobile ? 'top-10' : 'top-0'}`}>
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 mobile-header-condensed">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group" 
            aria-label="Atualizar produtos e ir para o início"
          >
            <img
              src={logoText}
              alt="Site Mariela"
              className="h-8 md:h-10 transition-all duration-300 dark:brightness-0 dark:invert"
            />
            {refreshState === 'loading' && (
              <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
            )}
            {refreshState === 'success' && (
              <Check className="h-4 w-4 text-green-500 animate-scale-in" />
            )}
            {refreshState === 'idle' && (
              <RefreshCw className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </button>

          {/* Navegação desktop */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link 
              to="/" 
              onClick={() => {
                setTimeout(() => {
                  document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Início
            </Link>
            <Link to="/products" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Produtos</Link>
            <Link to="/monte-seu-look" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Monte Seu Look Mariela</Link>
            <Link 
              to="/" 
              onClick={() => {
                setTimeout(() => {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Contato
            </Link>
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Carrinho */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10 relative"
              aria-label="Carrinho de compras"
            >
              <Link to="/cart">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </Link>
            </Button>

            {/* WhatsApp */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10"
              aria-label="WhatsApp da Mariela"
            >
              <a
                href="https://wa.me/5583987373396?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20da%20Mariela%20Style%20Shop%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </Button>

            {/* Instagram */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10"
              aria-label="Instagram da Mariela"
            >
              <a
                href="https://www.instagram.com/marielaloja_/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </Button>

            {/* Menu Mobile */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Menu mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-4 md:hidden animate-slide-down">
            <Link 
              to="/" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Início
            </Link>
            <Link 
              to="/products" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Produtos
            </Link>
            <Link 
              to="/monte-seu-look" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Monte Seu Look Mariela
            </Link>
            <Link 
              to="/" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Contato
            </Link>
          </div>
        )}
        </div>
      </header>
    </>
  );
};
