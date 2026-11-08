import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Maximize2,
  Play,
  Pause,
  ExternalLink,
  Volume2,
  VolumeX,
  Pipette,
} from 'lucide-react';
import { useVideo } from '../../context/VideoContext';

export const Miniplayer: React.FC = () => {
  const { isMiniplayerOpen, miniplayerVideo, closeMiniplayer, showToast } = useVideo();
  const navigate = useNavigate();
  const location = useLocation();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  // If miniplayer is not active or user is currently on the watch page of this video, do not display miniplayer
  if (!isMiniplayerOpen || !miniplayerVideo) return null;
  if (location.pathname === `/watch/${miniplayerVideo.id}`) return null;

  const handleMaximize = () => {
    navigate(`/watch/${miniplayerVideo.id}`);
  };

  const handlePictureInPicture = async () => {
    try {
      if ('pictureInPictureEnabled' in document) {
        showToast('Tip: Use YouTube player fullscreen or PiP menu for floating playback 🪟');
      } else {
        showToast('Picture-in-Picture is not supported by your browser.');
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-72 sm:w-88 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
      {/* Video Viewport Container */}
      <div className="relative aspect-video w-full bg-black group">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${miniplayerVideo.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
            window.location.origin
          )}&mute=${isMuted ? '1' : '0'}&rel=0`}
          title={miniplayerVideo.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />

        {/* Top Floating Control Bar */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity z-10">
          {/* Picture in picture hint */}
          <button
            onClick={handlePictureInPicture}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-xs transition-colors cursor-pointer"
            title="Picture-in-Picture options"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Maximize to Watch Page */}
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-xs transition-colors cursor-pointer"
            title="Expand to Watch Page"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close Miniplayer */}
          <button
            onClick={closeMiniplayer}
            className="p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs backdrop-blur-xs transition-colors cursor-pointer"
            title="Close Miniplayer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Info Bar */}
      <div
        onClick={handleMaximize}
        className="p-3 bg-neutral-900 hover:bg-neutral-800/80 transition-colors cursor-pointer flex items-center justify-between gap-3 text-white"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate leading-snug">
            {miniplayerVideo.title}
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            {miniplayerVideo.channel.name}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMaximize();
          }}
          className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shrink-0 transition-colors"
          title="Expand"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
