import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

export interface AppNotificationItem {
  _id: string;
  recipientUserId: string;
  senderUserId?: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  type: string;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch persistent notification inbox from backend MongoDB API
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';

      const res = await fetch(`${apiBase}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[NotificationContext] Fetch notifications error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch on user login / app startup
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time Socket.IO notification events
  useEffect(() => {
    if (!socket || !user) return;

    const handleRealtimeNotification = (data: any) => {
      console.log('🔔 [Realtime Notification Received]:', data);

      const newItem: AppNotificationItem = {
        _id: data._id || `rt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        recipientUserId: user._id,
        type: data.type || 'system_alert',
        title: data.title || data.actorName || 'SplitWise Alert',
        message: data.message || 'You have a new update in your group.',
        read: false,
        createdAt: data.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => [newItem, ...prev.filter((n) => n._id !== newItem._id)]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleRealtimeNotification);

    return () => {
      socket.off('notification', handleRealtimeNotification);
    };
  }, [socket, user]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';

      await fetch(`${apiBase}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('[NotificationContext] Mark read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';

      await fetch(`${apiBase}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('[NotificationContext] Mark all read error:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
