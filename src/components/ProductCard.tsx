import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Produto } from "@/data/products";
import { Link, useNavigate } from "react-router-dom";
import produtoGenerico from "@/assets/produto-generico.png";
import { ProductImageSkeleton } from "./ProductImageSkeleton";
import { cn } from "@/lib/utils";
import { getProductPathWithSearch, getProductShareMessage, getTrackedProductUrl } from "@/lib/productLinks";
import { formatBRL, getDisplayPrice, getPromoInfo } from "@/lib/formatters";
import { getPublicProductBadge } from "@/services/productInsightsService";
import { trackWhatsappClick } from "@/services/vitrineTrackingService";
import { sortSizes, isValidSize } from "@/lib/sizeUtils";
import { useSizeSelectionGuide } from "@/hooks/useSizeSelectionGuide";

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

export const ProductCard = ({ produto: produtoProp, layoutMode = "grade" }: ProductCardProps) => {
  // Cards usam EXCLUSIVAMENTE os dados vindos da listagem `/vitrine-api/produtos`.
  // Não há fallback por `/produto/{id}` — isso evita N+1 requests.
  const produto = produtoProp;

  const publicBadge = getPublicProductBadge(produto);

  // Lista de cores: SOMENTE dados reais vindos da API em `produto.cores`.
  // Sem fallback "Única" — se a API não enviar cores, o card não exibe seletor.
  const coresList = useMemo(() => {
    if (!produto.cores || produto.cores.length === 0) return [];
    const mapped = produto.cores.map((c) => ({
      produto_cor_id: c.produto_cor_id,
      cor: c.cor,
      // Ordenar tamanhos naturalmente (PP, P, M, G, GG, XG... → numéricos)
      // e descartar legados ("U", "Única") que nunca devem aparecer no card.
      tamanhos: sortSizes(
        c.tamanhos
          .filter((t) => t.disponibilidade > 0 && isValidSize(t.tamanho))
          .map((t) => t.tamanho),
      ),
      imagem_full: c.imagem_full,
      imagem_thumb: c.imagem_thumb,
    }));

    // Log em DEV quando produto tem cores mas nenhum tamanho válido — facilita
    // diagnóstico de payloads inconsistentes vindos da API. Silencioso em produção.
    if (import.meta.env.DEV) {
      const todosVazios = mapped.length > 0 && mapped.every((c) => c.tamanhos.length === 0);
      if (todosVazios) {
        console.debug("[ProductCard] Produto com cores mas sem tamanhos válidos:", {
          produto_id: produto.produtoId || produto.id,
          nome: produto.nome,
          cores: produto.cores,
        });
      }
    }

    return mapped;
  }, [produto.cores]);

  const primeiraCorDisponivel = coresList[0]?.cor || "";
  const primeiraCorIdDisponivel = coresList[0]?.produto_cor_id || "";

  const [corSelecionada, setCorSelecionada] = useState(primeiraCorDisponivel);
  const [corSelecionadaId, setCorSelecionadaId] = useState(primeiraCorIdDisponivel);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Hook compartilhado para guiar o usuário até o seletor de tamanho do card
  // (mesma UX do ProductDetail e Monte seu Look). Sem toast agressivo.
  const sizeGuide = useSizeSelectionGuide();

  /**
   * O card pode renderizar até 3 containers de tamanho no DOM (lista, grade
   * mobile, grade desktop) — apenas um é visível por vez via Tailwind.
   * Este callback ref escolhe o container atualmente visível para o hook.
   */
  const setSizeSectionRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    // `offsetParent === null` indica que o elemento está oculto (display:none).
    if (el.offsetParent !== null) {
      sizeGuide.sectionRef.current = el;
    }
  };
  
  const whatsappNumber = "5583986567915";
  const isAcessorio = produto.categoria === "bolsas" || produto.categoria === "acessorios";

  const corSelecionadaObj = useMemo(
    () => coresList.find((c) => c.produto_cor_id === corSelecionadaId) || coresList.find((c) => c.cor === corSelecionada),
    [coresList, corSelecionadaId, corSelecionada],
  );

  const coresDisponiveis = useMemo(() => coresList.map((c) => c.cor), [coresList]);
  // Mapa canônico cor → tamanhos disponíveis. Fonte única de verdade para
  // garantir que os tamanhos exibidos sempre correspondem à cor selecionada.
  const coresTamanhosMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    coresList.forEach((c) => { map[c.cor] = c.tamanhos; });
    return map;
  }, [coresList]);
  // Tamanhos disponíveis derivados estritamente da cor selecionada via mapa.
  // Evita qualquer divergência entre `corSelecionadaObj` e o conjunto canônico.
  const tamanhosDisponiveis = useMemo(
    () => (corSelecionada && coresTamanhosMap[corSelecionada]) || [],
    [corSelecionada, coresTamanhosMap],
  );

  // União de TODOS os tamanhos do produto (em qualquer cor), ordenada.
  // Usada para renderizar chips desabilitados de tamanhos indisponíveis
  // na cor atual — sem inventar dados, apenas espelhando a oferta real.
  const todosTamanhos = useMemo(() => {
    const set = new Set<string>();
    coresList.forEach((c) => c.tamanhos.forEach((t) => set.add(t)));
    return sortSizes(Array.from(set));
  }, [coresList]);

  // Filtra apenas URLs de imagem não vazias/válidas (string não-vazia).
  // Evita índices "fantasmas" no carrossel quando a API envia entradas vazias.
  const imagensValidas = useMemo(
    () => (produto.imagens || []).filter((u): u is string => typeof u === "string" && u.trim().length > 0),
    [produto.imagens],
  );

  // Mapa bidirecional cor ↔ imagem usando `coresList` (fonte canônica por cor).
  // `produto.variants` tem várias entradas por cor (uma por tamanho) e não é
  // 1:1 com `produto.imagens`, então não serve para sincronizar cor↔imagem.
  const imagemPorCor = useMemo(() => {
    const map: Record<string, string> = {};
    coresList.forEach((c) => {
      const url = (c.imagem_full || c.imagem_thumb || "").trim();
      if (url) map[c.cor] = url;
    });
    return map;
  }, [coresList]);

  const corPorImagem = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(imagemPorCor).forEach(([cor, url]) => {
      if (url && !map[url]) map[url] = cor;
    });
    return map;
  }, [imagemPorCor]);

  // Mapa pré-computado URL → índice para lookup O(1) (evita indexOf em handlers).
  const indicePorUrl = useMemo(() => {
    const map: Record<string, number> = {};
    imagensValidas.forEach((url, idx) => {
      if (!(url in map)) map[url] = idx;
    });
    return map;
  }, [imagensValidas]);

  // Imagem atual: índice do carrossel é a fonte primária (setas sempre funcionam).
  // Fallback: imagem da cor selecionada → primeira imagem válida → genérico.
  const imagemAtual = useMemo(() => {
    const imgIndice = imagensValidas[currentImageIndex];
    if (imgIndice) return imgIndice;
    if (corSelecionadaObj) {
      const imgCor = (corSelecionadaObj.imagem_full || corSelecionadaObj.imagem_thumb || "").trim();
      if (imgCor) return imgCor;
    }
    return imagensValidas[0] || produtoGenerico;
  }, [imagensValidas, currentImageIndex, corSelecionadaObj]);

  // Cor vinculada à imagem atual (via mapa cor↔imagem).
  const corDaImagemAtual = useMemo(() => {
    const url = imagensValidas[currentImageIndex];
    return (url && corPorImagem[url]) || "";
  }, [imagensValidas, currentImageIndex, corPorImagem]);

  // Helper: ao trocar de cor, mantém o tamanho se ainda for válido para a
  // nova cor; caso contrário, seleciona automaticamente o primeiro tamanho
  // válido daquela cor (ou limpa, se a cor não tiver tamanhos).
  const reconcileSizeForColor = (cor: string) => {
    const tamanhosDaCor = coresTamanhosMap[cor] || [];
    if (tamanhoSelecionado && tamanhosDaCor.includes(tamanhoSelecionado)) return;
    setTamanhoSelecionado(tamanhosDaCor[0] || "");
  };

  // Helper: ao trocar imagem via setas, sincroniza a cor selecionada
  // se a nova imagem pertence a alguma cor conhecida.
  const syncColorFromImageIndex = (newIndex: number) => {
    const url = imagensValidas[newIndex];
    const cor = url ? corPorImagem[url] : "";
    if (cor && cor !== corSelecionada) {
      const corItem = coresList.find((c) => c.cor === cor);
      setCorSelecionada(cor);
      setCorSelecionadaId(corItem?.produto_cor_id || cor);
      reconcileSizeForColor(cor);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagensValidas.length <= 1) return;
    setSlideDirection('right');
    const newIndex = currentImageIndex === 0 ? imagensValidas.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    syncColorFromImageIndex(newIndex);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagensValidas.length <= 1) return;
    setSlideDirection('left');
    const newIndex = currentImageIndex === imagensValidas.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    syncColorFromImageIndex(newIndex);
  };

  const handleSelectColor = (cor: string) => {
    const corItem = coresList.find((c) => c.cor === cor);
    // Localiza a imagem dessa cor com lookup O(1).
    const urlAlvo = imagemPorCor[cor];
    const imgIndex = urlAlvo ? indicePorUrl[urlAlvo] : undefined;
    if (typeof imgIndex === "number" && imgIndex !== currentImageIndex) {
      setSlideDirection(imgIndex > currentImageIndex ? 'left' : 'right');
      setCurrentImageIndex(imgIndex);
    }
    setCorSelecionada(cor);
    setCorSelecionadaId(corItem?.produto_cor_id || cor);
    reconcileSizeForColor(cor);
  };

  const promo = getPromoInfo(produto);
  const precoFormatado = formatBRL(getDisplayPrice(produto));
  const precoOriginalFormatado = promo.isPromo ? formatBRL(promo.precoVenda) : undefined;

  /**
   * Estratégia híbrida (acordada com o usuário):
   * - Se o card tem variantes inline (cores disponíveis) E o usuário ainda não
   *   selecionou cor/tamanho, guia inline (scroll + destaque + foco no 1º tamanho).
   * - Se o card NÃO tem variantes inline (ex.: produto sem cores carregadas),
   *   navega para a página de detalhe para o usuário escolher lá.
   * Nunca mostra toast vermelho de erro.
   */
  const guiarSelecaoOuNavegar = (): boolean => {
    if (isAcessorio) return true; // acessórios usam tamanho "U"
    const temVariantesInline = coresList.length > 0;
    if (!temVariantesInline) {
      navigate(getProductPathWithSearch(produto));
      return false;
    }
    sizeGuide.guide();
    return false;
  };

  const handleAdicionarCarrinho = () => {
    const tamanhoParaAdicionar = isAcessorio ? "U" : tamanhoSelecionado;
    const corParaAdicionar = corSelecionada;

    if (!isAcessorio && (!corParaAdicionar || !tamanhoParaAdicionar)) {
      guiarSelecaoOuNavegar();
      return;
    }
    
    addToCart(produto, tamanhoParaAdicionar);
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} (${corParaAdicionar} - ${tamanhoParaAdicionar}) foi adicionado ao carrinho.`,
    });
    setTamanhoSelecionado("");
    // Mantém a cor selecionada para preservar a imagem da cor escolhida no card
  };

  const handleWhatsApp = () => {
    const tamanhoParaUsar = isAcessorio ? "U" : tamanhoSelecionado;

    if (!isAcessorio && (!corSelecionada || !tamanhoParaUsar)) {
      guiarSelecaoOuNavegar();
      return;
    }
    
    const productLink = getTrackedProductUrl(produto);
    const message = getProductShareMessage(produto, {
      cor: corSelecionada || undefined,
      tamanho: tamanhoParaUsar || undefined,
      url: productLink,
    });
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    try {
      trackWhatsappClick(produto.produtoId || produto.id, "catalogo");
    } catch {
      /* nunca bloquear o clique */
    }
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
              {imagensValidas.length > 1 && (
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
                      <div
                        ref={setSizeSectionRef}
                        tabIndex={-1}
                        className={cn(
                          "scroll-mt-24 rounded-md transition-all duration-300",
                          sizeGuide.highlight &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background p-2 -m-2 animate-pulse"
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-1">
                          {todosTamanhos.map((tamanho) => {
                            const disponivel = tamanhosDisponiveis.includes(tamanho);
                            return (
                              <Button
                                key={tamanho}
                                data-size-option
                                variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                                size="sm"
                                onClick={() => disponivel && setTamanhoSelecionado(tamanho)}
                                disabled={!disponivel}
                                aria-disabled={!disponivel}
                                title={disponivel ? tamanho : `${tamanho} indisponível nesta cor`}
                                className={cn(
                                  "text-xs h-7",
                                  !disponivel && "line-through opacity-50 cursor-not-allowed",
                                )}
                              >
                                {tamanho}
                              </Button>
                            );
                          })}
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
          {imagensValidas.length > 1 && (
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
          {imagensValidas.length > 1 && (
            <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1">
              {imagensValidas.map((_, idx) => (
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
              <div
                ref={setSizeSectionRef}
                tabIndex={-1}
                className={cn(
                  "flex sm:hidden flex-wrap gap-1.5 mt-1.5 animate-fade-in scroll-mt-24 rounded-md transition-all duration-300",
                  sizeGuide.highlight &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background p-1.5 -m-1.5 animate-pulse"
                )}
              >
                {todosTamanhos.map((tamanho) => {
                  const disponivel = tamanhosDisponiveis.includes(tamanho);
                  return (
                    <button
                      key={tamanho}
                      type="button"
                      data-size-option
                      onClick={() => disponivel && setTamanhoSelecionado(tamanho)}
                      disabled={!disponivel}
                      aria-disabled={!disponivel}
                      title={disponivel ? tamanho : `${tamanho} indisponível nesta cor`}
                      className={cn(
                        "min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold transition-all",
                        tamanhoSelecionado === tamanho
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary border border-border text-foreground",
                        !disponivel && "line-through opacity-50 cursor-not-allowed",
                      )}
                    >
                      {tamanho}
                    </button>
                  );
                })}
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
                  <div
                    ref={setSizeSectionRef}
                    tabIndex={-1}
                    className={cn(
                      "mt-2 scroll-mt-24 rounded-md transition-all duration-300",
                      sizeGuide.highlight &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background p-2 -m-2 animate-pulse"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tam:</p>
                    <div className="flex flex-wrap gap-1">
                      {todosTamanhos.map((tamanho) => {
                        const disponivel = tamanhosDisponiveis.includes(tamanho);
                        return (
                          <Button
                            key={tamanho}
                            data-size-option
                            variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                            size="sm"
                            onClick={() => disponivel && setTamanhoSelecionado(tamanho)}
                            disabled={!disponivel}
                            aria-disabled={!disponivel}
                            title={disponivel ? tamanho : `${tamanho} indisponível nesta cor`}
                            className={cn(
                              "text-xs h-7 px-2.5",
                              !disponivel && "line-through opacity-50 cursor-not-allowed",
                            )}
                          >
                            {tamanho}
                          </Button>
                        );
                      })}
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
