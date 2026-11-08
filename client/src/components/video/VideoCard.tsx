import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  MoreVertical,
  Clock,
  Share2,
  BookmarkPlus,
  Play,
  ThumbsUp,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Video } from '../../types/video';
import { formatViews } from '../../utils/formatters';
import { useVideo } from '../../context/VideoContext';

interface VideoCardProps {
  video: Video;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();
  const {
    playVideo,
    toggleWatchLater,
    watchLaterVideos,
    toggleLike,
    likedVideos,
    openSaveModal,
    showToast,
    dismissVideo,
  } = useVideo();
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWatchLater = watchLaterVideos.includes(video.id);
  const isLiked = likedVideos.includes(video.id);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCardClick = () => {
    playVideo(video);
    navigate(`/watch/${video.id}`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.origin + `/watch/${video.id}`);
    showToast('Video link copied to clipboard! 📋');
    setShowMenu(false);
  };

  const handleWatchLaterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchLater(video.id);
    setShowMenu(false);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(video.id);
    setShowMenu(false);
  };

  return (
    <div
      className="flex flex-col group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
    >
      {/* 1. Thumbnail Container */}
      <div
        onClick={handleCardClick}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 transition-all duration-200 group-hover:rounded-none group-hover:shadow-lg"
      >
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
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-xs font-semibold tracking-wide">
          {video.duration}
        </span>

        {/* Quick action overlay buttons on hover */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10 transition-opacity">
            <button
              onClick={handleWatchLaterClick}
              title={isWatchLater ? 'Remove from Watch Later' : 'Watch Later'}
              className={`p-1.5 rounded-md backdrop-blur-md transition-colors ${
                isWatchLater
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/70 hover:bg-black text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              title="Share"
              className="p-1.5 rounded-md bg-black/70 hover:bg-black text-white backdrop-blur-md transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hover subtle play indicator */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Video Details */}
      <div className="flex gap-3 mt-3 px-1">
        {/* Channel Avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/channel/${encodeURIComponent(video.channel.id || video.channel.name)}`);
          }}
          className="shrink-0 cursor-pointer"
          title={video.channel.name}
        >
          <img
            src={video.channel.avatar}
            alt={video.channel.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                video.channel.name || 'User'
              )}&backgroundColor=e50914`;
            }}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 hover:opacity-85 transition-opacity"
          />
        </div>

        {/* Title, Channel and Metadata */}
        <div className="flex-1 min-w-0" onClick={handleCardClick}>
          {video.recommendationReason && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{video.recommendationReason}</span>
            </div>
          )}
          <h3
            className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            title={video.title}
          >
            {video.title}
          </h3>

          {/* Channel Name with Verified Badge */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/channel/${encodeURIComponent(video.channel.id || video.channel.name)}`);
            }}
            className="flex items-center gap-1.5 mt-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer w-fit"
          >
            <span className="truncate">{video.channel.name}</span>
            {video.channel.verified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 fill-neutral-500/20 shrink-0" />
            )}
          </div>

          {/* Views & Timestamp */}
          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            <span>{formatViews(video.views)} views</span>
            <span>•</span>
            <span>{video.uploadedAt}</span>
          </div>
        </div>

        {/* 3. Kebab Menu Trigger */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 w-52 bg-white dark:bg-[#282828] rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={handleWatchLaterClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>
                  {isWatchLater ? 'Remove from Watch Later' : 'Save to Watch Later'}
                </span>
              </button>
              <button
                onClick={handleLikeClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{isLiked ? 'Unlike Video' : 'Add to Liked Videos'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showToast('Added to default Playlist');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Save to Playlist</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
              <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissVideo(video.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
                <span>Not interested</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
