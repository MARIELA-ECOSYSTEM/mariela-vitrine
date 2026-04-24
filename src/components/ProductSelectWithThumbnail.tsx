import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Produto } from "@/data/products";
import produtoGenerico from "@/assets/produto-generico.png";
import { formatBRL, getDisplayPrice } from "@/lib/formatters";

interface ProductSelectWithThumbnailProps {
  produtos: Produto[];
  value: number | null;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export const ProductSelectWithThumbnail = ({
  produtos,
  value,
  onValueChange,
  placeholder,
  disabled = false
}: ProductSelectWithThumbnailProps) => {
  return (
    <Select 
      value={value?.toString() || ""} 
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="bg-background border-border">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        {produtos.map((produto) => (
          <SelectItem 
            key={produto.id} 
            value={produto.id.toString()}
            className="cursor-pointer hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <img 
                src={produto.imagens[0] || produtoGenerico} 
                alt={produto.nome}
                className="w-12 h-12 object-cover rounded border border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = produtoGenerico;
                }}
              />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{produto.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBRL(getDisplayPrice(produto))}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
