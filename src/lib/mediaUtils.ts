 /**
  * Utilitário para padronizar propriedades de performance de mídia (img, video).
  * Centraliza o suporte a fetchPriority, loading e decoding.
  */
 
 export type MediaPriority = "high" | "low" | "auto";
 
 interface MediaProps {
   loading?: "lazy" | "eager";
   decoding?: "async" | "sync" | "auto";
   fetchPriority?: MediaPriority;
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
     // Usamos fetchPriority camelCase pois o usuário solicitou esta grafia como padrão.
     // Estendemos os tipos globais para suportar esta prop no React 18.
     fetchPriority: props.fetchPriority,
   };
 }