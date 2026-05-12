import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Hand } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductImageSkeleton, preloadAdjacentImage, type PreloadPriority } from "@/components/ProductImageSkeleton";

/**
 * Helpers HOISTED (fora do componente) para garantir referência estável
 * entre renders e permitir cache module-level. Em alternâncias rápidas de
 * cor, isso evita reparses de HEX e re-cálculos de luminância.
 */

/** Mantém o nome canônico EXATAMENTE como veio do payload. */
const canonicalColorName = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string" || raw.length === 0) return null;
  return raw;
};

/**
 * Cache module-level de luminância por HEX. As cores do catálogo são um
 * conjunto pequeno e estável → cache cresce só uma vez e nunca expira.
 */
const LUMINANCE_CACHE = new Map<string, number | null>();
const hexLuminance = (hex: string | undefined): number | null => {
  if (!hex || typeof hex !== "string") return null;
  const cached = LUMINANCE_CACHE.get(hex);
  if (cached !== undefined) return cached;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    LUMINANCE_CACHE.set(hex, null);
    return null;
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  LUMINANCE_CACHE.set(hex, lum);
  return lum;
};

/**
 * Cache de classes Tailwind por `size`. Pré-computado uma vez no load do
 * módulo — strings imutáveis, zero alocação por render.
 */
const BADGE_SIZE_CLASSES: Record<"md" | "sm" | "xs", { pill: string; dot: string }> = {
  md: {
    pill: "h-7 pl-1 pr-2.5 gap-1.5 text-xs rounded-full max-w-[12rem]",
    dot: "h-5 w-5 shrink-0",
  },
  sm: {
    pill: "h-6 pl-1 pr-2 gap-1 text-[10px] leading-none rounded-full max-w-[7rem]",
    dot: "h-4 w-4 shrink-0",
  },
  xs: {
    pill: "h-5 pl-[3px] pr-1.5 gap-1 text-[9px] leading-none rounded-full max-w-[5.5rem]",
    dot: "h-3.5 w-3.5 shrink-0",
  },
};

const BADGE_BASE_CLASSES =
  "inline-flex items-center justify-center select-none cursor-default " +
  "bg-black/55 text-white border border-white/15 " +
  "backdrop-blur-xl backdrop-saturate-150 " +
  "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.05)_inset] " +
  "font-medium tracking-wide whitespace-nowrap " +
  "[text-shadow:0_1px_2px_rgba(0,0,0,0.55)] " +
  "transition-[transform,box-shadow,background-color] duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:bg-black/65 " +
  "hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)_inset] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background/40 ";

/**
 * Cache module-level dos cálculos do badge por chave `(size|hex)`.
 * Toda badge — independente de qual instância do `ImageGallery` ela
 * pertença — reaproveita o MESMO objeto resultante. Isso elimina
 * alocações em re-renders frequentes (ex.: alternância rápida de cor
 * em mobile) e mantém referências estáveis para componentes filhos.
 */
interface BadgeStyle {
  buttonClass: string;
  swatchClass: string;
}
const BADGE_STYLE_CACHE = new Map<string, BadgeStyle>();
const RING_LIGHT = "ring-1 ring-black/30";
const RING_DARK = "ring-1 ring-white/40";
const SWATCH_BASE =
  "rounded-full shadow-inner shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] ";

function getBadgeStyle(size: "md" | "sm" | "xs", swatchHex: string | undefined): BadgeStyle {
  // Chave estável; HEX vazio/undefined entram como "" — mesmo caminho.
  const key = `${size}|${swatchHex ?? ""}`;
  const cached = BADGE_STYLE_CACHE.get(key);
  if (cached) return cached;
  const sizes = BADGE_SIZE_CLASSES[size];
  const lum = hexLuminance(swatchHex);
  const isLight = lum !== null && lum > 0.7;
  const ring = isLight ? RING_LIGHT : RING_DARK;
  const style: BadgeStyle = {
    buttonClass: BADGE_BASE_CLASSES + sizes.pill,
    swatchClass: SWATCH_BASE + ring + " " + sizes.dot,
  };
  BADGE_STYLE_CACHE.set(key, style);
  return style;
}

interface ImageGalleryProps {
  images: string[];
  productName: string;
  emPromocao?: boolean;
  isNovidade?: boolean;
  publicBadge?: {
    label: string;
    description: string;
  } | null;
  selectedIndex?: number;
  onImageSelect?: (index: number) => void;
  /**
   * Cor associada a cada imagem (mesma ordem de `images`). `null` quando
   * a imagem é solta (não pertence a uma cor específica). Quando fornecido,
   * a galeria exibe uma badge com o nome da cor sobre cada miniatura e
   * sobre a imagem principal.
   */
  imageColors?: (string | null)[];
  /**
   * Mapa cor → HEX usado para renderizar o "swatch dot" dentro da badge.
   * Quando a cor não está no mapa, a badge é exibida sem o ponto colorido
   * (apenas com o nome). Vem do `COLOR_MAP` do `ProductDetail`.
   */
  colorSwatchMap?: Record<string, string>;
}

export const ImageGallery = ({ 
  images, 
  productName, 
  emPromocao, 
  isNovidade,
  publicBadge,
  selectedIndex,
  onImageSelect,
  imageColors,
  colorSwatchMap,
}: ImageGalleryProps) => {
  /**
   * Badge com nome canônico da cor + tooltip. Estilo unificado para card e
   * miniaturas, com fundo high-contrast (foreground sobre background) e
   * sombra dupla para legibilidade sobre qualquer imagem (claras/escuras).
   * `size`:
   *  - `md`: badge da imagem principal
   *  - `sm`: badge de miniatura desktop
   *  - `xs`: badge de miniatura mobile (mais compacta)
   * O tooltip ativa em hover (desktop) e em foco/long-press (mobile).
   */
  /**
   * Badge moderna estilo "pill" com glassmorphism:
   *  - Fundo translúcido com `backdrop-blur-xl` e borda interna sutil
   *    (white/20 sobre escuro) → legível em qualquer foto.
   *  - Swatch dot circular com a cor real no início (anel branco fino para
   *    destacar cores claras como Branco/Off White sobre fundos brancos).
   *  - Micro-interação: hover/focus levanta a badge (translate-y) e
   *    intensifica a sombra. Transição rápida (200ms) para sensação premium.
   *  - Tooltip continua ativando em hover/focus/long-press.
   */
  const ColorBadge = ({
    cor,
    size,
    label,
  }: {
    cor: string;
    size: "md" | "sm" | "xs";
    label: string;
  }) => {
    // Memoização por (size, swatchHex) compartilhada entre TODAS as
    // instâncias de badge do app via `BADGE_STYLE_CACHE`. Em troca rápida
    // de cor (mobile/desktop) o lookup é O(1) e devolve as MESMAS strings
    // — zero alocação, zero reparse de HEX, zero recompose de Tailwind.
    const swatchHex = colorSwatchMap?.[cor];
    const { buttonClass, swatchClass } = getBadgeStyle(size, swatchHex);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={0}
            aria-label={label}
            className={buttonClass}
          >
            {swatchHex && (
              <span
                aria-hidden="true"
                className={swatchClass}
                style={{ backgroundColor: swatchHex }}
              />
            )}
            <span className="truncate">{cor}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="px-2.5 py-1">
          <div className="flex items-center gap-2">
            {swatchHex && (
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full ring-1 ring-border"
                style={{ backgroundColor: swatchHex }}
              />
            )}
            <span className="text-xs font-medium">{label}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };
  const [indiceAtual, setIndiceAtual] = useState(selectedIndex || 0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  
  // Memoiza para não recriar array a cada render (mantém referências estáveis
  // para filhos memoizados e evita work extra durante a troca de cor).
  // SEM fallback local: a Vitrine consome estritamente o que a vitrine-api
  // entregou. Se a API não enviar imagens, a galeria fica vazia e o
  // ProductImageSkeleton exibe seu próprio estado de erro acessível.
  const imagensValidas = useMemo(
    () => images.filter((u): u is string => typeof u === "string" && u.trim().length > 0),
    [images],
  );
  const temMultiplasImagens = imagensValidas.length > 1;
  // Sem imagens da API: NÃO injetamos placeholder local. Renderizamos um
  // estado vazio semântico para que o usuário perceba a ausência (e o
  // PDV/QA detecte payloads incorretos), sem disfarçar com asset interno.
  const semImagensDaApi = imagensValidas.length === 0;

  // Show swipe hint on first visit
  useEffect(() => {
    if (temMultiplasImagens) {
      const hasSeenSwipeHint = localStorage.getItem('mariela_swipe_hint_seen');
      if (!hasSeenSwipeHint) {
        setShowSwipeHint(true);
        const timer = setTimeout(() => {
          setShowSwipeHint(false);
          localStorage.setItem('mariela_swipe_hint_seen', 'true');
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [temMultiplasImagens]);

  // Sync with external selectedIndex
  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex !== indiceAtual) {
      setIndiceAtual(selectedIndex);
    }
  }, [selectedIndex]);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleProxima();
    } else if (isRightSwipe) {
      handleAnterior();
    }
  };

  const handleAnterior = useCallback(() => {
    const newIndex = indiceAtual === 0 ? imagensValidas.length - 1 : indiceAtual - 1;
    setIndiceAtual(newIndex);
    onImageSelect?.(newIndex);
  }, [indiceAtual, imagensValidas.length, onImageSelect]);

  const handleProxima = useCallback(() => {
    const newIndex = indiceAtual === imagensValidas.length - 1 ? 0 : indiceAtual + 1;
    setIndiceAtual(newIndex);
    onImageSelect?.(newIndex);
  }, [indiceAtual, imagensValidas.length, onImageSelect]);

  const handleThumbnailClick = useCallback((index: number) => {
    setIndiceAtual(index);
    onImageSelect?.(index);
  }, [onImageSelect]);

  /**
   * Helper compartilhado: usa exatamente a mesma lógica de cálculo de
   * vizinho do ProductCard para garantir que a direção prevista é
   * idêntica nos dois pontos. Prioridade conforme o trigger:
   * - hover/focus = `low`  (intenção, não compete com a principal)
   * - touchstart  = `high` (clique iminente em mobile)
   *
   * Throttle de 250ms para `low` (hover/focus): movimentos rápidos do
   * mouse sobre as setas não disparam preload em rajada. `high`
   * (touchstart) ignora o throttle — clique iminente precisa antecipar.
   */
  const lastHoverPreloadAtRef = useRef<number>(0);
  const preloadDirection = useCallback(
    (direction: "next" | "prev", priority: PreloadPriority = "low") => {
      if (priority !== "high") {
        const now = Date.now();
        if (now - lastHoverPreloadAtRef.current < 250) return;
        lastHoverPreloadAtRef.current = now;
      }
      preloadAdjacentImage(imagensValidas, indiceAtual, direction, priority);
    },
    [imagensValidas, indiceAtual],
  );

  if (semImagensDaApi) {
    return (
      <div
        className="aspect-square bg-muted rounded-xl md:rounded-2xl flex items-center justify-center"
        role="img"
        aria-label={`${productName} — imagem indisponível`}
        data-testid="gallery-empty-state"
      >
        <span className="text-sm text-muted-foreground">
          Imagem indisponível
        </span>
      </div>
    );
  }

  return (
   <TooltipProvider delayDuration={150}>
    <div className="space-y-3 md:space-y-4">
      {/* Imagem Principal */}
      <div 
        className="relative aspect-square bg-muted rounded-xl md:rounded-2xl overflow-hidden group shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Badge da cor associada à imagem principal — reflete `indiceAtual`,
            atualiza imediatamente ao trocar de cor (mobile/desktop). */}
        {(() => {
          const cor = canonicalColorName(imageColors?.[indiceAtual]);
          if (!cor) return null;
          // Key combina cor + URL da imagem atual para re-montar a badge
          // (crossfade) sempre que o usuário trocar a cor — sincronizando
          // com o swap da imagem principal vinda da vitrine-api.
          const fadeKey = `${cor}::${imagensValidas[indiceAtual] ?? ""}`;
          return (
            <div
              key={fadeKey}
              className="absolute top-3 left-3 z-10 animate-fade-in"
            >
              <ColorBadge cor={cor} size="md" label={`Cor: ${cor}`} />
            </div>
          );
        })()}
        {/* Imagem Principal com tap para zoom */}
        <div 
          className="relative h-full overflow-hidden cursor-pointer"
          onClick={() => setIsDialogOpen(true)}
        >
          <ProductImageSkeleton
            src={imagensValidas[indiceAtual]}
            alt={`${productName} - imagem ${indiceAtual + 1}`}
            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
            priority={indiceAtual === 0}
            enableBlurUp
            images={imagensValidas}
            currentIndex={indiceAtual}
          />
          
          {/* Overlay com botão de zoom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <Maximize2 className="h-4 w-4" />
              <span className="text-sm font-medium">Toque para ampliar</span>
            </div>
          </div>
        </div>

        {/* Dialog com Zoom Avançado */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[100vw] w-full h-[100dvh] md:max-w-7xl md:h-[90vh] p-0 bg-black/98 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                centerOnInit
                wheel={{ step: 0.2 }}
                pinch={{ step: 5 }}
                doubleClick={{ mode: "toggle", step: 2 }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    {/* Controles de Zoom - Mobile optimized */}
                    <div className="absolute top-4 right-4 z-50 flex gap-2 md:flex-col">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setIsDialogOpen(false)}
                        className="bg-background/90 hover:bg-background h-10 w-10 md:h-9 md:w-9"
                      >
                        <X className="h-5 w-5 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => zoomIn()}
                        className="bg-background/90 hover:bg-background h-10 w-10 md:h-9 md:w-9"
                      >
                        <ZoomIn className="h-5 w-5 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => zoomOut()}
                        className="bg-background/90 hover:bg-background h-10 w-10 md:h-9 md:w-9"
                      >
                        <ZoomOut className="h-5 w-5 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => resetTransform()}
                        className="bg-background/90 hover:bg-background h-10 w-10 md:h-9 md:w-9"
                      >
                        <RotateCcw className="h-5 w-5 md:h-4 md:w-4" />
                      </Button>
                    </div>

                    {/* Dica de pinch zoom mobile */}
                    <div className="absolute top-4 left-4 z-50 md:hidden">
                      <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                        Pinça para zoom • Toque duplo amplia
                      </div>
                    </div>

                    {/* Navegação de Imagens no Dialog */}
                    {temMultiplasImagens && (
                      <>
                        <button
                          onClick={handleAnterior}
                          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 bg-background/90 hover:bg-background p-2 md:p-3 rounded-full shadow-lg transition-all active:scale-95"
                        >
                          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                        </button>
                        <button
                          onClick={handleProxima}
                          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 bg-background/90 hover:bg-background p-2 md:p-3 rounded-full shadow-lg transition-all active:scale-95"
                        >
                          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                        </button>
                      </>
                    )}

                    {/* Contador e Thumbnails no Dialog */}
                    {temMultiplasImagens && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                        {/* Mini thumbnails */}
                        <div className="flex gap-1.5 bg-background/80 backdrop-blur-sm p-1.5 rounded-full">
                          {imagensValidas.map((img, index) => (
                            <button
                              key={index}
                              onClick={() => handleThumbnailClick(index)}
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 transition-all ${
                                indiceAtual === index
                                  ? "border-primary scale-110 shadow-lg"
                                  : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={img}
                                alt={`Miniatura ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Imagem com Zoom */}
                    <TransformComponent
                      wrapperClass="!w-full !h-full"
                      contentClass="!w-full !h-full flex items-center justify-center"
                    >
                      <img
                        src={imagensValidas[indiceAtual]}
                        alt={`${productName} - imagem ${indiceAtual + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Setas de Navegação */}
        {temMultiplasImagens && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleAnterior(); }}
              onMouseEnter={() => preloadDirection("prev")}
              onPointerEnter={() => preloadDirection("prev")}
              onTouchStart={() => preloadDirection("prev", "high")}
              onFocus={() => preloadDirection("prev")}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 md:p-2.5 rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleProxima(); }}
              onMouseEnter={() => preloadDirection("next")}
              onPointerEnter={() => preloadDirection("next")}
              onTouchStart={() => preloadDirection("next", "high")}
              onFocus={() => preloadDirection("next")}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 md:p-2.5 rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {publicBadge && (
            <Badge title={publicBadge.description} className="bg-background/90 text-foreground border border-primary/30 shadow-sm backdrop-blur-sm text-xs md:text-sm px-2 md:px-3">
              {publicBadge.label}
            </Badge>
          )}
        </div>

        {/* Indicadores de Paginação (dots) - Mobile */}
        {temMultiplasImagens && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {imagensValidas.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); handleThumbnailClick(index); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  indiceAtual === index
                    ? "bg-primary w-6"
                    : "bg-background/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Contador de Imagens - Desktop */}
        {temMultiplasImagens && (
          <div className="hidden md:block absolute bottom-4 right-4 bg-background/90 px-3 py-1 rounded-full text-sm font-medium">
            {indiceAtual + 1} / {imagensValidas.length}
          </div>
        )}

        {/* Swipe Hint - Mobile */}
        {showSwipeHint && temMultiplasImagens && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 md:hidden animate-fade-in z-20">
            <div className="bg-foreground/80 text-background px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
              <Hand className="h-4 w-4" />
              <span className="text-sm font-medium">Deslize para ver mais</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Miniaturas - Desktop */}
      {temMultiplasImagens && (
        <div className="hidden md:grid grid-cols-5 gap-2 animate-fade-in">
          {imagensValidas.map((img, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => handleThumbnailClick(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 w-full ${
                  indiceAtual === index
                    ? "border-primary ring-2 ring-primary/20 shadow-md opacity-100"
                    : "border-border hover:border-primary/50 opacity-80 hover:opacity-100"
                }`}
                aria-label={`Ver imagem ${index + 1}`}
              >
                <img
                  src={img}
                  alt={`${productName} miniatura ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110"
                />
              </button>
              {(() => {
                const cor = canonicalColorName(imageColors?.[index]);
                if (!cor) return null;
                return (
                  <div className="absolute top-1 left-1">
                    <ColorBadge cor={cor} size="sm" label={`Cor: ${cor}`} />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Miniaturas - Mobile (horizontal scroll) */}
      {temMultiplasImagens && (
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {imagensValidas.map((img, index) => (
            <div key={index} className="relative flex-shrink-0">
              <button
                onClick={() => handleThumbnailClick(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  indiceAtual === index
                    ? "border-primary ring-2 ring-primary/20 shadow-md opacity-100"
                    : "border-border opacity-80"
                }`}
                aria-label={`Ver imagem ${index + 1}`}
              >
                <img
                  src={img}
                  alt={`${productName} miniatura ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
              {(() => {
                const cor = canonicalColorName(imageColors?.[index]);
                if (!cor) return null;
                return (
                  <div className="absolute top-1 left-1">
                    <ColorBadge cor={cor} size="xs" label={`Cor: ${cor}`} />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
   </TooltipProvider>
  );
};
