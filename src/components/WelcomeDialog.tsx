import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import logoFull from "@/assets/logo-full.png";

export const WelcomeDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Mostra o pop-up apenas em acesso direto/refresh, não em navegação interna
    const hasSeenInSession = sessionStorage.getItem("mariela-welcome-shown");
    if (!hasSeenInSession) {
      setOpen(true);
      sessionStorage.setItem("mariela-welcome-shown", "true");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] bg-background border-primary/20">
        <DialogHeader className="space-y-4">
          <div className="flex justify-center animate-fade-in">
          <img 
              src={logoFull} 
              alt="Site Mariela" 
              className="h-32"
            />
          </div>
          <DialogTitle className="text-center text-2xl font-serif animate-slide-down">
            Bem-vinda ao Site Mariela! 💜
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 text-base animate-fade-in">
            <p className="text-foreground/90">
              Que bom te ver por aqui! ✨
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex gap-3 items-start">
                <ShoppingBag className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-foreground/80">
                  Nossa vitrine virtual traz todas as peças que estão em estoque na loja física. 
                  Dá uma olhada e se apaixone! 🛍️
                </p>
              </div>
              
              <div className="flex gap-3 items-start">
                <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-foreground/80">
                  Use o <span className="font-semibold text-primary">Monte Seu Look</span> para 
                  criar combinações incríveis! Escolha as peças que mais combinam com você e veja 
                  como ficam juntas antes de garantir as suas. É diversão e praticidade no mesmo lugar! 🤩
                </p>
              </div>
              
              <div className="flex gap-3 items-start">
                <Heart className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-foreground/80">
                  Viu algo que amou? É só chamar a gente no WhatsApp que a gente ajuda
                  a finalizar seu pedido com todo carinho! 💬
                </p>
              </div>
            </div>

            <p className="text-foreground/90 font-medium pt-2">
              Aproveite e monte o look dos seus sonhos! 💕
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={() => setOpen(false)}
            className="flex-1 bg-primary hover:bg-primary-dark"
          >
            Explorar Produtos
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link to="/monte-seu-look">
              <Sparkles className="h-4 w-4 mr-2" />
              Monte Seu Look
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};