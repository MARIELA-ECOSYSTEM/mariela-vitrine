import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProductImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  slideDirection?: 'left' | 'right' | null;
  priority?: boolean; // Para imagens acima do fold
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

  // Reset state when src changes
  useEffect(() => {
    setLoadState('loading');
    setBlurDataUrl(null);
  }, [src]);

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
        <img
          key={src}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-out",
            loadState === 'loading' ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100",
            slideDirection === 'left' && "animate-slide-left",
            slideDirection === 'right' && "animate-slide-right"
          )}
          onLoad={() => setLoadState('loaded')}
          onError={() => setLoadState('error')}
        />
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
