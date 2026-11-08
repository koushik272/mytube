// client/src/context/NotificationContext.tsx - Real-time User Notification Management

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserNotification } from '../types/interaction';
import {
  subscribeToNotifications,
  markNotificationAsReadInFirestore,
  markAllNotificationsAsReadInFirestore,
  createNotificationInFirestore,
} from '../firebase/firestore';

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (
    notif: Omit<UserNotification, 'id' | 'createdAt' | 'read'>
  ) => Promise<UserNotification>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    // Subscribe to real-time notification stream for logged-in user
    const unsubscribe = subscribeToNotifications(currentUser.uid, (items) => {
      setNotifications(items);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationAsReadInFirestore(currentUser.uid, id);
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsReadInFirestore(currentUser.uid);
  };

  const sendNotification = async (
    notif: Omit<UserNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<UserNotification> => {
    return await createNotificationInFirestore({
      ...notif,
      read: false,
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
