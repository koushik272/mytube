import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock,
  BookmarkPlus,
  CheckCircle2,
  MessageSquare,
  Send,
  ExternalLink,
  ListVideo,
  Play,
  RotateCcw,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Settings,
  RectangleHorizontal,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatLikes, formatViews } from '../utils/formatters';
import { YouTubePlayer } from '../components/video/YouTubePlayer';
import {
  getYouTubeVideoById,
  getYouTubeRelatedVideos,
  getYouTubePlaylist,
  getYouTubeTrending,
} from '../services/youtubeApi';
import { Video } from '../types/video';
import { ReactionType, VideoReactionStats } from '../types/interaction';
import { CommentsSection } from '../components/comment/CommentsSection';
import {
  subscribeToVideoReactions,
  setVideoReactionInFirestore,
} from '../firebase/firestore';

export const WatchPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get('list');
  const navigate = useNavigate();

  const {
    videos,
    likedVideos,
    toggleLike,
    watchLaterVideos,
    toggleWatchLater,
    subscribedChannels,
    toggleSubscribe,
    customPlaylists,
    openSaveModal,
    openMiniplayer,
    showToast,
    playVideo,
  } = useVideo();
  const { currentUser, userProfile, requireAuth } = useAuth();
  const { settings, updateSettings, openSettingsModal } = useSettings();

  const [currentVideo, setCurrentVideo] = useState<Video | null>(() => {
    return videos.find((v) => v.id === id) || null;
  });
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [recommendationTab, setRecommendationTab] = useState<'related' | 'trending'>('related');
  const [playlistData, setPlaylistData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Real-time Like & Dislike reaction state
  const [reactionStats, setReactionStats] = useState<VideoReactionStats>({
    likesCount: 85000,
    dislikesCount: 0,
  });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);

  // Theater Mode State
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(() => {
    return settings.theaterMode ?? false;
  });

  const toggleTheaterMode = () => {
    const nextVal = !isTheaterMode;
    setIsTheaterMode(nextVal);
    updateSettings({ theaterMode: nextVal });
    showToast(nextVal ? 'Theater mode enabled (t) 🎬' : 'Default view (t)');
  };

  // Load video details dynamically if not in memory
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);

      // 1. Check in existing memory
      const matched = videos.find((v) => v.id === id);
      if (matched) {
        setCurrentVideo(matched);
        playVideo(matched);
      } else if (id) {
        // Fetch via YouTube API
        const fetched = await getYouTubeVideoById(id);
        if (isMounted && fetched) {
          setCurrentVideo(fetched);
          playVideo(fetched);
        }
      }

      // 2. Fetch related recommendations
      if (id) {
        const related = await getYouTubeRelatedVideos(id);
        if (isMounted) setRelatedVideos(related);
      }

      // 3. Fetch playlist details if list param is present
      if (playlistId) {
        // Check if custom playlist
        const customPl = customPlaylists.find((p) => p.id === playlistId);
        if (customPl) {
          const resolved: Video[] = [];
          for (const vId of customPl.videoIds) {
            const inMem = videos.find((v) => v.id === vId);
            if (inMem) {
              resolved.push(inMem);
            } else {
              const fetched = await getYouTubeVideoById(vId);
              if (fetched) resolved.push(fetched);
            }
          }
          if (isMounted) {
            setPlaylistData({
              id: customPl.id,
              title: customPl.title,
              channelTitle: customPl.ownerName || 'Custom Playlist',
              itemCount: resolved.length,
              items: resolved,
            });
          }
        } else {
          const pl = await getYouTubePlaylist(playlistId);
          if (isMounted) setPlaylistData(pl);
        }
      }

      if (isMounted) setIsLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, playlistId, videos, customPlaylists]);

  // Load trending videos if the user switches to the Trending tab
  useEffect(() => {
    if (recommendationTab === 'trending' && trendingVideos.length === 0) {
      getYouTubeTrending({ regionCode: 'IN', maxResults: 15 }).then((res) => {
        if (res && res.items) {
          setTrendingVideos(res.items);
        }
      });
    }
  }, [recommendationTab, trendingVideos.length]);

  const isInvalidVideoId = Boolean(id && !/^[a-zA-Z0-9_-]{11}$/.test(id));

  if (!currentVideo && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-8">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Loading YouTube video...
        </p>
      </div>
    );
  }

  const activeVideo = currentVideo || {
    id,
    title: `YouTube Video (${id})`,
    description: 'Original YouTube video playback powered by official YouTube IFrame Player API.',
    videoUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: '10:00',
    views: 1200000,
    likes: 85000,
    uploadedAt: 'Recently',
    category: 'All' as any,
    channel: {
      id: 'ch-yt',
      name: 'YouTube Channel',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=YouTube`,
      subscribers: '1.2M',
      verified: true,
    },
    commentsCount: 940,
    tags: ['youtube', 'original'],
  };

  const isWatchLater = watchLaterVideos.includes(activeVideo.id);
  const isSubscribed = subscribedChannels.includes(activeVideo.channel.id);

  // Subscribe to real-time Likes / Dislikes reaction counts & user reaction state
  useEffect(() => {
    const unsubReactions = subscribeToVideoReactions(
      activeVideo.id,
      currentUser?.uid || null,
      activeVideo.likes,
      (data) => {
        setReactionStats(data.stats);
        setUserReaction(data.userReaction);
      }
    );

    return () => {
      unsubReactions();
    };
  }, [activeVideo.id, currentUser?.uid, activeVideo.likes]);

  const handleToggleReaction = (targetType: ReactionType) => {
    requireAuth(async () => {
      const nextReaction: ReactionType | null =
        userReaction === targetType ? null : targetType;

      const updated = await setVideoReactionInFirestore(
        activeVideo.id,
        currentUser!.uid,
        nextReaction,
        userReaction,
        activeVideo.likes
      );

      setReactionStats(updated);
      setUserReaction(nextReaction);

      // Keep library "Liked Videos" sync
      if (nextReaction === 'like' && !likedVideos.includes(activeVideo.id)) {
        toggleLike(activeVideo.id);
      } else if (nextReaction !== 'like' && likedVideos.includes(activeVideo.id)) {
        toggleLike(activeVideo.id);
      }

      if (nextReaction === 'like') {
        showToast('Added to Liked videos 👍');
      } else if (nextReaction === 'dislike') {
        showToast('Feedback noted 👎');
      } else {
        showToast('Reaction removed');
      }
    }, 'Sign in to like or dislike this video');
  };

  const handleSubscribe = () => {
    toggleSubscribe(activeVideo.channel.id, activeVideo.channel.name);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Video link copied to clipboard! 📋');
  };

  // Next eligible video for autoplay & up-next
  const nextEligibleVideo = React.useMemo(() => {
    if (playlistData && playlistData.items?.length > 0) {
      const currentIdx = playlistData.items.findIndex(
        (item: Video) => item.id === activeVideo.id
      );
      if (currentIdx >= 0 && currentIdx < playlistData.items.length - 1) {
        const nxt = playlistData.items[currentIdx + 1];
        return {
          id: nxt.id,
          title: nxt.title,
          thumbnailUrl: nxt.thumbnailUrl,
          channelName: nxt.channel?.name,
        };
      }
    }
    if (relatedVideos.length > 0) {
      const nxt = relatedVideos[0];
      return {
        id: nxt.id,
        title: nxt.title,
        thumbnailUrl: nxt.thumbnailUrl,
        channelName: nxt.channel?.name,
      };
    }
    return null;
  }, [playlistData, activeVideo.id, relatedVideos]);

  const handleTriggerNext = () => {
    if (!nextEligibleVideo) return;
    if (playlistData && playlistData.items?.length > 0) {
      const currentIdx = playlistData.items.findIndex(
        (item: Video) => item.id === activeVideo.id
      );
      if (currentIdx >= 0 && currentIdx < playlistData.items.length - 1) {
        navigate(`/watch/${nextEligibleVideo.id}?list=${playlistData.id}`);
        return;
      }
    }
    navigate(`/watch/${nextEligibleVideo.id}`);
  };

  const renderPlayer = (isTheater: boolean) => (
    <YouTubePlayer
      videoId={activeVideo.id}
      title={activeVideo.title}
      nextVideo={nextEligibleVideo}
      onTriggerNext={handleTriggerNext}
      autoplayEnabled={settings.autoplayNext}
      onToggleAutoplay={() => {
        const nextVal = !settings.autoplayNext;
        updateSettings({ autoplayNext: nextVal });
        showToast(nextVal ? 'Autoplay enabled 🔁' : 'Autoplay disabled ⏸');
      }}
      playbackSpeed={settings.playbackSpeed}
      onSpeedChange={(speed) => {
        updateSettings({ playbackSpeed: speed });
        showToast(`Playback speed set to ${speed}x`);
      }}
      theaterMode={isTheater}
      onToggleTheaterMode={toggleTheaterMode}
      preferredQuality={settings.preferredQuality}
      onQualityChange={(q) => updateSettings({ preferredQuality: q })}
      captionsEnabled={settings.captionsEnabled}
      onToggleCaptions={(en) => updateSettings({ captionsEnabled: en })}
      onEnded={() => {
        if (settings.autoplayNext && nextEligibleVideo) {
          // YouTubePlayer displays the 5s auto-advance overlay
        } else if (nextEligibleVideo) {
          showToast(`Next up: ${nextEligibleVideo.title}`);
        }
      }}
    />
  );

  return (
    <div className="flex flex-col w-full pb-20 lg:pb-8">
      {/* 1. Cinema Banner if Theater Mode is Active */}
      {isTheaterMode && (
        <div className="w-full bg-black flex justify-center items-center shadow-2xl mb-4 sm:mb-6">
          <div className="w-full max-w-[1700px] max-h-[82vh] aspect-video">
            {renderPlayer(true)}
          </div>
        </div>
      )}

      {/* 2. Main 2-Column Content Layout */}
      <div className="flex flex-col xl:flex-row gap-6 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Main Video & Content Column */}
        <div className="flex-1 min-w-0">
          {/* Invalid Video ID Notice */}
          {isInvalidVideoId && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-800 dark:text-amber-200 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Non-standard Video ID</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                  The video identifier "{id}" does not follow standard 11-character YouTube video ID format. You can pick an eligible video from the recommendations sidebar.
                </p>
              </div>
            </div>
          )}

          {/* Normal Mode Player */}
          {!isTheaterMode && renderPlayer(false)}

          {/* Video Title */}
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-4 leading-snug">
            {activeVideo.title}
          </h1>

        {/* Channel Info & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-3 py-1">
          {/* Channel Info */}
          <div className="flex items-center gap-3">
            <Link
              to={`/channel/${encodeURIComponent(activeVideo.channel.id || activeVideo.channel.name)}`}
              className="flex items-center gap-3 group"
            >
              <img
                src={activeVideo.channel.avatar}
                alt={activeVideo.channel.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700 shrink-0 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-1 font-semibold text-sm text-neutral-900 dark:text-neutral-100 group-hover:underline">
                  <span>{activeVideo.channel.name}</span>
                  {activeVideo.channel.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 fill-neutral-500/20" />
                  )}
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {activeVideo.channel.subscribers} subscribers
                </span>
              </div>
            </Link>

            <button
              onClick={handleSubscribe}
              className={`ml-3 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                isSubscribed
                  ? 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isSubscribed ? 'Subscribed 🔔' : 'Subscribe'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Like / Dislike pill group */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden text-neutral-800 dark:text-neutral-200 shadow-xs">
              <button
                onClick={() => handleToggleReaction('like')}
                className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-xs font-semibold cursor-pointer ${
                  userReaction === 'like'
                    ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40'
                    : ''
                }`}
                title="I like this video"
              >
                <ThumbsUp
                  className={`w-4 h-4 ${
                    userReaction === 'like' ? 'fill-current' : ''
                  }`}
                />
                <span>{formatLikes(reactionStats.likesCount)}</span>
              </button>
              <div className="w-[1px] h-5 bg-neutral-300 dark:bg-neutral-700" />
              <button
                onClick={() => handleToggleReaction('dislike')}
                className={`flex items-center gap-1 px-3 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer ${
                  userReaction === 'dislike'
                    ? 'text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/40'
                    : ''
                }`}
                title="I dislike this video"
              >
                <ThumbsDown
                  className={`w-4 h-4 ${
                    userReaction === 'dislike' ? 'fill-current' : ''
                  }`}
                />
                {reactionStats.dislikesCount > 0 && (
                  <span className="text-[11px] font-medium">
                    {reactionStats.dislikesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {/* Watch Later button */}
            <button
              onClick={() => toggleWatchLater(activeVideo.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors text-xs font-semibold cursor-pointer ${
                isWatchLater
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isWatchLater ? 'Saved' : 'Save'}</span>
            </button>

            {/* Save to Playlist button */}
            <button
              onClick={() => openSaveModal(activeVideo)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              title="Save to playlist"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Playlist</span>
            </button>

            {/* Minimize to Miniplayer button */}
            <button
              onClick={() => {
                openMiniplayer(activeVideo);
                navigate(-1);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              title="Minimize to floating Miniplayer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Miniplayer</span>
            </button>

            {/* Theater Mode button */}
            <button
              onClick={toggleTheaterMode}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors text-xs font-semibold cursor-pointer ${
                isTheaterMode
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
              title="Toggle Theater Mode (t)"
            >
              <RectangleHorizontal className="w-4 h-4" />
              <span>{isTheaterMode ? 'Theater On' : 'Theater'}</span>
            </button>

            {/* Watch Settings button */}
            <button
              onClick={openSettingsModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              title="Watch Settings (Autoplay, Speed, Search History)"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            {/* Direct YouTube Link */}
            <a
              href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on YouTube.com"
              className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Video Description Box */}
        <div
          onClick={() => setIsDescExpanded((prev) => !prev)}
          className="mt-4 p-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
            <span>{formatViews(activeVideo.views)} views</span>
            <span>•</span>
            <span>{activeVideo.uploadedAt}</span>
            <div className="flex gap-1.5 ml-2">
              {(activeVideo.tags || []).slice(0, 3).map((tag) => (
                <span key={tag} className="text-blue-600 dark:text-blue-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <p
            className={`text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line ${
              isDescExpanded ? '' : 'line-clamp-2'
            }`}
          >
            {activeVideo.description}
          </p>
          <button className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-2 hover:underline">
            {isDescExpanded ? 'Show less' : '...more'}
          </button>
        </div>

        {/* Interactive Real-Time Comments Section */}
        <CommentsSection
          videoId={activeVideo.id}
          videoTitle={activeVideo.title}
          commentsCountFallback={activeVideo.commentsCount}
        />
      </div>

      {/* Sidebar: Playlists & Recommended Videos */}
      <div className="w-full xl:w-96 shrink-0 space-y-4">
        {/* Playlist Episode Queue Box (if list param provided) */}
        {playlistData && (
          <div className="bg-neutral-100 dark:bg-[#181818] p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Link
                to={`/playlist/${playlistData.id}`}
                className="flex items-center gap-2 font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:text-red-600 dark:hover:text-red-400 truncate"
              >
                <ListVideo className="w-4 h-4 text-red-600 shrink-0" />
                <span className="truncate">{playlistData.title}</span>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                {/* Previous Video in Playlist */}
                <button
                  onClick={() => {
                    const currentIdx = playlistData.items.findIndex(
                      (item: Video) => item.id === activeVideo.id
                    );
                    if (currentIdx > 0) {
                      const prevVideo = playlistData.items[currentIdx - 1];
                      navigate(`/watch/${prevVideo.id}?list=${playlistData.id}`);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="Previous in playlist"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Next Video in Playlist */}
                <button
                  onClick={() => {
                    const currentIdx = playlistData.items.findIndex(
                      (item: Video) => item.id === activeVideo.id
                    );
                    if (
                      currentIdx >= 0 &&
                      currentIdx < playlistData.items.length - 1
                    ) {
                      const nextVideo = playlistData.items[currentIdx + 1];
                      navigate(`/watch/${nextVideo.id}?list=${playlistData.id}`);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  title="Next in playlist"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mb-3">
              {playlistData.channelTitle} • {playlistData.items?.length || 0} videos
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {playlistData.items?.map((item: Video, idx: number) => (
                <Link
                  key={item.id}
                  to={`/watch/${item.id}?list=${playlistData.id}`}
                  className={`flex items-center gap-2.5 p-1.5 rounded-xl text-xs transition-colors ${
                    item.id === activeVideo.id
                      ? 'bg-neutral-200 dark:bg-neutral-700 font-bold text-red-600 dark:text-red-400'
                      : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <span className="w-4 text-center font-mono text-[10px] text-neutral-400">
                    {idx + 1}
                  </span>
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-14 h-9 rounded object-cover shrink-0"
                  />
                  <span className="truncate flex-1">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Up Next Recommendations & Trending Switcher */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setRecommendationTab('related')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                recommendationTab === 'related'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Related
            </button>
            <button
              onClick={() => setRecommendationTab('trending')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                recommendationTab === 'trending'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>Trending</span>
            </button>
          </div>
          <span className="text-[11px] text-neutral-500">
            {recommendationTab === 'related'
              ? `${relatedVideos.length} recommendations`
              : 'Popular in India'}
          </span>
        </div>

        <div className="space-y-3">
          {(recommendationTab === 'related' ? relatedVideos : trendingVideos).map((video) => (
            <Link
              key={video.id}
              to={`/watch/${video.id}`}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
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
                <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[10px] font-semibold">
                  {video.duration}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {video.title}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {video.channel.name}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {formatViews(video.views)} views • {video.uploadedAt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  </div>
);
};
