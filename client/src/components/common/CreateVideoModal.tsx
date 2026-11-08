import React, { useState } from 'react';
import { X, UploadCloud, Video as VideoIcon, CheckCircle2 } from 'lucide-react';
import { useVideo } from '../../context/VideoContext';
import { CATEGORIES } from '../../data/categories';
import { Category } from '../../types/video';

interface CreateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateVideoModal: React.FC<CreateVideoModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useVideo();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Education');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      if (!title) {
        setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a video title');
      return;
    }

    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setTitle('');
          setDescription('');
          setFileName(null);
          showToast(`Video "${title}" uploaded successfully! 🚀`);
          onClose();
        }, 500);
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Upload Video to MyTube
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dropzone */}
          <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-red-500 dark:hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50 dark:bg-neutral-800/40">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <UploadCloud className="w-10 h-10 text-neutral-400 dark:text-neutral-500 mb-2" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {fileName ? fileName : 'Select or drag & drop a video file'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">MP4, WebM, or MKV up to 500MB</p>
          </label>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Title (required)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass on React 19 Architecture"
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              disabled={isUploading}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
              disabled={isUploading}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
              disabled={isUploading}
            />
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
                <span>Uploading video...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 text-sm font-medium rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                'Publishing...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Publish Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
