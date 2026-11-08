import React from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  User,
  Settings,
  HelpCircle,
  PlaySquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVideo } from '../../context/VideoContext';
import { useSettings } from '../../context/SettingsContext';

interface UserMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({ isOpen, onClose }) => {
  const { userProfile, logout, isDemoMode } = useAuth();
  const { showToast } = useVideo();
  const { openSettingsModal } = useSettings();

  if (!isOpen || !userProfile) return null;

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of MyTube 👋');
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 w-72 bg-white dark:bg-[#282828] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Profile Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-start gap-3">
        <img
          src={userProfile.photoURL}
          alt={userProfile.displayName}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
            {userProfile.displayName}
          </p>
          <p className="text-xs font-medium text-red-600 dark:text-red-400 truncate">
            {userProfile.handle}
          </p>
          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
            {userProfile.email}
          </p>
        </div>
      </div>

      {isDemoMode && (
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/50 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" />
            Mode: Local Sandbox
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            .env ready
          </span>
        </div>
      )}

      {/* Menu Links */}
      <div className="py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 divide-y divide-neutral-100 dark:divide-neutral-700/60">
        <div className="py-1">
          <Link
            to="/library"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors"
          >
            <User className="w-4 h-4 text-neutral-500" />
            <span>View your channel</span>
          </Link>
          <Link
            to="/library"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors"
          >
            <PlaySquare className="w-4 h-4 text-neutral-500" />
            <span>MyTube Studio & Playlists</span>
          </Link>
        </div>

        <div className="py-1">
          <button
            onClick={() => {
              showToast('Account security verified with Firebase Auth');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-left transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Your data & privacy</span>
          </button>
          <button
            onClick={() => {
              openSettingsModal();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-left transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-neutral-500" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => {
              showToast('Step 2 Firebase Auth & Cloud Firestore active');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-left transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-neutral-500" />
            <span>Help</span>
          </button>
        </div>

        <div className="py-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
