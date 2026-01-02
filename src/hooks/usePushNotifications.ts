import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
}

export function usePushNotifications() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
  });

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));

    // Register service worker
    if (isSupported && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        variant: 'destructive',
        title: 'No soportado',
        description: 'Tu navegador no soporta notificaciones push',
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast({
          title: '¡Notificaciones activadas!',
          description: 'Recibirás alertas de tickets urgentes',
        });
        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'No podrás recibir notificaciones push',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [state.isSupported, toast]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Play notification sound if enabled
    const settings = localStorage.getItem('systemSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.enableNotificationSound) {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Show notification directly with the Notification API for better compatibility
    try {
      const notification = new Notification(title, {
        ...options,
        icon: options?.icon || '/favicon.ico',
        badge: '/favicon.ico',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      // Fallback to service worker if direct notification fails
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options,
        });
      }
    }
  }, [state.permission]);

  // Subscribe to urgent tickets for admins
  useEffect(() => {
    if (!user || !isAdmin || state.permission !== 'granted') return;

    const channel = supabase
      .channel('urgent-tickets-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: 'priority=eq.urgent',
        },
        (payload) => {
          const ticket = payload.new as { title: string; ticket_number: number };
          sendNotification('🚨 Ticket Urgente', {
            body: `#${ticket.ticket_number}: ${ticket.title}`,
            icon: '/favicon.ico',
            tag: 'urgent-ticket',
            requireInteraction: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, state.permission, sendNotification]);

  // Subscribe to new notifications for the user
  useEffect(() => {
    if (!user || state.permission !== 'granted') return;

    const channel = supabase
      .channel('user-notifications-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as { title: string; message: string };
          sendNotification(notif.title, {
            body: notif.message,
            icon: '/favicon.ico',
            tag: 'notification',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, state.permission, sendNotification]);

  return {
    ...state,
    requestPermission,
    sendNotification,
  };
}
