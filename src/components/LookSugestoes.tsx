import { useEffect, useState } from "react";
import { vitrineApiService, LookSugestao } from "@/services/vitrineApiService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyMediaProps } from "@/lib/mediaUtils";

interface LookSugestoesProps {
  onSelectLook: (produtoIds: string[]) => void;
}

export const LookSugestoes = ({ onSelectLook }: LookSugestoesProps) => {
  const [sugestoes, setSugestoes] = useState<LookSugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const isDev = import.meta.env.DEV;
  const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugLooks") === "1";

  useEffect(() => {
    const loadSugestoes = async () => {
      try {
        const blocks = await vitrineApiService.getHomeBlocks();
        const blockML = blocks.find(b => b.config.sugestoes_monte_look);
        const looks = blockML?.config.sugestoes_monte_look || [];
        
        if (isDev && isDebug) {
          console.group("[MonteSeuLook] Sugestões Recebidas");
          console.info("Bloco ML:", blockML);
          console.info("Sugestões:", looks);
          console.groupEnd();
        }

        setSugestoes(looks.slice(0, 3));
      } catch (error) {
        console.error("[LookSugestoes] Erro ao carregar sugestões:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSugestoes();
  }, [isDev, isDebug]);

  if (loading || sugestoes.length === 0) return null;

  return (
    <section className="mb-10 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
          Sugestões de Looks
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sugestoes.map((sugestao) => (
          <Card key={sugestao.id} className="group overflow-hidden border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md bg-card flex flex-col">
            <div className="relative aspect-[4/5] bg-muted overflow-hidden">
              {sugestao.mediaType === "video" ? (
                <div className="relative w-full h-full">
                  <video
                    {...applyMediaProps(sugestao.mediaUrl, true, "high")}
                    poster={sugestao.posterUrl}
                    autoPlay
                    loop
                    muted={muted}
                    playsInline
                    className="w-full h-full object-cover"
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
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <Button 
                  onClick={() => onSelectLook(sugestao.produtos)}
                  className="w-full bg-white text-black hover:bg-white/90 gap-2 font-semibold"
                >
                  <ShoppingBag className="h-4 w-4" />
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
    </section>
  );
};