import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const NetworkStatusIndicator = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setShowReconnected(false);
    } else if (wasOffline && isOnline) {
      setShowReconnected(true);
      setVisible(true);
      
      // Hide after 3 seconds when back online
      const timer = setTimeout(() => {
        setVisible(false);
        setShowReconnected(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg transition-all duration-300 animate-fade-in",
        !isOnline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-green-600 text-white"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Sem conexão - Modo offline</span>
          </>
        ) : showReconnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Conectado - Sincronizando...</span>
            <RefreshCw className="w-4 h-4 animate-spin" />
          </>
        ) : null}
      </div>
    </div>
  );
};
