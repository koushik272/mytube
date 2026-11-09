import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  Film,
  History,
  Flame,
  Music2,
  Gamepad2,
  Trophy,
  Newspaper,
  Settings,
  HelpCircle,
  MessageSquareWarning,
  ChevronRight,
  X,
  Play,
  UserCircle2,
  ListVideo,
  Sparkles,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useGestureMode } from '../../context/GestureModeContext';
import { SUBSCRIPTION_CHANNELS } from '../../data/sampleVideos';

export const Sidebar: React.FC = () => {
  const { isCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();
  const { likedVideos, watchLaterVideos, customPlaylists } = useVideo();
  const { currentUser, openAuthModal } = useAuth();
  const { openSettingsModal } = useSettings();
  const { openGestureMode } = useGestureMode();

  // Navigation link helper
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold'
        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
    }`;

  const miniNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-3.5 px-1 rounded-xl text-[10px] font-medium transition-colors gap-1.5 ${
      isActive
        ? 'text-red-600 dark:text-red-400 font-semibold'
        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
    }`;

  return (
    <>
      {/* 1. Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={closeMobileSidebar}
        />
      )}

      {/* 2. Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-[#0f0f0f] z-50 lg:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out border-r border-neutral-200 dark:border-neutral-800 flex flex-col p-3 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-4 pt-1 border-b border-neutral-200 dark:border-neutral-800">
          <Link
            to="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-1.5"
          >
            <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white">
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">
              MyTube
            </span>
          </Link>
          <button
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-3 space-y-1">
          <NavLink to="/" onClick={closeMobileSidebar} className={navClass}>
            <Home className="w-5 h-5" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/trending" onClick={closeMobileSidebar} className={navClass}>
            <Flame className="w-5 h-5 text-red-500" />
            <span>Trending</span>
          </NavLink>
          <NavLink to="/shorts" onClick={closeMobileSidebar} className={navClass}>
            <Compass className="w-5 h-5" />
            <span>Shorts</span>
          </NavLink>
          <NavLink to="/subscriptions" onClick={closeMobileSidebar} className={navClass}>
            <PlaySquare className="w-5 h-5" />
            <span>Subscriptions</span>
          </NavLink>
          <button
            onClick={() => {
              closeMobileSidebar();
              openGestureMode();
            }}
            className="w-full flex items-center gap-5 px-3 py-2.5 rounded-xl text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer group"
          >
            <Sparkles className="w-5 h-5 text-cyan-500 animate-pulse group-hover:scale-110 transition-transform" />
            <span>3D Gesture Mode</span>
          </button>

          <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

          <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            You
          </div>
          <NavLink to="/library" onClick={closeMobileSidebar} className={navClass}>
            <Film className="w-5 h-5" />
            <span>Library</span>
          </NavLink>
          <NavLink to="/history" onClick={closeMobileSidebar} className={navClass}>
            <History className="w-5 h-5" />
            <span>History</span>
          </NavLink>
          <NavLink to="/watch-later" onClick={closeMobileSidebar} className={navClass}>
            <Clock className="w-5 h-5" />
            <span>Watch Later</span>
          </NavLink>
          {customPlaylists.map((pl) => (
            <NavLink
              key={pl.id}
              to={`/playlist/${pl.id}`}
              onClick={closeMobileSidebar}
              className={navClass}
            >
              <ListVideo className="w-5 h-5 text-neutral-500" />
              <span className="truncate">{pl.title}</span>
            </NavLink>
          ))}

          <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

          <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Subscriptions
          </div>
          {SUBSCRIPTION_CHANNELS.map((ch) => (
            <Link
              key={ch.id}
              to="/subscriptions"
              onClick={closeMobileSidebar}
              className="flex items-center gap-4 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
            >
              <img
                src={ch.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              <span className="truncate flex-1">{ch.name}</span>
              {ch.hasNew && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </aside>

      {/* 3. Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-[#0f0f0f] border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 shrink-0 select-none overflow-y-auto ${
          isCollapsed ? 'w-20 px-1 py-2' : 'w-60 px-3 py-3'
        }`}
      >
        {isCollapsed ? (
          /* Mini Collapsed Sidebar */
          <div className="space-y-2">
            <NavLink to="/" className={miniNavClass} title="Home">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </NavLink>
            <NavLink to="/trending" className={miniNavClass} title="Trending">
              <Flame className="w-5 h-5 text-red-500" />
              <span>Trending</span>
            </NavLink>
            <NavLink to="/shorts" className={miniNavClass} title="Shorts">
              <Compass className="w-5 h-5" />
              <span>Shorts</span>
            </NavLink>
            <NavLink
              to="/subscriptions"
              className={miniNavClass}
              title="Subscriptions"
            >
              <PlaySquare className="w-5 h-5" />
              <span>Subs</span>
            </NavLink>
            <NavLink to="/library" className={miniNavClass} title="You">
              <Film className="w-5 h-5" />
              <span>You</span>
            </NavLink>
            <NavLink to="/history" className={miniNavClass} title="History">
              <History className="w-5 h-5" />
              <span>History</span>
            </NavLink>
            <button
              onClick={openGestureMode}
              className="w-full flex flex-col items-center justify-center py-3.5 px-1 rounded-xl text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors gap-1.5 cursor-pointer group"
              title="3D Holographic Gesture Mode"
            >
              <Sparkles className="w-5 h-5 text-cyan-500 animate-pulse group-hover:scale-110 transition-transform" />
              <span>Holo 3D</span>
            </button>
          </div>
        ) : (
          /* Expanded Full Sidebar */
          <div className="space-y-1 text-neutral-800 dark:text-neutral-200">
            {/* Primary Section */}
            <div className="space-y-0.5">
              <NavLink to="/" className={navClass}>
                <Home className="w-5 h-5" />
                <span>Home</span>
              </NavLink>
              <NavLink to="/shorts" className={navClass}>
                <Compass className="w-5 h-5" />
                <span>Shorts</span>
              </NavLink>
              <NavLink to="/subscriptions" className={navClass}>
                <PlaySquare className="w-5 h-5" />
                <span>Subscriptions</span>
              </NavLink>
              <button
                onClick={openGestureMode}
                className="w-full flex items-center gap-5 px-3 py-2.5 rounded-xl text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer group"
              >
                <Sparkles className="w-5 h-5 text-cyan-500 animate-pulse group-hover:scale-110 transition-transform" />
                <span>3D Gesture Mode</span>
              </button>
            </div>

            <div className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />

            {/* Library / User Section */}
            <div className="space-y-0.5">
              <Link
                to="/library"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-red-600 dark:hover:text-red-400 group"
              >
                <span>You</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <NavLink to="/library" className={navClass}>
                <Film className="w-5 h-5" />
                <span>Library</span>
              </NavLink>
              <NavLink to="/history" className={navClass}>
                <History className="w-5 h-5" />
                <span>History</span>
              </NavLink>
              <Link
                to="/watch-later"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <Clock className="w-5 h-5" />
                  <span>Watch Later</span>
                </div>
                <span className="text-xs text-neutral-400 font-normal">
                  {watchLaterVideos.length}
                </span>
              </Link>
              <Link
                to="/watch-later"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <ThumbsUp className="w-5 h-5" />
                  <span>Liked Videos</span>
                </div>
                <span className="text-xs text-neutral-400 font-normal">
                  {likedVideos.length}
                </span>
              </Link>
              {customPlaylists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                  title={pl.title}
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <ListVideo className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span className="truncate">{pl.title}</span>
                  </div>
                  <span className="text-xs text-neutral-400 font-normal shrink-0 ml-1">
                    {pl.videoIds.length}
                  </span>
                </Link>
              ))}
            </div>

            <div className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />

            {/* Unauthenticated Callout */}
            {!currentUser && (
              <>
                <div className="p-3 mx-1 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 my-1">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 leading-relaxed">
                    Sign in to like videos, comment, and subscribe.
                  </p>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                  >
                    <UserCircle2 className="w-4 h-4" />
                    <span>Sign in</span>
                  </button>
                </div>
                <div className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />
              </>
            )}

            {/* Subscriptions Channels */}
            <div>
              <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Subscriptions
              </div>
              <div className="space-y-0.5 mt-1">
                {SUBSCRIPTION_CHANNELS.map((ch) => (
                  <Link
                    key={ch.id}
                    to="/subscriptions"
                    className="flex items-center gap-4 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <img
                      src={ch.avatar}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="truncate flex-1">{ch.name}</span>
                    {ch.hasNew && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />

            {/* Explore Section */}
            <div>
              <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Explore
              </div>
              <div className="space-y-0.5 mt-1">
                <NavLink
                  to="/trending"
                  className={navClass}
                >
                  <Flame className="w-5 h-5 text-red-500" />
                  <span>Trending</span>
                </NavLink>
                <Link
                  to="/"
                  className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <Music2 className="w-5 h-5 text-amber-500" />
                  <span>Music</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <Gamepad2 className="w-5 h-5 text-emerald-500" />
                  <span>Gaming</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <Trophy className="w-5 h-5 text-blue-500" />
                  <span>Cricket & Sports</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <Film className="w-5 h-5 text-purple-500" />
                  <span>Movies</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                >
                  <Newspaper className="w-5 h-5 text-teal-500" />
                  <span>News</span>
                </Link>
              </div>
            </div>

            <div className="my-2.5 border-t border-neutral-200 dark:border-neutral-800" />

            {/* Settings & Help */}
            <div className="space-y-0.5">
              <button
                onClick={openSettingsModal}
                className="w-full flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
              >
                <Settings className="w-5 h-5 text-neutral-500" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => alert('MyTube Help: Step 1 Project Foundation Active')}
                className="w-full flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-neutral-500" />
                <span>Help</span>
              </button>
              <button
                onClick={() => alert('Send Feedback: Everything working smoothly!')}
                className="w-full flex items-center gap-5 px-3 py-2 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
              >
                <MessageSquareWarning className="w-5 h-5 text-neutral-500" />
                <span>Send Feedback</span>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-4 px-3 text-[11px] text-neutral-400 dark:text-neutral-500 space-y-2">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span>About</span>
                <span>Press</span>
                <span>Copyright</span>
                <span>Contact</span>
                <span>Creators</span>
                <span>Developers</span>
              </div>
              <p>© 2026 MyTube LLC</p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
