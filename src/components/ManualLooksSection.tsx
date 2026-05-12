import { LookManual, Produto } from "@/data/products";
import { Button } from "@/components/ui/button";
import { ImagePlus, Sparkles, ChevronRight } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { getProductImageByColor } from "@/lib/productImage";
import { cn } from "@/lib/utils";

interface ManualLooksSectionProps {
  looks: LookManual[];
}

export const ManualLooksSection = ({ looks }: ManualLooksSectionProps) => {
  const { produtos } = useProducts();

  return (
    <section className="animate-fade-in pb-12 border-t border-border pt-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
            Looks Prontos
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {looks.map((look) => (
          <ManualLookCard key={look.id} look={look} allProducts={produtos} />
        ))}
      </div>
    </section>
  );
};

interface ManualLookCardProps {
  look: LookManual;
  allProducts: Produto[];
}

const ManualLookCard = ({ look, allProducts }: ManualLookCardProps) => {
  const linkedProducts = look.produtos_vinculados
    .map((pid) => allProducts.find((p) => p.produtoId === pid || String(p.id) === pid))
    .filter((p): p is Produto => !!p);

  const handleSelectLook = () => {
    const event = new CustomEvent("monte-seu-look:select-products", {
      detail: { products: look.produtos_vinculados }
    });
    window.dispatchEvent(event);
    
    const builder = document.getElementById("look-builder-root");
    if (builder) {
      builder.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="p-4">
        <h3 className="font-serif font-bold text-lg text-foreground mb-3 truncate">
          {look.nome}
        </h3>
        
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {linkedProducts.map((product) => (
            <div 
              key={product.id} 
              className="w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-border bg-muted"
              title={product.nome}
            >
              <img
                src={getProductImageByColor(product).src}
                alt={product.nome}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {linkedProducts.length === 0 && (
            <div className="w-full h-20 flex items-center justify-center bg-muted rounded-lg border border-dashed border-border">
              <span className="text-xs text-muted-foreground">Produtos não encontrados</span>
            </div>
          )}
        </div>

        <Button 
          variant="ghost" 
          className="w-full justify-between group/btn text-primary hover:text-primary hover:bg-primary/5 rounded-xl h-10 px-3"
          onClick={handleSelectLook}
        >
          <span className="text-sm font-semibold">Selecionar esse look</span>
          <ChevronRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};