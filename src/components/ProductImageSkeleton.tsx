import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProductImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  slideDirection?: 'left' | 'right' | null;
}

export const ProductImageSkeleton = ({ src, alt, className, slideDirection }: ProductImageSkeletonProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
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
        rootMargin: "100px", // Preload 100px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn("relative w-full h-full", className)}>
      {/* Shimmer skeleton while loading */}
      {isLoading && (
        <div className="absolute inset-0 w-full h-full bg-muted overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
          />
        </div>
      )}
      
      {/* Only load image when in viewport */}
      {isInView && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100",
            slideDirection === 'left' && "animate-slide-left",
            slideDirection === 'right' && "animate-slide-right"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-muted-foreground text-sm">Imagem indisponível</span>
        </div>
      )}
    </div>
  );
};
