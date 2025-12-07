import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Produto } from "@/data/products";
import { ProductSelectWithThumbnail } from "@/components/ProductSelectWithThumbnail";
import { X } from "lucide-react";

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: Produto[];
  selectedProducts: number[];
  onConfirm: (products: number[]) => void;
}

export const ProductSelectionDialog = ({
  open,
  onOpenChange,
  produtos,
  selectedProducts,
  onConfirm
}: ProductSelectionDialogProps) => {
  const [selections, setSelections] = useState<{
    blusa: number | null;
    bottom: number | null;
    bolsa: number | null;
    vestido: number | null;
    conjunto: number | null;
  }>({
    blusa: null,
    bottom: null,
    bolsa: null,
    vestido: null,
    conjunto: null,
  });

  // Inicializar seleções com produtos já selecionados
  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      const newSelections = {
        blusa: null as number | null,
        bottom: null as number | null,
        bolsa: null as number | null,
        vestido: null as number | null,
        conjunto: null as number | null,
      };

      selectedProducts.forEach(id => {
        const produto = produtos.find(p => p.id === id);
        if (produto) {
          if (produto.categoria === "blusas") {
            newSelections.blusa = produto.id;
          } else if (produto.categoria === "calças" || produto.categoria === "shorts") {
            newSelections.bottom = produto.id;
          } else if (produto.categoria === "bolsas") {
            newSelections.bolsa = produto.id;
          } else if (produto.categoria === "vestidos") {
            newSelections.vestido = produto.id;
          } else if (produto.categoria === "conjuntos") {
            newSelections.conjunto = produto.id;
          }
        }
      });

      setSelections(newSelections);
    }
  }, [open, selectedProducts, produtos]);

  const blusas = produtos.filter(p => p.categoria === "blusas");
  const bottoms = produtos.filter(p => p.categoria === "shorts" || p.categoria === "calças");
  const bolsas = produtos.filter(p => p.categoria === "bolsas");
  const vestidos = produtos.filter(p => p.categoria === "vestidos");
  const conjuntos = produtos.filter(p => p.categoria === "conjuntos");

  const handleConfirm = () => {
    const selectedIds = Object.values(selections).filter((id): id is number => id !== null);
    onConfirm(selectedIds);
    onOpenChange(false);
  };

  const handleRemoveItem = (category: keyof typeof selections) => {
    setSelections({ ...selections, [category]: null });
  };

  const getSelectedProduct = (id: number | null) => {
    if (!id) return null;
    return produtos.find(p => p.id === id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">Selecionar Produtos do Look</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Blusa */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Blusa</label>
              {selections.blusa && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('blusa')}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <ProductSelectWithThumbnail
              produtos={blusas}
              value={selections.blusa}
              onValueChange={(value) => setSelections({ ...selections, blusa: parseInt(value) })}
              placeholder="Selecione uma blusa"
            />
          </div>

          {/* Bottom (Calças/Shorts) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Calça/Short</label>
              {selections.bottom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('bottom')}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <ProductSelectWithThumbnail
              produtos={bottoms}
              value={selections.bottom}
              onValueChange={(value) => setSelections({ ...selections, bottom: parseInt(value) })}
              placeholder="Selecione uma calça ou short"
            />
          </div>

          {/* Bolsa */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Bolsa</label>
              {selections.bolsa && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('bolsa')}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <ProductSelectWithThumbnail
              produtos={bolsas}
              value={selections.bolsa}
              onValueChange={(value) => setSelections({ ...selections, bolsa: parseInt(value) })}
              placeholder="Selecione uma bolsa"
            />
          </div>

          {/* Vestido */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Vestido</label>
              {selections.vestido && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('vestido')}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <ProductSelectWithThumbnail
              produtos={vestidos}
              value={selections.vestido}
              onValueChange={(value) => setSelections({ ...selections, vestido: parseInt(value) })}
              placeholder="Selecione um vestido"
            />
          </div>

          {/* Conjunto */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Conjunto</label>
              {selections.conjunto && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('conjunto')}
                  className="h-8 px-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <ProductSelectWithThumbnail
              produtos={conjuntos}
              value={selections.conjunto}
              onValueChange={(value) => setSelections({ ...selections, conjunto: parseInt(value) })}
              placeholder="Selecione um conjunto"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Seleção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
