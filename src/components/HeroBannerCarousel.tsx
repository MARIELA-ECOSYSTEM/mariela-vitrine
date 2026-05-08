import { useEffect, useState } from "react";
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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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

  const currentBanner = colecoes?.[currentIndex];
  const bannerImage = currentBanner?.imagem_capa_url;

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
    if (!currentBanner) return;
    const params = new URLSearchParams();
    try {
      const current = new URLSearchParams(search);
      current.forEach((value, key) => {
        if (key.toLowerCase().startsWith("utm_")) params.set(key, value);
      });
    } catch {}
    params.set("colecaoId", currentBanner.id);
    navigate(`/products?${params.toString()}`);
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
      className="relative w-full h-[25vh] sm:h-[34vh] md:h-[42vh] lg:h-[48vh] overflow-hidden cursor-pointer"
      onClick={handleBannerClick}
    >
      {colecoes.map((colecao, idx) => (
        <div
          key={colecao.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          {colecao.imagem_capa_url && !imgErrors[colecao.id] ? (
            <img
              src={colecao.imagem_capa_url}
              alt={colecao.nome}
              className="w-full h-full object-cover"
              onError={() => setImgErrors(prev => ({ ...prev, [colecao.id]: true }))}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageOff className="w-12 h-12 text-muted-foreground/30" />
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
      ))}

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
        alt=""
        className="absolute top-4 right-4 h-10 sm:h-14 md:h-16 opacity-40 pointer-events-none z-20"
      />
    </section>
  );
};
