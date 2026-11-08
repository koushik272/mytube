import React, { useState } from 'react';
import {
  X,
  Plus,
  Lock,
  Globe,
  Check,
  ListPlus,
  FolderPlus,
} from 'lucide-react';
import { useVideo } from '../../context/VideoContext';

export const SaveToPlaylistModal: React.FC = () => {
  const {
    isSaveModalOpen,
    videoToSave,
    closeSaveModal,
    customPlaylists,
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
  } = useVideo();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isSaveModalOpen || !videoToSave) return null;

  const handleTogglePlaylist = (playlistId: string, isChecked: boolean) => {
    if (isChecked) {
      removeVideoFromPlaylist(playlistId, videoToSave.id);
    } else {
      addVideoToPlaylist(playlistId, videoToSave.id);
    }
  };

  const handleCreateNewPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPl = await createPlaylist(newTitle.trim(), newDescription.trim(), isPrivate);
    // Automatically add this video to the newly created playlist
    await addVideoToPlaylist(newPl.id, videoToSave.id);

    setNewTitle('');
    setNewDescription('');
    setIsPrivate(false);
    setIsCreatingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
              Save video to...
            </h3>
          </div>
          <button
            onClick={closeSaveModal}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview Badge */}
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
          <img
            src={videoToSave.thumbnailUrl}
            alt=""
            className="w-14 h-9 rounded-lg object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {videoToSave.title}
            </p>
            <p className="text-[10px] text-neutral-500 truncate">
              {videoToSave.channel.name}
            </p>
          </div>
        </div>

        {/* Existing Playlists Checklist */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {customPlaylists.map((pl) => {
            const isChecked = pl.videoIds.includes(videoToSave.id);
            return (
              <label
                key={pl.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isChecked
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'border-neutral-400 dark:border-neutral-600'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block truncate">
                      {pl.title}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {pl.videoIds.length} videos
                    </span>
                  </div>
                </div>

                {pl.isPrivate ? (
                  <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}

                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTogglePlaylist(pl.id, isChecked)}
                  className="hidden"
                />
              </label>
            );
          })}
        </div>

        {/* Create New Playlist Form Toggle */}
        {!isCreatingNew ? (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold text-red-600 dark:text-red-400 transition-colors cursor-pointer border border-dashed border-red-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create new playlist</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateNewPlaylist}
            className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-3 animate-in fade-in duration-150"
          >
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter playlist title..."
                autoFocus
                className="w-full px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Privacy
              </label>
              <select
                value={isPrivate ? 'private' : 'public'}
                onChange={(e) => setIsPrivate(e.target.value === 'private')}
                className="w-full px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
              >
                <option value="public">Public (Anyone can view)</option>
                <option value="private">Private (Only you can view)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
