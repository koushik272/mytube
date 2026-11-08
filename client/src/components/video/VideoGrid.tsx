import React from 'react';
import { Video } from '../../types/video';
import { VideoCard } from './VideoCard';
import { VideoOff, RotateCcw } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';

interface VideoGridProps {
  videos: Video[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  const { setCurrentCategory, setSearchQuery } = useVideo();

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
          <VideoOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          No videos found
        </h3>
        <p className="text-sm text-neutral-500 max-w-sm mt-1 mb-6">
          Try different keywords or browse other categories to discover great content.
        </p>
        <button
          onClick={() => {
            setCurrentCategory('All');
            setSearchQuery('');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Filters</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-7 p-3 sm:p-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};
