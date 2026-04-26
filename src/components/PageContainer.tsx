import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Sobrescreve as classes de padding horizontal. */
  padX?: string;
  /** Sobrescreve as classes de padding vertical. */
  padY?: string;
}

/**
 * Wrapper padrão de páginas: aplica `container mx-auto` com paddings
 * horizontais responsivos e o espaçamento vertical canônico
 * `py-6 md:py-12` usado em todo o site.
 */
export const PageContainer = ({
  children,
  className,
  padX = "px-3 sm:px-4 md:px-6",
  padY = "py-6 md:py-12",
  ...rest
}: PageContainerProps) => {
  return (
    <div className={cn("container mx-auto", padX, padY, className)} {...rest}>
      {children}
    </div>
  );
};