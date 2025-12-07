import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProductSkeletonProps {
  layoutMode?: "grade" | "lista";
}

// Componente de Skeleton animado com shimmer effect
const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      "relative overflow-hidden bg-muted rounded-md",
      "before:absolute before:inset-0",
      "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
      "before:animate-shimmer",
      className
    )}
  />
);

// Componente de pulso suave
const PulseSkeleton = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div 
    className={cn(
      "bg-muted rounded-md animate-pulse",
      className
    )}
    style={{ animationDelay: `${delay}ms` }}
  />
);

export const ProductSkeleton = ({ layoutMode = "grade" }: ProductSkeletonProps) => {
  // Layout em lista (horizontal)
  if (layoutMode === "lista") {
    return (
      <Card className="overflow-hidden border-border bg-card animate-fade-in">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Imagem com shimmer */}
            <div className="relative md:w-64 aspect-square md:aspect-auto overflow-hidden">
              <ShimmerSkeleton className="absolute inset-0" />
              {/* Badge placeholder */}
              <div className="absolute top-3 right-3">
                <PulseSkeleton className="h-5 w-16" delay={100} />
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-3">
                {/* Título */}
                <PulseSkeleton className="h-6 w-3/4" delay={50} />
                {/* Descrição */}
                <div className="space-y-2">
                  <PulseSkeleton className="h-4 w-full" delay={100} />
                  <PulseSkeleton className="h-4 w-2/3" delay={150} />
                </div>
                {/* Cores disponíveis */}
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <PulseSkeleton key={i} className="h-3 w-12" delay={200 + i * 50} />
                  ))}
                </div>
                {/* Preço */}
                <PulseSkeleton className="h-8 w-32 mt-2" delay={350} />
              </div>
              
              <div className="flex flex-col gap-2 md:min-w-[200px]">
                {/* Seletor de cor */}
                <PulseSkeleton className="h-4 w-24 mb-1" delay={400} />
                <div className="flex gap-1 flex-wrap">
                  {[...Array(3)].map((_, i) => (
                    <PulseSkeleton key={i} className="h-7 w-16" delay={450 + i * 50} />
                  ))}
                </div>
                {/* Botões */}
                <PulseSkeleton className="h-9 w-full mt-2" delay={600} />
                <PulseSkeleton className="h-9 w-full" delay={650} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Layout em grade (vertical - padrão)
  return (
    <Card className="overflow-hidden border-border bg-card flex flex-col h-full animate-fade-in group">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Imagem com shimmer e efeito de hover */}
        <div className="relative aspect-square overflow-hidden">
          <ShimmerSkeleton className="absolute inset-0" />
          {/* Badge placeholder */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <PulseSkeleton className="h-5 w-16" delay={100} />
          </div>
          {/* Indicadores de imagem */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[...Array(3)].map((_, i) => (
              <PulseSkeleton key={i} className="h-1.5 w-1.5 rounded-full" delay={150 + i * 30} />
            ))}
          </div>
        </div>
        
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex-1 space-y-2">
            {/* Título */}
            <PulseSkeleton className="h-6 w-3/4" delay={50} />
            {/* Descrição - 2 linhas */}
            <div className="space-y-1.5 min-h-[2.5rem]">
              <PulseSkeleton className="h-4 w-full" delay={100} />
              <PulseSkeleton className="h-4 w-4/5" delay={150} />
            </div>
            {/* Cores disponíveis */}
            <div className="flex items-center gap-1 min-h-[1.25rem]">
              <PulseSkeleton className="h-3 w-10" delay={200} />
              {[...Array(2)].map((_, i) => (
                <PulseSkeleton key={i} className="h-3 w-12" delay={250 + i * 50} />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Preço */}
            <PulseSkeleton className="h-7 w-28" delay={350} />
            
            {/* Seletor de cor */}
            <div className="min-h-[4.5rem]">
              <PulseSkeleton className="h-3 w-24 mb-2" delay={400} />
              <div className="flex flex-wrap gap-1">
                {[...Array(3)].map((_, i) => (
                  <PulseSkeleton key={i} className="h-7 w-16" delay={450 + i * 50} />
                ))}
              </div>
            </div>
            
            {/* Botões */}
            <div className="flex gap-2">
              <PulseSkeleton className="h-9 flex-1" delay={600} />
              <PulseSkeleton className="h-9 flex-1" delay={650} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
