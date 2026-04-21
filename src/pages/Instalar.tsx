import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QRCodeSVG } from "qrcode.react";
import logoSimple from "@/assets/logo-simple.png";
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
  RefreshCw,
  Zap,
  ShieldCheck,
  QrCode
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

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
  const isDesktop = !isIOS && !isAndroid;
  
  return { isIOS, isAndroid, isSafari, isChrome, isStandalone, isDesktop };
};

// Floating animated phone illustration
const PhoneIllustration = () => (
  <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
    {/* Glow ring */}
    <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
    <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
    
    {/* Phone body */}
    <div 
      className="absolute inset-4 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-1 border-2 border-primary-foreground/20"
      style={{ animation: 'float 3s ease-in-out infinite' }}
    >
      {/* Logo inside phone */}
      <img src={logoSimple} alt="Mariela" className="w-12 h-12 sm:w-16 sm:h-16 object-contain brightness-0 invert opacity-90" />
      <span className="text-primary-foreground/80 text-[8px] sm:text-[10px] font-medium">Mariela</span>
    </div>
    
    {/* Floating badges */}
    <div 
      className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-4 border-background"
      style={{ animation: 'float 2.5s ease-in-out infinite 0.3s' }}
    >
      <Download className="h-4 w-4 text-white" />
    </div>
    <div 
      className="absolute -bottom-1 -left-3 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg border-3 border-background"
      style={{ animation: 'float 2.8s ease-in-out infinite 0.6s' }}
    >
      <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
    </div>
  </div>
);

// Step card component
const StepCard = ({ step, icon: Icon, title, description, color }: {
  step: number;
  icon: any;
  title: string;
  description: string;
  color: string;
}) => (
  <div 
    className="flex items-start gap-4 animate-fade-in"
    style={{ animationDelay: `${step * 0.15}s` }}
  >
    <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md`}>
      {step}
    </div>
    <div className="flex-1 pb-4 border-b border-border/30 last:border-0">
      <p className="font-semibold text-foreground flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-70" />
        {title}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());

  const installUrl = typeof window !== 'undefined' ? window.location.origin + '/instalar' : '';

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
    
    if (getDeviceInfo().isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) setShowConfirmDialog(true);
  };

  const confirmInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
    } catch (error) {
      console.error('Install error:', error);
    }
    setDeferredPrompt(null);
    setShowConfirmDialog(false);
    setIsInstalling(false);
  };

  const benefits = [
    { icon: Home, title: "Tela Inicial", description: "Acesse como qualquer app", gradient: "from-primary/15 to-primary/5" },
    { icon: Wifi, title: "Modo Offline", description: "Sem internet? Sem problema", gradient: "from-accent/15 to-accent/5" },
    { icon: Bell, title: "Notificações", description: "Promoções em tempo real", gradient: "from-primary/15 to-primary/5" },
    { icon: Zap, title: "Super Rápido", description: "Carregamento instantâneo", gradient: "from-accent/15 to-accent/5" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pt-[60px] sm:pt-[68px]">
      <Header />
      
      {/* Custom float keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-10 sm:py-16">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 max-w-2xl relative z-10">
            <PhoneIllustration />
            
            <div className="text-center mt-6 animate-fade-in">
              <h1 className="text-2xl sm:text-4xl font-serif font-bold text-foreground mb-3">
                Instale o App <span className="text-primary">Mariela</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Sua loja de moda feminina favorita, sempre à mão. 
                Rápido, leve e com acesso offline.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-2xl pb-10">
          {/* Already Installed */}
          {isInstalled && (
            <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-5 animate-fade-in space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">App já instalado! 🎉</p>
                <p className="text-sm text-muted-foreground">O Mariela está na sua tela inicial</p>
              </div>
            </div>
            {!deviceInfo.isStandalone && (
              <Button
                onClick={() => {
                  // Try to open the installed PWA via the start_url
                  window.location.href = window.location.origin + '/?utm_source=pwa_redirect';
                }}
                variant="outline"
                className="w-full gap-2 rounded-xl border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
              >
                <Smartphone className="h-4 w-4" />
                Abrir no Aplicativo
              </Button>
            )}
            </div>
          )}

          {/* Install Button */}
          {deferredPrompt && !isInstalled && (
            <div className="mb-8 animate-fade-in">
              <Button 
                onClick={handleInstallClick}
                size="lg"
                className="w-full h-14 text-lg gap-3 shadow-xl hover:shadow-2xl transition-all rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              >
                <Download className="h-6 w-6" />
                Instalar App Mariela
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Instalação gratuita • Menos de 1MB
              </p>
            </div>
          )}

          {/* Platform Instructions */}
          {!isInstalled && !deferredPrompt && (
            <div className="mb-8">
              {deviceInfo.isIOS ? (
                <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 animate-fade-in">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Instalar no iPhone/iPad
                  </h3>
                  <StepCard step={1} icon={Share} title="Toque em Compartilhar" description='Na barra do Safari, toque no ícone de compartilhamento (quadrado com seta)' color="bg-primary" />
                  <StepCard step={2} icon={Plus} title="Adicionar à Tela de Início" description='Role o menu e selecione "Adicionar à Tela de Início"' color="bg-primary" />
                  <StepCard step={3} icon={CheckCircle2} title="Confirmar" description='Toque em "Adicionar" no canto superior direito' color="bg-primary" />
                </div>
              ) : deviceInfo.isAndroid ? (
                <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 animate-fade-in">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Instalar no Android
                  </h3>
                  <StepCard step={1} icon={MoreVertical} title="Menu do Chrome" description="Toque nos três pontos no canto superior direito" color="bg-primary" />
                  <StepCard step={2} icon={Download} title="Instalar aplicativo" description='Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"' color="bg-primary" />
                  <StepCard step={3} icon={CheckCircle2} title="Confirmar" description='Toque em "Instalar" para confirmar' color="bg-primary" />
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full gap-2 mt-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tentar instalação automática
                  </Button>
                </div>
              ) : (
                /* Desktop - QR Code section */
                <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 text-center animate-fade-in">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-lg">Escaneie com seu celular</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Aponte a câmera do celular para o QR Code abaixo para abrir a página de instalação
                  </p>
                  
                  <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-border/30">
                    <QRCodeSVG 
                      value={installUrl}
                      size={180}
                      level="M"
                      includeMargin={false}
                      imageSettings={{
                        src: logoSimple,
                        height: 36,
                        width: 36,
                        excavate: true,
                      }}
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Ou acesse <span className="font-mono text-primary text-xs">marielamf.lovable.app/instalar</span> no celular
                  </p>
                </div>
              )}
            </div>
          )}

          {/* QR Code for desktop even when prompt is available (hidden when installed) */}
          {deviceInfo.isDesktop && !isInstalled && deferredPrompt && (
            <div className="mb-8 bg-card border border-border/50 rounded-2xl p-6 text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">Instalar no celular?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Escaneie o QR Code</p>
              <div className="inline-block p-3 bg-white rounded-xl shadow-md">
                <QRCodeSVG value={installUrl} size={140} level="M" />
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {benefits.map((benefit, index) => (
              <div 
                key={benefit.title} 
                className={`bg-gradient-to-br ${benefit.gradient} border border-border/30 rounded-2xl p-4 text-center animate-fade-in hover:scale-[1.03] transition-transform`}
                style={{ animationDelay: `${index * 0.1 + 0.3}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold text-sm text-foreground">{benefit.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <ShieldCheck className="h-4 w-4" />
            <span>Seguro • Gratuito • Sem ocupar espaço</span>
          </div>

          {/* CTA */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="gap-2 rounded-xl"
            >
              Voltar para a Loja
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
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
              Deseja adicionar o Mariela à sua tela inicial?
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
