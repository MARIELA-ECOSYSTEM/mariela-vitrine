import { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";
import { Badge } from "@/components/ui/badge";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface Mannequin3DProps {
  selectedBlusa: Produto | null;
  selectedBottom: Produto | null;
  selectedBolsa: Produto | null;
  selectedVestido: Produto | null;
  selectedConjunto: Produto | null;
  selectedColors: {
    blusa: string;
    bottom: string;
    bolsa: string;
    vestido: string;
    conjunto: string;
  };
  lastAction?: {
    type: "add" | "remove";
    category: string;
  } | null;
}

export const Mannequin3D = ({
  selectedBlusa,
  selectedBottom,
  selectedBolsa,
  selectedVestido,
  selectedConjunto,
  selectedColors,
  lastAction,
}: Mannequin3DProps) => {
  const isFullOutfit = selectedVestido || selectedConjunto;

  const getImageForColor = (produto: Produto | null, cor: string) => {
    if (!produto) return produtoGenerico;
    if (!cor) return produto.imagens[0] || produtoGenerico;
    
    const imagemIndex = produto.variants.findIndex(v => v.cor === cor);
    return produto.imagens[imagemIndex >= 0 ? imagemIndex : 0] || produto.imagens[0] || produtoGenerico;
  };

  const getAnimationClass = (category: string) => {
    if (!lastAction) return "animate-mannequin-idle";
    if (lastAction.category === category) {
      return lastAction.type === "add" ? "animate-dress-on animate-add-glow" : "animate-dress-off";
    }
    return "";
  };

  const hasAnySelection = selectedBlusa || selectedBottom || selectedBolsa || selectedVestido || selectedConjunto;

  return (
    <div className="relative w-full min-h-[400px]">
      {/* 3D Stage Container with Zoom */}
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={3}
        centerOnInit
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "toggle" }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <div
            className="relative aspect-[3/4] max-w-md mx-auto select-none"
            style={{ perspective: "1200px" }}
          >
        {/* Background Stage */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-background to-secondary/60" />
          
          {/* Floor reflection */}
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-secondary/80 to-transparent" />
          
          {/* Spotlight effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-60" />
          
          {/* Stage edge */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* 3D Mannequin Container with continuous float animation */}
        <div 
          className="absolute inset-0 flex items-center justify-center animate-mannequin-float"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Shadow on floor */}
          <div className="absolute bottom-8 left-1/2 w-32 h-6 -translate-x-1/2 rounded-full bg-foreground/10 blur-xl" />

          {isFullOutfit ? (
            /* Full outfit display (dress/conjunto) */
            <div className={`relative w-full h-full flex items-center justify-center p-6 ${getAnimationClass(selectedVestido ? 'vestido' : 'conjunto')}`}>
              {(selectedVestido || selectedConjunto) && (
                <div className="relative w-full h-full max-h-[85%] transition-all duration-500">
                  <img
                    src={getImageForColor(
                      selectedVestido || selectedConjunto,
                      selectedVestido ? selectedColors.vestido : selectedColors.conjunto
                    )}
                    alt={(selectedVestido || selectedConjunto)?.nome}
                    className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-transform duration-300"
                    style={{ filter: "brightness(1.02) contrast(1.05)" }}
                  />
                  <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground shadow-xl backdrop-blur-sm animate-fade-in">
                    {selectedVestido ? "👗 Vestido" : "👔 Conjunto"}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            /* Layered outfit (blusa + bottom) */
            <div className="relative w-full h-full">
              {/* Blusa layer */}
              <div className={`absolute top-[5%] left-0 right-0 h-[45%] flex items-center justify-center px-6 ${getAnimationClass('blusa')}`}>
                {selectedBlusa ? (
                  <div className="relative w-full h-full transition-all duration-500">
                    <img
                      src={getImageForColor(selectedBlusa, selectedColors.blusa)}
                      alt={selectedBlusa.nome}
                      className="w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:scale-[1.02] transition-transform duration-300"
                      style={{ filter: "brightness(1.02) contrast(1.05)" }}
                    />
                    <Badge className="absolute -top-1 -right-1 bg-primary/90 text-primary-foreground shadow-xl text-xs backdrop-blur-sm animate-fade-in">
                      👚 Blusa
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/30">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-current flex items-center justify-center animate-pulse">
                      <span className="text-4xl opacity-50">👚</span>
                    </div>
                    <p className="text-sm font-medium">Arraste uma blusa</p>
                  </div>
                )}
              </div>

              {/* Bottom layer */}
              <div className={`absolute top-[48%] left-0 right-0 h-[48%] flex items-start justify-center px-6 ${getAnimationClass('bottom')}`}>
                {selectedBottom ? (
                  <div className="relative w-full h-full transition-all duration-500">
                    <img
                      src={getImageForColor(selectedBottom, selectedColors.bottom)}
                      alt={selectedBottom.nome}
                      className="w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:scale-[1.02] transition-transform duration-300"
                      style={{ filter: "brightness(1.02) contrast(1.05)" }}
                    />
                    <Badge className="absolute -top-1 -right-1 bg-primary/90 text-primary-foreground shadow-xl text-xs backdrop-blur-sm animate-fade-in">
                      {selectedBottom.categoria === "calças" ? "👖 Calça" : 
                       selectedBottom.categoria === "saias" ? "👗 Saia" : "🩳 Short"}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/30 pt-6">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-current flex items-center justify-center animate-pulse">
                      <span className="text-3xl opacity-50">👖</span>
                    </div>
                    <p className="text-sm font-medium">Arraste calça/short</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bolsa/Accessory floating */}
          {selectedBolsa && (
            <div className={`absolute right-3 top-1/3 w-24 h-24 z-10 ${getAnimationClass('bolsa')}`}>
              <div className="relative w-full h-full bg-background/95 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-primary/20 hover:scale-110 hover:rotate-3 transition-all duration-300 cursor-pointer">
                <img
                  src={getImageForColor(selectedBolsa, selectedColors.bolsa)}
                  alt={selectedBolsa.nome}
                  className="w-full h-full object-contain"
                  style={{ filter: "brightness(1.02)" }}
                />
                <Badge className="absolute -top-2 -left-2 bg-accent/90 text-accent-foreground shadow-xl text-xs backdrop-blur-sm">
                  👜
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!hasAnySelection && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 px-6 animate-fade-in">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-background/80 flex items-center justify-center">
                  <span className="text-5xl animate-bounce">✨</span>
                </div>
              </div>
              <div>
                <p className="text-xl font-serif font-semibold text-foreground mb-2">
                  Monte Seu Look
                </p>
                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                  Selecione as peças ao lado para começar a criar seu look perfeito
                </p>
              </div>
            </div>
          </div>
        )}
          </div>
        </TransformComponent>
      </TransformWrapper>
      
      {/* Zoom hint */}
      {hasAnySelection && (
        <p className="text-center text-xs text-muted-foreground mt-2 animate-fade-in">
          Use pinch ou scroll para zoom • Duplo clique para resetar
        </p>
      )}
    </div>
  );
};