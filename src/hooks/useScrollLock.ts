import { useEffect } from "react";

/**
 * Trava o scroll do body enquanto `locked` for verdadeiro.
 * Estratégia compatível com iOS Safari:
 * - Salva a posição de scroll atual (window.scrollY).
 * - Aplica `position: fixed` + `top: -scrollY` no body (única forma confiável de
 *   travar o scroll de fundo no iOS Safari; `overflow: hidden` sozinho não basta).
 * - Também aplica `overflow: hidden` para desktop/Android.
 * - Preserva `width: 100%` para evitar colapso do layout quando fixed é aplicado.
 * - Restaura todos os estilos originais E a posição de scroll ao desabilitar
 *   OU desmontar (cleanup do effect), garantindo que o body nunca fique travado.
 * - Seguro contra abrir/fechar rápido: cada toggle reaplica/limpa via cleanup.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const body = document.body;

    // Salva estilos originais para restauração precisa
    const original = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      body.style.overflow = original.overflow;
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.width = original.width;
      // Restaura a posição de scroll exata anterior à abertura do modal
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}