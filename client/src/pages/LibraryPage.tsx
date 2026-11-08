import React from 'react';
import { Link } from 'react-router-dom';
import {
  Film,
  History,
  Clock,
  ThumbsUp,
  ChevronRight,
  ListVideo,
  UserCircle2,
  LogIn,
  AtSign,
  Lock,
  Globe,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { VideoCard } from '../components/video/VideoCard';

export const LibraryPage: React.FC = () => {
  const { watchHistory, videos, likedVideos, watchLaterVideos, customPlaylists } = useVideo();
  const { currentUser, userProfile, openAuthModal } = useAuth();

  const likedVideosList = videos.filter((v) => likedVideos.includes(v.id));
  const watchLaterList = videos.filter((v) => watchLaterVideos.includes(v.id));

  // If user is not logged in, prompt sign in like official YouTube
  if (!currentUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-5">
          <Film className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Enjoy your favorite videos
        </h2>
        <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
          Sign in to access your watch history, saved Watch Later playlists, liked videos, and your channel settings.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-md cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In to MyTube</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8 max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)] pb-20 lg:pb-8">
      {/* User Header Profile */}
      <div className="flex items-center gap-5 p-5 rounded-3xl bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <img
          src={userProfile.photoURL}
          alt={userProfile.displayName}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-red-600 shadow-md shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {userProfile.displayName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 mt-0.5">
            <span className="font-semibold text-red-600 dark:text-red-400">
              {userProfile.handle}
            </span>
            <span>•</span>
            <span>{userProfile.subscribersCount} subscribers</span>
            <span>•</span>
            <span>{userProfile.email}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {watchHistory.length} watched
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {likedVideos.length} liked
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {watchLaterVideos.length} watch later
            </span>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <Link
            to="/history"
            className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-red-600 dark:hover:text-red-400 group"
          >
            <History className="w-5 h-5 text-red-600" />
            <span>History</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/history"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            See all ({watchHistory.length})
          </Link>
        </div>

        {watchHistory.length === 0 ? (
          <p className="text-xs text-neutral-500 px-1">No videos watched yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchHistory.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800" />

      {/* Watch Later Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <Link
            to="/watch-later"
            className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 group"
          >
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Watch Later</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/watch-later"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            See all ({watchLaterVideos.length})
          </Link>
        </div>

        {watchLaterList.length === 0 ? (
          <p className="text-xs text-neutral-500 px-1">
            No videos saved to watch later. Click the clock icon on any video to add it.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {watchLaterList.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800" />

      {/* Playlists Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100">
            <ListVideo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Playlists</span>
          </div>
          <span className="text-xs text-neutral-500 font-semibold">
            {customPlaylists.length} playlists
          </span>
        </div>

        {customPlaylists.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 text-center">
            <ListVideo className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No playlists created yet</p>
            <p className="text-xs text-neutral-500 mt-1">Save videos to custom playlists to organize your favorite content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customPlaylists.map((pl) => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs hover:shadow-md transition-all"
              >
                <div className="relative aspect-video w-full bg-neutral-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
                  <ListVideo className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold">
                    <ListVideo className="w-3.5 h-3.5" />
                    <span>{pl.videoIds.length} videos</span>
                  </div>
                </div>
                <div className="p-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {pl.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1">
                    {pl.description || 'Custom playlist'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1">
                    {pl.isPrivate ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800" />

      {/* Liked Videos Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100">
            <ThumbsUp className="w-5 h-5 text-emerald-600" />
            <span>Liked Videos</span>
          </div>
          <span className="text-xs text-neutral-500">
            {likedVideosList.length} videos
          </span>
        </div>

        {likedVideosList.length === 0 ? (
          <p className="text-xs text-neutral-500 px-1">
            No liked videos yet. Hit thumbs up on videos you love!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {likedVideosList.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
