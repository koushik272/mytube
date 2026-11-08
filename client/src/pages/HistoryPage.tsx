import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  PauseCircle,
  PlayCircle,
  Search,
  X,
  History as HistoryIcon,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { formatViews } from '../utils/formatters';
import { HistoryItem } from '../types/video';

// Helper to categorize history timestamps into date groups
function groupHistoryByDate(items: HistoryItem[]) {
  const groups: { [key: string]: HistoryItem[] } = {
    Today: [],
    Yesterday: [],
    'Earlier this week': [],
    Older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

  for (const item of items) {
    const itemTime = item.watchedAt ? new Date(item.watchedAt).getTime() : startOfToday;
    if (itemTime >= startOfToday) {
      groups.Today.push(item);
    } else if (itemTime >= startOfYesterday) {
      groups.Yesterday.push(item);
    } else if (itemTime >= startOfWeek) {
      groups['Earlier this week'].push(item);
    } else {
      groups.Older.push(item);
    }
  }

  return groups;
}

export const HistoryPage: React.FC = () => {
  const {
    watchHistory,
    clearHistory,
    removeFromHistory,
    isHistoryPaused,
    togglePauseHistory,
    playVideo,
    showToast,
  } = useVideo();

  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Filter history items by search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return watchHistory;
    const q = searchQuery.toLowerCase();
    return watchHistory.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.channel.name.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
    );
  }, [watchHistory, searchQuery]);

  const grouped = useMemo(() => groupHistoryByDate(filteredHistory), [filteredHistory]);

  const handleConfirmClear = () => {
    clearHistory();
    setIsConfirmClearOpen(false);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Left Column: History Video Feed */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <HistoryIcon className="w-6 h-6 text-red-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Watch History
          </h1>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {watchHistory.length}
          </span>
          {isHistoryPaused && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              History Paused
            </span>
          )}
        </div>

        {/* Empty State */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#141414] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
            <HistoryIcon className="w-14 h-14 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              {searchQuery ? 'No matching history found' : 'Your watch history is empty'}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? `No videos match "${searchQuery}". Try a different keyword.`
                : 'Videos you play on MyTube will automatically appear here.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : (
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors shadow-md"
              >
                Explore Trending Videos
              </Link>
            )}
          </div>
        ) : (
          /* Grouped History List */
          <div className="space-y-8">
            {Object.entries(grouped).map(([groupTitle, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupTitle} className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
                    {groupTitle}
                  </h2>
                  <div className="space-y-3">
                    {items.map((video) => (
                      <div
                        key={video.id}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors group relative bg-white dark:bg-[#161616] sm:bg-transparent sm:dark:bg-transparent border border-neutral-200 dark:border-neutral-800 sm:border-0"
                      >
                        {/* Thumbnail */}
                        <Link
                          to={`/watch/${video.id}`}
                          onClick={() => playVideo(video)}
                          className="relative aspect-video sm:w-56 md:w-64 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 shadow-xs"
                        >
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[11px] font-semibold rounded">
                            {video.duration}
                          </span>
                        </Link>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0 pr-10 flex flex-col justify-between py-0.5">
                          <div>
                            <Link
                              to={`/watch/${video.id}`}
                              onClick={() => playVideo(video)}
                            >
                              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {video.title}
                              </h3>
                            </Link>

                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              <Link
                                to={`/channel/${encodeURIComponent(video.channel.name)}`}
                                className="hover:underline flex items-center gap-1"
                              >
                                <span>{video.channel.name}</span>
                                {video.channel.verified && (
                                  <CheckCircle2 className="w-3 h-3 text-neutral-400" />
                                )}
                              </Link>
                              <span>•</span>
                              <span>{formatViews(video.views)} views</span>
                            </div>

                            {video.description && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1 hidden sm:block">
                                {video.description}
                              </p>
                            )}
                          </div>

                          {video.watchedAt && (
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-2">
                              <Clock className="w-3 h-3" />
                              <span>
                                Watched {new Date(video.watchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Remove from history button */}
                        <button
                          onClick={() => removeFromHistory(video.id)}
                          className="absolute top-3 right-3 p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove from watch history"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: History Controls & Search Sidebar */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        {/* Search History Filter Box */}
        <div className="bg-white dark:bg-[#161616] p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2">
            Search watch history
          </label>
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700">
            <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter history videos"
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-white dark:bg-[#161616] p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          {/* Clear History Button */}
          <button
            onClick={() => setIsConfirmClearOpen(true)}
            disabled={watchHistory.length === 0}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-neutral-500" />
            <span>Clear all watch history</span>
          </button>

          {/* Pause / Resume History Toggle */}
          <button
            onClick={togglePauseHistory}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            {isHistoryPaused ? (
              <>
                <PlayCircle className="w-4 h-4 text-green-600" />
                <span>Turn on watch history</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>Pause watch history</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Links Card */}
        <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-2">
          <p className="font-semibold text-neutral-700 dark:text-neutral-300">
            About Watch History
          </p>
          <p className="text-[11px] leading-relaxed">
            Your watch history is synchronized securely with Cloud Firestore when signed in. Pausing history prevents any played videos from being saved.
          </p>
          <Link
            to="/watch-later"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline block pt-1"
          >
            Go to Watch Later playlist →
          </Link>
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Clear watch history?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your MyTube watch history will be cleared from all sessions and Firestore. You cannot undo this action.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
