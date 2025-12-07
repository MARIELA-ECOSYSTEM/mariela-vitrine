import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  variants: Array<{
    tamanho: string;
    disponibilidade: number;
    cor: string;
  }>;
}

interface SizeFilterBadgesProps {
  products: Product[];
  selectedSize: string;
  onSizeSelect: (size: string) => void;
  disabled?: boolean;
}

export const SizeFilterBadges = ({
  products,
  selectedSize,
  onSizeSelect,
  disabled = false,
}: SizeFilterBadgesProps) => {
  // Calcula contagem de produtos por tamanho
  const sizeCounts = products.reduce((acc, product) => {
    const availableSizes = [...new Set(
      product.variants
        .filter(v => v.disponibilidade > 0)
        .map(v => v.tamanho)
    )];
    
    availableSizes.forEach(size => {
      acc[size] = (acc[size] || 0) + 1;
    });
    
    return acc;
  }, {} as Record<string, number>);

  // Ordenação padrão de tamanhos
  const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U', '34', '36', '38', '40', '42', '44', '46'];
  
  const sortedSizes = Object.keys(sizeCounts).sort((a, b) => {
    const indexA = sizeOrder.indexOf(a);
    const indexB = sizeOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  if (sortedSizes.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-1.5 mb-2 transition-opacity",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <Badge
        variant={selectedSize === "" ? "default" : "outline"}
        className={cn(
          "cursor-pointer text-xs px-2 py-0.5 transition-all hover:scale-105",
          selectedSize === "" && "bg-primary text-primary-foreground",
          disabled && "cursor-not-allowed"
        )}
        onClick={() => !disabled && onSizeSelect("")}
      >
        Todos ({products.length})
      </Badge>
      {sortedSizes.map((size) => (
        <Badge
          key={size}
          variant={selectedSize === size ? "default" : "outline"}
          className={cn(
            "cursor-pointer text-xs px-2 py-0.5 transition-all hover:scale-105",
            selectedSize === size && "bg-primary text-primary-foreground",
            disabled && "cursor-not-allowed"
          )}
          onClick={() => !disabled && onSizeSelect(size)}
        >
          {size} ({sizeCounts[size]})
        </Badge>
      ))}
    </div>
  );
};
