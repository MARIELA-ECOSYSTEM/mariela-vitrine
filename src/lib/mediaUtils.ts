 /**
  * Utilitário para padronizar propriedades de performance de mídia (img, video).
  * Centraliza o suporte a fetchPriority, loading e decoding.
  * Nota sobre o React 18: fetchPriority deve ser passado como camelCase 
  * nos tipos, mas o React 18 ainda pode emitir avisos no console pedindo 
  * lowercase fetchpriority se não for reconhecido como prop nativa.
  */
 
 export type MediaPriority = "high" | "low" | "auto";
 
 export interface MediaProps {
   loading?: "lazy" | "eager";
   decoding?: "async" | "sync" | "auto";
   fetchPriority?: MediaPriority;
   preload?: "auto" | "metadata" | "none";
 }
 
 /** Registro interno para o relatório de debug */
 const mediaRegistry = new Map<string, { type: "image" | "video"; priority: MediaPriority; isAboveFold: boolean; preloaded: boolean }>();
 
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
 export function applyMediaProps(src: string | undefined, isAboveFold: boolean = false, priority?: MediaPriority) {
   const props = getMediaPerformanceProps(isAboveFold, priority);
   
   if (import.meta.env.DEV && src) {
     const current = mediaRegistry.get(src);
     mediaRegistry.set(src, { 
       type: src.match(/\.(mp4|webm|ogg)$/i) ? "video" : "image",
       priority: props.fetchPriority || "auto",
       isAboveFold,
       preloaded: current?.preloaded || false
     });
   }
 
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
   if (typeof document === "undefined" || !url) return;
   
   if (import.meta.env.DEV) {
     const current = mediaRegistry.get(url);
     mediaRegistry.set(url, { 
       type: as,
       priority: priority,
       isAboveFold: current?.isAboveFold || true,
       preloaded: true 
     });
   }
 
   // Fallback para CSS.escape se não estiver disponível (ex: JSDOM antigo ou SSR)
   const safeUrl = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(url) : url.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, "\\$&");
   const selector = `link[data-media-preload="${safeUrl}"]`;
   
   try {
     if (document.head.querySelector(selector)) return;
   } catch {
     // Fallback se o seletor complexo falhar
     const existing = Array.from(document.head.querySelectorAll('link[data-media-preload]'))
       .find(l => l.getAttribute('data-media-preload') === url);
     if (existing) return;
   }
 
   const link = document.createElement("link");
   link.rel = "preload";
   link.as = as;
   link.href = url;
   if (priority !== "auto") {
     link.setAttribute("fetchpriority", priority);
   }
   link.dataset.mediaPreload = url;
   document.head.appendChild(link);
 }
 
 /**
  * Gera o relatório técnico de performance de mídia para o modo debug.
  */
 export function getMediaPerformanceReport() {
   if (!import.meta.env.DEV) return null;
   
   const stats = {
     total: mediaRegistry.size,
     highPriority: 0,
     preloaded: 0,
     items: [] as any[]
   };
 
   mediaRegistry.forEach((data, url) => {
     if (data.priority === "high") stats.highPriority++;
     if (data.preloaded) stats.preloaded++;
     stats.items.push({ url: url.slice(-30), ...data });
   });
 
   return stats;
 }
 
 /**
  * Valida inconsistências de preload no head (apenas em DEV).
  */
 export function validateHeadPreloads() {
   if (!import.meta.env.DEV || typeof document === "undefined") return [];
   
   const issues: string[] = [];
   const preloads = document.head.querySelectorAll('link[rel="preload"]');
   const urls = new Set<string>();
 
   preloads.forEach((link: any) => {
     const href = link.href;
     if (!href) issues.push("Link de preload sem URL detectado.");
     if (urls.has(href)) issues.push(`Preload duplicado para: ${href.slice(-30)}`);
     urls.add(href);
     
     const priority = link.getAttribute('fetchpriority');
     if (priority && !["high", "low", "auto"].includes(priority)) {
       issues.push(`Prioridade inválida ("${priority}") em preload: ${href.slice(-30)}`);
     }
   });
 
   return issues;
 }