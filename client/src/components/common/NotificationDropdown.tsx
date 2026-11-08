// client/src/components/common/NotificationDropdown.tsx - Interactive Real-time Notifications Dropdown

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Play,
  ListVideo,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { UserNotification } from '../../types/interaction';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { currentUser, openAuthModal } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const handleClickItem = (notif: UserNotification) => {
    markAsRead(notif.id);
    onClose();
    if (notif.link) {
      if (notif.link.startsWith('http')) {
        window.open(notif.link, '_blank');
      } else {
        navigate(notif.link);
      }
    }
  };

  const getNotificationIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case 'subscriber':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      case 'playlist':
        return <ListVideo className="w-3.5 h-3.5 text-purple-500" />;
      case 'video':
      default:
        return <Play className="w-3.5 h-3.5 text-red-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
          <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Content Body */}
      {!currentUser ? (
        <div className="p-6 text-center">
          <Bell className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Stay in the loop
          </p>
          <p className="text-xs text-neutral-500 mt-1 mb-4 leading-relaxed">
            Sign in to receive instant notifications about comments, replies, and subscribers.
          </p>
          <button
            onClick={() => {
              onClose();
              openAuthModal('login');
            }}
            className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Sparkles className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No notifications yet
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            When you receive comment replies or new subscribers, they will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClickItem(notif)}
              className={`flex items-start gap-3 p-3.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors relative group ${
                !notif.read ? 'bg-red-50/40 dark:bg-red-950/20' : ''
              }`}
            >
              {/* Avatar with type badge */}
              <div className="relative shrink-0 mt-0.5">
                <img
                  src={notif.avatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center shadow-xs border border-neutral-200 dark:border-neutral-800">
                  {getNotificationIcon(notif.type)}
                </div>
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {getRelativeTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-snug line-clamp-2">
                  {notif.message}
                </p>
              </div>

              {/* Unread indicator dot */}
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
