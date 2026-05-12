 /**
  * Utilitário para padronizar propriedades de performance de mídia (img, video).
  * Centraliza o suporte a fetchPriority, loading e decoding.
  */
 
 export type MediaPriority = "high" | "low" | "auto";
 
 interface MediaProps {
   loading?: "lazy" | "eager";
   decoding?: "async" | "sync" | "auto";
   fetchpriority?: MediaPriority;
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
     fetchpriority: effectivePriority,
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
     // Usamos fetchpriority (lowercase) para evitar avisos no React 18 e garantir 
     // que o atributo seja passado corretamente para o DOM.
     fetchpriority: props.fetchpriority,
   };
 }