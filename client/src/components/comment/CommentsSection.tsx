// client/src/components/comment/CommentsSection.tsx - Interactive Real-time Comments & Replies Engine

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { VideoComment } from '../../types/interaction';
import {
  subscribeToComments,
  addCommentInFirestore,
  updateCommentInFirestore,
  deleteCommentInFirestore,
  toggleCommentLikeInFirestore,
} from '../../firebase/firestore';

interface CommentsSectionProps {
  videoId: string;
  videoTitle?: string;
  commentsCountFallback?: number;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  videoId,
  videoTitle = 'Video',
  commentsCountFallback = 0,
}) => {
  const { currentUser, userProfile, openAuthModal, requireAuth } = useAuth();
  const { sendNotification } = useNotifications();

  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Replying state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Editing state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Expanded replies state
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Active kebab menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Subscribe to real-time comments on videoId change
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToComments(videoId, (items) => {
      setComments(items);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [videoId]);

  // Click outside to close menus
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      return `${months}mo ago`;
    } catch {
      return 'Recently';
    }
  };

  // Separate top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParentId: Record<string, VideoComment[]> = {};
  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesByParentId[c.parentId]) {
        repliesByParentId[c.parentId] = [];
      }
      repliesByParentId[c.parentId].push(c);
    }
  });

  // Sort top-level comments
  const sortedTopComments = [...topLevelComments].sort((a, b) => {
    if (sortBy === 'top') {
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Handle post new comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    requireAuth(async () => {
      setIsSubmitting(true);
      try {
        await addCommentInFirestore({
          videoId,
          userId: currentUser?.uid || 'user-guest',
          authorName: userProfile?.displayName || 'MyTube User',
          authorHandle: userProfile?.handle || '@user',
          authorAvatar:
            userProfile?.photoURL ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              userProfile?.displayName || 'User'
            )}`,
          text: newCommentText.trim(),
          parentId: null,
        });
        setNewCommentText('');
      } catch (err) {
        console.error('Error adding comment:', err);
      } finally {
        setIsSubmitting(false);
      }
    }, 'Sign in to join the conversation and comment on videos');
  };

  // Handle reply submit
  const handlePostReply = async (parentComment: VideoComment) => {
    if (!replyText.trim()) return;

    requireAuth(async () => {
      setIsSubmitting(true);
      try {
        await addCommentInFirestore({
          videoId,
          userId: currentUser?.uid || 'user-guest',
          authorName: userProfile?.displayName || 'MyTube User',
          authorHandle: userProfile?.handle || '@user',
          authorAvatar:
            userProfile?.photoURL ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              userProfile?.displayName || 'User'
            )}`,
          text: replyText.trim(),
          parentId: parentComment.id,
        });

        // Auto-expand replies thread
        setExpandedReplies((prev) => ({ ...prev, [parentComment.id]: true }));

        // Notify parent comment author if they are not the same user
        if (parentComment.userId && parentComment.userId !== currentUser?.uid) {
          sendNotification({
            userId: parentComment.userId,
            type: 'reply',
            title: 'New Reply to Your Comment',
            message: `${userProfile?.displayName || 'A user'} replied: "${replyText.slice(0, 60)}${
              replyText.length > 60 ? '...' : ''
            }"`,
            avatar:
              userProfile?.photoURL ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                userProfile?.displayName || 'User'
              )}`,
            link: `/watch/${videoId}`,
          });
        }

        setReplyText('');
        setReplyingToId(null);
      } catch (err) {
        console.error('Error posting reply:', err);
      } finally {
        setIsSubmitting(false);
      }
    }, 'Sign in to reply to comments');
  };

  // Handle edit comment
  const handleSaveEdit = async (comment: VideoComment) => {
    if (!editText.trim()) return;
    try {
      await updateCommentInFirestore(
        videoId,
        comment.id,
        editText.trim(),
        currentUser?.uid || ''
      );
      setEditingCommentId(null);
      setEditText('');
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Delete this comment permanently?')) {
      try {
        await deleteCommentInFirestore(videoId, commentId, currentUser?.uid || '');
      } catch (err) {
        console.error('Error deleting comment:', err);
      }
    }
  };

  // Handle like toggle on comment
  const handleLikeComment = async (commentId: string) => {
    requireAuth(async () => {
      await toggleCommentLikeInFirestore(
        videoId,
        commentId,
        currentUser?.uid || 'guest'
      );
    }, 'Sign in to like comments');
  };

  const toggleRepliesExpand = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const totalCommentsDisplay =
    comments.length > 0 ? comments.length : commentsCountFallback;

  return (
    <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6">
      {/* Header with count and Sort Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-600" />
            <span>{totalCommentsDisplay} Comments</span>
          </h2>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-1 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
          <button
            onClick={() => setSortBy('top')}
            className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              sortBy === 'top'
                ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white shadow-xs font-bold'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Top comments
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              sortBy === 'newest'
                ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-white shadow-xs font-bold'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Newest first
          </button>
        </div>
      </div>

      {/* Main Comment Input Box */}
      <form onSubmit={handlePostComment} className="flex gap-3 mb-8">
        <img
          src={
            userProfile?.photoURL ||
            'https://api.dicebear.com/7.x/initials/svg?seed=Guest'
          }
          alt={userProfile?.displayName || 'User'}
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-neutral-300 dark:ring-neutral-700"
        />
        <div className="flex-1">
          <textarea
            rows={2}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onFocus={() => {
              if (!currentUser) {
                openAuthModal('login');
              }
            }}
            placeholder="Add a comment..."
            className="w-full bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-red-600 dark:focus:border-red-500 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none transition-colors resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            {newCommentText.trim() && (
              <button
                type="button"
                onClick={() => setNewCommentText('')}
                className="px-4 py-1.5 text-xs font-semibold rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmitting}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                newCommentText.trim() && !isSubmitting
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 py-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && comments.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-[#161616] rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <MessageSquare className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No comments yet
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Be the first to share your thoughts on this video!
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {sortedTopComments.map((comment) => {
          const isAuthor = currentUser?.uid === comment.userId;
          const replies = repliesByParentId[comment.id] || [];
          const areRepliesOpen = !!expandedReplies[comment.id];
          const isReplying = replyingToId === comment.id;
          const isEditing = editingCommentId === comment.id;

          return (
            <div key={comment.id} className="group flex gap-3 items-start">
              {/* User Avatar */}
              <img
                src={comment.authorAvatar}
                alt={comment.authorName}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-neutral-200 dark:ring-neutral-800 mt-0.5"
              />

              <div className="flex-1 min-w-0">
                {/* Author Name, Handle & Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {comment.authorName}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                      {comment.authorHandle}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      • {formatRelativeTime(comment.createdAt)}
                    </span>
                    {comment.isEdited && (
                      <span className="text-[10px] text-neutral-400 italic">
                        (edited)
                      </span>
                    )}
                  </div>

                  {/* Kebab menu for Edit / Delete */}
                  {isAuthor && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === comment.id ? null : comment.id
                          );
                        }}
                        className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === comment.id && (
                        <div className="absolute right-0 top-6 w-28 bg-white dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditText(comment.text);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-left cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteComment(comment.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment Text or Inline Edit Form */}
                {isEditing ? (
                  <div className="mt-2">
                    <textarea
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="px-3 py-1 text-xs font-semibold rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment)}
                        className="px-4 py-1 text-xs font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-wrap leading-relaxed">
                    {comment.text}
                  </p>
                )}

                {/* Comment Actions: Like, Dislike, Reply */}
                <div className="flex items-center gap-4 mt-2 text-neutral-600 dark:text-neutral-400 text-xs">
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1.5 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{comment.likesCount > 0 ? comment.likesCount : ''}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (replyingToId === comment.id) {
                        setReplyingToId(null);
                      } else {
                        setReplyingToId(comment.id);
                        setReplyText('');
                      }
                    }}
                    className="font-semibold hover:text-neutral-900 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Reply
                  </button>
                </div>

                {/* Inline Reply Input */}
                {isReplying && (
                  <div className="flex gap-2.5 mt-3 pl-2 sm:pl-4 border-l-2 border-red-500">
                    <img
                      src={
                        userProfile?.photoURL ||
                        'https://api.dicebear.com/7.x/initials/svg?seed=Guest'
                      }
                      alt=""
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.authorName}...`}
                        autoFocus
                        className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:border-red-600 py-1 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1 text-xs rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePostReply(comment)}
                          disabled={!replyText.trim() || isSubmitting}
                          className="px-4 py-1 text-xs font-semibold rounded-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replies Thread Toggle */}
                {replies.length > 0 && (
                  <div className="mt-2.5">
                    <button
                      onClick={() => toggleRepliesExpand(comment.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      {areRepliesOpen ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Hide {replies.length} replies</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>View {replies.length} replies</span>
                        </>
                      )}
                    </button>

                    {/* Replies List */}
                    {areRepliesOpen && (
                      <div className="mt-3 space-y-3 pl-3 sm:pl-6 border-l-2 border-neutral-200 dark:border-neutral-800">
                        {replies.map((reply) => {
                          const isReplyAuthor = currentUser?.uid === reply.userId;
                          const isEditingReply = editingCommentId === reply.id;

                          return (
                            <div key={reply.id} className="flex gap-2.5 items-start">
                              <img
                                src={reply.authorAvatar}
                                alt={reply.authorName}
                                className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                      {reply.authorName}
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      {reply.authorHandle}
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      • {formatRelativeTime(reply.createdAt)}
                                    </span>
                                  </div>

                                  {isReplyAuthor && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-neutral-400 hover:text-red-500 rounded"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 leading-relaxed">
                                  {reply.text}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
