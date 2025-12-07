import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  ShoppingBag, 
  X, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Check,
  Sparkles,
  Eye
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { Produto } from "@/data/products";
import confetti from "canvas-confetti";
import produtoGenerico from "@/assets/produto-generico.png";
import { cn } from "@/lib/utils";

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
  const isLoading = loading && produtos.length === 0; // Só mostra loading se não tem produtos
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
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
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981']
      });
    }
    prevIsLookComplete.current = !!isLookComplete;
  }, [isLookComplete]);

  const clearAllSelections = () => {
    setSelectedItems({ blusa: null, bottom: null, bolsa: null, vestido: null, conjunto: null });
    setSelectedSizes({ blusa: "", bottom: "", bolsa: "", vestido: "", conjunto: "" });
    setSelectedColors({ blusa: "", bottom: "", bolsa: "", vestido: "", conjunto: "" });
  };

  const selectItem = (category: CategoryKey, productId: number, clearCategories?: CategoryKey[]) => {
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
    const whatsappNumber = "5583987373396";
    
    const validateSizes = () => {
      if (selectedProducts.blusa && !selectedSizes.blusa) return "Selecione o tamanho da blusa";
      if (selectedProducts.bottom && !selectedSizes.bottom) return "Selecione o tamanho da peça inferior";
      if (selectedProducts.vestido && !selectedSizes.vestido) return "Selecione o tamanho do vestido";
      if (selectedProducts.conjunto && !selectedSizes.conjunto) return "Selecione o tamanho do conjunto";
      return null;
    };

    const error = validateSizes();
    if (error) {
      alert(error);
      return;
    }
    
    const formatPreco = (produto: Produto) => {
      const preco = produto.precoPromocional || produto.precoVenda;
      return `R$ ${preco.toFixed(2).replace('.', ',')}`;
    };

    const items: string[] = [];
    if (selectedProducts.blusa) items.push(`${selectedProducts.blusa.nome} | ${selectedSizes.blusa}${selectedColors.blusa ? ` - ${selectedColors.blusa}` : ""} - ${formatPreco(selectedProducts.blusa)}`);
    if (selectedProducts.bottom) items.push(`${selectedProducts.bottom.nome} | ${selectedSizes.bottom}${selectedColors.bottom ? ` - ${selectedColors.bottom}` : ""} - ${formatPreco(selectedProducts.bottom)}`);
    if (selectedProducts.bolsa) items.push(`${selectedProducts.bolsa.nome}${selectedColors.bolsa ? ` - ${selectedColors.bolsa}` : ""} - ${formatPreco(selectedProducts.bolsa)}`);
    if (selectedProducts.vestido) items.push(`${selectedProducts.vestido.nome} | ${selectedSizes.vestido}${selectedColors.vestido ? ` - ${selectedColors.vestido}` : ""} - ${formatPreco(selectedProducts.vestido)}`);
    if (selectedProducts.conjunto) items.push(`${selectedProducts.conjunto.nome} | ${selectedSizes.conjunto}${selectedColors.conjunto ? ` - ${selectedColors.conjunto}` : ""} - ${formatPreco(selectedProducts.conjunto)}`);
    
    const message = `✨ Olá!\nMontei meu look dos sonhos no Site Mariela:\n\n${items.join("\n\n")}\n\n💜 Total: R$ ${totalValue.toFixed(2).replace('.', ',')}\n\nPode me auxiliar na compra? 🤩`;
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getCategoryCount = (key: CategoryKey) => {
    return productsByCategory[key].length;
  };

  const isCategoryDisabled = (key: CategoryKey) => {
    if (key === 'blusa' || key === 'bottom') return isFullOutfit;
    if (key === 'vestido') return isFullOutfit && !selectedProducts.vestido;
    if (key === 'conjunto') return isFullOutfit && !selectedProducts.conjunto;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-muted-foreground font-medium">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="relative pb-24 lg:pb-0">
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
          />
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
      <div className="lg:hidden space-y-3">
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50 animate-slide-up safe-area-bottom">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total do Look</p>
              <p className="text-xl font-bold text-primary">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPreview(true)}
              className="shrink-0"
            >
              <Eye className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={handleWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Preview Modal */}
      {showPreview && (
        <div className="lg:hidden fixed inset-0 bg-background/95 backdrop-blur-lg z-50 overflow-auto animate-fade-in">
          <div className="p-4 pb-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif font-bold">Pré-Visualização</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <PreviewPanel
              selectedProducts={selectedProducts}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              totalValue={totalValue}
              hasAnySelection={hasAnySelection}
              onClear={clearAllSelections}
              onWhatsApp={handleWhatsApp}
              getImageForColor={getImageForColor}
            />
          </div>
        </div>
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
      selectedProduct && "border-primary/30 bg-primary/5"
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <span className="text-2xl">{category.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{category.label}</h3>
          {selectedProduct ? (
            <p className="text-sm text-primary truncate">{selectedProduct.nome}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{products.length} disponíveis</p>
          )}
        </div>
        
        {selectedProduct && (
          <img
            src={getImageForColor(selectedProduct, selectedColor)}
            alt={selectedProduct.nome}
            className="w-12 h-12 object-cover rounded-lg border border-border"
          />
        )}
        
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Color & Size Selection for selected product */}
          {selectedProduct && (
            <div className="space-y-3 bg-secondary/30 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cor & Tamanho</span>
                <Button variant="ghost" size="sm" onClick={onRemove} className="h-8 text-destructive">
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
              
              {availableColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((cor) => (
                    <button
                      key={cor}
                      onClick={() => onColorChange(cor)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        selectedColor === cor
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:border-primary/50"
                      )}
                    >
                      {cor}
                      {selectedColor === cor && <Check className="h-3 w-3 ml-1 inline" />}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedColor && availableSizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((tamanho) => (
                    <button
                      key={tamanho}
                      onClick={() => onSizeChange(tamanho)}
                      className={cn(
                        "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                        selectedSize === tamanho
                          ? "bg-primary text-primary-foreground"
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

          {/* Product Grid */}
          <div className="grid grid-cols-3 gap-2">
            {products.map((produto) => (
              <button
                key={produto.id}
                onClick={() => onSelect(produto.id)}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                  selectedProduct?.id === produto.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/30"
                )}
              >
                <img
                  src={produto.imagens[0] || produtoGenerico}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = produtoGenerico;
                  }}
                />
                {selectedProduct?.id === produto.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-primary-foreground bg-primary rounded-full p-1" />
                  </div>
                )}
                {produto.emPromocao && (
                  <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    Oferta
                  </div>
                )}
              </button>
            ))}
          </div>
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
}: PreviewPanelProps) => {
  const isFullOutfit = selectedProducts.vestido || selectedProducts.conjunto;
  
  return (
    <div className="bg-gradient-to-br from-secondary/30 via-background to-secondary/50 rounded-3xl p-4 lg:p-6 border border-border">
      {/* Look Preview Area */}
      <div className="relative aspect-[3/4] max-w-xs mx-auto mb-6 rounded-2xl overflow-hidden bg-gradient-to-b from-secondary/40 to-secondary/70">
        {/* Spotlight Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 bg-gradient-radial from-primary/10 to-transparent" />
        
        {hasAnySelection ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {isFullOutfit ? (
              /* Full Outfit */
              <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
                <img
                  src={getImageForColor(
                    selectedProducts.vestido || selectedProducts.conjunto,
                    selectedProducts.vestido ? selectedColors.vestido : selectedColors.conjunto
                  )}
                  alt="Look"
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              /* Layered Outfit */
              <div className="relative w-full h-full">
                {/* Top */}
                <div className="absolute top-0 left-0 right-0 h-1/2 flex items-center justify-center p-2">
                  {selectedProducts.blusa ? (
                    <img
                      src={getImageForColor(selectedProducts.blusa, selectedColors.blusa)}
                      alt={selectedProducts.blusa.nome}
                      className="max-w-full max-h-full object-contain drop-shadow-xl animate-fade-in"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <span className="text-3xl opacity-30">👚</span>
                    </div>
                  )}
                </div>
                
                {/* Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-start justify-center p-2">
                  {selectedProducts.bottom ? (
                    <img
                      src={getImageForColor(selectedProducts.bottom, selectedColors.bottom)}
                      alt={selectedProducts.bottom.nome}
                      className="max-w-full max-h-full object-contain drop-shadow-xl animate-fade-in"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mt-4">
                      <span className="text-2xl opacity-30">👖</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bolsa Floating */}
            {selectedProducts.bolsa && (
              <div className="absolute right-2 top-1/3 w-16 h-16 bg-background/90 backdrop-blur rounded-xl p-1 shadow-lg border border-primary/20 animate-fade-in">
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
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-background/80 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-bounce" />
              </div>
            </div>
            <p className="text-lg font-serif font-semibold text-foreground text-center">
              Monte Seu Look
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Selecione as peças acima para começar
            </p>
          </div>
        )}
      </div>

      {/* Selected Items Summary */}
      {hasAnySelection && (
        <div className="space-y-3 animate-fade-in">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Resumo do Look
          </h4>
          
          <div className="space-y-2 text-sm">
            {Object.entries(selectedProducts).map(([key, product]) => {
              if (!product) return null;
              const color = selectedColors[key as CategoryKey];
              const size = selectedSizes[key as CategoryKey];
              const price = product.precoPromocional || product.precoVenda;
              
              return (
                <div key={key} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={getImageForColor(product, color)}
                      alt={product.nome}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{product.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {color && `${color}`}{color && size && " • "}{size && `Tam. ${size}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-primary shrink-0">
                    R$ {price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClear} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button onClick={onWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
