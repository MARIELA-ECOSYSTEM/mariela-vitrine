import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Produto } from "@/data/products";
import { Link, useNavigate } from "react-router-dom";
import { getProductImageByColor, PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/productImage";
import { ProductImageSkeleton, preloadImage, preloadImagesPrioritized } from "./ProductImageSkeleton";
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
   * Marcamos cada container com `data-size-section` e a função
   * `resolveVisibleSection` (chamada NO MOMENTO do guide) escolhe o que está
   * realmente visível, evitando race entre múltiplos callback refs.
   */
  const cardRootRef = useRef<HTMLDivElement | null>(null);
  const resolveVisibleSection = useCallback((): HTMLElement | null => {
    const root = cardRootRef.current ?? document;
    const scope = root instanceof HTMLElement ? root : document;
    const sections = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-size-section]"),
    );
    const visible = sections.find((s: HTMLElement) => {
      const style = window.getComputedStyle(s);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (s.offsetParent === null && style.position !== "fixed") return false;
      const r = s.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return visible ?? null;
  }, []);
  
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

  // ============================================================
  // Preload inteligente de vizinhos (next/prev + cor adjacente)
  // ------------------------------------------------------------
  // Em hover/focus do card pré-carregamos a próxima e a anterior
  // imagem do carrossel + a imagem da próxima cor da lista. Isso
  // torna a troca por seta ou por cor instantânea (cache do
  // ProductImageSkeleton) sem provocar fetch massivo.
  //
  // Throttle por 500ms para evitar flood quando o ponteiro passa
  // rapidamente sobre vários cards.
  // ============================================================
  const lastPreloadAtRef = useRef<number>(0);
  // Handle do último preload em curso — permite cancelar download em
  // background quando o usuário sai do card antes da imagem chegar.
  const lastPreloadHandleRef = useRef<{ cancel: () => void } | null>(null);

  const preloadNeighbors = useCallback(() => {
    const now = Date.now();
    if (now - lastPreloadAtRef.current < 500) return;
    lastPreloadAtRef.current = now;

    const targets: string[] = [];
    if (imagensValidas.length > 1) {
      const nextIdx = (currentImageIndex + 1) % imagensValidas.length;
      const prevIdx = (currentImageIndex - 1 + imagensValidas.length) % imagensValidas.length;
      const nextUrl = imagensValidas[nextIdx];
      const prevUrl = imagensValidas[prevIdx];
      if (nextUrl) targets.push(nextUrl);
      if (prevUrl) targets.push(prevUrl);
    }
    // Próxima cor da lista (ciclo) — antecipa troca de variação.
    if (coresList.length > 1) {
      const corIdx = Math.max(0, coresList.findIndex((c) => c.cor === corSelecionada));
      const nextCor = coresList[(corIdx + 1) % coresList.length];
      const url = (nextCor?.imagem_full || nextCor?.imagem_thumb || "").trim();
      if (url) targets.push(url);
    }
    if (targets.length === 0) return;
    // Cancela qualquer preload anterior ainda em curso (rate-limit já
    // impede flood, mas cobertura adicional não custa nada).
    lastPreloadHandleRef.current?.cancel();
    lastPreloadHandleRef.current = preloadImagesPrioritized(targets, 2);
  }, [imagensValidas, currentImageIndex, coresList, corSelecionada]);

  /**
   * Cancela preloads em background quando o usuário sai do card antes
   * que as imagens cheguem. Economiza banda em listas longas onde o
   * mouse passa rapidamente por vários cards.
   */
  const cancelPreloadNeighbors = useCallback(() => {
    lastPreloadHandleRef.current?.cancel();
    lastPreloadHandleRef.current = null;
  }, []);

  /**
   * Preload focado em UMA direção: dispara somente a imagem na direção
   * provável do clique (next ou prev). Usado em hover/touchstart das
   * setas do card para reduzir delay perceptível ao trocar rapidamente.
   */
  const preloadOnArrowHover = useCallback((direction: "next" | "prev") => {
    if (imagensValidas.length <= 1) return;
    const targetIdx = direction === "next"
      ? (currentImageIndex + 1) % imagensValidas.length
      : (currentImageIndex - 1 + imagensValidas.length) % imagensValidas.length;
    const url = imagensValidas[targetIdx];
    if (!url) return;
    preloadImage(url).catch(() => {});
  }, [imagensValidas, currentImageIndex]);

  // Garante limpeza ao desmontar o card (ex.: filtro reordenando lista).
  useEffect(() => () => { lastPreloadHandleRef.current?.cancel(); }, []);

  // Imagem atual: índice do carrossel é a fonte primária (setas sempre funcionam).
  // Fallback: imagem da cor selecionada → primeira imagem válida → genérico.
  const imagemAtual = useMemo(() => {
    const imgIndice = imagensValidas[currentImageIndex];
    if (imgIndice) return imgIndice;
    if (corSelecionadaObj) {
      const imgCor = (corSelecionadaObj.imagem_full || corSelecionadaObj.imagem_thumb || "").trim();
      if (imgCor) return imgCor;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[ProductCard] Imagem da cor ausente — usando primeira disponível.", {
          produto: produto.nome,
          cor: corSelecionada,
          origem: "imagensValidas[0]",
        });
      }
    }
    if (import.meta.env.DEV && imagensValidas.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[ProductCard] Sem imagens — usando placeholder.", {
        produto: produto.nome,
        cor: corSelecionada,
        origem: "placeholder",
      });
    }
    return imagensValidas[0] || PRODUCT_IMAGE_PLACEHOLDER;
  }, [imagensValidas, currentImageIndex, corSelecionadaObj, corSelecionada, produto.nome]);

  // Alt dinâmico via utilitário central — garante padronização entre
  // ProductCard, ProductDetail e Monte seu Look.
  const altImagem = useMemo(
    () => getProductImageByColor(produto, corSelecionada).alt,
    [produto, corSelecionada],
  );

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
    // Re-resolve o container visível NO MOMENTO do clique (lista vs. grade vs. mobile/desktop)
    // — evita race entre callbacks de ref de containers ocultos.
    const visibleSection = resolveVisibleSection();
    if (visibleSection) {
      sizeGuide.sectionRef.current = visibleSection;
      sizeGuide.guide();
    } else {
      // Sem nenhum seletor visível inline → navega para o detalhe.
      navigate(getProductPathWithSearch(produto));
    }
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
      <Card ref={cardRootRef} className="card-shine group overflow-hidden border-border hover:border-primary/40 transition-all duration-300 hover:shadow-hover hover:translate-x-1 bg-card animate-fade-in">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <Link
              to={getProductPathWithSearch(produto)}
              className="relative overflow-hidden md:w-64 aspect-square md:aspect-auto bg-muted block"
              onMouseEnter={preloadNeighbors}
              onPointerEnter={preloadNeighbors}
              onFocus={preloadNeighbors}
              onMouseLeave={cancelPreloadNeighbors}
              onPointerLeave={cancelPreloadNeighbors}
              onBlur={cancelPreloadNeighbors}
            >
              <ProductImageSkeleton 
                src={imagemAtual} 
                alt={altImagem}
                className="transition-transform duration-700 group-hover:scale-110"
                slideDirection={slideDirection}
              />
              {/* Navigation Arrows */}
              {imagensValidas.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    onMouseEnter={() => preloadOnArrowHover("prev")}
                    onPointerEnter={() => preloadOnArrowHover("prev")}
                    onTouchStart={() => preloadOnArrowHover("prev")}
                    onFocus={() => preloadOnArrowHover("prev")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    onMouseEnter={() => preloadOnArrowHover("next")}
                    onPointerEnter={() => preloadOnArrowHover("next")}
                    onTouchStart={() => preloadOnArrowHover("next")}
                    onFocus={() => preloadOnArrowHover("next")}
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
                        data-size-section
                        tabIndex={-1}
                        className={cn(
                          "scroll-mt-24 rounded-md transition-all duration-300"
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">Selecione o Tamanho:</p>
                        <div className="flex flex-wrap gap-1">
                          {/* Renderizamos apenas os tamanhos disponíveis para a cor atual.
                              Tamanhos indisponíveis são omitidos (sem chip riscado). */}
                          {tamanhosDisponiveis.map((tamanho) => (
                            <Button
                              key={tamanho}
                              data-size-option
                              variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTamanhoSelecionado(tamanho)}
                              title={tamanho}
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
                <p aria-live="polite" aria-atomic="true" className="sr-only">
                  {sizeGuide.announceMessage}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Layout em grade (vertical - padrão)
  return (
    <Card ref={cardRootRef} className="card-shine group overflow-hidden border-border hover:border-primary/40 transition-all duration-500 hover:shadow-hover hover:-translate-y-1 sm:hover:-translate-y-2 bg-card flex flex-col animate-fade-in relative">
      <CardContent className="p-0 flex flex-col flex-1">
        <Link
          to={getProductPathWithSearch(produto)}
          className="relative overflow-hidden aspect-square bg-muted block flex-shrink-0"
          onMouseEnter={preloadNeighbors}
          onPointerEnter={preloadNeighbors}
          onFocus={preloadNeighbors}
          onMouseLeave={cancelPreloadNeighbors}
          onPointerLeave={cancelPreloadNeighbors}
          onBlur={cancelPreloadNeighbors}
        >
          <ProductImageSkeleton 
            src={imagemAtual} 
            alt={altImagem}
            className="transition-all duration-700 group-hover:scale-105 sm:group-hover:scale-110 group-hover:brightness-110"
            slideDirection={slideDirection}
          />
          {/* Navigation Arrows - sempre visíveis em mobile */}
          {imagensValidas.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                onMouseEnter={() => preloadOnArrowHover("prev")}
                onPointerEnter={() => preloadOnArrowHover("prev")}
                onTouchStart={() => preloadOnArrowHover("prev")}
                onFocus={() => preloadOnArrowHover("prev")}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-background/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background active:scale-95"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={handleNextImage}
                onMouseEnter={() => preloadOnArrowHover("next")}
                onPointerEnter={() => preloadOnArrowHover("next")}
                onTouchStart={() => preloadOnArrowHover("next")}
                onFocus={() => preloadOnArrowHover("next")}
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
                data-size-section
                tabIndex={-1}
                className={cn(
                  "flex sm:hidden flex-wrap gap-1.5 mt-1.5 animate-fade-in scroll-mt-24 rounded-md transition-all duration-300"
                )}
              >
                {/* Apenas tamanhos com disponibilidade na cor atual. */}
                {tamanhosDisponiveis.map((tamanho) => (
                  <button
                    key={tamanho}
                    type="button"
                    data-size-option
                    onClick={() => setTamanhoSelecionado(tamanho)}
                    title={tamanho}
                    className={cn(
                      "min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold transition-all",
                      tamanhoSelecionado === tamanho
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-border text-foreground",
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
                  <div
                    data-size-section
                    tabIndex={-1}
                    className={cn(
                      "mt-2 scroll-mt-24 rounded-md transition-all duration-300"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tam:</p>
                    <div className="flex flex-wrap gap-1">
                      {/* Apenas tamanhos disponíveis para a cor selecionada. */}
                      {tamanhosDisponiveis.map((tamanho) => (
                        <Button
                          key={tamanho}
                          data-size-option
                          variant={tamanhoSelecionado === tamanho ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTamanhoSelecionado(tamanho)}
                          title={tamanho}
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
            <p aria-live="polite" aria-atomic="true" className="sr-only">
              {sizeGuide.announceMessage}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
