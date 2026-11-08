import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Grid,
  CheckCircle2,
  Users,
  Sparkles,
  PlaySquare,
  Plus,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { VideoGrid } from '../components/video/VideoGrid';
import { getYouTubeSubscriptionsFeed } from '../services/youtubeApi';
import { Video } from '../types/video';

// Recommended channels for empty state
const RECOMMENDED_CHANNELS = [
  {
    id: '@Telusko',
    name: 'Telusko',
    subscribers: '3.04M',
    avatar: 'https://yt3.googleusercontent.com/0nsZM3NF0C9bFr2IFXicMJ1w82ldRaZvGKFnezBe2lpW7F9gI92FaLubcTghnNNt4Ld8DfRvEMo=s900-c-k-c0x00ffffff-no-rj',
    category: 'Education & Code',
  },
  {
    id: 'SonyLIV',
    name: 'Sony LIV',
    subscribers: '45M',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SonyLIV&backgroundColor=059669',
    category: 'Cricket & Entertainment',
  },
  {
    id: 'T-Series Telugu',
    name: 'T-Series Telugu',
    subscribers: '12M',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TSeries&backgroundColor=e50914',
    category: 'Music & Songs',
  },
  {
    id: 'Cinema updates',
    name: 'Cinema updates',
    subscribers: '1.2M',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Cinema&backgroundColor=2563eb',
    category: 'Sports & Cricket',
  },
];

export const SubscriptionsPage: React.FC = () => {
  const { subscribedChannels, toggleSubscribe, showToast } = useVideo();
  const { currentUser } = useAuth();

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [feedVideos, setFeedVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real subscription feed
  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setIsLoading(true);
      try {
        const videos = await getYouTubeSubscriptionsFeed(subscribedChannels);
        if (isMounted) {
          setFeedVideos(videos);
        }
      } catch (err) {
        console.warn('Error loading subscriptions feed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadFeed();

    return () => {
      isMounted = false;
    };
  }, [subscribedChannels]);

  // Filter feed by selected channel
  const displayedVideos = selectedChannel
    ? feedVideos.filter(
        (v) =>
          v.channel.name.toLowerCase().includes(selectedChannel.toLowerCase().replace('@', '')) ||
          v.channel.id === selectedChannel
      )
    : feedVideos;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Subscribed Channels Bar */}
      <div className="p-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0f0f0f]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Subscriptions
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {subscribedChannels.length} channels
            </span>
          </div>

          <span className="text-xs font-semibold text-neutral-500">
            Chronological Feed
          </span>
        </div>

        {/* Channels horizontal chips */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* All Videos Pill */}
          <button
            onClick={() => setSelectedChannel(null)}
            className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              selectedChannel === null
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>All Channels</span>
          </button>

          {/* Subscribed Channel Chips */}
          {subscribedChannels.map((ch) => {
            const isSelected = selectedChannel === ch;
            const displayName = ch.replace('@', '');
            return (
              <button
                key={ch}
                onClick={() => setSelectedChannel(isSelected ? null : ch)}
                className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    displayName
                  )}&backgroundColor=e50914`}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="truncate max-w-[120px]">{displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Subscriptions Feed Content */}
      <div className="p-3 sm:p-6 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-neutral-500">
              Fetching latest videos from your subscribed channels...
            </p>
          </div>
        ) : displayedVideos.length === 0 ? (
          /* Empty State & Recommended Channels */
          <div className="max-w-2xl mx-auto py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Don’t miss new videos
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mb-8 max-w-md mx-auto leading-relaxed">
              Sign in and subscribe to your favorite channels to see their latest releases here in real-time.
            </p>

            {/* Recommended Channels Grid */}
            <div className="text-left mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                  Recommended Channels to Follow
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RECOMMENDED_CHANNELS.map((ch) => {
                  const isSub = subscribedChannels.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 shadow-xs"
                    >
                      <Link
                        to={`/channel/${encodeURIComponent(ch.id)}`}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <img
                          src={ch.avatar}
                          alt={ch.name}
                          className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate group-hover:underline">
                            {ch.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {ch.subscribers} • {ch.category}
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() => toggleSubscribe(ch.id, ch.name)}
                        className={`ml-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          isSub
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {isSub ? 'Subscribed' : 'Subscribe'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {selectedChannel
                  ? `Latest from ${selectedChannel}`
                  : 'Latest Releases from Subscriptions'}
              </h2>
              <span className="text-xs text-neutral-500">
                {displayedVideos.length} videos
              </span>
            </div>
            <VideoGrid videos={displayedVideos} />
          </div>
        )}
      </div>
    </div>
  );
};
