import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  X, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Check,
  Sparkles,
  Eye,
  Loader2,
  PartyPopper
} from "lucide-react";
import { formatBRL, getDisplayPrice } from "@/lib/formatters";
import { useProducts } from "@/hooks/useProducts";
import { Produto } from "@/data/products";
import confetti from "canvas-confetti";
import produtoGenerico from "@/assets/produto-generico.png";
import { cn } from "@/lib/utils";
import { CategorySkeleton, ColorSizeSkeleton } from "./CategorySkeleton";
import { toast } from "@/hooks/use-toast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useSizeSelectionGuide } from "@/hooks/useSizeSelectionGuide";

// Ícone oficial do WhatsApp (inline SVG) — deixa explícito o canal de envio.
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
    className={className}
  >
    <path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.12 1.6 5.92L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.43h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.43ZM12.05 21.3h-.01a9.43 9.43 0 0 1-4.81-1.32l-.34-.2-3.8 1 1.02-3.7-.22-.38a9.42 9.42 0 0 1-1.45-5.04c0-5.21 4.24-9.45 9.46-9.45 2.52 0 4.9.99 6.68 2.77a9.39 9.39 0 0 1 2.77 6.69c0 5.22-4.24 9.45-9.45 9.45Zm5.18-7.07c-.28-.14-1.68-.83-1.94-.92-.26-.1-.45-.14-.64.14-.19.28-.74.92-.9 1.11-.17.19-.33.21-.61.07-.28-.14-1.2-.44-2.28-1.41-.84-.75-1.41-1.67-1.58-1.95-.16-.28-.02-.43.13-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.39s1.02 2.77 1.16 2.96c.14.19 2 3.05 4.85 4.28.68.29 1.2.46 1.61.59.68.22 1.29.19 1.78.12.54-.08 1.68-.69 1.91-1.35.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33Z" />
  </svg>
);

interface SelectedItems {
  blusa: number | null;
  bottom: number | null;
  bolsa: number | null;
  vestido: number | null;
  conjunto: number | null;
}

interface SelectedSizes {
  blusa: string;
  bottom: string;
  bolsa: string;
  vestido: string;
  conjunto: string;
}

interface SelectedColors {
  blusa: string;
  bottom: string;
  bolsa: string;
  vestido: string;
  conjunto: string;
}

type CategoryKey = keyof SelectedItems;

const categoryConfig: Array<{
  key: CategoryKey;
  label: string;
  emoji: string;
  clearOnSelect?: CategoryKey[];
}> = [
  { key: 'vestido', label: 'Vestidos', emoji: '👗', clearOnSelect: ['blusa', 'bottom', 'conjunto'] },
  { key: 'conjunto', label: 'Conjuntos', emoji: '👔', clearOnSelect: ['blusa', 'bottom', 'vestido'] },
  { key: 'blusa', label: 'Blusas', emoji: '👚' },
  { key: 'bottom', label: 'Peças Inferiores', emoji: '👖' },
  { key: 'bolsa', label: 'Bolsas & Acessórios', emoji: '👜' },
];

export const MobileLookBuilder = () => {
  const { produtos, loading } = useProducts();
  const isLoading = loading && produtos.length === 0;
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);

  // Guia compartilhado: usa `guideElement` para focar a categoria que está
  // sem tamanho ao tentar enviar pelo WhatsApp (em vez de alert agressivo).
  const sizeGuide = useSizeSelectionGuide();
  const [showPreview, setShowPreview] = useState(false);
  const [isClosingPreview, setIsClosingPreview] = useState(false);
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);

  // Refs para gerenciar foco — devolver foco ao botão "Ver" ao fechar.
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  // Ref do timer da animação de saída — evita race em abrir/fechar rápido.
  const closeTimerRef = useRef<number | null>(null);
  // Ref de "componente montado" — bloqueia setState após desmontagem.
  const mountedRef = useRef(true);

  // Fechamento animado: dispara animação de saída e desmonta após o término.
  const closePreview = () => {
    if (isClosingPreview) return;
    setIsClosingPreview(true);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (!mountedRef.current) return;
      setShowPreview(false);
      setIsClosingPreview(false);
      if (lastTriggerRef.current && typeof lastTriggerRef.current.focus === "function") {
        lastTriggerRef.current.focus();
      }
    }, 230);
  };

  // Helper para abrir o preview registrando o gatilho que recebeu foco.
  const openPreview = (e?: React.MouseEvent<HTMLElement>) => {
    // Cancela qualquer fechamento pendente — abrir/fechar rápido nunca trava estado.
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosingPreview(false);
    lastTriggerRef.current = (e?.currentTarget as HTMLElement) || null;
    setShowPreview(true);
  };

  // Cleanup global: marca desmontado e cancela timer pendente.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Trava o scroll do body via hook reutilizável (cleanup garantido).
  useScrollLock(showPreview);

  // ESC + foco inicial + trap de foco enquanto o modal estiver aberto.
  useEffect(() => {
    if (!showPreview) return;
    const sheet = sheetRef.current;

    const getFocusable = (): HTMLElement[] => {
      if (!sheet) return [];
      return Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePreview();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: confina Tab/Shift+Tab dentro do sheet.
      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        sheet?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !sheet?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    // Foco inicial no sheet (próximo tick para garantir mount).
    const focusTimer = window.setTimeout(() => sheetRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview]);
  
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({
    blusa: null,
    bottom: null,
    bolsa: null,
    vestido: null,
    conjunto: null,
  });

  const [selectedSizes, setSelectedSizes] = useState<SelectedSizes>({
    blusa: "",
    bottom: "",
    bolsa: "",
    vestido: "",
    conjunto: "",
  });

  const [selectedColors, setSelectedColors] = useState<SelectedColors>({
    blusa: "",
    bottom: "",
    bolsa: "",
    vestido: "",
    conjunto: "",
  });

  // Filtrar produtos por categoria
  const productsByCategory = useMemo(() => ({
    blusa: produtos.filter(p => p.categoria === "blusas"),
    bottom: produtos.filter(p => ["shorts", "calças", "saias", "short-saias"].includes(p.categoria)),
    bolsa: produtos.filter(p => ["bolsas", "acessorios"].includes(p.categoria)),
    vestido: produtos.filter(p => p.categoria === "vestidos"),
    conjunto: produtos.filter(p => p.categoria === "conjuntos"),
  }), [produtos]);

  // Produtos selecionados
  const selectedProducts = useMemo(() => ({
    blusa: selectedItems.blusa ? produtos.find(p => p.id === selectedItems.blusa) || null : null,
    bottom: selectedItems.bottom ? produtos.find(p => p.id === selectedItems.bottom) || null : null,
    bolsa: selectedItems.bolsa ? produtos.find(p => p.id === selectedItems.bolsa) || null : null,
    vestido: selectedItems.vestido ? produtos.find(p => p.id === selectedItems.vestido) || null : null,
    conjunto: selectedItems.conjunto ? produtos.find(p => p.id === selectedItems.conjunto) || null : null,
  }), [selectedItems, produtos]);

  const isFullOutfit = selectedProducts.vestido !== null || selectedProducts.conjunto !== null;
  const hasAnySelection = Object.values(selectedItems).some(v => v !== null);

  // Indica se há produto selecionado em alguma categoria de roupa sem tamanho.
  // Bolsa/acessório não exige tamanho.
  const missingSize = useMemo(() => {
    const cats: CategoryKey[] = ["blusa", "bottom", "vestido", "conjunto"];
    return cats.some((k) => selectedProducts[k] && !selectedSizes[k]);
  }, [selectedProducts, selectedSizes]);

  const getPreco = (produto: Produto | null) => {
    if (!produto) return 0;
    return produto.precoPromocional || produto.precoVenda;
  };

  const totalValue = Object.values(selectedProducts).reduce((sum, p) => sum + getPreco(p), 0);

  // Check if look is complete
  const isLookComplete = useMemo(() => {
    if (isFullOutfit) {
      return (selectedProducts.vestido || selectedProducts.conjunto) && selectedProducts.bolsa;
    }
    return selectedProducts.blusa && selectedProducts.bottom && selectedProducts.bolsa;
  }, [selectedProducts, isFullOutfit]);

  const prevIsLookComplete = useRef(false);

  useEffect(() => {
    if (isLookComplete && !prevIsLookComplete.current) {
      // Trigger heavy haptic on look complete
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
      
      // Show congratulations toast
      toast({
        title: "🎉 Look Completo!",
        description: "Parabéns! Seu look está montado e pronto para arrasar!",
      });
      
      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6']
      });
      
      // Second burst for more impact
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#a855f7', '#ec4899', '#f59e0b']
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#8b5cf6', '#f59e0b']
        });
      }, 150);
    }
    prevIsLookComplete.current = !!isLookComplete;
  }, [isLookComplete]);

  const clearAllSelections = () => {
    setSelectedItems({ blusa: null, bottom: null, bolsa: null, vestido: null, conjunto: null });
    setSelectedSizes({ blusa: "", bottom: "", bolsa: "", vestido: "", conjunto: "" });
    setSelectedColors({ blusa: "", bottom: "", bolsa: "", vestido: "", conjunto: "" });
  };

  // Haptic feedback utility
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const selectItem = (category: CategoryKey, productId: number, clearCategories?: CategoryKey[]) => {
    // Trigger haptic feedback
    triggerHaptic('medium');
    
    // Trigger animation
    setAnimatingItem(`${category}-${productId}`);
    setTimeout(() => setAnimatingItem(null), 400);

    const newItems = { ...selectedItems, [category]: productId };
    const newSizes = { ...selectedSizes, [category]: "" };
    const newColors = { ...selectedColors, [category]: "" };
    
    if (clearCategories) {
      clearCategories.forEach(cat => {
        newItems[cat] = null;
        newSizes[cat] = "";
        newColors[cat] = "";
      });
    }
    
    setSelectedItems(newItems);
    setSelectedSizes(newSizes);
    setSelectedColors(newColors);
  };

  const removeItem = (category: CategoryKey) => {
    setSelectedItems({ ...selectedItems, [category]: null });
    setSelectedSizes({ ...selectedSizes, [category]: "" });
    setSelectedColors({ ...selectedColors, [category]: "" });
  };

  const getImageForColor = (produto: Produto | null, cor: string) => {
    if (!produto) return produtoGenerico;
    // Contrato novo: cores[] traz a imagem própria por cor (mais confiável).
    if (cor && produto.cores && produto.cores.length > 0) {
      const corMatch = produto.cores.find((c) => c.cor === cor);
      const fromCor =
        corMatch?.imagem_full ||
        corMatch?.imagem_thumb ||
        corMatch?.imagens?.[0]?.url_full ||
        corMatch?.imagens?.[0]?.url_thumb ||
        null;
      if (fromCor) return fromCor;
    }
    if (!produto.imagens || produto.imagens.length === 0) return produtoGenerico;
    if (!cor) return produto.imagens[0] || produtoGenerico;
    
    const coresUnicas = [...new Set(produto.variants.map(v => v.cor))];
    const corIndex = coresUnicas.findIndex(c => c === cor);
    
    if (corIndex >= 0 && produto.imagens[corIndex]) {
      return produto.imagens[corIndex];
    }
    
    return produto.imagens[0] || produtoGenerico;
  };

  const handleWhatsApp = () => {
    const whatsappNumber = "5583986567915";

    // Identifica a primeira categoria com produto selecionado mas sem tamanho.
    // Bolsa não tem tamanho — é ignorada na validação.
    const categoriasComTamanho: CategoryKey[] = ["blusa", "bottom", "vestido", "conjunto"];
    const categoriaFaltante = categoriasComTamanho.find(
      (k) => selectedProducts[k] && !selectedSizes[k],
    );
    if (categoriaFaltante) {
      // Expande a categoria para garantir que o seletor de tamanho fique visível,
      // depois localiza o nó pelo data-attribute e dispara o guia (scroll + destaque + foco).
      setExpandedCategory(categoriaFaltante);
      // Aguarda um frame para a expansão renderizar antes de medir/rolar.
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-category="${categoriaFaltante}"]`,
        );
        sizeGuide.guideElement(el);
      });
      return;
    }
    
    const formatPreco = (produto: Produto) => formatBRL(getDisplayPrice(produto));

    const formatItem = (produto: Produto, size: string, color: string) => {
      const productLink = `${window.location.origin}/products/${produto.id}`;
      return `${produto.nome} | ${size}${color ? ` - ${color}` : ""} - ${formatPreco(produto)}\n🔗 ${productLink}`;
    };

    const items: string[] = [];
    if (selectedProducts.blusa) items.push(formatItem(selectedProducts.blusa, selectedSizes.blusa, selectedColors.blusa));
    if (selectedProducts.bottom) items.push(formatItem(selectedProducts.bottom, selectedSizes.bottom, selectedColors.bottom));
    if (selectedProducts.bolsa) items.push(`${selectedProducts.bolsa.nome}${selectedColors.bolsa ? ` - ${selectedColors.bolsa}` : ""} - ${formatPreco(selectedProducts.bolsa)}\n🔗 ${window.location.origin}/products/${selectedProducts.bolsa.id}`);
    if (selectedProducts.vestido) items.push(formatItem(selectedProducts.vestido, selectedSizes.vestido, selectedColors.vestido));
    if (selectedProducts.conjunto) items.push(formatItem(selectedProducts.conjunto, selectedSizes.conjunto, selectedColors.conjunto));
    
    const message = `✨ Olá!\nMontei meu look dos sonhos no Site Mariela:\n\n${items.join("\n\n")}\n\n💜 Total: ${formatBRL(totalValue)}\n\nPode me auxiliar na compra? 🤩`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isCategoryDisabled = (key: CategoryKey) => {
    if (key === 'blusa' || key === 'bottom') return isFullOutfit;
    if (key === 'vestido') return isFullOutfit && !selectedProducts.vestido;
    if (key === 'conjunto') return isFullOutfit && !selectedProducts.conjunto;
    return false;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {categoryConfig.map((cat, index) => (
          <div 
            key={cat.key}
            className="bg-card rounded-2xl border border-border p-4"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted category-skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted category-skeleton rounded w-24" />
                <div className="h-3 bg-muted category-skeleton rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative pb-28 lg:pb-0">
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-8">
        {/* Preview Side */}
        <div className="sticky top-24">
          <PreviewPanel
            selectedProducts={selectedProducts}
            selectedColors={selectedColors}
            selectedSizes={selectedSizes}
            totalValue={totalValue}
            hasAnySelection={hasAnySelection}
            onClear={clearAllSelections}
            onWhatsApp={handleWhatsApp}
            getImageForColor={getImageForColor}
            missingSize={missingSize}
          />
          {/* aria-live region (desktop) — anuncia falta de tamanho ao tentar enviar. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {sizeGuide.announceMessage}
          </p>
        </div>

        {/* Selection Side */}
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-foreground flex items-center justify-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              Selecione as Peças
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Escolha cada item para montar sua combinação
            </p>
          </div>

          {categoryConfig.map((cat) => (
            <CategorySection
              key={cat.key}
              category={cat}
              products={productsByCategory[cat.key]}
              selectedProduct={selectedProducts[cat.key]}
              selectedColor={selectedColors[cat.key]}
              selectedSize={selectedSizes[cat.key]}
              isExpanded={expandedCategory === cat.key}
              isDisabled={isCategoryDisabled(cat.key)}
              isLoading={loading}
              animatingItem={animatingItem}
              onToggle={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
              onSelect={(id) => selectItem(cat.key, id, cat.clearOnSelect)}
              onRemove={() => removeItem(cat.key)}
              onColorChange={(color) => {
                setSelectedColors({ ...selectedColors, [cat.key]: color });
                setSelectedSizes({ ...selectedSizes, [cat.key]: "" });
              }}
              onSizeChange={(size) => setSelectedSizes({ ...selectedSizes, [cat.key]: size })}
              getImageForColor={getImageForColor}
            />
          ))}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-2.5">
        {/* Mini Preview Bar */}
        {hasAnySelection && (
          <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-2xl p-3 border border-primary/20 animate-pop-in">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs text-muted-foreground shrink-0">Seu Look:</span>
              {Object.entries(selectedProducts).map(([key, product]) => {
                if (!product) return null;
                const color = selectedColors[key as CategoryKey];
                return (
                  <div 
                    key={key} 
                    className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 border-primary/30 bg-background animate-pop-in"
                  >
                    <img
                      src={getImageForColor(product, color)}
                      alt={product.nome}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => openPreview(e)}
                className="shrink-0 h-8 gap-1 text-xs text-primary"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver
              </Button>
            </div>
          </div>
        )}

        {/* Category List */}
        {categoryConfig.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            products={productsByCategory[cat.key]}
            selectedProduct={selectedProducts[cat.key]}
            selectedColor={selectedColors[cat.key]}
            selectedSize={selectedSizes[cat.key]}
            isExpanded={expandedCategory === cat.key}
            isDisabled={isCategoryDisabled(cat.key)}
            isLoading={loading}
            animatingItem={animatingItem}
            onToggle={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
            onSelect={(id) => selectItem(cat.key, id, cat.clearOnSelect)}
            onRemove={() => removeItem(cat.key)}
            onColorChange={(color) => {
              setSelectedColors({ ...selectedColors, [cat.key]: color });
              setSelectedSizes({ ...selectedSizes, [cat.key]: "" });
            }}
            onSizeChange={(size) => setSelectedSizes({ ...selectedSizes, [cat.key]: size })}
            getImageForColor={getImageForColor}
          />
        ))}
      </div>

      {/* Mobile Fixed Bottom Bar */}
      {hasAnySelection && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50 animate-bottom-sheet safe-area-bottom">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total do Look</p>
                <p className="text-lg sm:text-xl font-bold text-primary truncate">
                  {formatBRL(totalValue)}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => openPreview(e)}
                className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 touch-feedback"
              >
                <Eye className="h-5 w-5" />
              </Button>
              
              <Button
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0 h-10 sm:h-11 px-4 sm:px-6 touch-feedback"
                aria-label={missingSize ? "Selecione o tamanho" : "Quero garantir meu look — enviar via WhatsApp"}
              >
                <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">
                  {missingSize ? "Selecione o tamanho" : "Quero garantir meu look 💜"}
                </span>
                <span className="sm:hidden">
                  {missingSize ? "Selecione o tamanho" : "Quero meu look 💜"}
                </span>
              </Button>
            </div>
            <p aria-live="polite" aria-atomic="true" className="sr-only">
              {sizeGuide.announceMessage}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Preview Modal - Full Screen Bottom Sheet */}
      {showPreview && createPortal(
        <div
          className="lg:hidden fixed inset-0 z-[60] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-look-preview-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Fechar pré-visualização"
            className={cn(
              "absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default",
              isClosingPreview ? "animate-backdrop-out" : "animate-fade-in",
            )}
            onClick={closePreview}
          />
          
          {/* Bottom Sheet */}
          <div
            ref={sheetRef}
            tabIndex={-1}
            className={cn(
              "mt-auto bg-background rounded-t-3xl max-h-[90vh] overflow-hidden relative outline-none",
              isClosingPreview ? "animate-bottom-sheet-out" : "animate-bottom-sheet",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <h3
                id="mobile-look-preview-title"
                className="text-lg font-serif font-bold"
              >
                Pré-Visualização
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePreview}
                aria-label="Fechar pré-visualização"
                className="touch-feedback"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Content */}
            <div
              className="overflow-y-auto overscroll-contain max-h-[calc(90vh-120px)] p-4 pb-8"
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
            >
              <PreviewPanel
                selectedProducts={selectedProducts}
                selectedColors={selectedColors}
                selectedSizes={selectedSizes}
                totalValue={totalValue}
                hasAnySelection={hasAnySelection}
                onClear={clearAllSelections}
                onWhatsApp={handleWhatsApp}
                getImageForColor={getImageForColor}
                missingSize={missingSize}
                isMobile
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Category Section Component
interface CategorySectionProps {
  category: typeof categoryConfig[0];
  products: Produto[];
  selectedProduct: Produto | null;
  selectedColor: string;
  selectedSize: string;
  isExpanded: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  animatingItem: string | null;
  onToggle: () => void;
  onSelect: (id: number) => void;
  onRemove: () => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  getImageForColor: (produto: Produto | null, cor: string) => string;
}

const CategorySection = ({
  category,
  products,
  selectedProduct,
  selectedColor,
  selectedSize,
  isExpanded,
  isDisabled,
  isLoading,
  animatingItem,
  onToggle,
  onSelect,
  onRemove,
  onColorChange,
  onSizeChange,
  getImageForColor,
}: CategorySectionProps) => {
  const availableColors = selectedProduct
    ? [...new Set(selectedProduct.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))]
    : [];

  const availableSizes = selectedProduct && selectedColor
    ? [...new Set(selectedProduct.variants.filter(v => v.disponibilidade > 0 && v.cor === selectedColor).map(v => v.tamanho))]
    : [];

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300",
      isDisabled && "opacity-50 pointer-events-none",
      selectedProduct && "border-primary/40 bg-primary/5 shadow-sm"
    )}
    data-category={category.key}
    tabIndex={-1}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 text-left touch-feedback"
      >
        <span className="text-xl sm:text-2xl">{category.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">{category.label}</h3>
          {selectedProduct ? (
            <p className="text-xs sm:text-sm text-primary truncate">{selectedProduct.nome}</p>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">{products.length} disponíveis</p>
          )}
        </div>
        
        {selectedProduct && (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-border shrink-0 animate-pop-in">
            <img
              src={getImageForColor(selectedProduct, selectedColor)}
              alt={selectedProduct.nome}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className={cn(
          "shrink-0 transition-transform duration-200",
          isExpanded && "rotate-180"
        )}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 animate-fade-in">
          {/* Color & Size Selection for selected product */}
          {selectedProduct && (
            <div className="space-y-2.5 sm:space-y-3 bg-secondary/30 rounded-xl p-2.5 sm:p-3 animate-pop-in">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Cor & Tamanho</span>
                <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 sm:h-8 text-destructive text-xs touch-feedback">
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Remover
                </Button>
              </div>
              
              {availableColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((cor) => {
                    const colorHex = {
                      "Preto": "#000000",
                      "Branco": "#FFFFFF",
                      "Vermelho": "#DC2626",
                      "Azul": "#2563EB",
                      "Verde": "#16A34A",
                      "Amarelo": "#EAB308",
                      "Rosa": "#EC4899",
                      "Roxo": "#9333EA",
                      "Laranja": "#EA580C",
                      "Marrom": "#92400E",
                      "Cinza": "#6B7280",
                      "Bege": "#D4C5B9",
                      "Nude": "#E5D4C1",
                      "Caqui": "#BDB76B",
                      "Vinho": "#722F37",
                      "Mostarda": "#FFDB58",
                      "Off White": "#F8F8F8",
                      "Caramelo": "#C68642",
                    }[cor] || "#94A3B8";
                    
                    return (
                      <button
                        key={cor}
                        onClick={() => {
                          if ('vibrate' in navigator) navigator.vibrate(10);
                          onColorChange(cor);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all touch-feedback",
                          selectedColor === cor
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border hover:border-primary/50"
                        )}
                      >
                        <span 
                          className="w-4 h-4 rounded-full border-2 shadow-sm flex-shrink-0"
                          style={{ 
                            backgroundColor: colorHex,
                            borderColor: selectedColor === cor ? "currentColor" : "rgba(0,0,0,0.1)",
                            boxShadow: (cor === "Branco" || cor === "Off White") ? "inset 0 0 0 1px #E2E8F0" : "none"
                          }}
                        />
                        {cor}
                        {selectedColor === cor && <Check className="h-3.5 w-3.5 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {selectedColor && availableSizes.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {availableSizes.map((tamanho) => (
                    <button
                      key={tamanho}
                      data-size-option
                      onClick={() => {
                        if ('vibrate' in navigator) navigator.vibrate(10);
                        onSizeChange(tamanho);
                      }}
                      className={cn(
                        "min-w-[44px] h-11 px-3 rounded-lg text-sm font-semibold transition-all touch-feedback",
                        selectedSize === tamanho
                          ? "bg-primary text-primary-foreground animate-pop-in"
                          : "bg-background border border-border hover:border-primary/50"
                      )}
                    >
                      {tamanho}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product Grid with Loading */}
          {isLoading && products.length === 0 ? (
            <CategorySkeleton count={6} />
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {products.map((produto) => {
                const isAnimating = animatingItem === `${category.key}-${produto.id}`;
                return (
                  <button
                    key={produto.id}
                    onClick={() => onSelect(produto.id)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all touch-feedback",
                      selectedProduct?.id === produto.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-primary/30",
                      isAnimating && "animate-pop-in"
                    )}
                  >
                    <img
                      src={produto.imagens[0] || produtoGenerico}
                      alt={produto.nome}
                      className="w-full h-full object-cover transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = produtoGenerico;
                      }}
                    />
                    {selectedProduct?.id === produto.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-fade-in">
                        <Check className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground bg-primary rounded-full p-0.5 sm:p-1" />
                      </div>
                    )}
                    {produto.emPromocao && (
                      <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-destructive text-destructive-foreground text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full">
                        Oferta
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Preview Panel Component
interface PreviewPanelProps {
  selectedProducts: Record<CategoryKey, Produto | null>;
  selectedColors: SelectedColors;
  selectedSizes: SelectedSizes;
  totalValue: number;
  hasAnySelection: boolean;
  onClear: () => void;
  onWhatsApp: () => void;
  getImageForColor: (produto: Produto | null, cor: string) => string;
  isMobile?: boolean;
}

const PreviewPanel = ({
  selectedProducts,
  selectedColors,
  selectedSizes,
  totalValue,
  hasAnySelection,
  onClear,
  onWhatsApp,
  getImageForColor,
  isMobile = false,
}: PreviewPanelProps) => {
  const isFullOutfit = selectedProducts.vestido || selectedProducts.conjunto;
  
  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-primary/20 shadow-lg">
      {/* Look Preview Area - Improved layout */}
      <div className={cn(
        "relative mx-auto mb-4 rounded-2xl overflow-hidden bg-gradient-to-b from-secondary/20 via-background to-secondary/30",
        isMobile ? "aspect-square max-w-[320px]" : "aspect-[3/4] max-w-sm"
      )}>
        {/* Spotlight Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-radial from-primary/15 to-transparent" />
        
        {hasAnySelection ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
            {isFullOutfit ? (
              /* Full Outfit - Larger display */
              <div className="relative w-full h-full flex items-center justify-center animate-pop-in">
                <img
                  src={getImageForColor(
                    selectedProducts.vestido || selectedProducts.conjunto,
                    selectedProducts.vestido ? selectedColors.vestido : selectedColors.conjunto
                  )}
                  alt="Look"
                  className="w-[85%] h-[85%] object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              /* Layered Outfit - Tighter spacing, larger images */
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-0">
                {/* Top - More overlap */}
                <div className="flex-1 flex items-end justify-center w-full pb-0 z-10">
                  {selectedProducts.blusa ? (
                    <img
                      src={getImageForColor(selectedProducts.blusa, selectedColors.blusa)}
                      alt={selectedProducts.blusa.nome}
                      className="w-[75%] h-auto max-h-[55%] object-contain drop-shadow-xl animate-pop-in"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center bg-background/50">
                      <span className="text-3xl sm:text-4xl opacity-40">👚</span>
                    </div>
                  )}
                </div>
                
                {/* Bottom - Overlapping with top */}
                <div className="flex-1 flex items-start justify-center w-full pt-0 -mt-6 sm:-mt-8">
                  {selectedProducts.bottom ? (
                    <img
                      src={getImageForColor(selectedProducts.bottom, selectedColors.bottom)}
                      alt={selectedProducts.bottom.nome}
                      className="w-[70%] h-auto max-h-[55%] object-contain drop-shadow-xl animate-pop-in"
                    />
                  ) : (
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center bg-background/50">
                      <span className="text-2xl sm:text-3xl opacity-40">👖</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bolsa Floating - Better positioned */}
            {selectedProducts.bolsa && (
              <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 w-14 h-14 sm:w-18 sm:h-18 bg-background/95 backdrop-blur-sm rounded-xl p-1.5 shadow-xl border-2 border-primary/30 animate-pop-in">
                <img
                  src={getImageForColor(selectedProducts.bolsa, selectedColors.bolsa)}
                  alt={selectedProducts.bolsa.nome}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
              <div className="absolute inset-3 rounded-full bg-background/90 flex items-center justify-center shadow-inner">
                <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-primary animate-bounce" />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-serif font-bold text-foreground text-center">
              Monte Seu Look
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-[200px]">
              Selecione as peças para visualizar seu look completo
            </p>
          </div>
        )}
      </div>

      {/* Selected Items Summary */}
      {hasAnySelection && (
        <div className="space-y-2.5 sm:space-y-3 animate-fade-in">
          <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <ShoppingBag className="h-4 w-4" />
            Resumo do Look
          </h4>
          
          <div className="space-y-1.5 sm:space-y-2 text-sm">
            {Object.entries(selectedProducts).map(([key, product]) => {
              if (!product) return null;
              const color = selectedColors[key as CategoryKey];
              const size = selectedSizes[key as CategoryKey];
              const price = product.precoPromocional || product.precoVenda;
              
              return (
                <div key={key} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2 animate-pop-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={getImageForColor(product, color)}
                      alt={product.nome}
                      className="w-7 h-7 sm:w-8 sm:h-8 object-cover rounded"
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-xs sm:text-sm">{product.nome}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {color && `${color}`}{color && size && " • "}{size && `Tam. ${size}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-primary shrink-0 text-xs sm:text-sm">
                    {formatBRL(price)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 sm:pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm sm:text-base">Total:</span>
              <span className="text-xl sm:text-2xl font-bold text-primary">
                {formatBRL(totalValue)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1 sm:pt-2">
            <Button variant="outline" onClick={onClear} className="flex-1 h-10 sm:h-11 touch-feedback">
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button onClick={onWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 sm:h-11 touch-feedback">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};