import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Download, 
  Smartphone, 
  CheckCircle2,
  Sparkles,
  Home,
  Wifi,
  Bell,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      setShowConfirmDialog(true);
    }
  };

  const confirmInstall = async () => {
    if (!deferredPrompt) return;
    
    setIsInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowConfirmDialog(false);
    setIsInstalling(false);
  };

  const benefits = [
    { icon: Home, title: "Ícone na Tela Inicial", description: "Acesse diretamente como qualquer app" },
    { icon: Wifi, title: "Funciona Offline", description: "Navegue pelos produtos sem internet" },
    { icon: Bell, title: "Notificações", description: "Receba alertas de promoções" },
    { icon: Sparkles, title: "Mais Rápido", description: "Carregamento instantâneo" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/20 to-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-2xl pt-24">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-xl animate-bounce">
              <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
            </div>
            <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-background">
              <Download className="h-4 w-4 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-2">
            Instale o App Mariela
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Tenha a loja sempre à mão, direto na sua tela inicial
          </p>
        </div>

        {/* Already Installed */}
        {isInstalled && (
          <div className="mb-6 border-green-500/50 bg-green-500/10 rounded-2xl p-4 animate-pop-in flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">App já instalado!</p>
              <p className="text-sm text-muted-foreground">Você já tem o Mariela na sua tela inicial</p>
            </div>
          </div>
        )}

        {/* Install Button - Main CTA */}
        {deferredPrompt && !isInstalled && (
          <div className="mb-8 animate-pop-in">
            <Button 
              onClick={handleInstallClick}
              size="lg"
              className="w-full h-14 text-lg gap-3 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
            >
              <Download className="h-6 w-6" />
              Instalar App Mariela
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-3">
              Clique para adicionar o app à sua tela inicial
            </p>
          </div>
        )}

        {/* No prompt available message */}
        {!deferredPrompt && !isInstalled && (
          <div className="mb-8 bg-muted/50 rounded-2xl p-6 text-center animate-fade-in">
            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Instalação não disponível</h3>
            <p className="text-sm text-muted-foreground">
              O seu navegador não suporta instalação automática. 
              Tente abrir este site no Chrome (Android) ou Safari (iPhone).
            </p>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {benefits.map((benefit, index) => (
            <div 
              key={benefit.title} 
              className="bg-card border border-border/50 rounded-2xl p-4 text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <benefit.icon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm text-foreground">{benefit.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in">
          <p className="text-muted-foreground text-sm mb-4">
            Depois de instalar, o app Mariela aparecerá na sua tela inicial como qualquer outro aplicativo!
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="gap-2"
          >
            Voltar para a Loja
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>

      <Footer />

      {/* Install Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Instalar App Mariela
            </DialogTitle>
            <DialogDescription>
              Deseja adicionar o Mariela à sua tela inicial? Você poderá acessar a loja como um aplicativo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Acesso rápido pela tela inicial
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Funciona offline
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Notificações de promoções
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmInstall} disabled={isInstalling} className="gap-2">
              {isInstalling ? (
                <>Instalando...</>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Instalar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
