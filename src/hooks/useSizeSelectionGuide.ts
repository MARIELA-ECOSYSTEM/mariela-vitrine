import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook reutilizável para guiar o usuário até a seção de seleção de tamanho
 * quando ele tenta executar uma ação (WhatsApp, carrinho, etc.) sem tamanho.
 *
 * Substitui o toast agressivo por:
 *  - scroll suave até a seção, considerando a altura real do header fixo;
 *  - destaque visual temporário que reinicia a cada chamada;
 *  - anúncio em região aria-live (sem caracteres quebrados);
 *  - foco programático no primeiro botão `[data-size-option]:not([disabled])`
 *    dentro da seção, com fallback para a própria seção (`tabIndex={-1}`).
 *
 * Uso:
 *   const guide = useSizeSelectionGuide();
 *   <div ref={guide.sectionRef} tabIndex={-1} className={guide.highlight ? "..." : ""}>
 *     <button data-size-option>...</button>
 *   </div>
 *   <p aria-live="polite" className="sr-only">{guide.announceMessage}</p>
 *   <button onClick={() => guide.guide()}>Selecione o tamanho</button>
 */
export function useSizeSelectionGuide() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [highlight, setHighlight] = useState(false);
  // Contador serve de "nonce" para reanunciar mesmo quando o texto repete.
  const [announceTick, setAnnounceTick] = useState(0);
  const highlightTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Mede a altura real do header fixo no DOM (procura `header[data-fixed-header]`
   * ou o primeiro `<header>` com `position: fixed/sticky`). Fallback: 80px.
   */
  const measureHeaderOffset = useCallback((): number => {
    const candidates = Array.from(document.querySelectorAll("header"));
    for (const h of candidates) {
      const style = window.getComputedStyle(h);
      if (style.position === "fixed" || style.position === "sticky") {
        return Math.ceil(h.getBoundingClientRect().height) + 12;
      }
    }
    return 80;
  }, []);

  const runGuide = useCallback((el: HTMLElement | null) => {
    if (el) {
      const headerOffset = measureHeaderOffset();
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }

    // Reinicia destaque: limpa, desliga, força reflow, religa.
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlight(false);
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      setHighlight(true);
      highlightTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setHighlight(false);
        highlightTimerRef.current = null;
      }, 1600);
    });

    // Anúncio acessível (incrementa contador para reanunciar em cliques repetidos).
    setAnnounceTick((n) => n + 1);

    // Foco programático no primeiro tamanho disponível, após iniciar o scroll.
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    focusTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      const root = el;
      if (!root) return;
      const firstSizeBtn = root.querySelector<HTMLButtonElement>(
        "button[data-size-option]:not([disabled])"
      );
      if (firstSizeBtn) {
        firstSizeBtn.focus({ preventScroll: true });
      } else if (typeof root.focus === "function") {
        root.focus({ preventScroll: true });
      }
      focusTimerRef.current = null;
    }, 350);
  }, [measureHeaderOffset]);

  /** Guia usando a sectionRef interna (uso comum: ProductDetail, ProductCard). */
  const guide = useCallback(() => {
    runGuide(sectionRef.current);
  }, [runGuide]);

  /** Guia para um elemento arbitrário (uso: Monte seu Look — categorias). */
  const guideElement = useCallback(
    (el: HTMLElement | null) => {
      runGuide(el);
    },
    [runGuide],
  );

  // Texto exposto na região aria-live; muda quando announceTick > 0.
  const announceMessage =
    announceTick > 0 ? "Selecione um tamanho para continuar." : "";

  return {
    sectionRef,
    highlight,
    announceMessage,
    /** Dispara scroll + destaque + anúncio + foco. */
    guide,
    /** Versão imperativa: dispara o mesmo fluxo para um elemento externo. */
    guideElement,
  };
}
