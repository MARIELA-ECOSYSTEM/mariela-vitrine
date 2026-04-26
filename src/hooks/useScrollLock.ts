import { useEffect } from "react";

/**
 * Trava o scroll do body enquanto `locked` for verdadeiro.
 * - Restaura o `overflow` original ao desabilitar OU desmontar (cleanup do effect).
 * - Seguro contra abrir/fechar rápido: cada toggle reaplica/limpa via cleanup.
 * - Não causa "body travado" em nenhum cenário (ex.: navegação durante modal aberto).
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}