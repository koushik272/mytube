import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Video, Category, HistoryItem, CustomPlaylist } from '../types/video';
import { SAMPLE_VIDEOS } from '../data/sampleVideos';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import {
  searchYouTubeVideos,
  getYouTubeTrending,
  getYouTubePersonalizedRecommendations,
} from '../services/youtubeApi';
import {
  saveWatchHistoryItemToFirestore,
  removeWatchHistoryItemFromFirestore,
  clearWatchHistoryInFirestore,
  getWatchHistoryFromFirestore,
  createCustomPlaylistInFirestore,
  updateCustomPlaylistInFirestore,
  deleteCustomPlaylistInFirestore,
  addVideoToCustomPlaylistInFirestore,
  removeVideoFromCustomPlaylistInFirestore,
  getUserCustomPlaylistsFromFirestore,
  getUserRecommendationPreferences,
  dismissVideoForUser,
  undodismissVideoForUser,
  clearRecommendationPreferences as clearRecommendationPreferencesInFirestore,
} from '../firebase/firestore';

interface VideoContextType {
  videos: Video[];
  currentCategory: Category;
  setCurrentCategory: (category: Category) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredVideos: Video[];
  activeVideo: Video | null;
  playVideo: (video: Video) => void;
  closePlayer: () => void;
  watchHistory: HistoryItem[];
  likedVideos: string[];
  watchLaterVideos: string[];
  subscribedChannels: string[];
  toggleLike: (videoId: string) => void;
  toggleWatchLater: (videoId: string) => void;
  toggleSubscribe: (channelId: string, channelName?: string) => void;
  removeFromHistory: (videoId: string) => void;
  clearHistory: () => void;
  isHistoryPaused: boolean;
  togglePauseHistory: () => void;

  // Personalized Recommendation Engine
  dismissedVideoIds: string[];
  dismissVideo: (videoId: string) => Promise<void>;
  undodismissVideo: (videoId: string) => Promise<void>;
  clearRecommendationHistory: () => Promise<void>;
  recommendationsSeed: number;
  refreshRecommendations: () => void;
  isPersonalized: boolean;

  // Custom Playlists
  customPlaylists: CustomPlaylist[];
  createPlaylist: (title: string, description: string, isPrivate: boolean) => Promise<CustomPlaylist>;
  updatePlaylist: (id: string, updates: Partial<CustomPlaylist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addVideoToPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  isSaveModalOpen: boolean;
  videoToSave: Video | null;
  openSaveModal: (video: Video) => void;
  closeSaveModal: () => void;

  // Miniplayer
  isMiniplayerOpen: boolean;
  miniplayerVideo: Video | null;
  openMiniplayer: (video?: Video) => void;
  closeMiniplayer: () => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;
  isLoading: boolean;
  refreshVideos: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, updatePreferences, requireAuth } = useAuth();
  const { searchHistory, settings } = useSettings();
  const [videos, setVideos] = useState<Video[]>(SAMPLE_VIDEOS);
  const [currentCategory, setCurrentCategory] = useState<Category>('For You');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHistoryPaused, setIsHistoryPaused] = useState<boolean>(false);
  const [dismissedVideoIds, setDismissedVideoIds] = useState<string[]>([]);
  const [recommendationsSeed, setRecommendationsSeed] = useState<number>(1);

  // Miniplayer states
  const [isMiniplayerOpen, setIsMiniplayerOpen] = useState<boolean>(false);
  const [miniplayerVideo, setMiniplayerVideo] = useState<Video | null>(null);

  // Save to Playlist Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [videoToSave, setVideoToSave] = useState<Video | null>(null);

  // Custom Playlists State
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem('mytube_custom_playlists');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'pl_fav_coding',
              title: 'Top Coding Masterclasses',
              description: 'Hand-picked development tutorials & deep dives',
              isPrivate: false,
              videoIds: ['BGTx91t8q50', 'eIrMbAQSU34'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ownerUid: 'guest',
              ownerName: 'MyTube Community',
            },
            {
              id: 'pl_cricket_sixes',
              title: 'Epic Cricket Moments',
              description: 'Sixes and match winning highlights',
              isPrivate: false,
              videoIds: ['895eN_9xhqo', 'n-IhEQ8r5I0'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ownerUid: 'guest',
              ownerName: 'Cricket Lovers',
            },
          ];
    } catch {
      return [];
    }
  });

  // User preference arrays synced from Firestore profile or local storage
  const [likedVideos, setLikedVideos] = useState<string[]>(['M7lc1UVf-VE', 'fJ9rUzIMcZQ']);
  const [watchLaterVideos, setWatchLaterVideos] = useState<string[]>(['jNQXAC9IVRw']);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(['UCiMhD4jzUqG-IgPzUmmytRQ', '@Telusko']);

  // Watch history state
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('mytube_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync state whenever userProfile or currentUser changes
  useEffect(() => {
    if (userProfile) {
      if (userProfile.likedVideos) setLikedVideos(userProfile.likedVideos);
      if (userProfile.watchLaterVideos) setWatchLaterVideos(userProfile.watchLaterVideos);
      if (userProfile.subscribedChannels) setSubscribedChannels(userProfile.subscribedChannels);
      if (typeof userProfile.isHistoryPaused === 'boolean') {
        setIsHistoryPaused(userProfile.isHistoryPaused);
      }
    } else {
      setLikedVideos(['M7lc1UVf-VE', 'fJ9rUzIMcZQ']);
      setWatchLaterVideos(['jNQXAC9IVRw']);
      setSubscribedChannels([]);
    }
  }, [userProfile]);

  // Load history from Firestore when user logs in
  useEffect(() => {
    async function loadUserHistory() {
      if (currentUser) {
        try {
          const items = await getWatchHistoryFromFirestore(currentUser.uid);
          if (items && items.length > 0) {
            setWatchHistory(items);
          }
        } catch (err) {
          console.warn('Error loading user history from Firestore:', err);
        }
      }
    }
    loadUserHistory();
  }, [currentUser]);

  // Load custom playlists from Firestore when user logs in
  useEffect(() => {
    async function loadUserPlaylists() {
      if (currentUser) {
        try {
          const pls = await getUserCustomPlaylistsFromFirestore(currentUser.uid);
          if (pls && pls.length > 0) {
            setCustomPlaylists(pls);
          }
        } catch (err) {
          console.warn('Error loading custom playlists:', err);
        }
      }
    }
    loadUserPlaylists();
  }, [currentUser]);

  // Load user recommendation preferences (dismissed videos)
  useEffect(() => {
    async function loadRecPrefs() {
      try {
        const prefs = await getUserRecommendationPreferences(currentUser?.uid);
        if (prefs?.dismissedVideoIds) {
          setDismissedVideoIds(prefs.dismissedVideoIds);
        }
      } catch (err) {
        console.warn('Error loading recommendation preferences:', err);
      }
    }
    loadRecPrefs();
  }, [currentUser]);

  // Fetch real YouTube videos when category changes
  const fetchCategoryVideos = useCallback(
    async (cat: Category) => {
      setIsLoading(true);
      try {
        // 1. For You tab: Dynamic Activity-based Recommendations
        if (cat === 'For You') {
          const recs = await getYouTubePersonalizedRecommendations({
            recentVideos: watchHistory.slice(0, 8).map((v) => ({
              id: v.id,
              title: v.title,
              category: v.category,
              channelName: v.channel?.name,
            })),
            likedVideoIds: likedVideos,
            subscribedChannels,
            recentSearches: settings.isSearchHistoryPaused ? [] : searchHistory.slice(0, 5),
            dismissedVideoIds,
            refreshSeed: recommendationsSeed,
            limit: 24,
          });
          if (recs && recs.length > 0) {
            setVideos(recs);
            return;
          }
        }

        // 2. Trending tab: YouTube Most Popular in India
        if (cat === 'Trending') {
          const trending = await getYouTubeTrending({ regionCode: 'IN', category: 'all' });
          if (trending.items && trending.items.length > 0) {
            setVideos(trending.items);
            return;
          }
        }

        // 3. Category tabs: Real YouTube search results
        const query =
          cat === 'All'
            ? 'trending music gaming technology'
            : cat === 'Sports'
            ? 'sports cricket football highlights'
            : cat === 'Entertainment'
            ? 'entertainment comedy movie trailers'
            : cat;

        const result = await searchYouTubeVideos(query);
        if (result.items && result.items.length > 0) {
          setVideos(result.items);
        }
      } catch (err) {
        console.warn('Error fetching category videos from YouTube API:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      watchHistory,
      likedVideos,
      subscribedChannels,
      settings.isSearchHistoryPaused,
      searchHistory,
      dismissedVideoIds,
      recommendationsSeed,
    ]
  );

  useEffect(() => {
    fetchCategoryVideos(currentCategory);
  }, [currentCategory, fetchCategoryVideos]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const playVideo = (video: Video) => {
    setActiveVideo(video);

    // If history is paused, don't record
    if (isHistoryPaused) return;

    const historyItem: HistoryItem = {
      ...video,
      watchedAt: new Date().toISOString(),
    };

    setWatchHistory((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id);
      const updated = [historyItem, ...filtered];
      localStorage.setItem('mytube_history', JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      saveWatchHistoryItemToFirestore(currentUser.uid, historyItem).catch(console.warn);
    }
  };

  const closePlayer = () => {
    setActiveVideo(null);
  };

  const removeFromHistory = (videoId: string) => {
    setWatchHistory((prev) => {
      const updated = prev.filter((v) => v.id !== videoId);
      localStorage.setItem('mytube_history', JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      removeWatchHistoryItemFromFirestore(currentUser.uid, videoId).catch(console.warn);
    }
    showToast('Removed from watch history');
  };

  const clearHistory = () => {
    setWatchHistory([]);
    localStorage.removeItem('mytube_history');

    if (currentUser) {
      clearWatchHistoryInFirestore(currentUser.uid).catch(console.warn);
    }
    showToast('Watch history cleared');
  };

  const togglePauseHistory = () => {
    const nextVal = !isHistoryPaused;
    setIsHistoryPaused(nextVal);
    updatePreferences({ isHistoryPaused: nextVal });
    showToast(nextVal ? 'Watch history paused ⏸️' : 'Watch history resumed ▶️');
  };

  // Toggle Like with authentication protection & Firestore synchronization
  const toggleLike = (videoId: string) => {
    requireAuth(() => {
      setLikedVideos((prev) => {
        let updated: string[];
        if (prev.includes(videoId)) {
          updated = prev.filter((id) => id !== videoId);
          showToast('Removed from Liked videos');
        } else {
          updated = [...prev, videoId];
          showToast('Added to Liked videos 👍 (Synced to Firestore)');
        }
        updatePreferences({ likedVideos: updated });
        return updated;
      });
    }, 'Sign in to add videos to your Liked playlist');
  };

  // Toggle Watch Later with authentication protection & Firestore synchronization
  const toggleWatchLater = (videoId: string) => {
    requireAuth(() => {
      setWatchLaterVideos((prev) => {
        let updated: string[];
        if (prev.includes(videoId)) {
          updated = prev.filter((id) => id !== videoId);
          showToast('Removed from Watch Later');
        } else {
          updated = [...prev, videoId];
          showToast('Saved to Watch Later ⏰ (Synced to Firestore)');
        }
        updatePreferences({ watchLaterVideos: updated });
        return updated;
      });
    }, 'Sign in to save videos to Watch Later');
  };

  // Toggle Subscribe with authentication protection & Firestore synchronization
  const toggleSubscribe = (channelId: string, channelName?: string) => {
    requireAuth(() => {
      setSubscribedChannels((prev) => {
        let updated: string[];
        const name = channelName || 'Channel';
        if (prev.includes(channelId)) {
          updated = prev.filter((id) => id !== channelId);
          showToast(`Unsubscribed from ${name}`);
        } else {
          updated = [...prev, channelId];
          showToast(`Subscribed to ${name}! 🔔 (Synced to Firestore)`);
        }
        updatePreferences({ subscribedChannels: updated });
        return updated;
      });
    }, 'Sign in to subscribe to channels');
  };

  // Custom Playlist actions
  const createPlaylist = async (
    title: string,
    description: string,
    isPrivate: boolean
  ): Promise<CustomPlaylist> => {
    const ownerUid = currentUser?.uid || 'guest';
    const ownerName = userProfile?.displayName || 'MyTube User';
    const newPl = await createCustomPlaylistInFirestore(ownerUid, {
      title,
      description,
      isPrivate,
      videoIds: [],
      ownerUid,
      ownerName,
    });

    setCustomPlaylists((prev) => [newPl, ...prev]);
    showToast(`Playlist "${title}" created! 📁`);
    return newPl;
  };

  const updatePlaylist = async (id: string, updates: Partial<CustomPlaylist>) => {
    const ownerUid = currentUser?.uid || 'guest';
    await updateCustomPlaylistInFirestore(ownerUid, id, updates);
    setCustomPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === id ? { ...pl, ...updates, updatedAt: new Date().toISOString() } : pl
      )
    );
    showToast('Playlist updated! ✏️');
  };

  const deletePlaylist = async (id: string) => {
    const ownerUid = currentUser?.uid || 'guest';
    await deleteCustomPlaylistInFirestore(ownerUid, id);
    setCustomPlaylists((prev) => prev.filter((pl) => pl.id !== id));
    showToast('Playlist deleted');
  };

  const addVideoToPlaylist = async (playlistId: string, videoId: string) => {
    const ownerUid = currentUser?.uid || 'guest';
    await addVideoToCustomPlaylistInFirestore(ownerUid, playlistId, videoId);
    setCustomPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.videoIds.includes(videoId)
          ? { ...pl, videoIds: [...pl.videoIds, videoId], updatedAt: new Date().toISOString() }
          : pl
      )
    );
    showToast('Added to playlist! 🎵');
  };

  const removeVideoFromPlaylist = async (playlistId: string, videoId: string) => {
    const ownerUid = currentUser?.uid || 'guest';
    await removeVideoFromCustomPlaylistInFirestore(ownerUid, playlistId, videoId);
    setCustomPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, videoIds: pl.videoIds.filter((v) => v !== videoId), updatedAt: new Date().toISOString() }
          : pl
      )
    );
    showToast('Removed from playlist');
  };

  const openSaveModal = (video: Video) => {
    requireAuth(() => {
      setVideoToSave(video);
      setIsSaveModalOpen(true);
    }, 'Sign in to save videos to your playlists');
  };

  const closeSaveModal = () => {
    setIsSaveModalOpen(false);
    setVideoToSave(null);
  };

  // Miniplayer actions
  const openMiniplayer = (video?: Video) => {
    const v = video || activeVideo;
    if (v) {
      setMiniplayerVideo(v);
      setIsMiniplayerOpen(true);
    }
  };

  const closeMiniplayer = () => {
    setIsMiniplayerOpen(false);
    setMiniplayerVideo(null);
  };

  const isPersonalized = Boolean(
    currentUser && (watchHistory.length > 0 || likedVideos.length > 0 || subscribedChannels.length > 0)
  );

  const refreshRecommendations = () => {
    setRecommendationsSeed((prev) => prev + 1);
    showToast('Refreshing recommendations 🔄');
  };

  const dismissVideo = async (videoId: string) => {
    const updated = await dismissVideoForUser(videoId, currentUser?.uid);
    setDismissedVideoIds(updated);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    showToast('Video marked as "Not Interested" 🚫');
  };

  const undodismissVideo = async (videoId: string) => {
    const updated = await undodismissVideoForUser(videoId, currentUser?.uid);
    setDismissedVideoIds(updated);
    showToast('Action undone ↩️');
    fetchCategoryVideos(currentCategory);
  };

  const clearRecommendationHistory = async () => {
    await clearRecommendationPreferencesInFirestore(currentUser?.uid);
    setDismissedVideoIds([]);
    showToast('Recommendation preferences cleared 🗑️');
    fetchCategoryVideos(currentCategory);
  };

  const filteredVideos = useMemo(() => {
    const dismissedSet = new Set(dismissedVideoIds);
    return videos
      .filter((video) => !dismissedSet.has(video.id))
      .filter((video) => {
        const matchesSearch =
          !searchQuery.trim() ||
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
      });
  }, [videos, searchQuery, dismissedVideoIds]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        currentCategory,
        setCurrentCategory,
        searchQuery,
        setSearchQuery,
        filteredVideos,
        activeVideo,
        playVideo,
        closePlayer,
        watchHistory,
        likedVideos,
        watchLaterVideos,
        subscribedChannels,
        toggleLike,
        toggleWatchLater,
        toggleSubscribe,
        removeFromHistory,
        clearHistory,
        isHistoryPaused,
        togglePauseHistory,
        dismissedVideoIds,
        dismissVideo,
        undodismissVideo,
        clearRecommendationHistory,
        recommendationsSeed,
        refreshRecommendations,
        isPersonalized,
        customPlaylists,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        isSaveModalOpen,
        videoToSave,
        openSaveModal,
        closeSaveModal,
        isMiniplayerOpen,
        miniplayerVideo,
        openMiniplayer,
        closeMiniplayer,
        toastMessage,
        showToast,
        isLoading,
        refreshVideos: () => fetchCategoryVideos(currentCategory),
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = (): VideoContextType => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};
