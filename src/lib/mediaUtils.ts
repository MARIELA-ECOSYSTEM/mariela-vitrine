 /**
  * Utilitário para padronizar propriedades de performance de mídia (img, video).
  * Centraliza o suporte a fetchPriority, loading e decoding.
  */
 
 export type MediaPriority = "high" | "low" | "auto";
 
 interface MediaProps {
   loading?: "lazy" | "eager";
   decoding?: "async" | "sync" | "auto";
   fetchPriority?: MediaPriority;
   preload?: "auto" | "metadata" | "none";
 }
 
 /**
  * Retorna as propriedades de performance ideais para uma imagem ou vídeo.
  * 
  * @param isAboveFold - Se a mídia está no topo da página (acima da dobra).
  * @param priority - Prioridade explícita se desejar sobrescrever o padrão da dobra.
  */
 export function getMediaPerformanceProps(
   isAboveFold: boolean = false,
   priority?: MediaPriority
 ): MediaProps {
   const effectivePriority = priority || (isAboveFold ? "high" : "auto");
   
   return {
     loading: isAboveFold ? "eager" : "lazy",
     decoding: "async",
     fetchPriority: effectivePriority,
   };
 }
 
 /**
  * Helper para aplicar as props de mídia de forma segura no React 18+.
  * Garante que o fetchPriority seja passado corretamente.
  */
 export function applyMediaProps(isAboveFold: boolean = false, priority?: MediaPriority) {
   const props = getMediaPerformanceProps(isAboveFold, priority);
   
   return {
     loading: props.loading,
     decoding: props.decoding,
     fetchPriority: props.fetchPriority,
     preload: isAboveFold ? "auto" : "metadata",
   };
 }
 
 /**
  * Injeta um <link rel="preload"> no head de forma padronizada.
  */
 export function injectMediaPreload(url: string, as: "image" | "video", priority: MediaPriority = "high"): void {
   if (typeof document === "undefined") return;
   const selector = `link[data-media-preload="${CSS.escape(url)}"]`;
   if (document.head.querySelector(selector)) return;
 
   const link = document.createElement("link");
   link.rel = "preload";
   link.as = as;
   link.href = url;
   if (priority !== "auto") {
     link.setAttribute("fetchpriority", priority); // Atributo HTML nativo é sempre lowercase
   }
   link.dataset.mediaPreload = url;
   document.head.appendChild(link);
 }