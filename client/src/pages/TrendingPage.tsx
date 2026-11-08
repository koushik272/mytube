import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Music2,
  Gamepad2,
  Trophy,
  Film,
  Newspaper,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getYouTubeTrending, TrendingFilters } from '../services/youtubeApi';
import { Video } from '../types/video';
import { VideoCard } from '../components/video/VideoCard';
import { useVideo } from '../context/VideoContext';

type TrendingCategory = 'all' | 'music' | 'gaming' | 'sports' | 'entertainment' | 'news';

interface CategoryOption {
  id: TrendingCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_TABS: CategoryOption[] = [
  { id: 'all', label: 'Now', icon: Flame },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'entertainment', label: 'Entertainment', icon: Film },
  { id: 'news', label: 'News', icon: Newspaper },
];

const REGIONS = [
  { code: 'IN', label: 'India', flag: '🇮🇳' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
];

export const TrendingPage: React.FC = () => {
  const { playVideo, dismissedVideoIds } = useVideo();
  const [selectedCategory, setSelectedCategory] = useState<TrendingCategory>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('IN');
  const [videos, setVideos] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(
    async (reset = true) => {
      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const filters: TrendingFilters = {
          regionCode: selectedRegion,
          category: selectedCategory,
          pageToken: reset ? undefined : nextPageToken,
          maxResults: 24,
        };

        const result = await getYouTubeTrending(filters);

        if (reset) {
          setVideos(result.items);
        } else {
          setVideos((prev) => [...prev, ...result.items]);
        }
        setNextPageToken(result.nextPageToken);
      } catch (err: any) {
        setError(err.message || 'Failed to load trending videos');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCategory, selectedRegion, nextPageToken]
  );

  useEffect(() => {
    fetchTrending(true);
  }, [selectedCategory, selectedRegion]);

  // Filter out dismissed ("Not Interested") videos
  const displayedVideos = videos.filter((v) => !dismissedVideoIds.includes(v.id));

  const currentRegionMeta = REGIONS.find((r) => r.code === selectedRegion) || REGIONS[0];

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-24 lg:pb-8 min-h-[calc(100vh-3.5rem)]">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Trending
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live most popular videos in {currentRegionMeta.flag} {currentRegionMeta.label}
            </p>
          </div>
        </div>

        {/* Region Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-semibold text-neutral-500 shrink-0 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Region:</span>
          </span>
          {REGIONS.map((region) => {
            const isSelected = selectedRegion === region.code;
            return (
              <button
                key={region.code}
                onClick={() => setSelectedRegion(region.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <span>{region.flag}</span>
                <span>{region.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4 border-b border-neutral-200 dark:border-neutral-800">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Content Grid */}
      <div className="mt-6">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-7 animate-pulse">
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
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Flame className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              Unable to load trending feed
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">{error}</p>
            <button
              onClick={() => fetchTrending(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : displayedVideos.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Flame className="w-12 h-12 text-neutral-400 mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              No trending videos available
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Try switching region or category to view popular videos.
            </p>
          </div>
        ) : (
          /* Video Grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-7">
              {displayedVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Pagination / Load More Button */}
            {nextPageToken && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => fetchTrending(false)}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      <span>Loading more trending videos...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Trending Videos</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default TrendingPage;
