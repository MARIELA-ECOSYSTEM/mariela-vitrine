import { cn } from "@/lib/utils";

interface CategorySkeletonProps {
  count?: number;
  className?: string;
}

export const CategorySkeleton = ({ count = 6, className }: CategorySkeletonProps) => {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative aspect-square rounded-xl overflow-hidden category-skeleton"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="absolute inset-0 bg-muted" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="h-3 bg-muted-foreground/10 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProductItemSkeleton = () => {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent category-skeleton">
      <div className="absolute inset-0 bg-muted" />
      <div className="absolute bottom-2 left-2 right-2 space-y-1">
        <div className="h-2.5 bg-muted-foreground/10 rounded w-full" />
        <div className="h-2 bg-muted-foreground/10 rounded w-1/2" />
      </div>
    </div>
  );
};

export const ColorSizeSkeleton = () => {
  return (
    <div className="space-y-3 bg-secondary/30 rounded-xl p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted-foreground/10 rounded w-24" />
        <div className="h-6 bg-muted-foreground/10 rounded w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-16 bg-muted-foreground/10 rounded-full" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-10 bg-muted-foreground/10 rounded-lg" />
        ))}
      </div>
    </div>
  );
};