import { Produto } from "@/data/products";
import mannequinBase from "@/assets/mannequin-base.png";
import { Badge } from "@/components/ui/badge";
import { getProductImageByColor } from "@/lib/productImage";

interface MannequinDisplayProps {
  selectedBlusa: Produto | null;
  selectedBottom: Produto | null;
  selectedBolsa: Produto | null;
  selectedVestido: Produto | null;
  selectedConjunto: Produto | null;
  selectedColors: {
    blusa: string;
    bottom: string;
    bolsa: string;
    vestido: string;
    conjunto: string;
  };
}

export const MannequinDisplay = ({
  selectedBlusa,
  selectedBottom,
  selectedBolsa,
  selectedVestido,
  selectedConjunto,
  selectedColors,
}: MannequinDisplayProps) => {
  const isFullOutfit = selectedVestido || selectedConjunto;

  // Wrapper sobre o utilitário central — reusa fallback/log padronizados.
  const getImageForColor = (produto: Produto | null, cor: string) =>
    getProductImageByColor(produto, cor).src;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Container do Manequim */}
      <div className="relative aspect-[2/3] bg-gradient-to-br from-secondary/10 via-background to-secondary/5 rounded-3xl shadow-2xl overflow-hidden border-2 border-border/40">
        {/* Efeito de iluminação */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 pointer-events-none" />
        
        {/* Imagem base do manequim */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <img
            src={mannequinBase}
            alt="Manequim"
            className="h-full w-auto object-contain"
          />
        </div>

        {/* Área de sobreposição de roupas */}
        <div className="absolute inset-0">
          {isFullOutfit ? (
            // Vestido ou Conjunto - visualização completa
            <div className="relative h-full w-full">
              {(selectedVestido || selectedConjunto) && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative w-full h-full">
                    <img
                      src={getImageForColor(
                        selectedVestido || selectedConjunto,
                        selectedVestido ? selectedColors.vestido : selectedColors.conjunto
                      )}
                      alt={(selectedVestido || selectedConjunto)?.nome}
                      className="w-full h-full object-contain drop-shadow-2xl animate-fade-in"
                    />
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg">
                        {selectedVestido ? "Vestido" : "Conjunto"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Separado: Blusa + Bottom
            <div className="relative h-full">
              {/* Blusa - parte superior (40% da altura) */}
              <div className="absolute top-[5%] left-0 right-0 h-[40%] flex items-center justify-center px-8">
                {selectedBlusa ? (
                  <div className="relative w-full h-full">
                    <img
                      src={getImageForColor(selectedBlusa, selectedColors.blusa)}
                      alt={selectedBlusa.nome}
                      className="w-full h-full object-contain drop-shadow-2xl animate-fade-in"
                    />
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg text-xs">
                        Blusa
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/40">
                    <svg
                      className="w-20 h-20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 11h10M7 11V7a4 4 0 018 0v4M7 11v10a2 2 0 002 2h6a2 2 0 002-2V11"
                      />
                    </svg>
                    <p className="text-sm font-medium">Selecione uma Blusa</p>
                  </div>
                )}
              </div>

              {/* Bottom - parte inferior (45% da altura) */}
              <div className="absolute top-[48%] left-0 right-0 h-[45%] flex items-start justify-center px-8">
                {selectedBottom ? (
                  <div className="relative w-full h-full">
                    <img
                      src={getImageForColor(selectedBottom, selectedColors.bottom)}
                      alt={selectedBottom.nome}
                      className="w-full h-full object-contain drop-shadow-2xl animate-fade-in"
                    />
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg text-xs">
                        {selectedBottom.categoria === "calças"
                          ? "Calça"
                          : "Short"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground/40 pt-4">
                    <svg
                      className="w-16 h-20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 3v18M9 9l3-3 3 3M9 15l3 3 3-3"
                      />
                    </svg>
                    <p className="text-sm font-medium">
                      Selecione Calça/Short
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bolsa/Acessório - flutuando do lado direito */}
          {selectedBolsa && (
            <div className="absolute right-4 top-[35%] w-28 h-28 animate-fade-in">
              <div className="relative w-full h-full bg-background/95 backdrop-blur-sm rounded-2xl p-3 shadow-2xl border-2 border-primary/30 hover:scale-110 transition-transform duration-300">
                <img
                  src={getImageForColor(selectedBolsa, selectedColors.bolsa)}
                  alt={selectedBolsa.nome}
                  className="w-full h-full object-contain"
                />
                <div className="absolute -top-2 -left-2">
                  <Badge className="bg-accent text-accent-foreground shadow-lg text-xs">
                    Bolsa
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estado vazio */}
        {!selectedBlusa &&
          !selectedBottom &&
          !selectedBolsa &&
          !selectedVestido &&
          !selectedConjunto && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 px-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-primary/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">
                    Monte seu Look
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Selecione as peças abaixo para começar
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Legenda inferior */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Visualização em tempo real do seu look
        </p>
      </div>
    </div>
  );
};
