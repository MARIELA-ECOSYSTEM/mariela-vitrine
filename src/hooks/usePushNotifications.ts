import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (isSupported) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        await subscribeToNotifications();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificações:', error);
      return false;
    }
  }, [state.isSupported]);

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setState(prev => ({ ...prev, isSubscribed: true }));
        return existingSubscription;
      }

      // For demo purposes, we'll just mark as subscribed
      // In production, you'd send the subscription to your server
      setState(prev => ({ ...prev, isSubscribed: true }));
      
      return null;
    } catch (error) {
      console.error('Erro ao se inscrever para notificações:', error);
      return null;
    }
  };

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') return;
    
    try {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.png',
        ...options,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    sendLocalNotification,
  };
}
