import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoSimple from "@/assets/logo-simple.png";
import { useHeaderOverlay } from "@/contexts/HeaderOverlayContext";
import { vitrineApiService, type ColecaoDestaque } from "@/services/vitrineApiService";
import { cn } from "@/lib/utils";
import { ImageOff, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroBannerCarousel = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { setBannerImage } = useHeaderOverlay();
  const [colecoes, setColecoes] = useState<ColecaoDestaque[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<Record<string, { error: boolean; reason?: string }>>({});
  const [loadTimes, setLoadTimes] = useState<Record<string, number>>({});
  const loadStartTimes = useRef<Record<string, number>>({});
  const isDebug = (import.meta.env.DEV && new URLSearchParams(search).get("debugColecoes") === "1") || 
                  new URLSearchParams(search).get("debugIntegracao") === "1";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    vitrineApiService.getColecoesDestaque()
      .then(items => {
        if (!cancelled) setColecoes(items);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  const currentColecao = colecoes?.[currentIndex];
  
  /**
   * Resolve a melhor mídia disponível seguindo a prioridade do contrato:
   * 1. home_destaque_url
   * 2. banner_url
   * 3. imagem_capa_url
   */
  const getBestMedia = (col: ColecaoDestaque) => {
    if (col.home_destaque_url && !mediaErrors[col.id]?.error) {
      return { url: col.home_destaque_url, type: col.home_destaque_tipo || "image", origin: "home_destaque" as const };
    }
    if (col.banner_url && !mediaErrors[`${col.id}-banner`]?.error) {
      return { url: col.banner_url, type: "image" as const, origin: "banner" as const, fallbackReason: col.home_destaque_url ? "Falha na mídia da home" : "Mídia da home não cadastrada" };
    }
    if (col.imagem_capa_url && !mediaErrors[`${col.id}-capa`]?.error) {
      return { url: col.imagem_capa_url, type: "image" as const, origin: "capa" as const, fallbackReason: col.banner_url ? "Falha no banner" : "Banner não cadastrado" };
    }
    return null;
  };

  const currentMedia = currentColecao ? getBestMedia(currentColecao) : null;
  // Banner de fundo do header: nunca usa vídeo.
  const bannerImage = currentMedia?.type !== "video" ? currentMedia?.url : (currentColecao?.banner_url || currentColecao?.imagem_capa_url);

  const handleMediaLoad = (id: string) => {
    if (loadStartTimes.current[id]) {
      const duration = performance.now() - loadStartTimes.current[id];
      setLoadTimes(prev => ({ ...prev, [id]: duration }));
    }
  };

  useEffect(() => {
    setBannerImage(bannerImage || null);
    return () => setBannerImage(null);
  }, [bannerImage, setBannerImage]);

  // Auto-play
  useEffect(() => {
    if (!colecoes || colecoes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % colecoes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [colecoes]);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!colecoes) return;
    setCurrentIndex(prev => (prev + 1) % colecoes.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!colecoes) return;
    setCurrentIndex(prev => (prev - 1 + colecoes.length) % colecoes.length);
  };

   const handleBannerClick = () => {
     if (!currentColecao) return;
     const params = new URLSearchParams();
     try {
       const current = new URLSearchParams(search);
       current.forEach((value, key) => {
         if (key.toLowerCase().startsWith("utm_")) params.set(key, value);
       });
     } catch (err) {
       console.error("[HeroBannerCarousel] Error parsing UTMs:", err);
     }
     const baseUrl = `/collections/${currentColecao.id}`;
     const queryString = params.toString();
     navigate(queryString ? `${baseUrl}?${queryString}` : baseUrl);
   };

  // Loading state com Skeleton para evitar layout shift
  if (colecoes === null && !failed) {
    return (
      <div 
        className="w-full h-[25vh] sm:h-[34vh] md:h-[42vh] lg:h-[48vh] bg-muted animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (failed || !colecoes || colecoes.length === 0) return null;

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative w-full h-[25vh] sm:h-[34vh] md:h-[42vh] lg:h-[48vh] overflow-hidden cursor-pointer"
      onClick={handleBannerClick}
    >
      {colecoes.map((colecao, idx) => {
        const media = getBestMedia(colecao);
        const isActive = idx === currentIndex;

        return (
          <div
            key={colecao.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${idx + 1} de ${colecoes.length}: ${colecao.nome}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              isActive ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            {media?.type === "video" && (isActive || Math.abs(idx - currentIndex) <= 1 || (currentIndex === colecoes.length - 1 && idx === 0) || (currentIndex === 0 && idx === colecoes.length - 1)) ? (
              <video
                src={media.url}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-full object-cover aspect-[16/7] sm:aspect-[21/9]"
                onLoadStart={() => { loadStartTimes.current[colecao.id] = performance.now(); }}
                onLoadedData={() => handleMediaLoad(colecao.id)}
                onError={() => setMediaErrors(prev => ({ ...prev, [colecao.id]: { error: true, reason: "Erro de decodificação ou rede" } }))}
                ref={(el) => {
                  if (!el) return;
                  if (isActive && isVisible) {
                    // Evita múltiplos play() e trata bloqueio de autoplay silenciosamente
                    if (el.paused) {
                      el.play().catch(() => {
                        // Falha silenciosa em produção; opcionalmente log em DEV via isDebug
                        if (isDebug) console.warn("[HeroBannerCarousel] Autoplay bloqueado pelo navegador");
                      });
                    }
                  } else if (!el.paused) {
                    el.pause();
                  }
                }}
              />
            ) : media?.url ? (
              <img
                src={media.url}
                alt={colecao.nome}
                loading={idx === 0 ? "eager" : "lazy"}
                {...({ fetchpriority: idx === 0 ? "high" : "auto" } as React.ImgHTMLAttributes<HTMLImageElement>)}
                className="w-full h-full object-cover aspect-[16/7] sm:aspect-[21/9]"
                onLoadStart={() => { 
                  const key = media.url === colecao.home_destaque_url ? colecao.id : 
                             media.url === colecao.banner_url ? `${colecao.id}-banner` : `${colecao.id}-capa`;
                  loadStartTimes.current[key] = performance.now(); 
                }}
                onLoad={() => {
                  const key = media.url === colecao.home_destaque_url ? colecao.id : 
                             media.url === colecao.banner_url ? `${colecao.id}-banner` : `${colecao.id}-capa`;
                  handleMediaLoad(key);
                }}
                onError={() => {
                  const key = media.url === colecao.home_destaque_url ? colecao.id : 
                             media.url === colecao.banner_url ? `${colecao.id}-banner` : `${colecao.id}-capa`;
                  setMediaErrors(prev => ({ ...prev, [key]: { error: true, reason: "Falha ao carregar arquivo" } }));
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageOff className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
            
            {isDebug && import.meta.env.DEV && (
              <div className="absolute top-4 left-4 z-50 bg-black/85 text-white p-2.5 text-[10px] rounded-md font-mono shadow-xl border border-white/10 backdrop-blur-sm">
                <p className="font-bold border-b border-white/20 pb-1 mb-1 text-primary">DEBUG MÍDIA</p>
                <p>Tipo: <span className="text-primary">{media?.type || "N/A"}</span></p>
                <p>Origem: <span className="text-green-400">{media?.origin || "fallback"}</span></p>
                {media?.fallbackReason && <p className="text-yellow-400">Motivo: {media.fallbackReason}</p>}
                <p>URL: ...{media?.url?.slice(-20) || "N/A"}</p>
                {loadTimes[media?.url === colecao.home_destaque_url ? colecao.id : 
                           media?.url === colecao.banner_url ? `${colecao.id}-banner` : `${colecao.id}-capa`] && (
                  <p>Carga: <span className="text-blue-400">{loadTimes[media?.url === colecao.home_destaque_url ? colecao.id : 
                             media?.url === colecao.banner_url ? `${colecao.id}-banner` : `${colecao.id}-capa`].toFixed(0)}ms</span></p>
                )}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            
            {colecao.cor_destaque && (
              <div 
                className="absolute top-0 left-0 right-0 h-1.5 opacity-80" 
                style={{ backgroundColor: colecao.cor_destaque }}
                aria-hidden
              />
            )}

            <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 lg:bottom-14 lg:left-14 max-w-[85%] sm:max-w-[70%] animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-medium text-white uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Destaque
                </span>
              </div>
              <h1 className="font-serif text-white text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg leading-tight">
                {colecao.nome}
              </h1>
              {colecao.descricao && (
                <p className="text-white/90 text-xs sm:text-base md:text-lg mt-2 sm:mt-3 drop-shadow line-clamp-2 max-w-2xl font-medium">
                  {colecao.descricao}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {colecoes.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white hover:bg-white/10 hidden sm:flex"
            onClick={prev}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white/50 hover:text-white hover:bg-white/10 hidden sm:flex"
            onClick={next}
            aria-label="Próximo"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {colecoes.map((_, idx) => (
              <button
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Logo watermark */}
      <img
        src={logoSimple}
        alt="Logo Mariela"
        className="absolute top-4 right-4 h-10 sm:h-14 md:h-16 opacity-40 pointer-events-none z-20"
      />
    </section>
  );
};
