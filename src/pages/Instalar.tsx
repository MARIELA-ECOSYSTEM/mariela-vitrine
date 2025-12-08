import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  Download, 
  Share, 
  Plus, 
  MoreVertical, 
  Smartphone, 
  CheckCircle2,
  Apple,
  Chrome,
  ArrowRight,
  Sparkles,
  Home,
  Wifi,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('android');

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

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    { icon: Home, title: "Ícone na Tela Inicial", description: "Acesse diretamente como qualquer app" },
    { icon: Wifi, title: "Funciona Offline", description: "Navegue pelos produtos sem internet" },
    { icon: Bell, title: "Notificações", description: "Receba alertas de promoções" },
    { icon: Sparkles, title: "Mais Rápido", description: "Carregamento instantâneo" },
  ];

  const iosSteps = [
    { 
      step: 1, 
      icon: Share, 
      title: "Toque em Compartilhar",
      description: "No Safari, toque no ícone de compartilhamento na barra inferior",
      image: "📤"
    },
    { 
      step: 2, 
      icon: Plus, 
      title: "Adicionar à Tela Inicial",
      description: "Role para baixo e toque em 'Adicionar à Tela de Início'",
      image: "➕"
    },
    { 
      step: 3, 
      icon: CheckCircle2, 
      title: "Confirmar",
      description: "Toque em 'Adicionar' no canto superior direito",
      image: "✅"
    },
  ];

  const androidSteps = [
    { 
      step: 1, 
      icon: MoreVertical, 
      title: "Menu do Navegador",
      description: "No Chrome, toque nos 3 pontos no canto superior direito",
      image: "⋮"
    },
    { 
      step: 2, 
      icon: Download, 
      title: "Instalar Aplicativo",
      description: "Selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'",
      image: "📲"
    },
    { 
      step: 3, 
      icon: CheckCircle2, 
      title: "Confirmar",
      description: "Toque em 'Instalar' para adicionar o app",
      image: "✅"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/20 to-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
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
          <Card className="mb-6 border-green-500/50 bg-green-500/10 animate-pop-in">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">App já instalado!</p>
                <p className="text-sm text-muted-foreground">Você já tem o Mariela na sua tela inicial</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Install Button */}
        {deferredPrompt && !isInstalled && (
          <Card className="mb-6 border-primary/50 bg-primary/5 overflow-hidden animate-pop-in">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-semibold text-foreground mb-1">Instalação Rápida</p>
                  <p className="text-sm text-muted-foreground">Clique para instalar automaticamente</p>
                </div>
                <Button 
                  onClick={handleInstall}
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 animate-pwa-install-glow"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Instalar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {benefits.map((benefit, index) => (
            <Card 
              key={benefit.title} 
              className="animate-fade-in border-border/50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-3 sm:p-4 text-center">
                <benefit.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto mb-2" />
                <p className="font-medium text-xs sm:text-sm text-foreground">{benefit.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'android' ? 'default' : 'outline'}
            onClick={() => setActiveTab('android')}
            className="flex-1 h-12 gap-2"
          >
            <Chrome className="h-5 w-5" />
            Android
          </Button>
          <Button
            variant={activeTab === 'ios' ? 'default' : 'outline'}
            onClick={() => setActiveTab('ios')}
            className="flex-1 h-12 gap-2"
          >
            <Apple className="h-5 w-5" />
            iPhone
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              {activeTab === 'ios' ? (
                <>
                  <Apple className="h-5 w-5" />
                  Instalação no iPhone (Safari)
                </>
              ) : (
                <>
                  <Chrome className="h-5 w-5" />
                  Instalação no Android (Chrome)
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {(activeTab === 'ios' ? iosSteps : androidSteps).map((step, index) => (
              <div 
                key={step.step} 
                className={cn(
                  "flex gap-4 animate-fade-in",
                  index < (activeTab === 'ios' ? iosSteps : androidSteps).length - 1 && "pb-4 border-b border-border"
                )}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Step Number */}
                <div className="shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg sm:text-xl">
                    {step.step}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
                </div>

                {/* Visual */}
                <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-secondary/50 rounded-xl flex items-center justify-center text-2xl sm:text-3xl">
                  {step.image}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
    </div>
  );
}
