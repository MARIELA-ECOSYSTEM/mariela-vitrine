import { Header } from "@/components/Header";
import { PageContainer } from "@/components/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton da página de detalhe do produto.
 * Mantém o layout real (header, breadcrumbs, grid imagem+info) e exibe
 * placeholders apenas nas áreas que dependem de dados/mídia. Substitui
 * o antigo `LoadingOverlay` full-screen — não bloqueia o restante da
 * página e evita salto de layout (CLS) quando os dados chegam.
 */
export const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pt-[60px] sm:pt-[68px]">
      <Header />
      <main className="pb-8 md:pb-16">
        <PageContainer padX="px-4 md:px-6" padY="pt-6 md:pt-8" className="animate-fade-in">
          {/* Breadcrumbs */}
          <div className="hidden md:block mb-4">
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Voltar */}
          <Skeleton className="h-8 w-20 mb-4 md:mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 max-w-6xl mx-auto">
            {/* Galeria principal + thumbs — espelha exatamente o ImageGallery
                real (aspect-square + thumbs mobile horizontais 16x16 +
                grid 5 colunas no desktop) para evitar CLS quando os
                dados chegam. */}
            <div className="space-y-3 md:space-y-4">
              <Skeleton className="w-full aspect-square rounded-xl md:rounded-2xl" />
              {/* Thumbs mobile (scroll horizontal) */}
              <div className="flex md:hidden gap-2 overflow-hidden pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-16 rounded-lg flex-shrink-0" />
                ))}
              </div>
              {/* Thumbs desktop (grid de 5) */}
              <div className="hidden md:grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg w-full" />
                ))}
              </div>
            </div>

            {/* Info do produto */}
            <div className="space-y-4 md:space-y-6">
              <Skeleton className="h-8 md:h-10 w-3/4" />
              <Skeleton className="h-9 md:h-11 w-40" />

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-9 rounded-full" />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-12 rounded-md" />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>

              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
};