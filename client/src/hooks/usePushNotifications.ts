import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isSupported ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing subscription status on mount
  useEffect(() => {
    if (!isSupported) return;

    const checkExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        // Silently ignore — just means we can't detect status
      }
    };

    checkExistingSubscription();
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('[Push] Browser does not support push notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('[Push] Error requesting permission:', err);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsLoading(true);

      // 1. Request notification permission
      const granted = await requestPermission();
      if (!granted) {
        console.log('[Push] Permission not granted');
        return false;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker registered:', registration.scope);

      // 3. Get VAPID public key from server
      const vapidRes = await api.get('/notifications/vapid-key');
      const vapidPublicKey = vapidRes.data.publicKey;

      if (!vapidPublicKey) {
        console.error('[Push] No VAPID public key from server');
        return false;
      }

      // 4. Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // 5. Subscribe with PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // 6. Send subscription to server
      await api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed to push notifications');
      return true;
    } catch (err) {
      console.error('[Push] Subscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsLoading(true);

      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        setIsSubscribed(false);
        return true;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;

        // Unsubscribe from browser PushManager
        await subscription.unsubscribe();

        // Remove from server DB
        try {
          await api.post('/notifications/unsubscribe', { endpoint });
        } catch (serverErr) {
          // Server cleanup is best-effort — browser is already unsubscribed
          console.warn('[Push] Server unsubscribe cleanup failed:', serverErr);
        }
      }

      setIsSubscribed(false);
      console.log('[Push] Successfully unsubscribed from push notifications');
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
  };
};
