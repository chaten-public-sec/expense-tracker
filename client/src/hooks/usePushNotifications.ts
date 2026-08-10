import { useState, useCallback, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isCapacitorNative } from '../utils/upiHelper';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'granted' | 'denied' | 'prompt' | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuth();
  const hasBrowserPush = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isNative = isCapacitorNative();
  const isSupported = hasBrowserPush || isNative;

  const [permission, setPermission] = useState<any>(
    isNative ? 'prompt' : hasBrowserPush ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Safely register FCM token with backend once user is authenticated
  const sendTokenToBackend = useCallback(async (tokenValue: string) => {
    if (!tokenValue) return;
    try {
      sessionStorage.setItem('splitwise_fcm_token', tokenValue);
      if (user && user._id) {
        const tokenHash = `${tokenValue.substring(0, 8)}...${tokenValue.substring(tokenValue.length - 6)}`;
        console.log('[Native FCM] Registering FCM token with backend for user:', user.fullName, tokenHash);
        await api.post('/notifications/register-fcm', { fcmToken: tokenValue });
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('[Native FCM] Failed to send FCM token to backend:', err);
    }
  }, [user]);

  // Sync cached token if user logs in after token was generated
  useEffect(() => {
    if (isNative && user && user._id) {
      const cachedToken = sessionStorage.getItem('splitwise_fcm_token');
      if (cachedToken) {
        sendTokenToBackend(cachedToken);
      }
    }
  }, [isNative, user, sendTokenToBackend]);

  // Check & Setup Android Capacitor Push Notifications
  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;

    const setupNativePush = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions();
        if (!isMounted) return;
        setPermission(permStatus.receive);

        if (permStatus.receive === 'granted') {
          setIsSubscribed(true);
        }

        // 1. Add listeners BEFORE calling register to avoid missing token event
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          console.log('[Native FCM] Push registration event received token:', token.value ? 'YES' : 'NO');
          await sendTokenToBackend(token.value);
        });

        const errListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[Native FCM] Registration error:', err);
        });

        const pushListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[Native FCM] Push notification received in foreground:', notification);
        });

        const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('[Native FCM] Push notification tapped:', notification);
          const data = notification.notification.data || {};
          if (data.type === 'settlement' || data.type === 'settlement_pending') {
            window.location.href = '/history';
          } else if (data.type === 'expense') {
            window.location.href = '/expenses';
          } else if (data.type === 'group') {
            window.location.href = '/dashboard';
          }
        });

        // 2. Safely call register if already granted without crashing
        if (permStatus.receive === 'granted') {
          try {
            await PushNotifications.register();
          } catch (regErr) {
            console.warn('[Native FCM] Non-fatal register error on setup:', regErr);
          }
        }

        return () => {
          regListener.remove();
          errListener.remove();
          pushListener.remove();
          actionListener.remove();
        };
      } catch (err) {
        console.warn('[Native FCM] Error initializing native push setup:', err);
      }
    };

    setupNativePush();

    return () => {
      isMounted = false;
    };
  }, [isNative, sendTokenToBackend]);

  // Check existing browser subscription status on mount
  useEffect(() => {
    if (!hasBrowserPush || isNative) return;

    const checkExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        // Silently ignore
      }
    };

    checkExistingSubscription();
  }, [hasBrowserPush, isNative]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    if (isNative) {
      try {
        const permResult = await PushNotifications.requestPermissions();
        setPermission(permResult.receive);
        if (permResult.receive === 'granted') {
          try {
            await PushNotifications.register();
          } catch (registerErr) {
            console.warn('[Native FCM] Safe catch during PushNotifications.register():', registerErr);
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error('[Native FCM] Permission request error:', err);
        return false;
      }
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('[Web Push] Error requesting permission:', err);
      return false;
    }
  }, [isSupported, isNative]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsLoading(true);

      if (isNative) {
        const granted = await requestPermission();
        if (granted) {
          try {
            await PushNotifications.register();
          } catch (e) {
            console.warn('[Native FCM] Safe register catch in subscribe():', e);
          }
          setIsSubscribed(true);
          return true;
        }
        return false;
      }

      // Web Push flow
      const granted = await requestPermission();
      if (!granted) return false;

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const vapidRes = await api.get('/notifications/vapid-key');
      const vapidPublicKey = vapidRes.data.publicKey;

      if (!vapidPublicKey) return false;

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

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      await api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscription error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isNative, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsLoading(true);

      if (isNative) {
        setIsSubscribed(false);
        return true;
      }

      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          try {
            await api.post('/notifications/unsubscribe', { endpoint });
          } catch (serverErr) {
            // Best effort
          }
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isNative]);

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
