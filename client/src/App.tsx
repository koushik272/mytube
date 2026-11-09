import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Toast } from './components/common/Toast';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { TrendingPage } from './pages/TrendingPage';
import { ShortsPage } from './pages/ShortsPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LibraryPage } from './pages/LibraryPage';
import { WatchPage } from './pages/WatchPage';
import { SearchPage } from './pages/SearchPage';
import { ChannelPage } from './pages/ChannelPage';
import { WatchLaterPage } from './pages/WatchLaterPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { Miniplayer } from './components/video/Miniplayer';
import { SaveToPlaylistModal } from './components/playlist/SaveToPlaylistModal';
import { WatchSettingsModal } from './components/settings/WatchSettingsModal';
import { useGestureMode } from './context/GestureModeContext';
import { useVideo } from './context/VideoContext';
import { HolographicGestureMode } from './components/gesture/HolographicGestureMode';

export const App: React.FC = () => {
  const navigate = useNavigate();
  const { isGestureModeActive, closeGestureMode } = useGestureMode();
  const { activeVideo, playVideo, likedVideos, toggleLike } = useVideo();
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [volume, setVolume] = React.useState(100);

  const handleSelectVideo = (video: any) => {
    playVideo(video);
    navigate(`/watch/${video.id}`);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    window.dispatchEvent(new CustomEvent('mytube:player-action', { detail: { action: 'play' } }));
  };

  const handlePause = () => {
    setIsPlaying(false);
    window.dispatchEvent(new CustomEvent('mytube:player-action', { detail: { action: 'pause' } }));
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    window.dispatchEvent(new CustomEvent('mytube:player-action', { detail: { action: 'volume', volume: newVol } }));
  };

  const handleToggleFullscreen = () => {
    window.dispatchEvent(new CustomEvent('mytube:player-action', { detail: { action: 'fullscreen' } }));
  };

  const handleNext = () => {
    window.dispatchEvent(new CustomEvent('mytube:player-action', { detail: { action: 'next' } }));
  };

  const isLiked = activeVideo ? likedVideos.includes(activeVideo.id) : false;
  const handleLike = () => {
    if (activeVideo) {
      toggleLike(activeVideo.id);
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f9] dark:bg-[#0f0f0f] text-[#0f0f0f] dark:text-[#f1f1f1] transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-x-hidden">
        {/* Left Sidebar (Desktop & Mobile Drawer) */}
        <Sidebar />

        {/* Center Main Scrollable Area */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/shorts" element={<ShortsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/watch-later" element={<WatchLaterPage />} />
            <Route path="/channel/:id" element={<ChannelPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Persistent Miniplayer (Floating Picture-in-Picture experience) */}
      <Miniplayer />

      {/* Save to Custom Playlist Modal Dialog */}
      <SaveToPlaylistModal />

      {/* User Watch Settings & Preferences Modal Dialog */}
      <WatchSettingsModal />

      {/* Firebase Authentication Modal Dialog */}
      <AuthModal />

      {/* Global Interactive Notification Toast */}
      <Toast />

      {/* 3D Holographic Gesture Mode Experience Overlay */}
      <HolographicGestureMode
        isOpen={isGestureModeActive}
        onClose={closeGestureMode}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onToggleFullscreen={handleToggleFullscreen}
        onLike={handleLike}
        isLiked={isLiked}
        videoTitle={activeVideo?.title || 'MyTube 3D Holographic Space'}
        onSelectVideo={handleSelectVideo}
      />
    </div>
  );
};

export default App;
