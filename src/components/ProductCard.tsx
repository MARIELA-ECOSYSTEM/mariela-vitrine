import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Produto } from "@/data/products";
import { Link } from "react-router-dom";
import produtoGenerico from "@/assets/produto-generico.png";
import { ProductImageSkeleton } from "./ProductImageSkeleton";
import { cn } from "@/lib/utils";
import { getProductPathWithSearch, getProductShareMessage, getTrackedProductUrl } from "@/lib/productLinks";
import { formatBRL, getDisplayPrice, getPromoInfo } from "@/lib/formatters";
import { getPublicProductBadge } from "@/services/productInsightsService";

// Mapa de cores para as amostras visuais
const COLOR_MAP: Record<string, string> = {
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
};

interface ProductCardProps {
  produto: Produto;
  layoutMode?: "grade" | "lista";
}

export const ProductCard = ({ produto, layoutMode = "grade" }: ProductCardProps) => {
  const publicBadge = getPublicProductBadge(produto);
  // Obter a primeira cor disponível para pré-seleção
  const primeiraCorDisponivel = useMemo(() => {
    const variantDisponivel = produto.variants.find(v => v.disponibilidade > 0);
    return variantDisponivel?.cor || "";
  }, [produto.variants]);

  const [corSelecionada, setCorSelecionada] = useState(primeiraCorDisponivel);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const whatsappNumber = "5583986567915";
  const isAcessorio = produto.categoria === "bolsas" || produto.categoria === "acessorios";
  
  // Obter cores disponíveis (não depende de tamanho)
  const coresDisponiveis = useMemo(() => {
    const cores = new Set<string>();
    produto.variants
      .filter(v => v.disponibilidade > 0)
      .forEach(v => cores.add(v.cor));
    return Array.from(cores);
  }, [produto.variants]);

  // Obter tamanhos disponíveis (depende da cor selecionada)
  const tamanhosDisponiveis = useMemo(() => {
    if (!corSelecionada) return [];
    const tamanhos = new Set<string>();
    produto.variants
      .filter(v => v.disponibilidade > 0 && v.cor === corSelecionada)
      .forEach(v => tamanhos.add(v.tamanho));
    return Array.from(tamanhos);
  }, [produto.variants, corSelecionada]);

  // Mapa de cores para tamanhos disponíveis (para exibição resumida)
  const coresTamanhosMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    produto.variants
      .filter(v => v.disponibilidade > 0)
      .forEach(v => {
        if (!map[v.cor]) map[v.cor] = [];
        if (!map[v.cor].includes(v.tamanho)) map[v.cor].push(v.tamanho);
      });
    return map;
  }, [produto.variants]);

  // Obter imagem da cor selecionada ou do índice atual
  const imagemAtual = useMemo(() => {
    if (corSelecionada) {
      const varianteIndex = produto.variants.findIndex(v => v.cor === corSelecionada);
      return produto.imagens[varianteIndex >= 0 ? varianteIndex : 0] || produto.imagens[0] || produtoGenerico;
    }
    return produto.imagens[currentImageIndex] || produto.imagens[0] || produtoGenerico;
  }, [produto, corSelecionada, currentImageIndex]);

  // Sincronizar cor com imagem
  const corDaImagemAtual = useMemo(() => {
    if (produto.variants[currentImageIndex]) {
      return produto.variants[currentImageIndex].cor;
    }
    return "";
  }, [produto.variants, currentImageIndex]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideDirection('right');
    const newIndex = currentImageIndex === 0 ? produto.imagens.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    // Selecionar a cor da nova imagem para mostrar os tamanhos
    if (produto.variants[newIndex]) {
      setCorSelecionada(produto.variants[newIndex].cor);
      setTamanhoSelecionado("");
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideDirection('left');
    const newIndex = currentImageIndex === produto.imagens.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    // Selecionar a cor da nova imagem para mostrar os tamanhos
    if (produto.variants[newIndex]) {
      setCorSelecionada(produto.variants[newIndex].cor);
      setTamanhoSelecionado("");
    }
  };

  const handleSelectColor = (cor: string) => {
    const varianteIndex = produto.variants.findIndex(v => v.cor === cor);
    if (varianteIndex >= 0 && varianteIndex < produto.imagens.length) {
      setSlideDirection(varianteIndex > currentImageIndex ? 'left' : 'right');
      setCurrentImageIndex(varianteIndex);
    }
    setCorSelecionada(cor);
    setTamanhoSelecionado("");
  };

  const promo = getPromoInfo(produto);
  const precoFormatado = formatBRL(getDisplayPrice(produto));
  const precoOriginalFormatado = promo.isPromo ? formatBRL(promo.precoVenda) : undefined;

  const handleAdicionarCarrinho = () => {
    const tamanhoParaAdicionar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaAdicionar = corSelecionada;
    
    if (!isAcessorio && !corParaAdicionar) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaAdicionar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }
    
    addToCart(produto, tamanhoParaAdicionar);
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} (${corParaAdicionar} - ${tamanhoParaAdicionar}) foi adicionado ao carrinho.`,
    });
    setTamanhoSelecionado("");
    setCorSelecionada("");
  };

  const handleWhatsApp = () => {
    const tamanhoParaUsar = isAcessorio ? "U" : tamanhoSelecionado;
    
    if (!isAcessorio && !corSelecionada) {
      toast({
        title: "Selecione uma cor",
        description: "Por favor, escolha a cor antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    if (!tamanhoParaUsar) {
      toast({
        title: "Selecione um tamanho",
        description: "Por favor, escolha o tamanho antes de enviar pelo WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    const productLink = getTrackedProductUrl(produto);
    const message = getProductShareMessage(produto, {
      cor: corSelecionada || undefined,
      tamanho: tamanhoParaUsar || undefined,
      url: productLink,
    });
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Layout em lista (horizontal)
  if (layoutMode === "lista") {
    return (
      <Card className="card-shine group overflow-hidden border-border hover:border-primary/40 transition-all duration-300 hover:shadow-hover hover:translate-x-1 bg-card animate-fade-in">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <Link to={getProductPathWithSearch(produto)} className="relative overflow-hidden md:w-64 aspect-square md:aspect-auto bg-muted block">
              <ProductImageSkeleton 
                src={imagemAtual} 
                alt={produto.nome}
                className="transition-transform duration-700 group-hover:scale-110"
                slideDirection={slideDirection}
              />
              {/* Navigation Arrows */}
              {produto.imagens.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {promo.isPromo && (
                  <Badge variant="destructive" className="shadow-sm">
                    {promo.badgeLabel}
                  </Badge>
                )}
                {publicBadge && (
                  <Badge title={publicBadge.description} className="bg-background/90 text-foreground border border-primary/30 shadow-sm backdrop-blur-sm">
                    {publicBadge.label}
                  </Badge>
                )}
              </div>
            </Link>
            
            <div className="p-5 flex-1 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-lg mb-2 text-foreground">
                  {produto.nome}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {produto.descricao}
                </p>
                <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground mb-4">
                  <span className="font-medium">Cores disponíveis:</span>
                  {coresDisponiveis.map((cor, index) => (
                    <span key={cor}>
                      {cor}{index < coresDisponiveis.length - 1 ? " |" : ""}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {promo.isPromo && precoOriginalFormatado && (
                    <p className="text-sm text-muted-foreground line-through">
                      {precoOriginalFormatado}
                    </p>
                  )}
                  <p className={`text-2xl font-semibold ${promo.isPromo ? 'text-destructive' : 'text-primary'}`}>
                    {precoFormatado}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 md:min-w-[200px]">
                {!isAcessorio && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Selecione a Cor:</p>
                      <div className="flex flex-wrap gap-1">
                        {coresDisponiveis.map((cor) => {
                          const isSelected = corSelecionada === cor;
                          const isHighlighted = !corSelecionada && corDaImagemAtual === cor;
                          return (
                            <Button
                              key={cor}
                              variant={isSelected || isHighlighted ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSelectColor(cor)}
                              className={cn(
                                "text-xs h-7 gap-1.5",
                                isHighlighted && !isSelected && "ring-2 ring-primary"
                              )}
                            >
                              <span 
                                className="w-3 h-3 rounded-full border border-background shadow-sm flex-shrink-0"
                                style={{ 
                                  backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                                  boxShadow: cor === "Branco" || cor === "Off White" ? "0 0 0 1px #E2E8F0" : "none"
                                }}
                              />
                              {cor}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {corSelecionada && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-1">
                          {tamanhosDisponiveis.map((tamanho) => (
                            <Button
                              key={tamanho}
                              variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTamanhoSelecionado(tamanho)}
                              className="text-xs h-7"
                            >
                              {tamanho}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAdicionarCarrinho}
                  className="gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  onClick={handleWhatsApp}
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Layout em grade (vertical - padrão)
  return (
    <Card className="card-shine group overflow-hidden border-border hover:border-primary/40 transition-all duration-500 hover:shadow-hover hover:-translate-y-1 sm:hover:-translate-y-2 bg-card flex flex-col animate-fade-in relative">
      <CardContent className="p-0 flex flex-col flex-1">
        <Link to={getProductPathWithSearch(produto)} className="relative overflow-hidden aspect-square bg-muted block flex-shrink-0">
          <ProductImageSkeleton 
            src={imagemAtual} 
            alt={produto.nome}
            className="transition-all duration-700 group-hover:scale-105 sm:group-hover:scale-110 group-hover:brightness-110"
            slideDirection={slideDirection}
          />
          {/* Navigation Arrows - sempre visíveis em mobile */}
          {produto.imagens.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-background/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background active:scale-95"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-background/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background active:scale-95"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </>
          )}
          {/* Efeito de brilho diagonal */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none hidden sm:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </div>
          <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2">
            {promo.isPromo && (
              <Badge
                variant="destructive"
                className="shadow-sm text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5"
              >
                {promo.badgeLabel}
              </Badge>
            )}
            {publicBadge && (
              <Badge title={publicBadge.description} className="bg-background/90 text-foreground border border-primary/30 shadow-sm backdrop-blur-sm text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5">
                {publicBadge.label}
              </Badge>
            )}
          </div>
          {/* Image indicators */}
          {produto.imagens.length > 1 && (
            <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1">
              {produto.imagens.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all",
                    idx === currentImageIndex ? "bg-primary w-2 sm:w-3" : "bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          )}
        </Link>
        
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col gap-1.5 sm:gap-3 flex-1">
          <div>
            <h3 className="font-medium text-sm sm:text-base md:text-lg mb-1 sm:mb-2 text-foreground line-clamp-1">
              {produto.nome}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2 min-h-[1rem] sm:min-h-[2.5rem] hidden xs:block">
              {produto.descricao}
            </p>
            {/* Desktop: cores com tamanhos disponíveis */}
            <div className="hidden sm:flex flex-col gap-1 text-xs text-muted-foreground">
              {coresDisponiveis.slice(0, 3).map((cor, index) => (
                <div key={cor} className="flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-border shadow-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                      boxShadow: cor === "Branco" || cor === "Off White" ? "0 0 0 1px #E2E8F0" : "none"
                    }}
                  />
                  <span className="font-medium text-foreground">{cor}</span>
                  <span className="text-muted-foreground">
                    {coresTamanhosMap[cor]?.join(" · ") || ""}
                  </span>
                  {index < Math.min(coresDisponiveis.length, 3) - 1 && (
                    <span className="text-border ml-auto">|</span>
                  )}
                </div>
              ))}
              {coresDisponiveis.length > 3 && (
                <span className="text-primary text-[11px]">+{coresDisponiveis.length - 3} cores</span>
              )}
            </div>
            {/* Mobile: cores com tamanhos */}
            <div className="flex sm:hidden flex-col gap-1 mt-1.5">
              {coresDisponiveis.slice(0, 2).map((cor) => {
                const isSelected = corSelecionada === cor;
                const isHighlighted = !corSelecionada && corDaImagemAtual === cor;
                const tamanhosDaCor = coresTamanhosMap[cor] || [];
                return (
                  <button
                    key={cor}
                    onClick={() => handleSelectColor(cor)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isHighlighted
                        ? "bg-primary/20 border border-primary text-foreground"
                        : "bg-secondary border border-border text-foreground"
                    )}
                  >
                    <span 
                      className="w-3 h-3 rounded-full border border-background/50 shadow-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                        boxShadow: cor === "Branco" || cor === "Off White" ? "0 0 0 1px #E2E8F0" : "none"
                      }}
                    />
                    <span className="font-semibold">{cor}</span>
                    <span className={cn(
                      "text-[10px]",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {tamanhosDaCor.join(" · ")}
                    </span>
                  </button>
                );
              })}
              {coresDisponiveis.length > 2 && (
                <span className="text-[10px] text-primary font-medium">+{coresDisponiveis.length - 2} cores</span>
              )}
            </div>
            
            {/* Mobile: tamanhos maiores */}
            {corSelecionada && (
              <div className="flex sm:hidden flex-wrap gap-1.5 mt-1.5 animate-fade-in">
                {tamanhosDisponiveis.map((tamanho) => (
                  <button
                    key={tamanho}
                    onClick={() => setTamanhoSelecionado(tamanho)}
                    className={cn(
                      "min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold transition-all",
                      tamanhoSelecionado === tamanho
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-border text-foreground"
                    )}
                  >
                    {tamanho}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {promo.isPromo && precoOriginalFormatado && (
                <p className="text-[10px] sm:text-sm text-muted-foreground line-through">
                  {precoOriginalFormatado}
                </p>
              )}
              <p className={`text-base sm:text-lg md:text-xl font-semibold ${promo.isPromo ? 'text-destructive' : 'text-primary'}`}>
                {precoFormatado}
              </p>
            </div>
            
            {/* Desktop: Seleção de cor e tamanho */}
            {!isAcessorio && (
              <div className="hidden sm:block min-h-[4.5rem]">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cor:</p>
                  <div className="flex flex-wrap gap-1 max-h-[3.5rem] overflow-y-auto">
                    {coresDisponiveis.map((cor) => {
                      const isSelected = corSelecionada === cor;
                      const isHighlighted = !corSelecionada && corDaImagemAtual === cor;
                      return (
                        <Button
                          key={cor}
                          variant={isSelected || isHighlighted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectColor(cor)}
                          className={cn(
                            "text-xs h-7 gap-1.5 px-2.5",
                            isHighlighted && !isSelected && "ring-2 ring-primary"
                          )}
                        >
                          <span 
                            className="w-3 h-3 rounded-full border border-background shadow-sm flex-shrink-0"
                            style={{ 
                              backgroundColor: COLOR_MAP[cor] || "#94A3B8",
                              boxShadow: cor === "Branco" || cor === "Off White" ? "0 0 0 1px #E2E8F0" : "none"
                            }}
                          />
                          {cor}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {corSelecionada && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tam:</p>
                    <div className="flex flex-wrap gap-1">
                      {tamanhosDisponiveis.map((tamanho) => (
                        <Button
                          key={tamanho}
                          variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTamanhoSelecionado(tamanho)}
                          className="text-xs h-7 px-2.5"
                        >
                          {tamanho}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex gap-1 sm:gap-2 mt-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAdicionarCarrinho}
                className="flex-1 gap-1 sm:gap-2 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Carrinho</span>
              </Button>
              <Button
                size="sm"
                onClick={handleWhatsApp}
                className="flex-1 gap-1 sm:gap-2 h-7 sm:h-9 text-[10px] sm:text-sm px-1.5 sm:px-3"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">WhatsApp</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
