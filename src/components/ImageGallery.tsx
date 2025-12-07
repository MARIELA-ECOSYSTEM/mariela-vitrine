import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, X, Hand } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import produtoGenerico from "@/assets/produto-generico.png";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  emPromocao?: boolean;
  isNovidade?: boolean;
  selectedIndex?: number;
  onImageSelect?: (index: number) => void;
}

export const ImageGallery = ({ 
  images, 
  productName, 
  emPromocao, 
  isNovidade,
  selectedIndex,
  onImageSelect
}: ImageGalleryProps) => {
  const [indiceAtual, setIndiceAtual] = useState(selectedIndex || 0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [hoveredThumbnail, setHoveredThumbnail] = useState<number | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  
  const imagensValidas = images.length > 0 ? images : [produtoGenerico];
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

  const handleAnterior = () => {
    setSlideDirection('right');
    const newIndex = indiceAtual === 0 ? imagensValidas.length - 1 : indiceAtual - 1;
    setIndiceAtual(newIndex);
    onImageSelect?.(newIndex);
  };

  const handleProxima = () => {
    setSlideDirection('left');
    const newIndex = indiceAtual === imagensValidas.length - 1 ? 0 : indiceAtual + 1;
    setIndiceAtual(newIndex);
    onImageSelect?.(newIndex);
  };

  const handleThumbnailClick = (index: number) => {
    setSlideDirection(index > indiceAtual ? 'left' : 'right');
    setIndiceAtual(index);
    onImageSelect?.(index);
  };

  return (
    <div className="space-y-4">
      {/* Imagem Principal */}
      <div 
        className="relative aspect-square bg-muted rounded-lg overflow-hidden group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="cursor-zoom-in relative h-full overflow-hidden">
              <img
                src={imagensValidas[indiceAtual]}
                alt={`${productName} - imagem ${indiceAtual + 1}`}
                className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'}`}
                key={indiceAtual}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-4 py-2 rounded-full flex items-center gap-2">
                  <ZoomIn className="h-5 w-5" />
                  <span className="text-sm font-medium">Clique para ampliar</span>
                </div>
              </div>
            </div>
          </DialogTrigger>
          
          {/* Dialog com Zoom Avançado */}
          <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95">
            <div className="relative w-full h-full flex items-center justify-center">
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={4}
                centerOnInit
                wheel={{ step: 0.1 }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    {/* Controles de Zoom */}
                    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => zoomIn()}
                        className="bg-background/90 hover:bg-background"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => zoomOut()}
                        className="bg-background/90 hover:bg-background"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => resetTransform()}
                        className="bg-background/90 hover:bg-background"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setIsDialogOpen(false)}
                        className="bg-background/90 hover:bg-background"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Navegação de Imagens no Dialog */}
                    {temMultiplasImagens && (
                      <>
                        <button
                          onClick={handleAnterior}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/90 hover:bg-background p-3 rounded-full shadow-lg transition-all"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={handleProxima}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/90 hover:bg-background p-3 rounded-full shadow-lg transition-all"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}

                    {/* Contador de Imagens */}
                    {temMultiplasImagens && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background/90 px-4 py-2 rounded-full">
                        <span className="text-sm font-medium">
                          {indiceAtual + 1} / {imagensValidas.length}
                        </span>
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
        
        {/* Setas de Navegação - Sempre visíveis quando há múltiplas imagens */}
        {temMultiplasImagens && (
          <>
            <button
              onClick={handleAnterior}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 rounded-full shadow-md transition-all hover:scale-110"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleProxima}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 rounded-full shadow-md transition-all hover:scale-110"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          {emPromocao && (
            <Badge className="bg-destructive text-destructive-foreground shadow-lg">
              PROMOÇÃO
            </Badge>
          )}
          {isNovidade && (
            <Badge className="bg-primary text-primary-foreground shadow-lg">
              Novidade
            </Badge>
          )}
        </div>

        {/* Contador de Imagens */}
        {temMultiplasImagens && (
          <div className="absolute bottom-4 right-4 bg-background/90 px-3 py-1 rounded-full text-sm font-medium">
            {indiceAtual + 1} / {imagensValidas.length}
          </div>
        )}

        {/* Swipe Hint - Mobile */}
        {showSwipeHint && temMultiplasImagens && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 md:hidden animate-fade-in z-20">
            <div className="bg-foreground/80 text-background px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
              <Hand className="h-4 w-4" />
              <span className="text-sm font-medium">Deslize para ver mais</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Miniaturas */}
      {temMultiplasImagens && (
        <div className="grid grid-cols-5 gap-2 animate-fade-in">
          {imagensValidas.map((img, index) => (
            <div
              key={index}
              className="relative"
              onMouseEnter={() => setHoveredThumbnail(index)}
              onMouseLeave={() => setHoveredThumbnail(null)}
            >
              <button
                onClick={() => handleThumbnailClick(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 w-full ${
                  indiceAtual === index
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/50"
                }`}
                aria-label={`Ver imagem ${index + 1}`}
              >
                <img
                  src={img}
                  alt={`${productName} miniatura ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </button>
              
              {/* Preview Ampliado no Hover */}
              {hoveredThumbnail === index && (
                <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in">
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
    </div>
  );
};
