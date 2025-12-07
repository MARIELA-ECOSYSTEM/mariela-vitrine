import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProductSkeletonProps {
  layoutMode?: "grade" | "lista";
}

// Componente de Skeleton animado com shimmer effect melhorado
const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      "relative overflow-hidden bg-gradient-to-r from-muted via-muted/80 to-muted rounded-md",
      className
    )}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  </div>
);

// Componente de pulso suave com wave effect
const PulseSkeleton = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div 
    className={cn(
      "relative overflow-hidden bg-muted rounded-md",
      className
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div 
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"
      style={{ animationDelay: `${delay}ms` }}
    />
  </div>
);

// Skeleton circular para avatares/cores
const CircleSkeleton = ({ size = "md", delay = 0 }: { size?: "sm" | "md" | "lg"; delay?: number }) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-6 h-6",
    lg: "w-10 h-10"
  };
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted rounded-full",
        sizeClasses[size]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        style={{ animationDelay: `${delay}ms` }}
      />
    </div>
  );
};

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
                <div className="flex gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <CircleSkeleton key={i} size="md" delay={200 + i * 50} />
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

  // Layout em grade (vertical - padrão) - MOBILE OPTIMIZED
  return (
    <Card className="overflow-hidden border-border bg-card flex flex-col h-full animate-fade-in group">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Imagem com shimmer e efeito elegante */}
        <div className="relative aspect-square overflow-hidden">
          <ShimmerSkeleton className="absolute inset-0" />
          {/* Badge placeholder */}
          <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2">
            <PulseSkeleton className="h-4 sm:h-5 w-12 sm:w-16" delay={100} />
          </div>
          {/* Indicadores de imagem */}
          <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1">
            {[...Array(3)].map((_, i) => (
              <CircleSkeleton key={i} size="sm" delay={150 + i * 30} />
            ))}
          </div>
        </div>
        
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col gap-1.5 sm:gap-3 flex-1">
          <div className="flex-1 space-y-1 sm:space-y-2">
            {/* Título */}
            <PulseSkeleton className="h-4 sm:h-5 md:h-6 w-4/5" delay={50} />
            {/* Descrição - responsivo */}
            <div className="hidden xs:block space-y-1 sm:space-y-1.5 min-h-[1rem] sm:min-h-[2.5rem]">
              <PulseSkeleton className="h-3 sm:h-4 w-full" delay={100} />
              <PulseSkeleton className="h-3 sm:h-4 w-3/4 hidden sm:block" delay={150} />
            </div>
            {/* Cores disponíveis - bolinhas */}
            <div className="flex items-center gap-1 min-h-[1rem] sm:min-h-[1.25rem]">
              {[...Array(4)].map((_, i) => (
                <CircleSkeleton key={i} size="sm" delay={200 + i * 40} />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-1 sm:gap-2">
            {/* Preço */}
            <PulseSkeleton className="h-5 sm:h-6 md:h-7 w-20 sm:w-28" delay={350} />
            
            {/* Seletor de cor - responsivo */}
            <div className="hidden xs:block min-h-[3rem] sm:min-h-[4.5rem]">
              <PulseSkeleton className="h-2.5 sm:h-3 w-16 sm:w-24 mb-1 sm:mb-2" delay={400} />
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {[...Array(3)].map((_, i) => (
                  <PulseSkeleton key={i} className="h-5 sm:h-7 w-8 sm:w-12" delay={450 + i * 50} />
                ))}
              </div>
            </div>
            
            {/* Botões */}
            <div className="flex gap-1 sm:gap-2 mt-auto">
              <PulseSkeleton className="h-7 sm:h-9 flex-1" delay={600} />
              <PulseSkeleton className="h-7 sm:h-9 flex-1" delay={650} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton para loading inicial da página
export const ProductsLoadingSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <div 
        key={index}
        className="animate-fade-in"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <ProductSkeleton layoutMode="grade" />
      </div>
    ))}
  </div>
);
