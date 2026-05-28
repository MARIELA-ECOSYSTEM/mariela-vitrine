import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_SIZE_OPTIONS = [12, 24, 30, 60, 120] as const;
export const DEFAULT_PAGE_SIZE = 30;

export interface ProductsPaginationProps {
  paginaAtual: number;
  itensPorPagina: number;
  totalItens: number;
  onPaginaChange: (pagina: number) => void;
  onItensPorPaginaChange: (itens: number) => void;
  className?: string;
  /** Quantos itens visíveis (após filtros locais) na página atual. Usado no indicador "1 - X". */
  itensVisiveisNaPagina?: number;
  opcoesPorPagina?: readonly number[];
}

/**
 * Gera a lista compacta de páginas com elipses: ex: [1, '…', 4, 5, 6, '…', 12]
 */
function buildPageList(total: number, current: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "..."> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export const ProductsPagination = ({
  paginaAtual,
  itensPorPagina,
  totalItens,
  onPaginaChange,
  onItensPorPaginaChange,
  className,
  itensVisiveisNaPagina,
  opcoesPorPagina = PAGE_SIZE_OPTIONS,
}: ProductsPaginationProps) => {
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
  const paginaSegura = Math.min(Math.max(1, paginaAtual), totalPaginas);

  const inicio = totalItens === 0 ? 0 : (paginaSegura - 1) * itensPorPagina + 1;
  const fim = (() => {
    if (totalItens === 0) return 0;
    const teorico = paginaSegura * itensPorPagina;
    const baseFim = Math.min(teorico, totalItens);
    // Se filtros locais reduziram a página, ajustamos o final mostrado.
    if (typeof itensVisiveisNaPagina === "number") {
      return inicio - 1 + itensVisiveisNaPagina;
    }
    return baseFim;
  })();

  const pageList = useMemo(() => buildPageList(totalPaginas, paginaSegura), [totalPaginas, paginaSegura]);

  if (totalItens === 0) return null;

  return (
    <nav
      aria-label="Paginação de produtos"
      className={cn(
        "mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Indicadores */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{inicio}–{fim}</span>
          {" "}de{" "}
          <span className="font-medium text-foreground">{totalItens}</span>
          {" "}produto{totalItens === 1 ? "" : "s"}
        </span>
        <span className="hidden sm:inline opacity-50">•</span>
        <span>
          Página <span className="font-medium text-foreground">{paginaSegura}</span>–
          <span className="font-medium text-foreground">{totalPaginas}</span>
        </span>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Por página:</span>
          <Select
            value={String(itensPorPagina)}
            onValueChange={(v) => onItensPorPaginaChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[78px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoesPorPagina.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPaginaChange(paginaSegura - 1)}
            disabled={paginaSegura <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {pageList.map((p, i) =>
            p === "..." ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground text-xs">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === paginaSegura ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-8 px-2 text-xs"
                onClick={() => onPaginaChange(p)}
                aria-current={p === paginaSegura ? "page" : undefined}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPaginaChange(paginaSegura + 1)}
            disabled={paginaSegura >= totalPaginas}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};