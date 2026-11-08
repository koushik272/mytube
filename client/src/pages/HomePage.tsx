import React from 'react';
import { Sparkles, RotateCcw, Flame, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CategoryBar } from '../components/video/CategoryBar';
import { VideoGrid } from '../components/video/VideoGrid';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const {
    filteredVideos,
    currentCategory,
    isLoading,
    refreshRecommendations,
    dismissedVideoIds,
    clearRecommendationHistory,
    isPersonalized,
  } = useVideo();
  const { currentUser, openAuthModal } = useAuth();

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Category Navigation Pills */}
      <CategoryBar />

      {/* For You / Recommendation Header Banner */}
      {currentCategory === 'For You' && (
        <div className="mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 border border-neutral-200/80 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {currentUser ? 'Personalized For You' : 'Discover Great Content'}
                </h2>
                {isPersonalized && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    <UserCheck className="w-3 h-3" />
                    <span>Activity Engine</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                {currentUser
                  ? 'Curated in real-time from your watch history, liked videos, and subscriptions'
                  : 'Popular and trending videos. Sign in to personalize your recommendations.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dismissedVideoIds.length > 0 && (
              <button
                onClick={clearRecommendationHistory}
                className="text-[11px] text-neutral-500 hover:text-red-600 dark:hover:text-red-400 font-medium px-2 py-1 transition-colors cursor-pointer"
                title="Reset dismissed 'Not Interested' videos"
              >
                Reset dismissed ({dismissedVideoIds.length})
              </button>
            )}

            {!currentUser && (
              <button
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-600/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            <button
              onClick={refreshRecommendations}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh recommendations with fresh topics"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Trending Header Banner */}
      {currentCategory === 'Trending' && (
        <div className="mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Trending in India 🇮🇳
              </h2>
              <p className="text-[11px] text-neutral-500">
                Real-time most popular videos across India
              </p>
            </div>
          </div>
          <Link
            to="/trending"
            className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
          >
            <span>Explore Trending Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Responsive Video Grid */}
      <main className="flex-1 pb-16 lg:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-7 p-3 sm:p-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="aspect-video w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-4/5" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-md w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <VideoGrid videos={filteredVideos} />
        )}
      </main>
    </div>
  );
};
