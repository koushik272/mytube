import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ListVideo,
  Play,
  Share2,
  Trash2,
  Edit3,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Film,
} from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { getYouTubeVideoById, getYouTubePlaylist } from '../services/youtubeApi';
import { Video, CustomPlaylist } from '../types/video';
import { formatViews } from '../utils/formatters';

export const PlaylistPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    customPlaylists,
    updatePlaylist,
    deletePlaylist,
    removeVideoFromPlaylist,
    videos,
    playVideo,
    showToast,
  } = useVideo();
  const { currentUser } = useAuth();

  const [playlistVideos, setPlaylistVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit form state
  const customPl = customPlaylists.find((p) => p.id === id);
  const [editTitle, setEditTitle] = useState(customPl?.title || '');
  const [editDesc, setEditDesc] = useState(customPl?.description || '');
  const [editIsPrivate, setEditIsPrivate] = useState(customPl?.isPrivate || false);

  useEffect(() => {
    if (customPl) {
      setEditTitle(customPl.title);
      setEditDesc(customPl.description);
      setEditIsPrivate(customPl.isPrivate);
    }
  }, [customPl]);

  // Load videos in this playlist
  useEffect(() => {
    let isMounted = true;
    async function loadVideos() {
      setIsLoading(true);

      // 1. If it's a custom playlist
      if (customPl) {
        const resolved: Video[] = [];
        for (const vId of customPl.videoIds) {
          const inMem = videos.find((v) => v.id === vId);
          if (inMem) {
            resolved.push(inMem);
          } else {
            const fetched = await getYouTubeVideoById(vId);
            if (fetched) resolved.push(fetched);
          }
        }
        if (isMounted) setPlaylistVideos(resolved);
      } else if (id) {
        // 2. Fetch public YouTube playlist
        const ytPl = await getYouTubePlaylist(id);
        if (isMounted && ytPl && Array.isArray(ytPl.items)) {
          setPlaylistVideos(ytPl.items);
        }
      }

      if (isMounted) setIsLoading(false);
    }

    loadVideos();

    return () => {
      isMounted = false;
    };
  }, [id, customPl, videos]);

  const handlePlayAll = () => {
    if (playlistVideos.length > 0) {
      playVideo(playlistVideos[0]);
      navigate(`/watch/${playlistVideos[0].id}?list=${id}`);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Playlist link copied to clipboard! 📋');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    await updatePlaylist(id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      isPrivate: editIsPrivate,
    });
    setIsEditModalOpen(false);
  };

  const handleDelete = async () => {
    await deletePlaylist(id);
    setIsDeleteModalOpen(false);
    navigate('/library');
  };

  const playlistTitle = customPl?.title || 'YouTube Playlist';
  const playlistDesc = customPl?.description || 'Curated video playlist';
  const isOwner = customPl ? customPl.ownerUid === currentUser?.uid || customPl.ownerUid === 'guest' : false;

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)] pb-24 lg:pb-8">
      {/* Left Sidebar: Playlist Header Card */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-gradient-to-b from-red-950/40 via-neutral-900/60 to-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4 text-white sticky top-20">
          {/* Cover image */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-800 shadow-md">
            {playlistVideos.length > 0 ? (
              <img
                src={playlistVideos[0].thumbnailUrl}
                alt={playlistTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-red-950/50">
                <ListVideo className="w-12 h-12 text-red-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <ListVideo className="w-8 h-8 text-white/80" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              {customPl?.isPrivate ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-neutral-300">
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-neutral-300">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </span>
              )}
            </div>

            <h1 className="text-xl font-extrabold tracking-tight leading-snug">
              {playlistTitle}
            </h1>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              {playlistDesc}
            </p>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-2">
              <span>{playlistVideos.length} videos</span>
              <span>•</span>
              <span>Updated recently</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handlePlayAll}
              disabled={playlistVideos.length === 0}
              className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Play All</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex-1 py-2 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              {customPl && isOwner && (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Edit Playlist"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-2 rounded-full bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    title="Delete Playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Content: Videos List */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-neutral-500">Loading playlist videos...</p>
          </div>
        ) : playlistVideos.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#161616] rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-xs">
            <ListVideo className="w-14 h-14 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              This playlist has no videos yet
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6 max-w-sm mx-auto leading-relaxed">
              Browse videos and click "Save to playlist" on any video to add it here.
            </p>
            <Link
              to="/"
              className="inline-block px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors shadow-md"
            >
              Browse Videos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {playlistVideos.map((video, idx) => (
              <div
                key={video.id + '_' + idx}
                className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors group relative bg-white dark:bg-[#161616] sm:bg-transparent sm:dark:bg-transparent border border-neutral-200 dark:border-neutral-800 sm:border-0"
              >
                {/* Track Number */}
                <span className="w-5 text-center font-mono text-xs text-neutral-400 font-semibold shrink-0">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <Link
                  to={`/watch/${video.id}?list=${id}`}
                  onClick={() => playVideo(video)}
                  className="relative aspect-video w-36 sm:w-48 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 shadow-xs"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-[10px] font-semibold rounded">
                    {video.duration}
                  </span>
                </Link>

                {/* Metadata */}
                <div className="flex-1 min-w-0 pr-8">
                  <Link
                    to={`/watch/${video.id}?list=${id}`}
                    onClick={() => playVideo(video)}
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {video.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <Link
                      to={`/channel/${encodeURIComponent(video.channel.name)}`}
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>{video.channel.name}</span>
                      {video.channel.verified && (
                        <CheckCircle2 className="w-3 h-3 text-neutral-400" />
                      )}
                    </Link>
                    <span>•</span>
                    <span>{formatViews(video.views)} views</span>
                  </div>
                </div>

                {/* Remove from playlist action (for custom playlist owners) */}
                {customPl && isOwner && (
                  <button
                    onClick={() => removeVideoFromPlaylist(id, video.id)}
                    className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Playlist Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
              Edit playlist
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Privacy
                </label>
                <select
                  value={editIsPrivate ? 'private' : 'public'}
                  onChange={(e) => setEditIsPrivate(e.target.value === 'private')}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Playlist Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Delete playlist?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete "{playlistTitle}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
