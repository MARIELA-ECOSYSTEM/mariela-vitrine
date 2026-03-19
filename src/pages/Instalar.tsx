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
  ArrowRight,
  Share,
  MoreVertical,
  Plus,
  RefreshCw
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

// Detect platform
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
  
  return { isIOS, isAndroid, isSafari, isChrome, isStandalone };
};

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const [promptReady, setPromptReady] = useState(false);

  useEffect(() => {
    // Update device info
    setDeviceInfo(getDeviceInfo());
    
    // Check if already installed
    if (deviceInfo.isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      console.log('beforeinstallprompt event captured');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPromptReady(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      console.log('App installed');
      setIsInstalled(true);
    });

    // For browsers that might have already fired the event
    // Try to trigger the prompt check after a short delay
    const timer = setTimeout(() => {
      if (!deferredPrompt && !deviceInfo.isIOS) {
        // Force a re-check by dispatching a custom event
        console.log('Checking for deferred prompt availability');
      }
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
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
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Install error:', error);
    }
    setDeferredPrompt(null);
    setShowConfirmDialog(false);
    setIsInstalling(false);
  };

  const handleRefreshForPrompt = () => {
    // Store flag to show we're expecting the prompt
    sessionStorage.setItem('expecting-install-prompt', 'true');
    window.location.reload();
  };

  const benefits = [
    { icon: Home, title: "Ícone na Tela Inicial", description: "Acesse diretamente como qualquer app" },
    { icon: Wifi, title: "Funciona Offline", description: "Navegue pelos produtos sem internet" },
    { icon: Bell, title: "Notificações", description: "Receba alertas de promoções" },
    { icon: Sparkles, title: "Mais Rápido", description: "Carregamento instantâneo" },
  ];

  // iOS Safari Instructions
  const IOSInstructions = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-500" />
          Instalar no iPhone/iPad (Safari)
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Toque no botão Compartilhar</p>
              <p className="text-sm text-muted-foreground mt-1">
                Na barra inferior do Safari, toque no ícone 
                <Share className="inline h-4 w-4 mx-1 text-blue-500" />
                (quadrado com seta para cima)
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Escolha "Adicionar à Tela de Início"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Role para baixo no menu e toque em 
                <span className="inline-flex items-center gap-1 mx-1 bg-muted px-2 py-0.5 rounded text-xs">
                  <Plus className="h-3 w-3" /> Tela de Início
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Confirme a instalação</p>
              <p className="text-sm text-muted-foreground mt-1">
                Toque em "Adicionar" no canto superior direito
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-center text-sm text-muted-foreground">
        Após seguir os passos, o app Mariela aparecerá na sua tela inicial! 🎉
      </p>
    </div>
  );

  // Android Chrome Instructions (when prompt not available)
  const AndroidInstructions = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-2xl p-5 border border-green-500/20">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-green-500" />
          Instalar no Android (Chrome)
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Abra o menu do Chrome</p>
              <p className="text-sm text-muted-foreground mt-1">
                Toque nos três pontos 
                <MoreVertical className="inline h-4 w-4 mx-1 text-green-500" />
                no canto superior direito
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Escolha "Adicionar à tela inicial"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ou "Instalar aplicativo" se disponível
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Confirme a instalação</p>
              <p className="text-sm text-muted-foreground mt-1">
                Toque em "Adicionar" para confirmar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Retry button for Android */}
      <Button 
        onClick={handleRefreshForPrompt}
        variant="outline"
        className="w-full gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar instalação automática
      </Button>
      
      <p className="text-center text-xs text-muted-foreground">
        Se o botão de instalação automática não aparecer, siga os passos acima
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/20 to-background pt-[56px] sm:pt-[64px]">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-2xl pt-16 sm:pt-20">
        {/* Hero Section */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-xl">
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
          <div className="mb-6 border-green-500/50 bg-green-500/10 rounded-2xl p-4 animate-fade-in flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">App já instalado!</p>
              <p className="text-sm text-muted-foreground">Você já tem o Mariela na sua tela inicial</p>
            </div>
          </div>
        )}

        {/* Install Button - When prompt is available (Android Chrome usually) */}
        {deferredPrompt && !isInstalled && (
          <div className="mb-6 animate-fade-in">
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

        {/* Platform-specific instructions when prompt not available */}
        {!isInstalled && !deferredPrompt && (
          <div className="mb-6">
            {deviceInfo.isIOS ? (
              <IOSInstructions />
            ) : deviceInfo.isAndroid ? (
              <AndroidInstructions />
            ) : (
              // Desktop or other browsers
              <div className="bg-muted/50 rounded-2xl p-6 text-center animate-fade-in">
                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Acesse pelo celular</h3>
                <p className="text-sm text-muted-foreground">
                  Para instalar o app, acesse este site pelo navegador do seu celular 
                  (Chrome no Android ou Safari no iPhone).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
