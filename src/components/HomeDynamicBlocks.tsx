 import { memo, useEffect, useRef } from "react";
 import { Button } from "@/components/ui/button";
 import { Link } from "react-router-dom";
 import { cn } from "@/lib/utils";
 import { Instagram, ArrowRight } from "lucide-react";
 
 interface BannerBlockProps {
   titulo: string | null;
   subtitulo: string | null;
   mediaUrl?: string;
   mediaType?: "image" | "video" | "gif";
   posterUrl?: string;
   ctaLabel?: string;
   ctaUrl?: string;
   priority?: boolean;
 }
 
 export const BannerBlock = memo(({ titulo, subtitulo, mediaUrl, mediaType, posterUrl, ctaLabel, ctaUrl, priority = false }: BannerBlockProps) => {
   const videoRef = useRef<HTMLVideoElement>(null);
 
   useEffect(() => {
     if (mediaType === "video" && videoRef.current) {
       // Autoplay seguro tratado com Promise para evitar erros de console
       // quando o navegador bloqueia o autoplay (silencioso em produção)
       const playPromise = videoRef.current.play();
       if (playPromise !== undefined) {
         playPromise.catch(() => {
           /* Autoplay bloqueado pelo navegador — comportamento esperado */
         });
       }
     }
   }, [mediaType, mediaUrl]);
 
   if (!mediaUrl) return null;
 
   return (
     <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-xl bg-muted group">
       {mediaType === "video" ? (
         <video
           ref={videoRef}
           src={mediaUrl}
           muted
           loop
           playsInline
           preload={priority ? "auto" : "metadata"}
           poster={posterUrl}
           className="absolute inset-0 w-full h-full object-cover"
         />
       ) : (
         <img
           src={mediaUrl}
           alt={titulo || "Banner"}
           loading={priority ? "eager" : "lazy"}
           fetchpriority={priority ? "high" : "auto"}
           className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
         />
       )}
       <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center text-center p-6 sm:p-12">
         {titulo && (
           <h2 className="text-white text-2xl sm:text-4xl md:text-5xl font-serif font-bold mb-2 sm:mb-4 drop-shadow-md">
             {titulo}
           </h2>
         )}
         {subtitulo && (
           <p className="text-white/90 text-sm sm:text-lg md:text-xl max-w-2xl mb-4 sm:mb-8 drop-shadow-sm line-clamp-2">
             {subtitulo}
           </p>
         )}
         {ctaLabel && ctaUrl && (
           <Button asChild size="lg" className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all">
             <Link to={ctaUrl}>{ctaLabel}</Link>
           </Button>
         )}
       </div>
     </div>
   );
 });
 
 interface InstagramBlockProps {
   titulo: string | null;
   subtitulo: string | null;
   posts?: Array<{
     id: string;
     url: string;
     mediaUrl: string;
     caption?: string;
   }>;
 }
 
 export const InstagramBlock = memo(({ titulo, subtitulo, posts }: InstagramBlockProps) => {
   if (!posts || posts.length === 0) return null;
 
   return (
     <div className="py-8">
       <div className="flex flex-col items-center mb-8">
         <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center mb-3">
           <Instagram className="text-white w-6 h-6" />
         </div>
         {titulo && <h2 className="text-xl sm:text-2xl font-serif font-bold">{titulo}</h2>}
         {subtitulo && <p className="text-muted-foreground text-sm">{subtitulo}</p>}
       </div>
       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 px-2 sm:px-6">
         {posts.slice(0, 4).map((post) => (
           <a
             key={post.id}
             href={post.url}
             target="_blank"
             rel="noopener noreferrer"
             className="relative aspect-square overflow-hidden rounded-lg group"
           >
             <img
               src={post.mediaUrl}
               alt={post.caption || "Instagram post"}
               className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
             />
             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
               <Instagram className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8" />
             </div>
           </a>
         ))}
       </div>
       <div className="mt-8 text-center">
         <Button variant="outline" asChild className="gap-2">
           <a href="https://instagram.com/marielaloja_" target="_blank" rel="noopener noreferrer">
             Seguir no Instagram <ArrowRight className="w-4 h-4" />
           </a>
         </Button>
       </div>
     </div>
   );
 });
 
 BannerBlock.displayName = "BannerBlock";
 InstagramBlock.displayName = "InstagramBlock";