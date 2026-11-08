import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Bell,
  Play,
  Film,
  ListVideo,
  Info,
  Calendar,
  Eye,
  Globe,
  Share2,
  Flame,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import {
  getYouTubeChannelDetails,
  getYouTubeChannelContent,
  YouTubeChannel,
} from '../services/youtubeApi';
import { Video } from '../types/video';
import { VideoCard } from '../components/video/VideoCard';
import { formatViews } from '../utils/formatters';

type TabType = 'videos' | 'shorts' | 'playlists' | 'about';

export const ChannelPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { subscribedChannels, toggleSubscribe, showToast } = useVideo();

  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [content, setContent] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);

  const cleanChannelId = decodeURIComponent(id);
  const isSubscribed = channel ? subscribedChannels.includes(channel.id) || subscribedChannels.includes(cleanChannelId) : false;

  // Load Channel Details
  useEffect(() => {
    let isMounted = true;
    async function loadChannel() {
      setIsLoading(true);
      try {
        const details = await getYouTubeChannelDetails(cleanChannelId);
        if (isMounted && details) {
          setChannel(details);
        }
      } catch (err) {
        console.warn('Failed to load channel details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (cleanChannelId) {
      loadChannel();
    }

    return () => {
      isMounted = false;
    };
  }, [cleanChannelId]);

  // Load Tab Content
  useEffect(() => {
    let isMounted = true;
    async function loadTabContent() {
      if (activeTab === 'about') return;

      setIsContentLoading(true);
      try {
        const items = await getYouTubeChannelContent(cleanChannelId, activeTab);
        if (isMounted) {
          setContent(items);
        }
      } catch (err) {
        console.warn(`Error loading ${activeTab}:`, err);
      } finally {
        if (isMounted) setIsContentLoading(false);
      }
    }

    if (cleanChannelId) {
      loadTabContent();
    }

    return () => {
      isMounted = false;
    };
  }, [cleanChannelId, activeTab]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Channel link copied to clipboard! 📋');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-8">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Loading YouTube Channel...
        </p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-8 text-center">
        <Film className="w-12 h-12 text-neutral-400 mb-3" />
        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
          Channel not found
        </h3>
        <p className="text-xs text-neutral-500 mt-1 mb-4">
          This channel might be private or does not exist.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-semibold"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Channel Banner */}
      <div className="w-full h-32 sm:h-48 md:h-64 overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
        <img
          src={channel.bannerUrl}
          alt={channel.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Channel Header Profile Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          {/* Avatar */}
          <img
            src={channel.avatarUrl}
            alt={channel.title}
            className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full object-cover ring-4 ring-white dark:ring-[#0f0f0f] shadow-xl shrink-0 -mt-10 sm:-mt-14"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
                {channel.title}
              </h1>
              {channel.verified && (
                <CheckCircle2 className="w-5 h-5 text-neutral-500 fill-neutral-500/20 shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {channel.handle}
              </span>
              <span>•</span>
              <span>{channel.subscriberCount}</span>
              <span>•</span>
              <span>{channel.videoCount}</span>
            </div>

            {/* Description Preview */}
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-2 max-w-2xl leading-relaxed">
              {channel.description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
              <button
                onClick={() => toggleSubscribe(channel.id, channel.title)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                  isSubscribed
                    ? 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isSubscribed && <Bell className="w-4 h-4 fill-current" />}
                <span>{isSubscribed ? 'Subscribed' : 'Subscribe'}</span>
              </button>

              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 sm:gap-6 border-b border-neutral-200 dark:border-neutral-800 mt-6 sm:mt-8 overflow-x-auto">
          {[
            { id: 'videos' as TabType, label: 'Videos', icon: Film },
            { id: 'shorts' as TabType, label: 'Shorts', icon: Flame },
            { id: 'playlists' as TabType, label: 'Playlists', icon: ListVideo },
            { id: 'about' as TabType, label: 'About', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="pt-6">
          {isContentLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-neutral-500">Loading {activeTab}...</p>
            </div>
          ) : activeTab === 'about' ? (
            /* About Tab */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  Description
                </h3>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                  {channel.description || 'No description provided.'}
                </p>
              </div>

              {/* Stats Card */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 h-fit">
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  Stats
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span>Joined {channel.joinedDate}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <Eye className="w-4 h-4 text-neutral-400" />
                  <span>{channel.viewCount}</span>
                </div>
                {channel.country && (
                  <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                    <Globe className="w-4 h-4 text-neutral-400" />
                    <span>Location: {channel.country}</span>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'shorts' ? (
            /* Shorts Grid */
            content.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                No Shorts found on this channel.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {content.map((short) => (
                  <Link
                    key={short.id}
                    to={`/watch/${short.id}`}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md block"
                  >
                    <img
                      src={short.thumbnailUrl}
                      alt={short.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="font-bold text-xs line-clamp-2 leading-snug">
                        {short.title}
                      </span>
                      <span className="text-[10px] text-neutral-300 mt-1">
                        {formatViews(short.views)} views
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            /* Videos & Playlists Grid */
            content.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs">
                No {activeTab} available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {content.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
