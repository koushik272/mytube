import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Play,
  Trash2,
  Share2,
  CheckCircle2,
  Film,
  Sparkles,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { getYouTubeVideoById } from '../services/youtubeApi';
import { Video } from '../types/video';
import { formatViews } from '../utils/formatters';

export const WatchLaterPage: React.FC = () => {
  const { watchLaterVideos, toggleWatchLater, videos, playVideo, showToast } = useVideo();
  const { currentUser, userProfile, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [fullVideos, setFullVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load complete video objects for IDs in watchLaterVideos
  useEffect(() => {
    let isMounted = true;
    async function resolveVideos() {
      setIsLoading(true);
      const list: Video[] = [];

      for (const id of watchLaterVideos) {
        // Check in memory first
        const found = videos.find((v) => v.id === id);
        if (found) {
          list.push(found);
        } else {
          // Fetch from YouTube API proxy
          const fetched = await getYouTubeVideoById(id);
          if (fetched) {
            list.push(fetched);
          }
        }
      }

      if (isMounted) {
        setFullVideos(list);
        setIsLoading(false);
      }
    }

    resolveVideos();

    return () => {
      isMounted = false;
    };
  }, [watchLaterVideos, videos]);

  const handlePlayAll = () => {
    if (fullVideos.length > 0) {
      playVideo(fullVideos[0]);
      navigate(`/watch/${fullVideos[0].id}`);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Watch Later playlist link copied! 📋');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Left Sidebar: Playlist Header Card */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-gradient-to-b from-blue-900/40 via-neutral-900/60 to-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4 text-white sticky top-20">
          {/* Cover image (first video thumbnail or placeholder) */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-800 shadow-md">
            {fullVideos.length > 0 ? (
              <img
                src={fullVideos[0].thumbnailUrl}
                alt="Watch Later"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-950/60">
                <Clock className="w-12 h-12 text-blue-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-white/80" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Watch Later</h1>
            <p className="text-xs text-neutral-300 mt-1">
              {userProfile ? userProfile.displayName : 'MyTube Playlist'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-2">
              <span>{watchLaterVideos.length} videos</span>
              <span>•</span>
              <span>Updated today</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handlePlayAll}
              disabled={fullVideos.length === 0}
              className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Play All</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Playlist</span>
            </button>
          </div>

          <p className="text-[10px] text-neutral-400 leading-relaxed pt-2 border-t border-white/10">
            Saved videos are automatically synchronized to Cloud Firestore across your devices.
          </p>
        </div>
      </div>

      {/* Right Content: Videos List */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-neutral-500">Loading Watch Later videos...</p>
          </div>
        ) : fullVideos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#161616] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
            <Clock className="w-14 h-14 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              No videos in Watch Later
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6 max-w-sm mx-auto leading-relaxed">
              Use the clock icon on any video card or watch page to save videos for later viewing.
            </p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors shadow-md"
            >
              Find Videos to Watch
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {fullVideos.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors group relative bg-white dark:bg-[#161616] sm:bg-transparent sm:dark:bg-transparent border border-neutral-200 dark:border-neutral-800 sm:border-0"
              >
                {/* Track Number */}
                <span className="w-5 text-center font-mono text-xs text-neutral-400 font-semibold shrink-0">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <Link
                  to={`/watch/${video.id}`}
                  onClick={() => playVideo(video)}
                  className="relative aspect-video w-36 sm:w-48 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 shadow-xs"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-[10px] font-semibold rounded">
                    {video.duration}
                  </span>
                </Link>

                {/* Metadata */}
                <div className="flex-1 min-w-0 pr-8">
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
                </div>

                {/* Remove from Watch Later button */}
                <button
                  onClick={() => toggleWatchLater(video.id)}
                  className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  title="Remove from Watch Later"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
