import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ShoppingBag, X, RefreshCw, Info } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent } from "@/components/ui/card";
import { Mannequin3D } from "@/components/Mannequin3D";
import { ProductSelectWithThumbnail } from "@/components/ProductSelectWithThumbnail";
import { SizeFilterBadges } from "@/components/SizeFilterBadges";
import confetti from "canvas-confetti";
import { formatBRL, getDisplayPrice } from "@/lib/formatters";

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

interface SizeFilters {
  vestido: string;
  conjunto: string;
  blusa: string;
  bottom: string;
  bolsa: string;
}

interface LastAction {
  type: "add" | "remove";
  category: string;
}

export const VirtualMannequin = () => {
  const { produtos } = useProducts();
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  const [sizeFilters, setSizeFilters] = useState<SizeFilters>({
    vestido: "",
    conjunto: "",
    blusa: "",
    bottom: "",
    bolsa: "",
  });

  const blusas = useMemo(() => produtos.filter(p => p.categoria === "blusas"), [produtos]);
  const bottoms = useMemo(() => produtos.filter(p => p.categoria === "shorts" || p.categoria === "calças" || p.categoria === "saias" || p.categoria === "short-saias"), [produtos]);
  const bolsas = useMemo(() => produtos.filter(p => p.categoria === "bolsas" || p.categoria === "acessorios"), [produtos]);
  const vestidos = useMemo(() => produtos.filter(p => p.categoria === "vestidos"), [produtos]);
  const conjuntos = useMemo(() => produtos.filter(p => p.categoria === "conjuntos"), [produtos]);

  // Produtos filtrados por tamanho
  const filterBySize = (products: typeof produtos, sizeFilter: string) => {
    if (!sizeFilter) return products;
    return products.filter(p => 
      p.variants.some(v => v.disponibilidade > 0 && v.tamanho === sizeFilter)
    );
  };

  const vestidosFiltrados = useMemo(() => filterBySize(vestidos, sizeFilters.vestido), [vestidos, sizeFilters.vestido]);
  const conjuntosFiltrados = useMemo(() => filterBySize(conjuntos, sizeFilters.conjunto), [conjuntos, sizeFilters.conjunto]);
  const blusasFiltradas = useMemo(() => filterBySize(blusas, sizeFilters.blusa), [blusas, sizeFilters.blusa]);
  const bottomsFiltrados = useMemo(() => filterBySize(bottoms, sizeFilters.bottom), [bottoms, sizeFilters.bottom]);
  const bolsasFiltradas = useMemo(() => filterBySize(bolsas, sizeFilters.bolsa), [bolsas, sizeFilters.bolsa]);

  // Trigger animation for add/remove actions
  const triggerAction = (type: "add" | "remove", category: string) => {
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    setLastAction({ type, category });
    actionTimeoutRef.current = setTimeout(() => {
      setLastAction(null);
    }, 700);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  const clearAllSelections = () => {
    setSelectedItems({
      blusa: null,
      bottom: null,
      bolsa: null,
      vestido: null,
      conjunto: null,
    });
    setSelectedSizes({
      blusa: "",
      bottom: "",
      bolsa: "",
      vestido: "",
      conjunto: "",
    });
    setSelectedColors({
      blusa: "",
      bottom: "",
      bolsa: "",
      vestido: "",
      conjunto: "",
    });
    setLastAction(null);
  };

  const clearCategory = (category: keyof SelectedItems) => {
    triggerAction("remove", category);
    setTimeout(() => {
      setSelectedItems({ ...selectedItems, [category]: null });
      setSelectedSizes({ ...selectedSizes, [category]: "" });
      setSelectedColors({ ...selectedColors, [category]: "" });
    }, 300);
  };

  const selectItem = (category: keyof SelectedItems, value: number, clearedCategories?: (keyof SelectedItems)[]) => {
    triggerAction("add", category);
    const newItems = { ...selectedItems, [category]: value };
    const newSizes = { ...selectedSizes, [category]: "" };
    const newColors = { ...selectedColors, [category]: "" };
    
    if (clearedCategories) {
      clearedCategories.forEach(cat => {
        newItems[cat] = null;
        newSizes[cat] = "";
        newColors[cat] = "";
      });
    }
    
    setSelectedItems(newItems);
    setSelectedSizes(newSizes);
    setSelectedColors(newColors);
  };

  // IMPORTANTE: Buscar produtos na lista COMPLETA (não filtrada) para garantir que sempre encontre o produto selecionado
  const selectedBlusa = selectedItems.blusa !== null ? produtos.find(p => p.id === selectedItems.blusa) || null : null;
  const selectedBottom = selectedItems.bottom !== null ? produtos.find(p => p.id === selectedItems.bottom) || null : null;
  const selectedBolsa = selectedItems.bolsa !== null ? produtos.find(p => p.id === selectedItems.bolsa) || null : null;
  const selectedVestido = selectedItems.vestido !== null ? produtos.find(p => p.id === selectedItems.vestido) || null : null;
  const selectedConjunto = selectedItems.conjunto !== null ? produtos.find(p => p.id === selectedItems.conjunto) || null : null;

  const isFullOutfit = selectedVestido !== null || selectedConjunto !== null;

  // Check if look is complete and trigger confetti
  const isLookComplete = useMemo(() => {
    if (isFullOutfit) {
      // Vestido ou conjunto + bolsa = look completo
      return (selectedVestido || selectedConjunto) && selectedBolsa;
    }
    // Blusa + bottom + bolsa = look completo
    return selectedBlusa && selectedBottom && selectedBolsa;
  }, [selectedBlusa, selectedBottom, selectedBolsa, selectedVestido, selectedConjunto, isFullOutfit]);

  const prevIsLookComplete = useRef(false);

  useEffect(() => {
    if (isLookComplete && !prevIsLookComplete.current) {
      // Trigger confetti when look becomes complete
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981']
      });
    }
    prevIsLookComplete.current = !!isLookComplete;
  }, [isLookComplete]);

  const getPreco = (produto: typeof produtos[0] | null | undefined) => {
    if (!produto) return 0;
    return produto.precoPromocional || produto.precoVenda;
  };

  const totalValue = getPreco(selectedBlusa) + getPreco(selectedBottom) + getPreco(selectedBolsa) + getPreco(selectedVestido) + getPreco(selectedConjunto);

  const handleWhatsApp = () => {
    const whatsappNumber = "5583987373396";
    
    if (selectedBlusa && !selectedSizes.blusa) {
      alert("Por favor, selecione o tamanho da blusa antes de enviar.");
      return;
    }
    if (selectedBottom && !selectedSizes.bottom) {
      alert("Por favor, selecione o tamanho da peça inferior antes de enviar.");
      return;
    }
    if (selectedVestido && !selectedSizes.vestido) {
      alert("Por favor, selecione o tamanho do vestido antes de enviar.");
      return;
    }
    if (selectedConjunto && !selectedSizes.conjunto) {
      alert("Por favor, selecione o tamanho do conjunto antes de enviar.");
      return;
    }
    
    const formatPreco = (produto: typeof produtos[0]) => formatBRL(getDisplayPrice(produto));

    const blusaText = selectedBlusa ? `${selectedBlusa.nome} | ${selectedSizes.blusa}${selectedColors.blusa ? ` - ${selectedColors.blusa}` : ""} - ${formatPreco(selectedBlusa)}` : "";
    const bottomText = selectedBottom ? `${selectedBottom.nome} | ${selectedSizes.bottom}${selectedColors.bottom ? ` - ${selectedColors.bottom}` : ""} - ${formatPreco(selectedBottom)}` : "";
    const bolsaText = selectedBolsa ? `${selectedBolsa.nome} | U${selectedColors.bolsa ? ` - ${selectedColors.bolsa}` : ""} - ${formatPreco(selectedBolsa)}` : "";
    const vestidoText = selectedVestido ? `${selectedVestido.nome} | ${selectedSizes.vestido}${selectedColors.vestido ? ` - ${selectedColors.vestido}` : ""} - ${formatPreco(selectedVestido)}` : "";
    const conjuntoText = selectedConjunto ? `${selectedConjunto.nome} | ${selectedSizes.conjunto}${selectedColors.conjunto ? ` - ${selectedColors.conjunto}` : ""} - ${formatPreco(selectedConjunto)}` : "";
    
    const items = [blusaText, bottomText, bolsaText, vestidoText, conjuntoText].filter(Boolean).join("\n\n");
    
    const message = `✨ Olá!\nMontei meu look dos sonhos no Site Mariela e quero garantir essas peças:\n\n${items}\n\n💜 Total: ${formatBRL(totalValue)}\n\nPode me auxiliar na finalização da compra, por favor? 🤩`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const hasAnySelection = selectedItems.blusa !== null || selectedItems.bottom !== null || selectedItems.bolsa !== null || selectedItems.vestido !== null || selectedItems.conjunto !== null;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Lado Esquerdo: Manequim */}
      <div className="order-2 lg:order-1">
        <Card className="border-primary/20 bg-gradient-to-br from-background to-secondary/20 sticky top-24">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                Pré-Visualização do Look
              </h3>
              <p className="text-sm text-muted-foreground">
                Veja como as peças ficam juntas
              </p>
            </div>
            
            <div className="transition-all duration-500 ease-out relative">
              <Mannequin3D
                selectedBlusa={selectedBlusa}
                selectedBottom={selectedBottom}
                selectedBolsa={selectedBolsa}
                selectedVestido={selectedVestido}
                selectedConjunto={selectedConjunto}
                selectedColors={selectedColors}
                lastAction={lastAction}
              />
              
              {/* Botão de Reset no Preview - Canto esquerdo inferior */}
              {hasAnySelection && (
                <div className="absolute bottom-4 left-4 z-10">
                  <Button 
                    onClick={clearAllSelections} 
                    variant="outline" 
                    size="sm"
                    className="bg-background/90 backdrop-blur-sm shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-all hover:scale-105 border-primary/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Resetar Look
                  </Button>
                </div>
              )}
            </div>

            {/* Resumo do Look (Controles removidos, apenas Resumo mantido) */}
            {hasAnySelection && (
              <div className="mt-6 space-y-4 animate-fade-in">

                {/* Resumo do Look */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Resumo do Look
                  </h4>
                  <div className="space-y-2">
                    {selectedBlusa && (
                      <div className="flex flex-col gap-0.5 text-sm animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Blusa:</span>
                          <span className="font-medium text-foreground">{selectedBlusa.nome}</span>
                        </div>
                        {(selectedColors.blusa || selectedSizes.blusa) && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            {selectedColors.blusa && <span>Cor: {selectedColors.blusa}</span>}
                            {selectedSizes.blusa && <span>Tam: {selectedSizes.blusa}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedBottom && (
                      <div className="flex flex-col gap-0.5 text-sm animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {selectedBottom.categoria === "calças" ? "Calça:" : 
                             selectedBottom.categoria === "saias" ? "Saia:" :
                             selectedBottom.categoria === "short-saias" ? "Short-Saia:" : "Short:"}
                          </span>
                          <span className="font-medium text-foreground">{selectedBottom.nome}</span>
                        </div>
                        {(selectedColors.bottom || selectedSizes.bottom) && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            {selectedColors.bottom && <span>Cor: {selectedColors.bottom}</span>}
                            {selectedSizes.bottom && <span>Tam: {selectedSizes.bottom}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedVestido && (
                      <div className="flex flex-col gap-0.5 text-sm animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Vestido:</span>
                          <span className="font-medium text-foreground">{selectedVestido.nome}</span>
                        </div>
                        {(selectedColors.vestido || selectedSizes.vestido) && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            {selectedColors.vestido && <span>Cor: {selectedColors.vestido}</span>}
                            {selectedSizes.vestido && <span>Tam: {selectedSizes.vestido}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedConjunto && (
                      <div className="flex flex-col gap-0.5 text-sm animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Conjunto:</span>
                          <span className="font-medium text-foreground">{selectedConjunto.nome}</span>
                        </div>
                        {(selectedColors.conjunto || selectedSizes.conjunto) && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            {selectedColors.conjunto && <span>Cor: {selectedColors.conjunto}</span>}
                            {selectedSizes.conjunto && <span>Tam: {selectedSizes.conjunto}</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedBolsa && (
                      <div className="flex flex-col gap-0.5 text-sm animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {selectedBolsa.categoria === "bolsas" ? "Bolsa:" : "Acessório:"}
                          </span>
                          <span className="font-medium text-foreground">{selectedBolsa.nome}</span>
                        </div>
                        {selectedColors.bolsa && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            <span>Cor: {selectedColors.bolsa}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Total:</span>
                      <span className="text-2xl font-bold text-primary animate-scale-in">
                        {formatBRL(totalValue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={clearAllSelections} variant="outline" className="flex-1 transition-all hover:scale-105">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                  <Button onClick={handleWhatsApp} disabled={!hasAnySelection} className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lado Direito: Seleção de Peças */}
      <div className="order-1 lg:order-2">
        <Card className="border-primary/20 bg-gradient-to-br from-background to-secondary/20">
          <CardContent className="p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  Selecione as Peças
                </h2>
              </div>
              <p className="text-muted-foreground">
                Escolha cada item para montar sua combinação
              </p>
            </div>

            <div className="space-y-6">
              {/* Vestidos */}
              <div className="space-y-3 transition-all duration-300">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <span className="text-2xl">👗</span> Vestidos
                </label>
                <SizeFilterBadges
                  products={vestidos}
                  selectedSize={sizeFilters.vestido}
                  onSizeSelect={(size) => setSizeFilters({ ...sizeFilters, vestido: size })}
                  disabled={selectedVestido !== null && (selectedColors.vestido !== "" || selectedSizes.vestido !== "")}
                />
                <div className="flex gap-2">
                  <ProductSelectWithThumbnail
                    produtos={vestidosFiltrados}
                    value={selectedItems.vestido}
                    onValueChange={(value) => {
                      selectItem('vestido', parseInt(value), ['blusa', 'bottom', 'conjunto']);
                    }}
                    placeholder="Selecione um vestido"
                    disabled={isFullOutfit && !selectedVestido}
                  />
                  {selectedVestido && (
                    <Button variant="outline" size="icon" onClick={() => clearCategory('vestido')} className="transition-all hover:scale-110">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedVestido && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(selectedVestido.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))].map((cor) => {
                          const imagemIndex = selectedVestido.variants.findIndex(v => v.cor === cor);
                          const imagemPreview = selectedVestido.imagens[imagemIndex >= 0 ? imagemIndex : 0] || selectedVestido.imagens[0];
                          return (
                            <div key={cor} className="relative group">
                              <Button
                                variant={selectedColors.vestido === cor ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectedColors({ ...selectedColors, vestido: cor });
                                  setSelectedSizes({ ...selectedSizes, vestido: "" });
                                }}
                                className="transition-all hover:scale-105"
                              >
                                {cor}
                              </Button>
                              {/* Preview on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                <div className="bg-background border border-border rounded-lg shadow-xl p-1">
                                  <img
                                    src={imagemPreview}
                                    alt={`${selectedVestido.nome} - ${cor}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedColors.vestido && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(selectedVestido.variants.filter(v => v.disponibilidade > 0 && v.cor === selectedColors.vestido).map(v => v.tamanho))].map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={selectedSizes.vestido === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSizes({ ...selectedSizes, vestido: tamanho })}
                              className="transition-all hover:scale-105"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conjuntos */}
              <div className="space-y-3 transition-all duration-300">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <span className="text-2xl">👔</span> Conjuntos
                </label>
                <SizeFilterBadges
                  products={conjuntos}
                  selectedSize={sizeFilters.conjunto}
                  onSizeSelect={(size) => setSizeFilters({ ...sizeFilters, conjunto: size })}
                  disabled={selectedConjunto !== null && (selectedColors.conjunto !== "" || selectedSizes.conjunto !== "")}
                />
                <div className="flex gap-2">
                  <ProductSelectWithThumbnail
                    produtos={conjuntosFiltrados}
                    value={selectedItems.conjunto}
                    onValueChange={(value) => {
                      selectItem('conjunto', parseInt(value), ['blusa', 'bottom', 'vestido']);
                    }}
                    placeholder="Selecione um conjunto"
                    disabled={isFullOutfit && !selectedConjunto}
                  />
                  {selectedConjunto && (
                    <Button variant="outline" size="icon" onClick={() => clearCategory('conjunto')} className="transition-all hover:scale-110">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedConjunto && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(selectedConjunto.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))].map((cor) => {
                          const imagemIndex = selectedConjunto.variants.findIndex(v => v.cor === cor);
                          const imagemPreview = selectedConjunto.imagens[imagemIndex >= 0 ? imagemIndex : 0] || selectedConjunto.imagens[0];
                          return (
                            <div key={cor} className="relative group">
                              <Button
                                variant={selectedColors.conjunto === cor ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectedColors({ ...selectedColors, conjunto: cor });
                                  setSelectedSizes({ ...selectedSizes, conjunto: "" });
                                }}
                                className="transition-all hover:scale-105"
                              >
                                {cor}
                              </Button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                <div className="bg-background border border-border rounded-lg shadow-xl p-1">
                                  <img
                                    src={imagemPreview}
                                    alt={`${selectedConjunto.nome} - ${cor}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedColors.conjunto && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(selectedConjunto.variants.filter(v => v.disponibilidade > 0 && v.cor === selectedColors.conjunto).map(v => v.tamanho))].map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={selectedSizes.conjunto === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSizes({ ...selectedSizes, conjunto: tamanho })}
                              className="transition-all hover:scale-105"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Blusas */}
              <div className="space-y-3 transition-all duration-300">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <span className="text-2xl">👚</span> Blusas
                </label>
                <SizeFilterBadges
                  products={blusas}
                  selectedSize={sizeFilters.blusa}
                  onSizeSelect={(size) => setSizeFilters({ ...sizeFilters, blusa: size })}
                  disabled={selectedBlusa !== null && (selectedColors.blusa !== "" || selectedSizes.blusa !== "")}
                />
                <div className="flex gap-2">
                  <ProductSelectWithThumbnail
                    produtos={blusasFiltradas}
                    value={selectedItems.blusa}
                    onValueChange={(value) => {
                      selectItem('blusa', parseInt(value));
                    }}
                    placeholder="Selecione uma blusa"
                    disabled={isFullOutfit}
                  />
                  {selectedBlusa && (
                    <Button variant="outline" size="icon" onClick={() => clearCategory('blusa')} className="transition-all hover:scale-110">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedBlusa && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(selectedBlusa.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))].map((cor) => {
                          const imagemIndex = selectedBlusa.variants.findIndex(v => v.cor === cor);
                          const imagemPreview = selectedBlusa.imagens[imagemIndex >= 0 ? imagemIndex : 0] || selectedBlusa.imagens[0];
                          return (
                            <div key={cor} className="relative group">
                              <Button
                                variant={selectedColors.blusa === cor ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectedColors({ ...selectedColors, blusa: cor });
                                  setSelectedSizes({ ...selectedSizes, blusa: "" });
                                }}
                                className="transition-all hover:scale-105"
                              >
                                {cor}
                              </Button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                <div className="bg-background border border-border rounded-lg shadow-xl p-1">
                                  <img
                                    src={imagemPreview}
                                    alt={`${selectedBlusa.nome} - ${cor}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedColors.blusa && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(selectedBlusa.variants.filter(v => v.disponibilidade > 0 && v.cor === selectedColors.blusa).map(v => v.tamanho))].map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={selectedSizes.blusa === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSizes({ ...selectedSizes, blusa: tamanho })}
                              className="transition-all hover:scale-105"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Calças/Shorts */}
              <div className="space-y-3 transition-all duration-300">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <span className="text-2xl">👖</span> Calças, Shorts, Saias & Short-Saias
                </label>
                <SizeFilterBadges
                  products={bottoms}
                  selectedSize={sizeFilters.bottom}
                  onSizeSelect={(size) => setSizeFilters({ ...sizeFilters, bottom: size })}
                  disabled={selectedBottom !== null && (selectedColors.bottom !== "" || selectedSizes.bottom !== "")}
                />
                <div className="flex gap-2">
                  <ProductSelectWithThumbnail
                    produtos={bottomsFiltrados}
                    value={selectedItems.bottom}
                    onValueChange={(value) => {
                      selectItem('bottom', parseInt(value));
                    }}
                    placeholder="Selecione uma peça inferior"
                    disabled={isFullOutfit}
                  />
                  {selectedBottom && (
                    <Button variant="outline" size="icon" onClick={() => clearCategory('bottom')} className="transition-all hover:scale-110">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedBottom && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(selectedBottom.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))].map((cor) => {
                          const imagemIndex = selectedBottom.variants.findIndex(v => v.cor === cor);
                          const imagemPreview = selectedBottom.imagens[imagemIndex >= 0 ? imagemIndex : 0] || selectedBottom.imagens[0];
                          return (
                            <div key={cor} className="relative group">
                              <Button
                                variant={selectedColors.bottom === cor ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setSelectedColors({ ...selectedColors, bottom: cor });
                                  setSelectedSizes({ ...selectedSizes, bottom: "" });
                                }}
                                className="transition-all hover:scale-105"
                              >
                                {cor}
                              </Button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                <div className="bg-background border border-border rounded-lg shadow-xl p-1">
                                  <img
                                    src={imagemPreview}
                                    alt={`${selectedBottom.nome} - ${cor}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedColors.bottom && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(selectedBottom.variants.filter(v => v.disponibilidade > 0 && v.cor === selectedColors.bottom).map(v => v.tamanho))].map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={selectedSizes.bottom === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedSizes({ ...selectedSizes, bottom: tamanho })}
                              className="transition-all hover:scale-105"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bolsas */}
              <div className="space-y-3 transition-all duration-300">
                <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                  <span className="text-2xl">👜</span> Bolsas & Acessórios
                </label>
                <SizeFilterBadges
                  products={bolsas}
                  selectedSize={sizeFilters.bolsa}
                  onSizeSelect={(size) => setSizeFilters({ ...sizeFilters, bolsa: size })}
                  disabled={selectedBolsa !== null && selectedColors.bolsa !== ""}
                />
                <div className="flex gap-2">
                  <ProductSelectWithThumbnail
                    produtos={bolsasFiltradas}
                    value={selectedItems.bolsa}
                    onValueChange={(value) => {
                      selectItem('bolsa', parseInt(value));
                    }}
                    placeholder="Selecione bolsa ou acessório"
                  />
                  {selectedBolsa && (
                    <Button variant="outline" size="icon" onClick={() => clearCategory('bolsa')} className="transition-all hover:scale-110">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedBolsa && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(selectedBolsa.variants.filter(v => v.disponibilidade > 0).map(v => v.cor))].map((cor) => {
                          const imagemIndex = selectedBolsa.variants.findIndex(v => v.cor === cor);
                          const imagemPreview = selectedBolsa.imagens[imagemIndex >= 0 ? imagemIndex : 0] || selectedBolsa.imagens[0];
                          return (
                            <div key={cor} className="relative group">
                              <Button
                                variant={selectedColors.bolsa === cor ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedColors({ ...selectedColors, bolsa: cor })}
                                className="transition-all hover:scale-105"
                              >
                                {cor}
                              </Button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                <div className="bg-background border border-border rounded-lg shadow-xl p-1">
                                  <img
                                    src={imagemPreview}
                                    alt={`${selectedBolsa.nome} - ${cor}`}
                                    className="w-20 h-20 object-cover rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
