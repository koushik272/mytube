import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Send,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { getYouTubeShorts, YouTubeShort } from '../services/youtubeApi';
import { formatLikes, formatViews } from '../utils/formatters';

export const ShortsPage: React.FC = () => {
  const { likedVideos, toggleLike, showToast, toggleSubscribe, subscribedChannels } = useVideo();
  const { currentUser, userProfile, requireAuth } = useAuth();

  const [shorts, setShorts] = useState<YouTubeShort[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ id: string; author: string; text: string; time: string }[]>([
    {
      id: 'c1',
      author: 'Rohit Sharma',
      text: 'The timing and frame rate on this YouTube Short are crazy good! 🔥',
      time: '2 hours ago',
    },
    {
      id: 'c2',
      author: 'Priya Patel',
      text: 'Playing directly in MyTube with full audio and no buffering. Amazing!',
      time: '5 hours ago',
    },
  ]);

  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Fetch real YouTube Shorts on mount
  useEffect(() => {
    let isMounted = true;
    async function loadShorts() {
      setIsLoading(true);
      try {
        const data = await getYouTubeShorts(25);
        if (isMounted && data.length > 0) {
          setShorts(data);
        }
      } catch (err) {
        console.warn('Failed to load shorts:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadShorts();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeShort = shorts[currentIndex];
  const isCurrentLiked = activeShort ? likedVideos.includes(activeShort.id) : false;
  const isCurrentSubscribed = activeShort ? subscribedChannels.includes(activeShort.channel.id) : false;

  const handleNext = useCallback(() => {
    if (shorts.length === 0) return;
    setIsDisliked(false);
    setCurrentIndex((prev) => (prev < shorts.length - 1 ? prev + 1 : 0));
  }, [shorts.length]);

  const handlePrev = useCallback(() => {
    if (shorts.length === 0) return;
    setIsDisliked(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : shorts.length - 1));
  }, [shorts.length]);

  // Keyboard navigation: ArrowUp = Prev, ArrowDown = Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommentsOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isCommentsOpen]);

  const handleShare = () => {
    if (activeShort) {
      navigator.clipboard?.writeText(`https://www.youtube.com/shorts/${activeShort.id}`);
      showToast('YouTube Shorts link copied to clipboard! 📋');
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    requireAuth(() => {
      const author = userProfile?.displayName || 'User';
      setComments((prev) => [
        {
          id: Date.now().toString(),
          author: `${author} (${userProfile?.handle || '@you'})`,
          text: newComment.trim(),
          time: 'Just now',
        },
        ...prev,
      ]);
      setNewComment('');
      showToast('Comment posted on Short! 💬');
    }, 'Sign in to comment on Shorts');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-8">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Loading real YouTube Shorts...
        </p>
      </div>
    );
  }

  if (!activeShort) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] p-8 text-center">
        <Sparkles className="w-12 h-12 text-neutral-400 mb-3" />
        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
          No YouTube Shorts available right now
        </h3>
        <p className="text-xs text-neutral-500 mt-1 mb-4">
          Please check your internet connection or search for shorts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-2 sm:p-4 pb-20 lg:pb-6 select-none">
      <div className="flex items-end gap-3 sm:gap-4 relative max-w-full">
        {/* Main Vertical Shorts Card */}
        <div
          ref={playerContainerRef}
          className="relative w-[320px] sm:w-[380px] md:w-[410px] h-[570px] sm:h-[660px] md:h-[720px] rounded-3xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between border border-neutral-800"
        >
          {/* Official YouTube IFrame Player (configured for vertical Shorts) */}
          <iframe
            key={activeShort.id}
            src={`https://www.youtube.com/embed/${activeShort.id}?autoplay=1&mute=${
              isMuted ? '1' : '0'
            }&controls=1&loop=1&playlist=${activeShort.id}&modestbranding=1&rel=0&playsinline=1`}
            title={activeShort.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
          />

          {/* Top Quick Actions (Mute & Fullscreen) */}
          <div className="relative z-20 p-3 sm:p-4 flex justify-between items-center pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-md">
              Shorts {currentIndex + 1} / {shorts.length}
            </span>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer shadow"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer shadow hidden sm:flex"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Video Metadata Overlay */}
          <div className="relative z-20 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white space-y-2 pointer-events-none">
            {/* Channel Info & Subscribe */}
            <div className="flex items-center gap-2.5 pointer-events-auto">
              <Link
                to={`/channel/${encodeURIComponent(activeShort.channel.name)}`}
                className="flex items-center gap-2 group"
              >
                <img
                  src={activeShort.channel.avatar}
                  alt={activeShort.channel.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white/60 shadow group-hover:scale-105 transition-transform"
                />
                <span className="font-bold text-sm drop-shadow-md group-hover:underline">
                  @{activeShort.channel.name}
                </span>
              </Link>
              <button
                onClick={() => toggleSubscribe(activeShort.channel.id, activeShort.channel.name)}
                className={`ml-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow ${
                  isCurrentSubscribed
                    ? 'bg-neutral-300 text-black'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isCurrentSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Short Title & Tags */}
            <p className="text-xs sm:text-sm font-medium leading-snug drop-shadow line-clamp-2">
              {activeShort.title}
            </p>
          </div>

          {/* Slide-over Comments Drawer */}
          {isCommentsOpen && (
            <div className="absolute inset-0 z-30 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md flex flex-col p-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-red-600" />
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    Comments ({comments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCommentsOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {c.author}
                      </span>
                      <span className="text-[10px] text-neutral-400">{c.time}</span>
                    </div>
                    <p className="text-neutral-800 dark:text-neutral-200">{c.text}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 rounded-full bg-red-600 text-white cursor-pointer hover:bg-red-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Floating Actions Column */}
        <div className="flex flex-col items-center gap-4 sm:gap-5 pb-4">
          {/* Like Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                toggleLike(activeShort.id);
                if (isDisliked) setIsDisliked(false);
              }}
              className={`p-3 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                isCurrentLiked
                  ? 'bg-red-600 text-white scale-110'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
              title="Like"
            >
              <ThumbsUp className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              {formatLikes(activeShort.likes + (isCurrentLiked ? 1 : 0))}
            </span>
          </div>

          {/* Dislike Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                setIsDisliked((prev) => !prev);
                if (isCurrentLiked) toggleLike(activeShort.id);
              }}
              className={`p-3 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                isDisliked
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
              }`}
              title="Dislike"
            >
              <ThumbsDown className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              Dislike
            </span>
          </div>

          {/* Comments Toggle */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setIsCommentsOpen((prev) => !prev)}
              className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title="Comments"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              {comments.length}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleShare}
              className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              Share
            </span>
          </div>

          {/* Next & Previous Arrow Controls */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-300 dark:border-neutral-800">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow"
              title="Previous Short (Up Arrow)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer shadow"
              title="Next Short (Down Arrow)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
