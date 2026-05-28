import { Instagram, Menu, ShoppingCart, MessageCircle, RefreshCw, Check, Download, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import { useHeaderOverlay } from "@/contexts/HeaderOverlayContext";
import { useBannerLuminance } from "@/hooks/useBannerLuminance";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 (topo) → 1 (totalmente opaco)
  // Bloqueia atualizações de scrollProgress durante scroll programático para
  // evitar piscadas de opacidade/blur enquanto o navegador interpola a posição.
  const programmaticScrollUntil = useState<{ value: number }>(() => ({ value: 0 }))[0];
  const { items } = useCart();
  const { refreshProducts } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const { bannerImage, activeSection, setActiveSection } = useHeaderOverlay();
  const bannerTone = useBannerLuminance(bannerImage); // 'light' = texto branco, 'dark' = texto escuro

  // Header transparente apenas na Home, onde existe um banner full-bleed atrás do header.
  const isHome = location.pathname === "/";
  // Modo "sobreposto ao banner": progresso < 1 e não está com menu mobile aberto.
  // Mobile menu aberto força fundo opaco para garantir legibilidade dos links.
  const isOverlay = isHome && scrollProgress < 0.98 && !isMobileMenuOpen;
  // Tom do conteúdo overlay: deriva da luminância do banner (auto-contraste).
  const overlayTextLight = bannerTone === "light"; // banner escuro → texto branco

  useEffect(() => {
    // Distância em px na qual o header transita de overlay → opaco.
    // Maior = transição mais suave e perceptível entre topo e meio da página.
    const FADE_DISTANCE = 320;
    // Easing "smoothstep" para evitar mudança linear/abrupta de opacidade/blur.
    const smoothstep = (t: number) => t * t * (3 - 2 * t);
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // Durante o scroll programático, mantém o header opaco e estável.
        if (Date.now() < programmaticScrollUntil.value) {
          setScrollProgress(1);
          return;
        }
        const y = window.scrollY;
        const raw = Math.min(1, Math.max(0, y / FADE_DISTANCE));
        const progress = smoothstep(raw);
        setScrollProgress(progress);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [programmaticScrollUntil]);

  // Ao trocar de rota, reavalia o estado de rolagem e fecha menu mobile.
  useEffect(() => {
    const y = window.scrollY;
    const raw = Math.min(1, Math.max(0, y / 320));
    setScrollProgress(raw * raw * (3 - 2 * raw));
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Scroll-spy: destaca a seção visível na Home (home / products / contact).
  useEffect(() => {
    if (!isHome) {
      setActiveSection(null);
      return;
    }
    const ids = ["home", "products", "contact"];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Escolhe a seção com maior interseção visível.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      {
        // "Foco" no terço superior da viewport (logo abaixo do header).
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome, setActiveSection]);

  // Suporte a hash na URL (ex.: /#contact, /#products) ao abrir/navegar:
  // sincroniza o estado ativo do menu e rola até a âncora com o offset do header.
  useEffect(() => {
    if (!isHome) return;
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return;
    if (["home", "products", "contact", "monte-seu-look"].includes(hash)) {
      setActiveSection(hash === "monte-seu-look" ? null : hash);
      // Aguarda o próximo frame para garantir que as seções estejam montadas.
      requestAnimationFrame(() => scrollToAnchor(hash));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome, location.hash]);

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

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // `path` é o destino do react-router. Para itens que rolam para uma âncora,
  // usamos `/#section` — assim funciona inclusive vindo de outra rota:
  // a navegação acontece e o effect de hash (abaixo) cuida do scroll.
  const navLinks = [
    { path: '/#home', basePath: '/', label: 'Início', scrollTo: 'home', section: 'home' },
    { path: '/products', basePath: '/products', label: 'Produtos', scrollTo: undefined as string | undefined, section: 'products' },
    { path: '/monte-seu-look', basePath: '/monte-seu-look', label: 'Monte Seu Look', scrollTo: undefined as string | undefined, section: undefined as string | undefined },
    { path: '/#contact', basePath: '/', label: 'Contato', scrollTo: 'contact', section: 'contact' },
  ];

  // Helper para definir se um link do menu está "ativo" considerando rota + scroll-spy.
  const isLinkActive = (link: { basePath: string; scrollTo?: string; section?: string }) => {
    if (isHome && link.section) {
      // Antes do scroll-spy detectar a primeira seção, considera "Início" como ativo no topo.
      if (activeSection === null && link.section === "home") return true;
      return activeSection === link.section;
    }
    if (!link.scrollTo) return isActive(link.basePath);
    return false;
  };

  // Faz scroll até uma âncora com retentativas — garante funcionamento mesmo
  // quando navegamos de outra rota e a seção ainda não foi montada. Compensa
  // a altura do header fixo (60px mobile / 68px desktop) para não cortar a seção.
  const scrollToAnchor = (id: string, maxAttempts = 30) => {
    let attempts = 0;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        // Lê a altura real do header da variável CSS (--header-height) para manter
        // o cálculo correto em todos os breakpoints e em ajustes futuros de layout.
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue("--header-height")
          .trim();
        const headerOffset = parseInt(raw, 10) || 68;
        // Considera também o `scroll-margin-top` definido no elemento (CSS),
        // o que permite que cada seção ajuste seu próprio offset sem alterar
        // a lógica aqui. Usa o maior valor entre os dois.
        const styles = getComputedStyle(el);
        const scrollMargin = parseInt(styles.scrollMarginTop, 10) || 0;
        const offset = Math.max(headerOffset, scrollMargin);
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        // Lock visual do header durante a animação (≈700ms) — evita flicker
        // de opacidade/blur enquanto o navegador interpola a posição.
        programmaticScrollUntil.value = Date.now() + 700;
        setScrollProgress(1);
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) setTimeout(tick, 100);
    };
    tick();
  };

  // Estilo inline para opacidade progressiva do fundo do header.
  // Usamos hsl(var(--background)) para respeitar o tema (claro/escuro).
  const headerBgStyle = useMemo(() => {
    if (!isHome) return undefined;
    // Em banners claros (texto escuro) aplicamos um leve "véu" branco translúcido
    // mesmo no topo, garantindo contraste AA sem perder a sensação de overlay.
    const overlayFloor = !overlayTextLight ? 0.55 : 0;
    const alpha = isMobileMenuOpen ? 1 : Math.max(scrollProgress, overlayFloor);
    return {
      backgroundColor: `hsl(var(--background) / ${alpha})`,
      borderBottomColor: `hsl(var(--border) / ${alpha * 0.5})`,
      // backdrop-blur cresce junto com a opacidade para um efeito "glass" intermediário.
      backdropFilter: alpha > 0.05 && alpha < 0.95 ? `blur(${Math.round(alpha * 12)}px)` : undefined,
      WebkitBackdropFilter: alpha > 0.05 && alpha < 0.95 ? `blur(${Math.round(alpha * 12)}px)` : undefined,
    } as React.CSSProperties;
  }, [isHome, isMobileMenuOpen, scrollProgress, overlayTextLight]);

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
      
      <header
        style={headerBgStyle}
        className={cn(
          "fixed left-0 right-0 z-50 animate-fade-in-down transition-colors duration-300 border-b",
          showInstallBanner && isMobile ? "top-10" : "top-0",
          // Fora da Home: sempre opaco com tokens semânticos.
          !isHome && "bg-background border-border/50 text-foreground",
          // Na Home: cor do texto controlada pelo modo overlay + tom do banner.
          isHome && (isOverlay
            ? overlayTextLight ? "text-white" : "text-foreground"
            : "text-foreground"),
          isHome && !isOverlay && "border-border/50",
          isHome && isOverlay && "border-transparent",
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo Text - Following Reference Pattern */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group" 
            aria-label="Atualizar produtos e ir para o início"
          >
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  "font-serif text-xl sm:text-2xl font-bold leading-tight transition-colors",
                  isOverlay
                    ? overlayTextLight ? "text-white drop-shadow-md" : "text-foreground drop-shadow-sm"
                    : "text-primary",
                )}
              >
                Mariela
              </span>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium tracking-wide transition-colors",
                  isOverlay
                    ? overlayTextLight ? "text-white/85 drop-shadow" : "text-foreground/75 drop-shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Moda Feminina
              </span>
            </div>
            {refreshState === 'loading' && (
              <RefreshCw className={cn("h-4 w-4 animate-spin", isOverlay ? (overlayTextLight ? "text-white" : "text-foreground") : "text-muted-foreground")} />
            )}
            {refreshState === 'success' && (
              <Check className="h-4 w-4 text-green-500 animate-scale-in" />
            )}
            {refreshState === 'idle' && (
              <RefreshCw className={cn("h-4 w-4 opacity-0 group-hover:opacity-100 transition-all", isOverlay ? (overlayTextLight ? "text-white" : "text-foreground") : "text-muted-foreground")} />
            )}
          </button>

          {/* Navegação desktop com marcador ativo */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Navegação Principal">
            {navLinks.map((link) => (
              <Link
                key={`${link.path}-${link.label}`}
                to={link.path}
                onClick={() => {
                  // Se já estamos na rota base do link, faz scroll imediato
                  // (o hash não muda quando é o mesmo, então o effect não roda).
                  if (link.scrollTo && location.pathname === link.basePath) {
                    scrollToAnchor(link.scrollTo);
                  }
                }}
                className={cn(
                  "text-sm font-medium transition-colors relative py-1",
                  isOverlay
                    ? cn(
                        overlayTextLight
                          ? "text-white drop-shadow hover:text-white/80"
                          : "text-foreground drop-shadow-sm hover:text-foreground/75",
                        isLinkActive(link) && "nav-link-active",
                      )
                    : isLinkActive(link)
                      ? "text-primary nav-link-active"
                      : "text-foreground hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={cn(
                isOverlay
                  ? overlayTextLight
                    ? "text-white hover:bg-white/15 hover:text-white"
                    : "text-foreground hover:bg-foreground/10"
                  : "hover:bg-primary/10",
              )}
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {/* Carrinho */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "relative",
                isOverlay
                  ? overlayTextLight
                    ? "text-white hover:bg-white/15 hover:text-white"
                    : "text-foreground hover:bg-foreground/10"
                  : "hover:bg-primary/10",
              )}
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
              className={cn(
                isOverlay
                  ? overlayTextLight
                    ? "text-white hover:bg-white/15 hover:text-white"
                    : "text-foreground hover:bg-foreground/10"
                  : "hover:bg-primary/10",
              )}
              aria-label="WhatsApp da Mariela"
            >
              <a
                href="https://wa.me/5583986567915?text=✨%20Olá%2C%20Mariela!%0AVi%20o%20site%20da%20Mariela%20Moda%20Feminina%20e%20quero%20saber%20mais%20sobre%20as%20peças%20😍"
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
              className={cn(
                isOverlay
                  ? overlayTextLight
                    ? "text-white hover:bg-white/15 hover:text-white"
                    : "text-foreground hover:bg-foreground/10"
                  : "hover:bg-primary/10",
              )}
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
                className={cn(
                  isOverlay
                    ? overlayTextLight
                      ? "text-white hover:bg-white/15 hover:text-white"
                      : "text-foreground hover:bg-foreground/10"
                    : "hover:bg-primary/10",
                )}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Menu mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="mt-3 flex flex-col gap-1 md:hidden animate-slide-down rounded-lg bg-background border border-border/60 p-2 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={`m-${link.path}-${link.label}`}
                to={link.path}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (link.scrollTo) scrollToAnchor(link.scrollTo);
                }}
                className={cn(
                  "text-sm font-medium px-3 py-2.5 rounded-md transition-colors",
                  isLinkActive(link)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/instalar"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium px-3 py-2.5 rounded-md text-foreground hover:bg-muted hover:text-primary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Instalar App
            </Link>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-md text-foreground hover:bg-muted hover:text-primary transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Modo Escuro
                </>
              )}
            </button>
          </div>
        )}
        </div>
      </header>
    </>
  );
};
