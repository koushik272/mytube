// client/src/pages/GesturePage.tsx - Dedicated 3D Holographic Gesture Experience Route

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '../context/VideoContext';
import { HolographicGestureMode } from '../components/gesture/HolographicGestureMode';
import { Video } from '../types/video';

export const GesturePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeVideo, playVideo, likedVideos, toggleLike } = useVideo();
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [volume, setVolume] = React.useState(100);

  const handleSelectVideo = (video: Video) => {
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
    <div className="w-full h-full min-h-[calc(100vh-56px)] flex flex-col bg-black">
      <HolographicGestureMode
        isOpen={true}
        onClose={() => navigate('/')}
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

export default GesturePage;
