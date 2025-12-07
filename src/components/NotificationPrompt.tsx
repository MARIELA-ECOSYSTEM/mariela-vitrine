import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export const NotificationPrompt = () => {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 30) {
        setIsDismissed(true);
        return;
      }
    }

    // Show prompt after delay if supported and not already granted
    if (isSupported && permission === 'default') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notificações ativadas! Você receberá avisos de novidades e promoções.");
    } else {
      toast.error("Não foi possível ativar notificações.");
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', new Date().toISOString());
  };

  if (!showPrompt || isDismissed || permission !== 'default') return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-up md:w-80">
      <Card className="bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1 text-sm">
                Ativar notificações?
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Receba avisos de novos produtos e promoções exclusivas!
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleEnable}
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <Bell className="w-3 h-3" />
                  Ativar
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Depois
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
