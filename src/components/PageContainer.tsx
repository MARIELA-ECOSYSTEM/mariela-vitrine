import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * Padding horizontal. Default canônico: `px-3 sm:px-4 md:px-6`.
   * Sobrescreva apenas quando a página tiver largura/recuo específico
   * (ex.: ProductDetail usa `px-4 md:px-6` por causa do grid lg:grid-cols-2).
   */
  padX?: string;
  /**
   * Padding vertical. Default canônico: `py-6 md:py-12`.
   * Sobrescreva apenas em páginas onde o `<main>` já controla o espaçamento
   * (ex.: ProductDetail aplica `pb-8 md:pb-16` no main).
   */
  padY?: string;
  /**
   * Quando `true`, o wrapper assume que o layout pai já adicionou
   * `pt-[60px] sm:pt-[68px]` para compensar o header fixo. Mantemos o
   * `padY` apenas para o espaçamento de conteúdo, sem somar offsets de
   * header. Em páginas com header transparente em overlay (ex.: Home),
   * o `padY` deve ser removido para que a hero ocupe o topo.
   */
  compensatesFixedHeader?: boolean;
}

/**
 * Wrapper padrão de páginas.
 *
 * Diretrizes (ver também `DEV.md`):
 * - Use em TODAS as páginas internas (Products, Cart, MonteSeuLook, etc.).
 * - Não duplique `pt-[60px]` aqui — esse offset pertence ao layout
 *   externo (`<div className="min-h-screen pt-[60px] sm:pt-[68px]">`).
 * - Páginas que devem sobrescrever:
 *   • `ProductDetail` → `padY="pb-8 md:pb-16 pt-0"` (galeria full-bleed).
 *   • `Instalar`      → wrapper próprio (hero com gradiente decorativo).
 *   • `Index` (Home)  → NÃO usar PageContainer (overlay header + hero).
 */
export const PageContainer = ({
  children,
  className,
  padX = "px-3 sm:px-4 md:px-6",
  padY = "py-6 md:py-12",
  compensatesFixedHeader: _compensatesFixedHeader,
  ...rest
}: PageContainerProps) => {
  return (
    <div className={cn("container mx-auto", padX, padY, className)} {...rest}>
      {children}
    </div>
  );
};