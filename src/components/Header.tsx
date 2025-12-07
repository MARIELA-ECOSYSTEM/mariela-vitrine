import { Instagram, Menu, ShoppingCart, MessageCircle, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoText from "@/assets/logo-text.png";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const { items } = useCart();
  const { refreshProducts } = useProducts();
  const navigate = useNavigate();

  useEffect(() => {
    if (refreshState === 'success') {
      const timer = setTimeout(() => setRefreshState('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [refreshState]);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 animate-fade-in-down">
      <div className="container mx-auto px-4 sm:px-6 py-4">
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
  );
};
