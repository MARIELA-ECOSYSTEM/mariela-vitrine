import { Loader2 } from "lucide-react";

export const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">Carregando produtos...</p>
      </div>
    </div>
  );
};
