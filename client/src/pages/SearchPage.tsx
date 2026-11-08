// client/src/pages/SearchPage.tsx - Real YouTube Search with Infinite Scroll, Multi-Filters & Production Resilience

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import { useSettings } from '../context/SettingsContext';
import {
  CheckCircle2,
  SlidersHorizontal,
  Play,
  Clock,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  X,
  RotateCcw,
  Video as VideoIcon,
  User,
  ListVideo,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { formatViews } from '../utils/formatters';
import { searchYouTubeVideos, SearchFilters } from '../services/youtubeApi';
import { Video } from '../types/video';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { playVideo, setSearchQuery } = useVideo();
  const { addSearchQuery } = useSettings();

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState<boolean>(true);

  // Search filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'channel' | 'playlist'>('all');
  const [sortOrder, setSortOrder] = useState<'relevance' | 'date' | 'viewCount' | 'rating'>('relevance');
  const [durationFilter, setDurationFilter] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [uploadDateFilter, setUploadDateFilter] = useState<'any' | 'hour' | 'today' | 'week' | 'month' | 'year'>('any');

  // Infinite scroll intersection observer sentinel
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Record valid searches into recent search history and keep search input in sync
  useEffect(() => {
    if (query.trim()) {
      addSearchQuery(query.trim());
      setSearchQuery(query.trim());
    }
  }, [query]);

  const executeSearch = useCallback(
    async (resetPage = true) => {
      if (!query.trim()) return;

      if (resetPage) {
        setIsLoading(true);
        setErrorMessage(null);
      } else {
        setIsLoadingMore(true);
      }

      const filters: SearchFilters = {
        type: typeFilter,
        order: sortOrder,
        videoDuration: durationFilter,
        uploadDate: uploadDateFilter,
        pageToken: resetPage ? undefined : nextPageToken,
      };

      try {
        const result = await searchYouTubeVideos(query, filters);
        if (result.error && resetPage && result.items.length === 0) {
          setErrorMessage(result.error);
        } else {
          setErrorMessage(null);
        }

        if (resetPage) {
          setVideos(result.items);
        } else {
          // Avoid duplicate video entries
          setVideos((prev) => {
            const existingIds = new Set(prev.map((v) => v.id));
            const fresh = result.items.filter((v) => !existingIds.has(v.id));
            return [...prev, ...fresh];
          });
        }

        setNextPageToken(result.nextPageToken);
        setTotalResults(result.totalResults);
      } catch (err: any) {
        console.warn('Search execution error:', err);
        if (resetPage) {
          setErrorMessage(err.message || 'Failed to fetch search results from YouTube.');
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query, typeFilter, sortOrder, durationFilter, uploadDateFilter, nextPageToken]
  );

  // Re-run search when query or filters change
  useEffect(() => {
    executeSearch(true);
  }, [query, typeFilter, sortOrder, durationFilter, uploadDateFilter]);

  const handleLoadMore = useCallback(() => {
    if (nextPageToken && !isLoadingMore && !isLoading) {
      executeSearch(false);
    }
  }, [nextPageToken, isLoadingMore, isLoading, executeSearch]);

  // Infinite scrolling observer setup
  useEffect(() => {
    if (!infiniteScrollEnabled || !nextPageToken || isLoadingMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const target = observerTargetRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [infiniteScrollEnabled, nextPageToken, isLoadingMore, isLoading, handleLoadMore]);

  const hasActiveFilters =
    typeFilter !== 'all' ||
    sortOrder !== 'relevance' ||
    durationFilter !== 'any' ||
    uploadDateFilter !== 'any';

  const resetAllFilters = () => {
    setTypeFilter('all');
    setSortOrder('relevance');
    setDurationFilter('any');
    setUploadDateFilter('any');
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Search Header Bar */}
      <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-sm sm:text-base font-medium text-neutral-800 dark:text-neutral-200">
            Real YouTube Results for{' '}
            <span className="font-bold text-neutral-900 dark:text-white">
              "{query}"
            </span>
            {totalResults > 0 && (
              <span className="text-xs text-neutral-500 ml-2">
                (about {formatViews(totalResults)} results)
              </span>
            )}
          </h1>

          <div className="flex items-center gap-2">
            {/* Infinite Scroll Toggle Pill */}
            <button
              onClick={() => setInfiniteScrollEnabled((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                infiniteScrollEnabled
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
              title="Toggle automatic loading as you scroll"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto-scroll:</span>
              <span>{infiniteScrollEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Filter Drawer Toggle */}
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters ? '• Active' : ''}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Filters:
            </span>
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold">
                <span>Type: {typeFilter}</span>
                <button
                  onClick={() => setTypeFilter('all')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {uploadDateFilter !== 'any' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                <span>Date: {uploadDateFilter}</span>
                <button
                  onClick={() => setUploadDateFilter('any')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {durationFilter !== 'any' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                <span>Duration: {durationFilter}</span>
                <button
                  onClick={() => setDurationFilter('any')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortOrder !== 'relevance' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <span>Sort: {sortOrder}</span>
                <button
                  onClick={() => setSortOrder('relevance')}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all</span>
            </button>
          </div>
        )}

        {/* Expandable Multi-Filter Grid Drawer */}
        {isFilterOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-neutral-100 dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            {/* 1. Search Type Filter */}
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mb-2 block uppercase tracking-wider text-[11px]">
                Search Type
              </span>
              <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                {[
                  { id: 'all', label: 'All Results' },
                  { id: 'video', label: 'Videos' },
                  { id: 'channel', label: 'Channels' },
                  { id: 'playlist', label: 'Playlists' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTypeFilter(item.id as any)}
                    className={`block w-full text-left py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                      typeFilter === item.id
                        ? 'font-bold text-red-600 dark:text-red-400 bg-neutral-200 dark:bg-neutral-800'
                        : 'hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Upload Date Filter */}
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mb-2 block uppercase tracking-wider text-[11px]">
                Upload Date
              </span>
              <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                {[
                  { id: 'any', label: 'Any time' },
                  { id: 'hour', label: 'Last hour' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This week' },
                  { id: 'month', label: 'This month' },
                  { id: 'year', label: 'This year' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setUploadDateFilter(item.id as any)}
                    className={`block w-full text-left py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                      uploadDateFilter === item.id
                        ? 'font-bold text-red-600 dark:text-red-400 bg-neutral-200 dark:bg-neutral-800'
                        : 'hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Duration Filter */}
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mb-2 block uppercase tracking-wider text-[11px]">
                Duration
              </span>
              <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                {[
                  { id: 'any', label: 'Any duration' },
                  { id: 'short', label: 'Under 4 minutes' },
                  { id: 'medium', label: '4 - 20 minutes' },
                  { id: 'long', label: 'Over 20 minutes' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDurationFilter(item.id as any)}
                    className={`block w-full text-left py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                      durationFilter === item.id
                        ? 'font-bold text-red-600 dark:text-red-400 bg-neutral-200 dark:bg-neutral-800'
                        : 'hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Sort By Filter */}
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100 mb-2 block uppercase tracking-wider text-[11px]">
                Sort By
              </span>
              <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'date', label: 'Upload date' },
                  { id: 'viewCount', label: 'View count' },
                  { id: 'rating', label: 'Rating' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSortOrder(item.id as any)}
                    className={`block w-full text-left py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                      sortOrder === item.id
                        ? 'font-bold text-red-600 dark:text-red-400 bg-neutral-200 dark:bg-neutral-800'
                        : 'hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start justify-between gap-3 text-red-800 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Search Request Notice</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => executeSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Searching real YouTube videos for "{query}"...
          </p>
        </div>
      ) : errorMessage && videos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#161616] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2 opacity-80" />
          <p className="text-base text-neutral-800 dark:text-neutral-200 font-semibold">
            Unable to fetch search results
          </p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {errorMessage}
          </p>
          <button
            onClick={() => executeSearch(true)}
            className="mt-4 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
          >
            Try Again
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#161616] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
          <Sparkles className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-50" />
          <p className="text-base text-neutral-800 dark:text-neutral-200 font-semibold">
            No results found for "{query}"
          </p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing your active filters, or exploring a broader time range.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="mt-4 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Link
              key={video.id}
              to={`/watch/${video.id}`}
              onClick={() => playVideo(video)}
              className="flex flex-col sm:flex-row gap-4 p-2 sm:p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors group cursor-pointer"
            >
              {/* 16:9 Real YouTube Thumbnail */}
              <div className="relative aspect-video sm:w-80 sm:h-44 rounded-2xl overflow-hidden bg-black shrink-0">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('mqdefault')) {
                      target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                    }
                  }}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-xs font-semibold">
                  {video.duration}
                </span>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Video Info Details */}
              <div className="flex-1 min-w-0 py-1">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {video.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  <span>{formatViews(video.views)} views</span>
                  <span>•</span>
                  <span>{video.uploadedAt}</span>
                </div>

                <div className="flex items-center gap-2 mt-2.5">
                  <img
                    src={video.channel.avatar}
                    alt={video.channel.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">
                    {video.channel.name}
                  </span>
                  {video.channel.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 fill-neutral-500/20 shrink-0" />
                  )}
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-2.5 leading-relaxed">
                  {video.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    Original YouTube Audio & Video
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    Official Playback
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Infinite Scroll Sentinel */}
          <div ref={observerTargetRef} className="h-6 w-full" />

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="py-6 flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span>Fetching more results from YouTube...</span>
            </div>
          )}

          {/* Manual Load More Button (if infinite scroll paused or user reaches end) */}
          {nextPageToken && !isLoadingMore && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <span>Load More YouTube Videos</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
