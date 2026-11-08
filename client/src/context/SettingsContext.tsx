// client/src/context/SettingsContext.tsx - User Watch Settings & Search History Engine

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  getUserSettingsFromFirestore,
  updateUserSettingsInFirestore,
  getSearchHistoryFromFirestore,
  saveSearchQueryToFirestore,
  deleteSearchQueryFromFirestore,
  clearSearchHistoryInFirestore,
} from '../firebase/firestore';

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  searchHistory: string[];
  addSearchQuery: (q: string) => Promise<void>;
  removeSearchQuery: (q: string) => Promise<void>;
  clearAllSearchQueries: () => Promise<void>;
  togglePauseSearchHistory: () => Promise<void>;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Load settings and search history whenever auth state changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const [loadedSettings, loadedHistory] = await Promise.all([
        getUserSettingsFromFirestore(currentUser?.uid),
        getSearchHistoryFromFirestore(currentUser?.uid),
      ]);
      if (isMounted) {
        setSettings(loadedSettings);
        setSearchHistory(loadedHistory);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const updated = await updateUserSettingsInFirestore(currentUser?.uid, partial);
    setSettings(updated);
  };

  const addSearchQuery = async (query: string) => {
    // If search history is paused, do not record new searches
    if (settings.isSearchHistoryPaused) return;
    const updated = await saveSearchQueryToFirestore(query, currentUser?.uid);
    setSearchHistory(updated);
  };

  const removeSearchQuery = async (query: string) => {
    const updated = await deleteSearchQueryFromFirestore(query, currentUser?.uid);
    setSearchHistory(updated);
  };

  const clearAllSearchQueries = async () => {
    await clearSearchHistoryInFirestore(currentUser?.uid);
    setSearchHistory([]);
  };

  const togglePauseSearchHistory = async () => {
    const nextState = !settings.isSearchHistoryPaused;
    await updateSettings({ isSearchHistoryPaused: nextState });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        searchHistory,
        addSearchQuery,
        removeSearchQuery,
        clearAllSearchQueries,
        togglePauseSearchHistory,
        isSettingsModalOpen,
        openSettingsModal: () => setIsSettingsModalOpen(true),
        closeSettingsModal: () => setIsSettingsModalOpen(false),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
