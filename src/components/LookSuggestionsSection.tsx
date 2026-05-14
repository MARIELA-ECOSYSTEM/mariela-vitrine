import { LookSuggestion } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { handleProductImageError } from "@/lib/productImage";

interface LookSuggestionsSectionProps {
  sugestoes: LookSuggestion[];
}

export const LookSuggestionsSection = ({ sugestoes }: LookSuggestionsSectionProps) => {
  const [muted, setMuted] = useState(true);
  const topSugestoes = sugestoes.slice(0, 3);

  return (
    <section className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
          Sugestões de Looks
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topSugestoes.map((sugestao) => (
          <SuggestionCard 
            key={sugestao.id} 
            sugestao={sugestao} 
            muted={muted} 
            onToggleMute={() => setMuted(!muted)} 
          />
        ))}
      </div>
    </section>
  );
};

interface SuggestionCardProps {
  sugestao: LookSuggestion;
  muted: boolean;
  onToggleMute: () => void;
}

const SuggestionCard = ({ sugestao, muted, onToggleMute }: SuggestionCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

   const isDev = import.meta.env.DEV;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

   useEffect(() => {
     if (sugestao.midia_tipo === "video" && videoRef.current) {
       if (isInView) {
         videoRef.current.play().catch(() => setIsPlaying(false));
       } else {
         videoRef.current.pause();
       }
     }
   }, [sugestao.midia_tipo, isInView]);

   if (mediaError) {
     if (isDev) {
       console.warn(`[MonteSeuLook] Sugestão "${sugestao.titulo}" (${sugestao.id}): Mídia editorial falhou ao carregar. Item omitido.`);
     }
     return null;
   }

  const handleMontarLook = () => {
    // Emit an event to select products in the builder
    const event = new CustomEvent("monte-seu-look:select-products", {
      detail: { products: sugestao.produtos_vinculados }
    });
    window.dispatchEvent(event);
    
    // Scroll to builder
    const builder = document.getElementById("look-builder-root");
    if (builder) {
      builder.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="group relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      tabIndex={0}
    >
      {/* Media Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {sugestao.midia_tipo === "video" && (
          <>
            {isInView ? (
              <video
                ref={videoRef}
                src={sugestao.midia_url}
                poster={sugestao.poster_url || undefined}
                muted={muted}
                loop
                playsInline
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => setMediaError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {sugestao.poster_url ? (
                  <img src={sugestao.poster_url} className="w-full h-full object-cover" alt={`Sugestão de look: ${sugestao.titulo}`} />
                ) : (
                  <Play className="h-10 w-10 text-primary opacity-20" />
                )}
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex gap-2">
               {/* Controls only shown if video is in DOM */}
               {isInView && (
                 <>
                    <button
                      onClick={onToggleMute}
                      className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
                      aria-label={muted ? "Ativar som" : "Desativar som"}
                    >
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    {!isPlaying && (
                      <button
                        onClick={() => setIsPlaying(true)}
                        className="p-1.5 rounded-full bg-primary/80 text-white backdrop-blur-sm hover:bg-primary transition-colors"
                        aria-label="Reproduzir vídeo"
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </button>
                    )}
                 </>
               )}
            </div>
          </>
        )}
        {sugestao.midia_tipo !== "video" && (
          <img
            src={sugestao.midia_url}
            alt={sugestao.titulo}
            loading="lazy"
            onError={handleProductImageError}
            onLoad={(e) => { if (!e.currentTarget.complete) setMediaError(true); }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-serif font-bold text-lg mb-1 text-foreground leading-tight">
          {sugestao.titulo}
        </h3>
        {sugestao.subtitulo && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {sugestao.subtitulo}
          </p>
        )}
        
        <div className="mt-auto">
          <Button 
            onClick={handleMontarLook}
            className="w-full gap-2 rounded-xl"
            variant="outline"
          >
            <Sparkles className="h-4 w-4" />
            Ver Produtos
          </Button>
        </div>
      </div>
    </div>
  );
};