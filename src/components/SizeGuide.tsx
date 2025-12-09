import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler, Info } from "lucide-react";

interface SizeGuideProps {
  categoria?: string;
}

export const SizeGuide = ({ categoria }: SizeGuideProps) => {
  const [open, setOpen] = useState(false);

  const sizeData = {
    roupas: {
      title: "Roupas Femininas",
      headers: ["Tamanho", "Busto (cm)", "Cintura (cm)", "Quadril (cm)"],
      rows: [
        ["PP", "80-84", "60-64", "86-90"],
        ["P", "84-88", "64-68", "90-94"],
        ["M", "88-92", "68-72", "94-98"],
        ["G", "92-96", "72-76", "98-102"],
        ["GG", "96-102", "76-82", "102-108"],
        ["XG", "102-108", "82-88", "108-114"],
      ],
    },
    vestidos: {
      title: "Vestidos",
      headers: ["Tamanho", "Busto (cm)", "Cintura (cm)", "Comprimento (cm)"],
      rows: [
        ["PP", "80-84", "60-64", "85-90"],
        ["P", "84-88", "64-68", "88-93"],
        ["M", "88-92", "68-72", "91-96"],
        ["G", "92-96", "72-76", "94-99"],
        ["GG", "96-102", "76-82", "97-102"],
      ],
    },
    calcas: {
      title: "Calças e Shorts",
      headers: ["Tamanho", "Cintura (cm)", "Quadril (cm)", "Entrepernas (cm)"],
      rows: [
        ["34", "60-64", "86-90", "76"],
        ["36", "64-68", "90-94", "77"],
        ["38", "68-72", "94-98", "78"],
        ["40", "72-76", "98-102", "79"],
        ["42", "76-80", "102-106", "80"],
        ["44", "80-84", "106-110", "81"],
        ["46", "84-88", "110-114", "82"],
      ],
    },
    blusas: {
      title: "Blusas e Camisas",
      headers: ["Tamanho", "Busto (cm)", "Ombros (cm)", "Comprimento (cm)"],
      rows: [
        ["PP", "80-84", "36-38", "58-60"],
        ["P", "84-88", "38-40", "60-62"],
        ["M", "88-92", "40-42", "62-64"],
        ["G", "92-96", "42-44", "64-66"],
        ["GG", "96-102", "44-46", "66-68"],
      ],
    },
  };

  const tips = [
    {
      title: "Como medir o Busto",
      description: "Meça a circunferência na parte mais larga do busto, mantendo a fita reta nas costas.",
    },
    {
      title: "Como medir a Cintura",
      description: "Meça na parte mais estreita da cintura, geralmente acima do umbigo.",
    },
    {
      title: "Como medir o Quadril",
      description: "Meça na parte mais larga do quadril, mantendo a fita reta.",
    },
    {
      title: "Dica importante",
      description: "Se estiver entre dois tamanhos, escolha o maior para mais conforto.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
          <Ruler className="h-4 w-4" />
          Guia de Medidas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ruler className="h-5 w-5 text-primary" />
            Guia de Medidas
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={categoria || "roupas"} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="roupas" className="text-xs">Roupas</TabsTrigger>
            <TabsTrigger value="vestidos" className="text-xs">Vestidos</TabsTrigger>
            <TabsTrigger value="calcas" className="text-xs">Calças</TabsTrigger>
            <TabsTrigger value="blusas" className="text-xs">Blusas</TabsTrigger>
          </TabsList>

          {Object.entries(sizeData).map(([key, data]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-primary/10 px-4 py-2">
                  <h3 className="font-semibold text-sm text-primary">{data.title}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        {data.headers.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                          {row.map((cell, j) => (
                            <td key={j} className={`px-3 py-2.5 whitespace-nowrap ${j === 0 ? 'font-semibold text-primary' : 'text-foreground'}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Tips Section */}
        <div className="mt-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Como tirar suas medidas
          </h4>
          <div className="grid gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm text-foreground">{tip.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Guide */}
        <div className="mt-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Use uma fita métrica flexível para obter medidas precisas. 
            Peça ajuda de alguém para medir suas costas com precisão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};