 import { useState, useEffect, useRef, useMemo, useCallback } from "react";
 import { cn } from "@/lib/utils";
 import { applyMediaProps } from "@/lib/mediaUtils";

interface ProductImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  slideDirection?: 'left' | 'right' | null;
  priority?: boolean; // Para imagens acima do fold
  /**
   * Habilita blur-up (placeholder desfocado) APENAS na imagem principal.
   * Cards/thumbs devem deixar `false` para evitar custo de canvas.
   * Default: `false` para preservar comportamento atual em cards.
   */
  enableBlurUp?: boolean;
  /**
   * Modo "trilho" estilo Posthaus/Swiper. Quando `images` + `currentIndex`
   * são passados, o componente renderiza 3 slots horizontais (prev/cur/next)
   * e desliza com `transform: translateX` + cubic-bezier. As setas/swipe
   * apenas mudam o índice — a animação fica 100% por conta do CSS, sem
   * trocar `src` (zero flicker, máxima fluidez).
   *
   * Quando ausente, o componente mantém o modo legado (cross-fade do `src`)
   * — usado em troca de cor cujo destino não é necessariamente vizinho.
   */
  images?: string[];
  currentIndex?: number;
  /**
   * Quando true, o estado de erro fica silencioso (sem overlay visível).
   * Usado nos slots laterais do trilho para evitar que uma falha em
   * vizinho "cego" pinte "Imagem indisponível" sob a imagem principal.
   */
  silentError?: boolean;
}

// =====================================================================
// Cache + preload de imagens com URL normalizada e cancelamento
// ---------------------------------------------------------------------
// - URL normalizada: a chave de cache ignora parâmetros de redimensiona-
//   mento/qualidade (`?w/?h/?q/...`), então `imagem_thumb` (?w=300) e
//   `imagem_full` (?w=800) da MESMA foto compartilham o mesmo "carrega-
//   mento conceitual" e nunca são re-fetched quando o usuário alterna
//   cor → seta → cor.
// - Refcount/cancelamento: cada chamada de `preloadImage` registra
//   interesse (refcount++). `cancelPreload` decrementa. Quando ninguém
//   mais quer a imagem E ela ainda não chegou, abortamos o download
//   limpando `img.src` (truque consagrado para cancelar fetch de Image).
// =====================================================================

const RESIZE_PARAMS = ["w", "h", "q", "width", "height", "quality", "fit", "auto", "dpr", "format"];
function normalizeImageKey(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://placeholder.local");
    RESIZE_PARAMS.forEach((k) => u.searchParams.delete(k));
    const search = u.searchParams.toString();
    return `${u.origin}${u.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return url.split("?")[0];
  }
}

type LoaderEntry = {
  promise: Promise<void>;
  img: HTMLImageElement;
  refCount: number;
  done: boolean;
  realSrc: string; // URL real disparada (pode ter query strings)
  priority: PreloadPriority;
};

export type PreloadPriority = "low" | "auto" | "high";

// Detecta se o navegador suporta `fetchPriority` em <img>. Detecção
// barata, executada UMA vez. Em browsers sem suporte (Safari < 17.2,
// Firefox antigo), aplicamos um fallback via <link rel="preload"> para
// pedidos "high" — assim mantemos a intenção de prioridade mesmo quando
// o atributo direto é ignorado. "low" sem suporte fica apenas com
// `decoding=async` (já não compete por padrão).
const SUPPORTS_FETCH_PRIORITY: boolean = (() => {
  if (typeof window === "undefined") return false;
  try {
    const probe = document.createElement("img");
    return "fetchPriority" in probe || "fetchpriority" in probe;
  } catch {
    return false;
  }
})();

/**
 * Fallback: injeta um `<link rel="preload" as="image">` no <head> com
 * `fetchpriority="high"`. O navegador inicia o download da imagem antes
 * do `<img>` real ser usado, dando-lhe prioridade alta na fila de rede.
 * Idempotente: nunca insere duplicado para a mesma URL.
 */
function injectPreloadLink(url: string, priority: PreloadPriority): void {
  if (typeof document === "undefined") return;
  if (priority !== "high") return; // só compensa o esforço para high
  const selector = `link[data-preload-img="${CSS.escape(url)}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.setAttribute("fetchpriority", "high");
  link.dataset.preloadImg = url;
  document.head.appendChild(link);
}

function applyPriorityHints(img: HTMLImageElement, priority: PreloadPriority): void {
  try {
    if (SUPPORTS_FETCH_PRIORITY) {
      (img as unknown as { fetchPriority?: string }).fetchPriority = priority;
    }
    img.decoding = "async";
  } catch { /* navegadores antigos */ }
}

const loadedImageCache = new Set<string>(); // chaves NORMALIZADAS já carregadas
const inflightLoaders = new Map<string, LoaderEntry>(); // chave normalizada → entry

/**
 * Pré-carrega uma imagem. Retorna uma promise que resolve quando a
 * imagem (ou outra variante da mesma URL normalizada) já está em cache.
 * Cada chamada incrementa o refcount; pareie com `cancelPreload` para
 * permitir cancelamento real se o usuário sair antes de carregar.
 */
export function preloadImage(src: string, priority: PreloadPriority = "low"): Promise<void> {
  if (!src) return Promise.resolve();
  const key = normalizeImageKey(src);
  if (loadedImageCache.has(key)) return Promise.resolve();

  const existing = inflightLoaders.get(key);
  if (existing) {
    existing.refCount += 1;
    // Upgrade de prioridade quando uma nova chamada pede algo mais
    // urgente (ex.: preload disparado em hover ganha boost ao usuário
    // tocar a seta). Browser respeita o último hint para o mesmo
    // request em curso.
    if (rankPriority(priority) > rankPriority(existing.priority)) {
      existing.priority = priority;
      applyPriorityHints(existing.img, priority);
      if (!SUPPORTS_FETCH_PRIORITY && priority === "high") {
        injectPreloadLink(existing.realSrc, priority);
      }
    }
    return existing.promise;
  }

  const img = new Image();
  // Default `low`: preloads em background nunca devem competir com a
  // imagem principal acima do fold. Quem pede prioridade maior (ex.:
  // touchstart na seta) sobe explicitamente.
  applyPriorityHints(img, priority);
  // Fallback para navegadores sem `fetchPriority`: usa <link rel=preload>
  // para sinalizar prioridade alta ao stack de rede.
  if (!SUPPORTS_FETCH_PRIORITY && priority === "high") {
    injectPreloadLink(src, priority);
  }

  const promise = new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const entry = inflightLoaders.get(key);
      if (entry) entry.done = true;
      loadedImageCache.add(key);
      inflightLoaders.delete(key);
      resolve();
    };
    img.onerror = () => {
      inflightLoaders.delete(key);
      reject();
    };
    img.src = src;
  });

  inflightLoaders.set(key, { promise, img, refCount: 1, done: false, realSrc: src, priority });
  // Engole rejection global pra não poluir console — chamadores tratam.
  promise.catch(() => {});
  return promise;
}

function rankPriority(p: PreloadPriority): number {
  return p === "high" ? 2 : p === "auto" ? 1 : 0;
}

/**
 * Helper unificado: pré-carrega a imagem na direção (next/prev) a
 * partir do índice atual de uma lista. Centraliza a lógica de cálculo
 * de vizinho usada no ProductCard e no ImageGallery — garante que a
 * direção prevista seja idêntica nos dois pontos.
 *
 * @param priority - "low" para hover/focus (apenas hint de intenção),
 *                   "high" para touchstart (clique iminente).
 */
export function preloadAdjacentImage(
  images: readonly string[],
  currentIndex: number,
  direction: "next" | "prev",
  priority: PreloadPriority = "low",
): void {
  if (!images || images.length <= 1) return;
  const len = images.length;
  const targetIdx = direction === "next"
    ? (currentIndex + 1) % len
    : (currentIndex - 1 + len) % len;
  const url = images[targetIdx];
  if (!url) return;
  preloadImage(url, priority).catch(() => {});
}

/**
 * Decrementa o interesse por uma URL pré-carregada. Se ninguém mais
 * estiver esperando E o download não terminou, aborta limpando `src`.
 * URLs já no cache são ignoradas silenciosamente.
 */
export function cancelPreload(src: string | null | undefined): void {
  if (!src) return;
  const key = normalizeImageKey(src);
  const entry = inflightLoaders.get(key);
  if (!entry || entry.done) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  // Aborta: limpar `src` interrompe o fetch em browsers modernos.
  try {
    entry.img.onload = null;
    entry.img.onerror = null;
    entry.img.src = "";
  } catch { /* ignore */ }
  inflightLoaders.delete(key);
}

/** Versão em lote para limpar vários preloads de uma vez. */
export function cancelPreloads(urls: Array<string | null | undefined>): void {
  urls.forEach((u) => cancelPreload(u));
}

/** Verifica se uma URL (normalizada) já está em cache de carregamento. */
export function isImagePreloaded(src: string | null | undefined): boolean {
  if (!src) return false;
  return loadedImageCache.has(normalizeImageKey(src));
}

function markImagePreloaded(src: string | null | undefined): void {
  if (!src) return;
  loadedImageCache.add(normalizeImageKey(src));
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
): { cancel: () => void } {
  const unique = Array.from(
    new Set(
      urls
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter((u) => u.length > 0),
    ),
  );
  const immediate = unique.slice(0, immediateCount);
  const deferred = unique.slice(immediateCount);
  const started: string[] = [];
  immediate.forEach((u) => {
    preloadImage(u).catch(() => {});
    started.push(u);
  });
  let cancelled = false;
  let idleHandle: number | null = null;
  let timeoutHandle: number | null = null;
  if (deferred.length > 0) {
    const runDeferred = () => {
      if (cancelled) return;
      deferred.forEach((u) => {
        preloadImage(u).catch(() => {});
        started.push(u);
      });
    };
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(runDeferred, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(runDeferred, 250);
    }
  }
  return {
    cancel: () => {
      cancelled = true;
      const w = window as unknown as { cancelIdleCallback?: (id: number) => void };
      if (idleHandle != null && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
      // Cancela apenas o que JÁ disparamos. Não toca em URLs nunca iniciadas.
      cancelPreloads(started);
    },
  };
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
  priority = false,
  enableBlurUp = false,
  images,
  currentIndex,
}: ProductImageSkeletonProps) => {
  // Dispatcher: trilho (Posthaus/Swiper) quando o pai gerencia índice
  // sobre uma lista de imagens; cross-fade legado caso contrário (usado
  // em troca de cor cujo destino não é necessariamente vizinho).
  if (Array.isArray(images) && images.length > 0 && typeof currentIndex === "number") {
    return (
      <ImageTrack
        images={images}
        currentIndex={currentIndex}
        alt={alt}
        className={className}
        slideDirection={slideDirection}
        priority={priority}
        enableBlurUp={enableBlurUp}
      />
    );
  }
  return (
    <LegacyImageDisplay
      src={src}
      alt={alt}
      className={className}
      slideDirection={slideDirection}
      priority={priority}
      enableBlurUp={enableBlurUp}
    />
  );
};

// =====================================================================
// ImageTrack — trilho horizontal (Posthaus/Swiper)
// ---------------------------------------------------------------------
// Renderiza 3 slots lado-a-lado (prev/cur/next) e desliza com
// `transform: translateX(-100%)` + cubic-bezier ~420ms. Os slots vizinhos
// são montados ANTES da animação iniciar, então a navegação é
// instantânea e fluida (sem troca de `src` durante o slide).
//
// Detalhes técnicos:
// - Detecta a direção pela diferença `currentIndex - prevIndex` (lida
//   com wrap "último→primeiro" e "primeiro→último" como o slide curto
//   visualmente esperado).
// - Após a transição (transitionend), reposiciona o trilho sem animação
//   ao slot central — assim a próxima navegação parte de um estado
//   neutro e o vizinho oposto reaparece.
// - Tamanho/posição absolutos garantem CLS=0.
// =====================================================================

interface ImageTrackProps {
  images: string[];
  currentIndex: number;
  alt: string;
  className?: string;
  slideDirection?: 'left' | 'right' | null;
  priority?: boolean;
  enableBlurUp?: boolean;
}

const TRACK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"; // mesma curva da Posthaus
const TRACK_DURATION_MS = 420;

// =====================================================================
// ImageTrack — crossfade leve no mesmo slot
// ---------------------------------------------------------------------
// Sem remount, sem skeleton, sem placeholder durante a troca:
// - Duas camadas <img> empilhadas (front/back) ocupando o mesmo slot.
// - Ao mudar `currentIndex`, pré-carregamos a próxima URL e só então
//   alternamos qual camada fica em opacity-1 (120-180ms).
// - A camada anterior permanece visível até a nova estar pronta E com
//   o fade-in concluído.
// - Trava de transição: cliques durante o fade são ignorados (apenas a
//   última intenção é enfileirada via `pendingSrcRef`).
// =====================================================================

// Crossfade adaptativo: a duração é escolhida com base no tempo real
// de carregamento da nova imagem. Imagens já em cache trocam quase
// instantaneamente; downloads mais lentos ganham um fade levemente
// mais suave para mascarar a latência. Nunca passa de `CROSSFADE_MAX_MS`.
const CROSSFADE_FAST_MS = 120;   // cache hit / load < 80ms
const CROSSFADE_MID_MS = 150;    // load entre 80ms e 250ms
const CROSSFADE_SLOW_MS = 180;   // load > 250ms
const CROSSFADE_MAX_MS = 180;

function pickCrossfadeDuration(loadMs: number): number {
  if (loadMs <= 0) return CROSSFADE_FAST_MS;            // cache puro
  if (loadMs < 80) return CROSSFADE_FAST_MS;
  if (loadMs < 250) return CROSSFADE_MID_MS;
  return CROSSFADE_SLOW_MS;
}

const ImageTrack = ({ images, currentIndex, alt, className, priority }: ImageTrackProps) => {
  const len = images.length;
  const safeIndex = Math.min(Math.max(currentIndex, 0), Math.max(len - 1, 0));
  const targetSrc = images[safeIndex] ?? "";

  // Camadas A/B; `activeLayer` indica qual está visível.
  const [layerA, setLayerA] = useState<string>(targetSrc);
  const [layerB, setLayerB] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  // Duração efetiva do crossfade — atualizada por swap com base no
  // tempo real medido entre início do preload e onload da nova imagem.
  const [fadeMs, setFadeMs] = useState<number>(CROSSFADE_FAST_MS);

  const isAnimatingRef = useRef(false);
  const pendingSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const currentSrcRef = useRef<string>(targetSrc);

  // Pré-carrega vizinhos (silencioso, respeita cache).
  useEffect(() => {
    if (len <= 1) return;
    const left = images[(safeIndex - 1 + len) % len];
    const right = images[(safeIndex + 1) % len];
    [left, right].forEach((u) => {
      if (u) preloadImage(u, "low").catch(() => {});
    });
  }, [images, safeIndex, len]);

  const runSwap = useCallback((nextSrc: string) => {
    if (!nextSrc || nextSrc === currentSrcRef.current) return;
    if (isAnimatingRef.current) {
      // Trava: só guardamos a última intenção.
      pendingSrcRef.current = nextSrc;
      return;
    }
    isAnimatingRef.current = true;

    const finishSwap = (loadMs: number) => {
      const duration = pickCrossfadeDuration(loadMs);
      setFadeMs(duration);
      // Coloca a nova imagem na camada inativa, então flipa.
      const incomingLayer: "A" | "B" = activeLayerRef.current === "A" ? "B" : "A";
      if (incomingLayer === "A") setLayerA(nextSrc);
      else setLayerB(nextSrc);
      // Aguarda o próximo frame para garantir que a nova camada já
      // está com a `src` aplicada antes de iniciar o fade.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setActiveLayer(incomingLayer);
          currentSrcRef.current = nextSrc;
          if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = window.setTimeout(() => {
            isAnimatingRef.current = false;
            fadeTimerRef.current = null;
            // Limpa a camada antiga depois do fade (libera memória mas
            // permanece em cache do browser).
            const stale: "A" | "B" = incomingLayer === "A" ? "B" : "A";
            if (stale === "A") setLayerA("");
            else setLayerB("");
            // Drena pendência: aplica apenas a última intenção.
            const pending = pendingSrcRef.current;
            pendingSrcRef.current = null;
            if (pending && pending !== currentSrcRef.current) runSwap(pending);
          }, duration + 20);
        });
      });
    };

    // Prefetch antes do swap visual — se já estiver em cache, resolve
    // imediatamente (sem request duplicada).
    if (isImagePreloaded(nextSrc)) {
      finishSwap(0);
    } else {
      const startedAt = (typeof performance !== "undefined" ? performance.now() : Date.now());
      preloadImage(nextSrc, "high").then(() => {
        const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
        finishSwap(now - startedAt);
      }).catch(() => {
        // Falha silenciosa: descarta swap e mantém imagem atual.
        // Edge case: NÃO executa crossfade — mantém imagem anterior intacta.
        isAnimatingRef.current = false;
        pendingSrcRef.current = null;
      });
    }
  }, []);

  // Mantém ref sincronizada para uso dentro de runSwap.
  const activeLayerRef = useRef<"A" | "B">("A");
  useEffect(() => { activeLayerRef.current = activeLayer; }, [activeLayer]);

  // Reage a mudanças de `currentIndex`/`targetSrc`.
  useEffect(() => {
    if (!targetSrc) return;
    if (targetSrc === currentSrcRef.current) return;
    runSwap(targetSrc);
  }, [targetSrc, runSwap]);

  useEffect(() => () => {
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
  }, []);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {layerA && (
        <img
          src={layerA}
           alt={activeLayer === "A" ? alt : ""}
           aria-hidden={activeLayer !== "A" || undefined}
           {...applyMediaProps(priority)}
           draggable={false}
           className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transform-gpu select-none",
            "transition-opacity ease-out",
            activeLayer === "A" ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${fadeMs}ms` }}
          onLoad={() => markImagePreloaded(layerA)}
        />
      )}
      {layerB && (
        <img
          src={layerB}
           alt={activeLayer === "B" ? alt : ""}
           aria-hidden={activeLayer !== "B" || undefined}
           {...applyMediaProps(true)}
           draggable={false}
           className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transform-gpu select-none",
            "transition-opacity ease-out",
            activeLayer === "B" ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${fadeMs}ms` }}
          onLoad={() => markImagePreloaded(layerB)}
        />
      )}
    </div>
  );
};

/**
 * Implementação clássica (cross-fade do `src`). Mantida como fallback
 * e usada para troca de cor cujo URL não corresponde necessariamente
 * ao próximo/anterior slide do trilho.
 */
const LegacyImageDisplay = ({
  src,
  alt,
  className,
  slideDirection,
  priority = false,
  enableBlurUp = false,
  silentError = false,
}: Omit<ProductImageSkeletonProps, "images" | "currentIndex">) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>(() => isImagePreloaded(src) ? 'loaded' : 'loading');
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
  // Opacidade inicial da imagem anterior durante o cross-fade.
  // Fica em 1 e cai para 0 ao longo da transição, garantindo que a nova
  // imagem "emerja" por cima sem flash de fundo.
  const fadeTimerRef = useRef<number | null>(null);
  // Último src solicitado por prop — usado para descartar resultados de
  // preloads obsoletos quando o usuário troca de cor rapidamente.
  const latestRequestedSrcRef = useRef<string>(src);

  // Placeholder color baseado na URL
  const placeholderColor = useMemo(() => generatePlaceholderColor(src), [src]);

  // Gerar um blur placeholder tiny (usando canvas) — APENAS na imagem
  // principal (`enableBlurUp`). Cards/thumbs deixam `false` para evitar
  // o custo de canvas + segundo Image() por miniatura. CLS=0 garantido:
  // o blur é renderizado em `position:absolute inset-0`, sem ocupar
  // espaço próprio no fluxo.
  useEffect(() => {
    if (!enableBlurUp) return;
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
    return () => {
      // Aborta a tiny image se a URL mudar antes de carregar.
      img.onload = null;
      try { img.src = ""; } catch { /* ignore */ }
    };
  }, [src, isInView, enableBlurUp]);

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
      latestRequestedSrcRef.current = src;
      // NÃO resetamos `loadState` aqui. Em produtos cacheados pelo
      // browser, o `<img onLoad>` pode disparar ANTES deste effect
      // rodar — sobrescrever o estado para 'loading' deixaria a
      // imagem invisível para sempre (opacity-0). Como `displaySrc`
      // já é inicializado com `src` no `useState`, não há nada a
      // fazer aqui na primeira execução.
      return;
    }
    if (src === displaySrc) return;
    latestRequestedSrcRef.current = src;
    let cancelled = false;
    // Registra interesse — pareado com cancelPreload no cleanup para
    // abortar o download quando o usuário troca de cor ANTES desta
    // imagem chegar. Sem isto, downloads obsoletos competem por banda.
    const inflightSrc = src;
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
      }, 280);
    };
    preloadImage(inflightSrc, "high").then(swap).catch(() => {
      if (cancelled) return;
      // Fallback seguro: se a nova imagem falhou, NÃO trocamos o src nem
      // aplicamos fade — mantemos a imagem anterior visível para evitar
      // qualquer quebra visual. O erro fica silencioso.
    });
    return () => {
      cancelled = true;
      // Decrementa o refcount do preload que iniciamos. Se ninguém
      // mais quiser essa imagem (ex.: usuário trocou de cor de novo),
      // o cancelPreload aborta o download em curso (img.src = "").
      cancelPreload(inflightSrc);
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
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out",
                isSwapping ? "opacity-0" : "opacity-100",
              )}
            />
          )}
          <img
             src={displaySrc}
             alt={alt}
             {...applyMediaProps(priority)}
             className={cn(
              "relative w-full h-full object-cover",
              // Carga inicial: fade lento + zoom sutil (mantém UX original).
              loadState === 'loading' && "opacity-0 scale-[1.02] transition-all duration-700 ease-out",
              loadState !== 'loading' && !isSwapping && "opacity-100 scale-100 transition-all duration-700 ease-out",
              // Troca de cor: cross-fade ~280ms com easing suave, sem zoom.
              // Quando estiver em swap, NÃO aplicamos slide — evita combinar
              // duas animações concorrentes (ficava "saltado"). Slide só
              // ocorre na navegação por setas (sem isSwapping).
              isSwapping && "opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] animate-[fade-in_280ms_cubic-bezier(0.22,1,0.36,1)_forwards]",
              !isSwapping && slideDirection === 'left' && "animate-slide-left",
              !isSwapping && slideDirection === 'right' && "animate-slide-right"
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
      
      {/* Error state — silenciado nos slots laterais do trilho */}
      {loadState === 'error' && !silentError && (
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
