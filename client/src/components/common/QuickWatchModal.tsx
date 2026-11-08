import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Link as LinkIcon, PlaySquare } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';

interface QuickWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickWatchModal: React.FC<QuickWatchModalProps> = ({ isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState('');
  const navigate = useNavigate();
  const { showToast } = useVideo();

  if (!isOpen) return null;

  // Extracts YouTube 11-char video ID from various link formats
  const extractVideoId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);

    return match && match[2].length === 11 ? match[2] : null;
  };

  const handlePlay = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(urlInput);

    if (videoId) {
      showToast(`Loading YouTube Video (${videoId})...`);
      navigate(`/watch/${videoId}`);
      setUrlInput('');
      onClose();
    } else {
      showToast('Please enter a valid YouTube video URL or 11-character video ID');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#212121] rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
              Watch Any YouTube Video
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePlay} className="mt-4 space-y-4">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Paste any YouTube URL or 11-character Video ID to play it with original audio inside MyTube:
          </p>

          <div className="relative flex items-center">
            <LinkIcon className="absolute left-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161616] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Video</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
