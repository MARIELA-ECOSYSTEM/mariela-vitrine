import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ProductImageSkeleton } from "./ProductImageSkeleton";
import { ImageOff, Play, VolumeX, Volume2 } from "lucide-react";

interface ProductMediaProps {
  type: "image" | "video";
  url: string;
  posterUrl?: string | null;
  alt: string;
  className?: string;
  autoPlayOnHover?: boolean;
  autoPlayOnVisible?: boolean;
  isMuted?: boolean;
  loop?: boolean;
  priority?: boolean;
  onVideoPlay?: () => void;
  onVideoPause?: () => void;
  onVideoError?: () => void;
  debug?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}

export const ProductMedia = ({
  type,
  url,
  posterUrl,
  alt,
  className,
  autoPlayOnHover = false,
  autoPlayOnVisible = false,
  isMuted = true,
  loop = true,
  priority = false,
  onVideoPlay,
  onVideoPause,
  onVideoError,
  debug = false,
  fetchPriority = "auto",
}: ProductMediaProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to handle autoplay on visible and pause on hidden
  useEffect(() => {
    if (type !== "video" || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
        
        if (!entry.isIntersecting && isPlaying) {
          videoRef.current?.pause();
          setIsPlaying(false);
          onVideoPause?.();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [type, isPlaying, onVideoPause]);

  // Handle playback logic
  useEffect(() => {
    if (type !== "video" || !videoRef.current || videoError) return;

    const shouldPlay = (autoPlayOnVisible && isVisible) || (autoPlayOnHover && isHovering);
    
    if (shouldPlay && !isPlaying) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            onVideoPlay?.();
          })
          .catch((err) => {
            if (debug) console.debug("[ProductMedia] Autoplay blocked or failed:", err);
            setIsPlaying(false);
          });
      }
    } else if (!shouldPlay && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onVideoPause?.();
    }
  }, [type, isHovering, isVisible, isPlaying, autoPlayOnHover, autoPlayOnVisible, videoError, debug, onVideoPlay, onVideoPause]);

  if (type === "image" || videoError) {
    return (
      <ProductImageSkeleton
        src={videoError && posterUrl ? posterUrl : url}
        alt={alt}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden bg-muted", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={url}
        poster={posterUrl || undefined}
        muted={isMuted}
        loop={loop}
        playsInline
        aria-label={alt}
        className="w-full h-full object-cover"
        onError={() => {
          setVideoError(true);
          onVideoError?.();
          if (debug) console.warn("[ProductMedia] Video load error:", url);
        }}
        // @ts-ignore - fetchPriority is standard in modern browsers but missing in some TS definitions
        fetchpriority={priority ? "high" : fetchPriority}
      />
      
      {!isPlaying && posterUrl && (
        <div className="absolute inset-0 z-0">
          <img 
            src={posterUrl} 
            alt={alt} 
            className="w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      )}

      {debug && (
        <div className="absolute top-2 left-2 z-20 bg-black/70 text-white text-[8px] p-1 rounded font-mono uppercase">
          {isVisible ? "Visible" : "Hidden"} | {isPlaying ? "Playing" : "Paused"} | {isHovering ? "Hover" : "No Hover"}
        </div>
      )}
      
      {/* Safe Volume toggle could be added here if needed */}
    </div>
  );
};