import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProductImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  slideDirection?: 'left' | 'right' | null;
  priority?: boolean; // Para imagens acima do fold
}

// Cache em memória de URLs já carregadas com sucesso. Evita criar várias
// instâncias de Image() para a mesma URL e permite troca instantânea ao
// alternar cores repetidas (sem flicker e sem novo round-trip de rede).
const loadedImageCache = new Set<string>();
const inflightLoaders = new Map<string, Promise<void>>();

export function preloadImage(src: string): Promise<void> {
  if (loadedImageCache.has(src)) return Promise.resolve();
  const existing = inflightLoaders.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      loadedImageCache.add(src);
      inflightLoaders.delete(src);
      resolve();
    };
    img.onerror = () => {
      inflightLoaders.delete(src);
      reject();
    };
    img.src = src;
  });
  inflightLoaders.set(src, promise);
  return promise;
}

/**
 * Preload em background com priorização. As primeiras URLs são carregadas
 * imediatamente; o restante aguarda `requestIdleCallback` (com fallback a
 * setTimeout) para não competir com a renderização inicial. Respeita o cache
 * existente — nunca dispara fetch duplicado para a mesma URL.
 */
export function preloadImagesPrioritized(
  urls: Array<string | null | undefined>,
  immediateCount = 2,
) {
  const unique = Array.from(
    new Set(
      urls
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter((u) => u.length > 0),
    ),
  );
  const immediate = unique.slice(0, immediateCount);
  const deferred = unique.slice(immediateCount);
  immediate.forEach((u) => {
    preloadImage(u).catch(() => {});
  });
  if (deferred.length === 0) return;
  const runDeferred = () => {
    deferred.forEach((u) => {
      preloadImage(u).catch(() => {});
    });
  };
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(runDeferred, { timeout: 1500 });
  } else {
    window.setTimeout(runDeferred, 250);
  }
}

// Gerar uma cor dominante baseada no hash da URL (placeholder colorido)
function generatePlaceholderColor(src: string): string {
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = src.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 15%, 85%)`;
}

export const ProductImageSkeleton = ({ 
  src, 
  alt, 
  className, 
  slideDirection,
  priority = false 
}: ProductImageSkeletonProps) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const imgRef = useRef<HTMLDivElement>(null);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);
  // `displaySrc` é o src efetivamente exibido. Mantemos a imagem anterior
  // visível até a nova carregar via Image() preload — evita flicker ao trocar
  // de cor no ProductDetail. Primeira carga ainda passa pelo ciclo normal.
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const isFirstSrcRef = useRef(true);
  // Imagem anterior mantida durante o cross-fade ao trocar de URL.
  // Fica visível por baixo da nova imagem por ~180ms para suavizar a troca.
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);
  // Último src solicitado por prop — usado para descartar resultados de
  // preloads obsoletos quando o usuário troca de cor rapidamente.
  const latestRequestedSrcRef = useRef<string>(src);

  // Placeholder color baseado na URL
  const placeholderColor = useMemo(() => generatePlaceholderColor(src), [src]);

  // Gerar um blur placeholder tiny (usando canvas)
  useEffect(() => {
    if (!isInView || !src) return;
    
    // Criar uma versão tiny da imagem para blur
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Imagem muito pequena (10x10) para blur rápido
        const size = 10;
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        setBlurDataUrl(canvas.toDataURL('image/jpeg', 0.1));
      } catch {
        // CORS ou outro erro - ignorar silenciosamente
      }
    };
    
    img.src = src;
  }, [src, isInView]);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority) return; // Skip observer for priority images
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Preload 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Troca de src: na PRIMEIRA carga deixamos o fluxo normal (skeleton/blur).
  // Em trocas subsequentes (ex.: troca de cor), pré-carregamos a nova imagem
  // em memória e só atualizamos `displaySrc` quando ela estiver pronta —
  // mantendo a imagem atual visível e eliminando o flicker.
  useEffect(() => {
    if (!isInView || !src) return;
    if (isFirstSrcRef.current) {
      isFirstSrcRef.current = false;
      setDisplaySrc(src);
      setLoadState('loading');
      setBlurDataUrl(null);
      latestRequestedSrcRef.current = src;
      return;
    }
    if (src === displaySrc) return;
    latestRequestedSrcRef.current = src;
    let cancelled = false;
    const swap = () => {
      if (cancelled) return;
      // Descarta se uma nova troca já foi solicitada nesse meio tempo.
      if (latestRequestedSrcRef.current !== src) return;
      // Mantém a imagem anterior visível durante o fade.
      setPreviousSrc(displaySrc);
      setDisplaySrc(src);
      setLoadState('loaded');
      setIsSwapping(true);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        setIsSwapping(false);
        setPreviousSrc(null);
        fadeTimerRef.current = null;
      }, 180);
    };
    preloadImage(src).then(swap).catch(() => {
      if (cancelled) return;
      // Fallback seguro: se a nova imagem falhou, NÃO trocamos o src nem
      // aplicamos fade — mantemos a imagem anterior visível para evitar
      // qualquer quebra visual. O erro fica silencioso.
    });
    return () => {
      cancelled = true;
    };
  }, [src, isInView, displaySrc]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return (
    <div 
      ref={imgRef} 
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Blur placeholder */}
      {blurDataUrl && loadState === 'loading' && (
        <img
          src={blurDataUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
        />
      )}
      
      {/* Shimmer overlay while loading */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]"
            style={{ transform: 'translateX(-100%)' }}
          />
        </div>
      )}
      
      {/* Main image - only load when in viewport */}
      {isInView && (
        <>
          {/* Imagem anterior — fica por baixo durante o cross-fade da troca de cor. */}
          {previousSrc && previousSrc !== displaySrc && (
            <img
              src={previousSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <img
            src={displaySrc}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            className={cn(
              "relative w-full h-full object-cover",
              // Carga inicial: fade lento + zoom sutil (mantém UX original).
              loadState === 'loading' && "opacity-0 scale-[1.02] transition-all duration-700 ease-out",
              loadState !== 'loading' && !isSwapping && "opacity-100 scale-100 transition-all duration-700 ease-out",
              // Troca de cor: cross-fade curto (~200ms) sem zoom, ease-out
              // consistente entre desktop e mobile.
              isSwapping && "opacity-0 transition-opacity duration-200 ease-out animate-[fade-in_200ms_ease-out_forwards]",
              slideDirection === 'left' && "animate-slide-left",
              slideDirection === 'right' && "animate-slide-right"
            )}
            onLoad={() => setLoadState('loaded')}
            onError={() => {
              // Só marcamos erro na PRIMEIRA carga (quando ainda não há
              // imagem renderizada). Em trocas posteriores, a imagem
              // anterior continua visível e o erro é silencioso.
              if (loadState === 'loading') setLoadState('error');
            }}
          />
        </>
      )}
      
      {/* Error state */}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
          <div className="text-center p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-muted-foreground text-xs">Imagem indisponível</span>
          </div>
        </div>
      )}
    </div>
  );
};
