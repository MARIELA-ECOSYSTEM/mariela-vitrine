import { LookManual, Produto } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ImagePlus, Sparkles, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { getProductImageByColor, handleProductImageError } from "@/lib/productImage";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface ManualLooksSectionProps {
  looks: LookManual[];
}

export const ManualLooksSection = ({ looks }: ManualLooksSectionProps) => {
  const { produtos } = useProducts();
  const [muted, setMuted] = useState(true);

  return (
    <section className="animate-fade-in pb-12 border-t border-border pt-12">
      <div className="flex items-center gap-2 mb-8">
        <ImagePlus className="h-5 w-5 text-primary" />
        <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
          Looks Prontos
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {looks.map((look) => (
          <ManualLookCard 
            key={look.id} 
            look={look} 
            allProducts={produtos} 
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
          />
        ))}
      </div>
    </section>
  );
};

interface ManualLookCardProps {
  look: LookManual;
  allProducts: Produto[];
  muted: boolean;
  onToggleMute: () => void;
}

const ManualLookCard = ({ look, allProducts, muted, onToggleMute }: ManualLookCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const isDev = import.meta.env.DEV;
  const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugLooks") === "1";

  const linkedProducts = look.produtos_vinculados
    .map((pid) => {
      const p = allProducts.find((p) => p.produtoId === pid || String(p.id) === pid);
      if (!p && isDev && isDebug) {
        console.warn(`[MonteSeuLook] Look Manual "${look.nome}": Produto vinculado não encontrado: ${pid}`);
      }
      return p;
    })
    .filter((p): p is Produto => !!p);

   useEffect(() => {
     if (look.midia_editorial_tipo === "video" && videoRef.current) {
       if (isPlaying) {
         videoRef.current.play().catch(() => setIsPlaying(false));
       } else {
         videoRef.current.pause();
       }
     }
   }, [isPlaying, look.midia_editorial_tipo]);

   if (mediaError) {
     if (isDev && isDebug) {
       console.warn(`[MonteSeuLook] Look Manual "${look.nome}" (${look.id}): Mídia editorial falhou ao carregar. Item omitido.`);
     }
     return null;
   }

  const handleSelectLook = () => {
    const event = new CustomEvent("monte-seu-look:select-products", {
      detail: { products: look.produtos_vinculados }
    });
    window.dispatchEvent(event);
    
    const builder = document.getElementById("look-builder-root");
    if (builder) {
      builder.scrollIntoView({ behavior: "smooth" });
    }
  };

  const hasMedia = look.midia_editorial_url && look.midia_editorial_tipo;

  return (
    <div 
      className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      tabIndex={0}
    >
      {/* Editorial Media */}
      {hasMedia && (
        <div className="relative aspect-[4/5] bg-muted overflow-hidden">
          {look.midia_editorial_tipo === "video" ? (
            <>
              <video
                ref={videoRef}
                src={look.midia_editorial_url!}
                muted={muted}
                loop
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => setMediaError(true)}
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                  className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                  aria-label={muted ? "Ativar som" : "Desativar som"}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                {!isPlaying && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                    className="p-1.5 rounded-full bg-primary/80 text-white backdrop-blur-sm hover:bg-primary transition-colors"
                    aria-label="Reproduzir vídeo"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <img
              src={look.midia_editorial_url!}
              alt={look.nome}
              loading="lazy"
              onError={() => setMediaError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-serif font-bold text-lg text-foreground mb-1 truncate">
          {look.nome}
        </h3>
        
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {linkedProducts.map((product) => (
            <div 
              key={product.id} 
              className="w-12 h-16 shrink-0 rounded-lg overflow-hidden border border-border bg-muted group/thumb relative"
              title={product.nome}
            >
              <img
                src={getProductImageByColor(product).src}
                alt={product.nome}
                onError={handleProductImageError}
                className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
              />
            </div>
          ))}
          {linkedProducts.length === 0 && !isDev && (
             <div className="w-full h-16 flex items-center justify-center bg-muted rounded-lg border border-dashed border-border">
               <span className="text-[10px] text-muted-foreground uppercase font-medium">Confira na loja</span>
             </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <Button 
            variant="default"
            className="w-full gap-2 rounded-xl h-10 shadow-sm"
            onClick={handleSelectLook}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Gostei, montar esse!</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-between group/btn text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl h-9 px-3"
            onClick={handleSelectLook}
          >
            <span className="text-xs font-medium">Ver detalhes das peças</span>
            <ChevronRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};