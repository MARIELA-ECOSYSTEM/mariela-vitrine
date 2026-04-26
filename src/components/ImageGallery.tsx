import { useState, useEffect, useMemo, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Hand } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImageSkeleton } from "@/components/ProductImageSkeleton";
import { PRODUCT_IMAGE_PLACEHOLDER as produtoGenerico } from "@/lib/productImage";

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
}

export const ImageGallery = ({ 
  images, 
  productName, 
  emPromocao, 
  isNovidade,
  publicBadge,
  selectedIndex,
  onImageSelect
}: ImageGalleryProps) => {
  const [indiceAtual, setIndiceAtual] = useState(selectedIndex || 0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [hoveredThumbnail, setHoveredThumbnail] = useState<number | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  
  // Memoiza para não recriar array a cada render (mantém referências estáveis
  // para filhos memoizados e evita work extra durante a troca de cor).
  const imagensValidas = useMemo(
    () => (images.length > 0 ? images : [produtoGenerico]),
    [images],
  );
  const temMultiplasImagens = imagensValidas.length > 1;

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

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Imagem Principal */}
      <div 
        className="relative aspect-square bg-muted rounded-xl md:rounded-2xl overflow-hidden group shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 md:p-2.5 rounded-full shadow-md transition-all hover:scale-110 active:scale-95"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleProxima(); }}
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
            <div
              key={index}
              className="relative"
              onMouseEnter={() => setHoveredThumbnail(index)}
              onMouseLeave={() => setHoveredThumbnail(null)}
            >
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
                  className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110"
                />
              </button>
              
              {/* Preview Ampliado no Hover */}
              {hoveredThumbnail === index && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in pointer-events-none">
                  <div className="relative">
                    <img
                      src={img}
                      alt={`${productName} preview ${index + 1}`}
                      className="w-48 h-48 object-cover rounded-lg shadow-2xl border-2 border-primary"
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rotate-45 border-r-2 border-b-2 border-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Miniaturas - Mobile (horizontal scroll) */}
      {temMultiplasImagens && (
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {imagensValidas.map((img, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                indiceAtual === index
                  ? "border-primary ring-2 ring-primary/20 shadow-md opacity-100"
                  : "border-border opacity-80"
              }`}
              aria-label={`Ver imagem ${index + 1}`}
            >
              <img
                src={img}
                alt={`${productName} miniatura ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
