import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook reutilizável para guiar o usuário até a seção de seleção de tamanho
 * quando ele tenta executar uma ação (WhatsApp, carrinho, etc.) sem tamanho.
 *
 * Mecanismo único de destaque: aplica a classe CSS `.size-guide-highlight`
 * diretamente no elemento alvo (sem estado React duplicado), garantindo o
 * mesmo visual em ProductDetail, ProductCard e MobileLookBuilder.
 *
 *  - scroll suave até a seção, considerando a altura real do header fixo;
 *  - destaque visual reiniciado a cada chamada (force reflow);
 *  - anúncio em região aria-live (sem caracteres quebrados);
 *  - foco programático no primeiro botão `[data-size-option]:not([disabled])`
 *    VISÍVEL dentro da seção, com fallback para a própria seção
 *    (`tabIndex={-1}`). Se nem seção nem botão forem encontrados, dispara
 *    mensagem alternativa orientando a abrir o produto.
 *
 * Uso:
 *   const guide = useSizeSelectionGuide();
 *   <div ref={guide.sectionRef} tabIndex={-1}>
 *     <button data-size-option>...</button>
 *   </div>
 *   <p aria-live="polite" className="sr-only">{guide.announceMessage}</p>
 *   <button onClick={() => guide.guide()}>Selecione o tamanho</button>
 */
export function useSizeSelectionGuide() {
  const sectionRef = useRef<HTMLElement | null>(null);
  // Contador serve de "nonce" para reanunciar mesmo quando o texto repete.
  const [announceTick, setAnnounceTick] = useState(0);
  // Mensagem dinâmica: muda quando não há alvo de tamanho válido (fallback).
  const [announceText, setAnnounceText] = useState<string>(
    "Selecione um tamanho para continuar.",
  );
  const focusTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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

  /**
   * Verifica se um elemento está visível (não display:none, não em container oculto,
   * tem dimensões > 0). Considera mobile/desktop layouts (sm:hidden, hidden sm:block).
   * Checa: conexão ao DOM, offsetParent, getComputedStyle (display/visibility/opacity)
   * e dimensões > 0. Cobre casos de elementos ocultos por classes responsivas.
   */
  const isVisible = useCallback((el: HTMLElement): boolean => {
    if (!el.isConnected) return false;
    // offsetParent é null quando o elemento (ou ancestral) tem display:none.
    // Exceção: <body> e position:fixed podem ter offsetParent null mas estarem visíveis.
    const style = window.getComputedStyle(el);
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (parseFloat(style.opacity || "1") === 0) return false;
    if (el.offsetParent === null && style.position !== "fixed") return false;
    const rects = el.getClientRects();
    if (rects.length === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }, []);

  const runGuide = useCallback((el: HTMLElement | null) => {
    // Fallback seguro: nenhum alvo encontrado — só anuncia mensagem alternativa.
    if (!el) {
      setAnnounceText("Abra o produto para selecionar o tamanho.");
      setAnnounceTick((n) => n + 1);
      return;
    }

    {
      const headerOffset = measureHeaderOffset();
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

      // Mecanismo único de destaque: aplica a classe `.size-guide-highlight`
      // diretamente no DOM. Reinicia a animação via reflow forçado.
      el.classList.remove("size-guide-highlight");
      void el.offsetWidth;
      el.classList.add("size-guide-highlight");
      window.setTimeout(() => {
        el.classList.remove("size-guide-highlight");
      }, 1600);
    }

    // Anúncio acessível padrão (incrementa contador para reanunciar em cliques repetidos).
    setAnnounceText("Selecione um tamanho para continuar.");
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
      // Procura primeiro botão de tamanho VISÍVEL (filtra layouts ocultos por
      // `hidden`, `sm:hidden`, etc.). Fallback: foca a própria seção.
      const candidates = Array.from(
        root.querySelectorAll<HTMLButtonElement>(
          "button[data-size-option]:not([disabled])",
        ),
      );
      const firstSizeBtn = candidates.find((btn) => isVisible(btn));
      if (firstSizeBtn) {
        firstSizeBtn.focus({ preventScroll: true });
      } else if (typeof root.focus === "function") {
        root.focus({ preventScroll: true });
      }
      focusTimerRef.current = null;
    }, 350);
  }, [measureHeaderOffset, isVisible]);

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

  // Texto exposto na região aria-live. Inclui o tick como sufixo invisível
  // (zero-width space repetido) para forçar leitores de tela a reanunciar
  // mesmo quando o texto base é idêntico em cliques repetidos.
  const announceMessage =
    announceTick > 0
      ? `${announceText}${"\u200B".repeat(announceTick % 5)}`
      : "";

  return {
    sectionRef,
    announceMessage,
    /** Dispara scroll + destaque + anúncio + foco. */
    guide,
    /** Versão imperativa: dispara o mesmo fluxo para um elemento externo. */
    guideElement,
  };
}
