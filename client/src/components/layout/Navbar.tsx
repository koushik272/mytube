import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Mic,
  Video as VideoIcon,
  Bell,
  ArrowLeft,
  X,
  Play,
  UserCircle2,
  History,
  Trash2,
  PauseCircle,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { VoiceSearchModal } from '../common/VoiceSearchModal';
import { QuickWatchModal } from '../common/QuickWatchModal';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { UserMenuDropdown } from '../auth/UserMenuDropdown';
import { getYouTubeSearchSuggestions } from '../../services/youtubeApi';

export const Navbar: React.FC = () => {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { searchQuery, setSearchQuery } = useVideo();
  const { currentUser, userProfile, openAuthModal, requireAuth } = useAuth();
  const { unreadCount } = useNotifications();
  const {
    searchHistory,
    addSearchQuery,
    removeSearchQuery,
    clearAllSearchQueries,
    settings,
  } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Close suggestions whenever the URL/route changes
  useEffect(() => {
    setShowSuggestions(false);
  }, [location.pathname, location.search]);

  const [inputVal, setInputVal] = useState(searchQuery);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Search suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // Sync external search query change
  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Debounce search suggestions fetch
  useEffect(() => {
    if (!inputVal.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await getYouTubeSearchSuggestions(inputVal);
        setSuggestions(results);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const matchingRecentSearches = inputVal.trim()
    ? searchHistory.filter((item) =>
        item.toLowerCase().includes(inputVal.trim().toLowerCase())
      )
    : searchHistory;

  // Click outside listener for dropdowns & suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target as Node))
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setSearchQuery(inputVal);
    if (inputVal.trim()) {
      addSearchQuery(inputVal.trim());
      navigate(`/search?q=${encodeURIComponent(inputVal.trim())}`);
    } else {
      navigate('/');
    }
    setIsMobileSearchActive(false);
  };

  const handleSelectSuggestion = (query: string) => {
    setInputVal(query);
    setSearchQuery(query);
    setShowSuggestions(false);
    setIsMobileSearchActive(false);
    addSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
      } else {
        handleSearchSubmit();
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setInputVal('');
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleMenuClick = () => {
    if (window.innerWidth < 1024) {
      toggleMobileSidebar();
    } else {
      toggleSidebar();
    }
  };

  const handlePlayUrlClick = () => {
    setIsWatchModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-white dark:bg-[#0f0f0f] border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 flex items-center justify-between transition-colors">
        {/* Mobile Fullscreen Search Bar */}
        {isMobileSearchActive ? (
          <div className="flex items-center w-full gap-2 relative" ref={mobileSearchRef}>
            <button
              onClick={() => {
                setIsMobileSearchActive(false);
                setShowSuggestions(false);
              }}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 flex items-center bg-neutral-100 dark:bg-[#121212] border border-neutral-300 dark:border-neutral-700 rounded-full overflow-hidden px-3 py-1.5"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search MyTube"
                autoFocus
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <button
              onClick={() => handleSearchSubmit()}
              className="p-2 bg-neutral-200 dark:bg-neutral-800 rounded-full text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-red-500 hover:text-white cursor-pointer"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Mobile Suggestions & Recent Searches Dropdown */}
            {showSuggestions && (matchingRecentSearches.length > 0 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                {!inputVal.trim() && matchingRecentSearches.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        clearAllSearchQueries();
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                {matchingRecentSearches.slice(0, inputVal.trim() ? 3 : 6).map((item, idx) => (
                  <div
                    key={`m-recent-${idx}`}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    onMouseDown={() => handleSelectSuggestion(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-sm font-semibold text-purple-900 dark:text-purple-200 truncate">
                        {item}
                      </span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeSearchQuery(item);
                      }}
                      className="p-1 text-neutral-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {suggestions.map((item, idx) => (
                  <button
                    key={`m-sugg-${idx}`}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(item)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Left Section: Menu & Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button
                onClick={handleMenuClick}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-colors"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                to="/"
                className="flex items-center gap-1.5 cursor-pointer select-none group"
                onClick={() => {
                  setSearchQuery('');
                  setInputVal('');
                  setShowSuggestions(false);
                }}
              >
                <div className="w-8 h-6 sm:w-9 sm:h-6.5 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </div>
                <div className="flex items-center">
                  <span className="font-bold text-lg sm:text-xl tracking-tighter text-neutral-900 dark:text-white font-sans">
                    MyTube
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 ml-1 mb-2.5">
                    IN
                  </span>
                </div>
              </Link>
            </div>

            {/* Center Section: Search Bar with Suggestions */}
            <div
              className="hidden md:flex items-center justify-center flex-1 max-w-2xl mx-4 relative"
              ref={searchContainerRef}
            >
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center w-full max-w-xl"
              >
                <div className="flex items-center w-full bg-white dark:bg-[#121212] border border-neutral-300 dark:border-neutral-700 rounded-l-full px-4 py-2 focus-within:border-blue-500 shadow-inner">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                  {inputVal && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  title="Search"
                  className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-l-0 border-neutral-300 dark:border-neutral-700 rounded-r-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {/* Suggestions & Recent Searches Dropdown */}
              {showSuggestions && (matchingRecentSearches.length > 0 || suggestions.length > 0) && (
                <div className="absolute top-full left-0 right-14 mt-1.5 bg-white dark:bg-[#212121] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden backdrop-blur-md">
                  {/* Header when input is empty */}
                  {!inputVal.trim() && matchingRecentSearches.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <span>Recent Searches</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          clearAllSearchQueries();
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {/* Matching Recent Searches */}
                  {matchingRecentSearches.slice(0, inputVal.trim() ? 3 : 8).map((item, idx) => (
                    <div
                      key={`recent-${idx}`}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 group cursor-pointer transition-colors"
                      onMouseDown={() => handleSelectSuggestion(item)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <History className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="text-sm font-semibold text-purple-900 dark:text-purple-200 truncate">
                          {item}
                        </span>
                        {inputVal.trim() && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded">
                            recent
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeSearchQuery(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Live YouTube API Suggestions */}
                  {suggestions.map((item, idx) => (
                    <button
                      key={`sugg-${idx}`}
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm cursor-pointer transition-colors ${
                        selectedSuggestionIndex === idx
                          ? 'bg-neutral-100 dark:bg-neutral-700/80 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}

                  {/* Paused history banner */}
                  {settings.isSearchHistoryPaused && (
                    <div className="px-4 py-1.5 mt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50/50 dark:bg-amber-950/20">
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Search history is paused</span>
                    </div>
                  )}
                </div>
              )}

              {/* Voice Search Button */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                title="Search with your voice"
                className="ml-2.5 p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer hover:text-red-500 shrink-0"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobile Search Icon */}
              <button
                onClick={() => setIsMobileSearchActive(true)}
                className="md:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Mobile Mic Icon */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="md:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                title="Voice Search"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Play YouTube URL Button */}
              <button
                onClick={() => setIsWatchModalOpen(true)}
                title="Play any YouTube Video URL"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                <span>Play URL</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <ThemeToggle />

              {/* Notifications with Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setIsNotificationOpen((prev) => !prev)}
                  title="Notifications"
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors relative cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0f0f0f]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                />
              </div>

              {/* User Authentication Status */}
              {currentUser && userProfile ? (
                /* Logged-In User Avatar with Dropdown */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="p-0.5 rounded-full hover:ring-2 hover:ring-red-500 transition-all cursor-pointer ml-1 flex items-center"
                    title={`Account: ${userProfile.displayName} (${userProfile.handle})`}
                  >
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                    />
                  </button>
                  <UserMenuDropdown
                    isOpen={isUserMenuOpen}
                    onClose={() => setIsUserMenuOpen(false)}
                  />
                </div>
              ) : (
                /* Unauthenticated Sign-In Pill */
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold transition-colors cursor-pointer ml-1 shrink-0"
                >
                  <UserCircle2 className="w-4 h-4" />
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </>
        )}
      </header>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Quick Play YouTube URL Modal */}
      <QuickWatchModal
        isOpen={isWatchModalOpen}
        onClose={() => setIsWatchModalOpen(false)}
      />
    </>
  );
};
