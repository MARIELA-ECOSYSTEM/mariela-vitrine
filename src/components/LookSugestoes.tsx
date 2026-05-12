import { useEffect, useState } from "react";
import { vitrineApiService, LookSugestao, LookManual } from "@/services/vitrineApiService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, ArrowRight, Volume2, VolumeX, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyMediaProps } from "@/lib/mediaUtils";

interface LookSugestoesProps {
  onSelectLook: (produtoIds: string[]) => void;
}

export const LookSugestoes = ({ onSelectLook }: LookSugestoesProps) => {
  const [sugestoes, setSugestoes] = useState<LookSugestao[]>([]);
  const [looksManuais, setLooksManuais] = useState<LookManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const isDev = import.meta.env.DEV;
  const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugLooks") === "1";

  useEffect(() => {
    const loadSugestoes = async () => {
      try {
        const blocks = await vitrineApiService.getHomeBlocks();
        const blockML = blocks.find(b => b.config.sugestoes_monte_look || b.config.looks_manuais);
        const looks = blockML?.config.sugestoes_monte_look || [];
        const manuais = blockML?.config.looks_manuais || [];
        
        if (isDev && isDebug) {
          console.group("[MonteSeuLook] Sugestões Recebidas");
          console.info("Bloco ML:", blockML);
          console.info("Sugestões:", looks);
          console.info("Looks Manuais:", manuais);
          console.groupEnd();
        }

        setSugestoes(looks.slice(0, 3));
        setLooksManuais(manuais);
      } catch (error) {
        console.error("[LookSugestoes] Erro ao carregar sugestões:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSugestoes();
  }, [isDev, isDebug]);

  if (loading || (sugestoes.length === 0 && looksManuais.length === 0)) return null;

  return (
    <section className="mb-10 animate-fade-in">
      {sugestoes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
              Sugestões de Looks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sugestoes.map((sugestao, index) => (
              <Card 
                key={sugestao.id} 
                className="group overflow-hidden border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md bg-card flex flex-col"
              >
                <div 
                  className="relative aspect-[4/5] bg-muted overflow-hidden"
                  style={{ containIntrinsicSize: 'auto 400px', contentVisibility: 'auto' }}
                >
                  {sugestao.mediaType === "video" ? (
                    <div className="relative w-full h-full">
                    <video
                      {...applyMediaProps(sugestao.mediaUrl, index === 0, index === 0 ? "high" : "auto")}
                      poster={sugestao.posterUrl}
                      autoPlay
                      loop
                      muted={muted}
                      playsInline
                      className="w-full h-full object-cover"
                      aria-label={`Vídeo: ${sugestao.titulo}`}
                      onError={() => {
                        if (import.meta.env.DEV) console.warn(`[LookSugestoes] Erro ao carregar vídeo: ${sugestao.mediaUrl}`);
                      }}
                    />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-2 right-2 h-8 w-8 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white rounded-full z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMuted(!muted);
                        }}
                      >
                        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                  <img
                    src={sugestao.mediaUrl}
                    alt={sugestao.titulo}
                    {...applyMediaProps(sugestao.mediaUrl, index === 0, index === 0 ? "high" : "auto")}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={() => {
                      if (import.meta.env.DEV) console.warn(`[LookSugestoes] Erro ao carregar imagem: ${sugestao.mediaUrl}`);
                    }}
                  />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <Button 
                    onClick={() => onSelectLook(sugestao.produtos)}
                    className="w-full bg-white text-black hover:bg-white/90 gap-2 font-semibold"
                    aria-label={`${sugestao.ctaLabel || "Montar este Look"}: ${sugestao.titulo}`}
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    {sugestao.ctaLabel || "Montar este Look"}
                  </Button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-1">{sugestao.titulo}</h3>
                  {sugestao.subtitulo && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {sugestao.subtitulo}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {sugestao.produtos.length} peças vinculadas
                    </span>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => onSelectLook(sugestao.produtos)}
                      className="text-primary p-0 h-auto font-semibold gap-1"
                    >
                      Ver Detalhes
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {looksManuais.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
              Galeria de Looks
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {looksManuais.map((look) => (
              <button
                key={look.id}
                onClick={() => onSelectLook(look.produtos)}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-primary/5 hover:border-primary/20 transition-all text-left outline-none focus-visible:ring-2 ring-primary ring-offset-2"
                style={{ containIntrinsicSize: 'auto 200px', contentVisibility: 'auto' }}
                aria-label={`Visualizar look: ${look.nome}`}
              >
                {look.mediaUrl ? (
                  <img
                    src={look.mediaUrl}
                    alt={look.nome}
                    {...applyMediaProps(look.mediaUrl, false)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center bg-secondary/20">
                    <span className="text-sm font-medium text-muted-foreground">{look.nome}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="font-bold text-sm line-clamp-1">{look.nome}</p>
                  <p className="text-[10px] opacity-80">{look.produtos.length} peças</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
