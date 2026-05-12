import { LookSuggestion } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (sugestao.midia_tipo === "video" && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, sugestao.midia_tipo]);

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
    <div className="group relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
      {/* Media Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {sugestao.midia_tipo === "video" ? (
          <>
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
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                onClick={onToggleMute}
                className="p-1.5 rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {!isPlaying && (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="p-1.5 rounded-full bg-primary/80 text-white backdrop-blur-sm hover:bg-primary transition-colors"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
              )}
            </div>
          </>
        ) : (
          <img
            src={sugestao.midia_url}
            alt={sugestao.titulo}
            loading="lazy"
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