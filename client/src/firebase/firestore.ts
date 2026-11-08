import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, isFirebaseConfigured } from './config';
import { UserProfile } from '../types/user';
import { HistoryItem, CustomPlaylist } from '../types/video';
import {
  VideoComment,
  VideoReaction,
  ReactionType,
  VideoReactionStats,
  UserNotification,
} from '../types/interaction';

/**
 * Generate a clean, unique channel handle from display name or email.
 * E.g., "John Doe" -> "@johndoe42"
 */
export function generateUniqueHandle(baseName: string): string {
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);

  const prefix = sanitized || 'user';
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `@${prefix}${randomSuffix}`;
}

/**
 * Creates or retrieves user profile document in Firestore collection `users/{uid}`.
 */
export async function createOrGetUserProfile(
  user: User,
  customDisplayName?: string
): Promise<UserProfile> {
  const displayName =
    customDisplayName ||
    user.displayName ||
    (user.email ? user.email.split('@')[0] : 'MyTube Creator');

  const defaultPhoto =
    user.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      displayName
    )}&backgroundColor=e50914,2563eb,059669`;

  // Local/offline fallback storage key
  const localKey = `mytube_profile_${user.uid}`;

  // If Firebase is configured and Firestore is available
  if (isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        localStorage.setItem(localKey, JSON.stringify(data));
        return data;
      } else {
        const handle = generateUniqueHandle(displayName);
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName,
          photoURL: defaultPhoto,
          handle,
          subscribersCount: 0,
          createdAt: new Date().toISOString(),
          likedVideos: ['vid-1', 'vid-3'],
          watchLaterVideos: ['vid-2'],
          subscribedChannels: ['ch-blender', 'ch-cricket'],
        };

        await setDoc(userRef, newProfile);
        localStorage.setItem(localKey, JSON.stringify(newProfile));
        return newProfile;
      }
    } catch (err) {
      console.warn('Firestore read/write failed, using local fallback:', err);
    }
  }

  // Fallback to local storage persistence for offline/testing mode
  const cached = localStorage.getItem(localKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  const fallbackProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: defaultPhoto,
    handle: generateUniqueHandle(displayName),
    subscribersCount: 0,
    createdAt: new Date().toISOString(),
    likedVideos: ['vid-1', 'vid-3'],
    watchLaterVideos: ['vid-2'],
    subscribedChannels: ['ch-blender', 'ch-cricket'],
  };
  localStorage.setItem(localKey, JSON.stringify(fallbackProfile));
  return fallbackProfile;
}

/**
 * Update user preferences (liked videos, watch later, subscribed channels, isHistoryPaused) in Firestore
 */
export async function syncUserPreferencesToFirestore(
  uid: string,
  preferences: Partial<Pick<UserProfile, 'likedVideos' | 'watchLaterVideos' | 'subscribedChannels' | 'isHistoryPaused'>>
): Promise<void> {
  const localKey = `mytube_profile_${uid}`;
  const cached = localStorage.getItem(localKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      const updated = { ...parsed, ...preferences };
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  if (isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, preferences);
    } catch (err) {
      console.warn('Failed to sync preferences to Firestore:', err);
    }
  }
}

/**
 * Saves a watched video to user's history collection in Firestore and localStorage
 */
export async function saveWatchHistoryItemToFirestore(
  uid: string,
  item: HistoryItem
): Promise<void> {
  const localKey = `mytube_history_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    const existing: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((h) => h.id !== item.id);
    const updated = [item, ...filtered].slice(0, 50);
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const itemRef = doc(db, 'users', uid, 'watchHistory', item.id);
      await setDoc(itemRef, item);
    } catch (err) {
      console.warn('Failed to save history to Firestore:', err);
    }
  }
}

/**
 * Removes a single video from user's history in Firestore and localStorage
 */
export async function removeWatchHistoryItemFromFirestore(
  uid: string,
  videoId: string
): Promise<void> {
  const localKey = `mytube_history_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: HistoryItem[] = JSON.parse(raw);
      const filtered = existing.filter((h) => h.id !== videoId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const itemRef = doc(db, 'users', uid, 'watchHistory', videoId);
      await deleteDoc(itemRef);
    } catch (err) {
      console.warn('Failed to delete history item from Firestore:', err);
    }
  }
}

/**
 * Clears all watch history for user in Firestore and localStorage
 */
export async function clearWatchHistoryInFirestore(uid: string): Promise<void> {
  const localKey = `mytube_history_${uid}`;
  localStorage.removeItem(localKey);

  if (isFirebaseConfigured() && db) {
    try {
      const historyCol = collection(db, 'users', uid, 'watchHistory');
      const snap = await getDocs(historyCol);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn('Failed to clear history in Firestore:', err);
    }
  }
}

/**
 * Fetches user's watch history from Firestore (with localStorage fallback)
 */
export async function getWatchHistoryFromFirestore(uid: string): Promise<HistoryItem[]> {
  const localKey = `mytube_history_${uid}`;
  let localList: HistoryItem[] = [];
  try {
    const localData = localStorage.getItem(localKey);
    localList = localData ? JSON.parse(localData) : [];
  } catch {
    localList = [];
  }

  if (isFirebaseConfigured() && db) {
    try {
      const historyCol = collection(db, 'users', uid, 'watchHistory');
      const q = query(historyCol, orderBy('watchedAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as HistoryItem);
        localStorage.setItem(localKey, JSON.stringify(items));
        return items;
      }
    } catch (err) {
      console.warn('Failed to get history from Firestore:', err);
    }
  }

  return localList;
}

/**
 * Creates a custom playlist in Firestore & localStorage
 */
export async function createCustomPlaylistInFirestore(
  uid: string,
  data: Omit<CustomPlaylist, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomPlaylist> {
  const playlistId = 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();
  const newPlaylist: CustomPlaylist = {
    ...data,
    id: playlistId,
    createdAt: now,
    updatedAt: now,
  };

  const localKey = `mytube_playlists_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    const existing: CustomPlaylist[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(localKey, JSON.stringify([newPlaylist, ...existing]));
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plRef = doc(db, 'users', uid, 'customPlaylists', playlistId);
      await setDoc(plRef, newPlaylist);
    } catch (err) {
      console.warn('Failed to save custom playlist in Firestore:', err);
    }
  }

  return newPlaylist;
}

/**
 * Updates a custom playlist in Firestore & localStorage
 */
export async function updateCustomPlaylistInFirestore(
  uid: string,
  playlistId: string,
  updates: Partial<CustomPlaylist>
): Promise<void> {
  const localKey = `mytube_playlists_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: CustomPlaylist[] = JSON.parse(raw);
      const updated = existing.map((pl) =>
        pl.id === playlistId ? { ...pl, ...updates, updatedAt: new Date().toISOString() } : pl
      );
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plRef = doc(db, 'users', uid, 'customPlaylists', playlistId);
      await updateDoc(plRef, { ...updates, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn('Failed to update playlist in Firestore:', err);
    }
  }
}

/**
 * Deletes a custom playlist in Firestore & localStorage
 */
export async function deleteCustomPlaylistInFirestore(
  uid: string,
  playlistId: string
): Promise<void> {
  const localKey = `mytube_playlists_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: CustomPlaylist[] = JSON.parse(raw);
      const updated = existing.filter((pl) => pl.id !== playlistId);
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plRef = doc(db, 'users', uid, 'customPlaylists', playlistId);
      await deleteDoc(plRef);
    } catch (err) {
      console.warn('Failed to delete playlist in Firestore:', err);
    }
  }
}

/**
 * Adds a video to a custom playlist
 */
export async function addVideoToCustomPlaylistInFirestore(
  uid: string,
  playlistId: string,
  videoId: string
): Promise<void> {
  const localKey = `mytube_playlists_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: CustomPlaylist[] = JSON.parse(raw);
      const updated = existing.map((pl) => {
        if (pl.id === playlistId && !pl.videoIds.includes(videoId)) {
          return {
            ...pl,
            videoIds: [...pl.videoIds, videoId],
            updatedAt: new Date().toISOString(),
          };
        }
        return pl;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plRef = doc(db, 'users', uid, 'customPlaylists', playlistId);
      const snap = await getDoc(plRef);
      if (snap.exists()) {
        const pl = snap.data() as CustomPlaylist;
        if (!pl.videoIds.includes(videoId)) {
          await updateDoc(plRef, {
            videoIds: [...pl.videoIds, videoId],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('Failed to add video to playlist in Firestore:', err);
    }
  }
}

/**
 * Removes a video from a custom playlist
 */
export async function removeVideoFromCustomPlaylistInFirestore(
  uid: string,
  playlistId: string,
  videoId: string
): Promise<void> {
  const localKey = `mytube_playlists_${uid}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: CustomPlaylist[] = JSON.parse(raw);
      const updated = existing.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            videoIds: pl.videoIds.filter((vId) => vId !== videoId),
            updatedAt: new Date().toISOString(),
          };
        }
        return pl;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plRef = doc(db, 'users', uid, 'customPlaylists', playlistId);
      const snap = await getDoc(plRef);
      if (snap.exists()) {
        const pl = snap.data() as CustomPlaylist;
        await updateDoc(plRef, {
          videoIds: pl.videoIds.filter((vId) => vId !== videoId),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to remove video from playlist in Firestore:', err);
    }
  }
}

/**
 * Fetches all custom playlists for a user
 */
export async function getUserCustomPlaylistsFromFirestore(
  uid: string
): Promise<CustomPlaylist[]> {
  const localKey = `mytube_playlists_${uid}`;
  let localList: CustomPlaylist[] = [];
  try {
    const localData = localStorage.getItem(localKey);
    localList = localData ? JSON.parse(localData) : [];
  } catch {
    localList = [];
  }

  if (isFirebaseConfigured() && db) {
    try {
      const plCol = collection(db, 'users', uid, 'customPlaylists');
      const snap = await getDocs(plCol);
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as CustomPlaylist);
        localStorage.setItem(localKey, JSON.stringify(items));
        return items;
      }
    } catch (err) {
      console.warn('Failed to get playlists from Firestore:', err);
    }
  }

  return localList;
}

/* ==========================================================================
   STEP 7: COMMENTS, LIKES, DISLIKES & NOTIFICATIONS (FIRESTORE ENGINE)
   ========================================================================== */

/**
 * Baseline initial comments for new/sample videos to ensure immediate visual interaction
 */
function getInitialComments(videoId: string): VideoComment[] {
  return [
    {
      id: `init_comm_1_${videoId}`,
      videoId,
      userId: 'user-community-1',
      authorName: 'Alex Rivera',
      authorHandle: '@alexstream',
      authorAvatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
      text: 'The original audio mix and visual fidelity on this YouTube video are spectacular!',
      likesCount: 142,
      dislikesCount: 0,
      parentId: null,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    },
    {
      id: `init_comm_2_${videoId}`,
      videoId,
      userId: 'user-community-2',
      authorName: 'Elena Rostova',
      authorHandle: '@elenatech',
      authorAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80',
      text: 'Playing directly in MyTube with zero buffering and pristine quality. Outstanding playback engine!',
      likesCount: 65,
      dislikesCount: 0,
      parentId: null,
      createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    },
  ];
}

/**
 * Real-time listener for comments on a specific video
 */
export function subscribeToComments(
  videoId: string,
  callback: (comments: VideoComment[]) => void
): () => void {
  const localKey = `mytube_comments_${videoId}`;

  const loadLocal = () => {
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    const initial = getInitialComments(videoId);
    localStorage.setItem(localKey, JSON.stringify(initial));
    return initial;
  };

  callback(loadLocal());

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'comments'), where('videoId', '==', videoId));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as VideoComment[];
            list.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem(localKey, JSON.stringify(list));
            callback(list);
          } else {
            callback(loadLocal());
          }
        },
        (err) => {
          console.warn('Comments Firestore onSnapshot listener error:', err);
          callback(loadLocal());
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to attach comments onSnapshot:', err);
    }
  }

  return () => {};
}

/**
 * Add a new comment or reply
 */
export async function addCommentInFirestore(
  commentData: Omit<
    VideoComment,
    'id' | 'createdAt' | 'likesCount' | 'dislikesCount'
  >
): Promise<VideoComment> {
  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newComment: VideoComment = {
    ...commentData,
    id: commentId,
    likesCount: 0,
    dislikesCount: 0,
    createdAt: new Date().toISOString(),
  };

  // 1. Immediate local storage persistence
  const localKey = `mytube_comments_${commentData.videoId}`;
  try {
    const raw = localStorage.getItem(localKey);
    const existing: VideoComment[] = raw
      ? JSON.parse(raw)
      : getInitialComments(commentData.videoId);
    const updated = [newComment, ...existing];
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {}

  // 2. Cloud Firestore persistence
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'comments', commentId), newComment);
    } catch (err) {
      console.warn('Error saving comment in Firestore:', err);
    }
  }

  return newComment;
}

/**
 * Edit an existing comment (only author permitted)
 */
export async function updateCommentInFirestore(
  videoId: string,
  commentId: string,
  newText: string,
  userId: string
): Promise<void> {
  const localKey = `mytube_comments_${videoId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: VideoComment[] = JSON.parse(raw);
      const updated = existing.map((c) =>
        c.id === commentId && c.userId === userId
          ? {
              ...c,
              text: newText,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}

  if (isFirebaseConfigured() && db) {
    try {
      const ref = doc(db, 'comments', commentId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().userId === userId) {
        await updateDoc(ref, {
          text: newText,
          isEdited: true,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Error updating comment in Firestore:', err);
    }
  }
}

/**
 * Delete a comment and its child replies (only author permitted)
 */
export async function deleteCommentInFirestore(
  videoId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const localKey = `mytube_comments_${videoId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: VideoComment[] = JSON.parse(raw);
      const updated = existing.filter(
        (c) =>
          !(c.id === commentId && c.userId === userId) &&
          c.parentId !== commentId
      );
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}

  if (isFirebaseConfigured() && db) {
    try {
      const ref = doc(db, 'comments', commentId);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().userId === userId) {
        await deleteDoc(ref);
      }
    } catch (err) {
      console.warn('Error deleting comment in Firestore:', err);
    }
  }
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLikeInFirestore(
  videoId: string,
  commentId: string,
  userId: string
): Promise<{ likesCount: number; isLiked: boolean }> {
  const userVoteKey = `mytube_comm_like_${commentId}_${userId}`;
  const localKey = `mytube_comments_${videoId}`;
  const wasLiked = localStorage.getItem(userVoteKey) === 'true';
  const isLiked = !wasLiked;

  let currentLikes = 0;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: VideoComment[] = JSON.parse(raw);
      const updated = existing.map((c) => {
        if (c.id === commentId) {
          currentLikes = Math.max(0, (c.likesCount || 0) + (isLiked ? 1 : -1));
          return { ...c, likesCount: currentLikes };
        }
        return c;
      });
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}

  if (isLiked) {
    localStorage.setItem(userVoteKey, 'true');
  } else {
    localStorage.removeItem(userVoteKey);
  }

  if (isFirebaseConfigured() && db) {
    try {
      const ref = doc(db, 'comments', commentId);
      await updateDoc(ref, {
        likesCount: currentLikes,
      });
    } catch (err) {
      console.warn('Error updating comment like in Firestore:', err);
    }
  }

  return { likesCount: currentLikes, isLiked };
}

/**
 * Subscribe to video reaction counts & current user reaction
 */
export function subscribeToVideoReactions(
  videoId: string,
  userId: string | null,
  defaultLikes: number,
  callback: (data: {
    stats: VideoReactionStats;
    userReaction: ReactionType | null;
  }) => void
): () => void {
  const localStatsKey = `mytube_reactions_${videoId}`;
  const localUserKey = userId
    ? `mytube_user_reaction_${videoId}_${userId}`
    : null;

  const getLocalData = () => {
    let stats: VideoReactionStats = {
      likesCount: defaultLikes,
      dislikesCount: 0,
    };
    let userReaction: ReactionType | null = null;
    try {
      const statsRaw = localStorage.getItem(localStatsKey);
      if (statsRaw) stats = JSON.parse(statsRaw);
      if (localUserKey) {
        userReaction =
          (localStorage.getItem(localUserKey) as ReactionType) || null;
      }
    } catch {}
    return { stats, userReaction };
  };

  callback(getLocalData());

  if (isFirebaseConfigured() && db) {
    try {
      const statsRef = doc(db, 'videoStats', videoId);
      const unsubStats = onSnapshot(statsRef, (snap) => {
        if (snap.exists()) {
          const stats = snap.data() as VideoReactionStats;
          localStorage.setItem(localStatsKey, JSON.stringify(stats));
          const current = getLocalData();
          callback({ stats, userReaction: current.userReaction });
        }
      });

      let unsubUser: (() => void) | null = null;
      if (userId) {
        const reactionRef = doc(db, 'videoReactions', `${videoId}_${userId}`);
        unsubUser = onSnapshot(reactionRef, (snap) => {
          let userReaction: ReactionType | null = null;
          if (snap.exists()) {
            userReaction = (snap.data().type as ReactionType) || null;
            if (localUserKey) localStorage.setItem(localUserKey, userReaction);
          } else if (localUserKey) {
            localStorage.removeItem(localUserKey);
          }
          const current = getLocalData();
          callback({ stats: current.stats, userReaction });
        });
      }

      return () => {
        unsubStats();
        if (unsubUser) unsubUser();
      };
    } catch (err) {
      console.warn('Failed to subscribe to video reactions:', err);
    }
  }

  return () => {};
}

/**
 * Set or toggle video reaction (Like, Dislike, or remove)
 */
export async function setVideoReactionInFirestore(
  videoId: string,
  userId: string,
  newReaction: ReactionType | null,
  currentReaction: ReactionType | null,
  defaultLikes: number
): Promise<VideoReactionStats> {
  const localStatsKey = `mytube_reactions_${videoId}`;
  const localUserKey = `mytube_user_reaction_${videoId}_${userId}`;

  // Calculate delta
  let likesDelta = 0;
  let dislikesDelta = 0;

  if (currentReaction === 'like') likesDelta -= 1;
  if (currentReaction === 'dislike') dislikesDelta -= 1;
  if (newReaction === 'like') likesDelta += 1;
  if (newReaction === 'dislike') dislikesDelta += 1;

  let currentStats: VideoReactionStats = {
    likesCount: defaultLikes,
    dislikesCount: 0,
  };
  try {
    const raw = localStorage.getItem(localStatsKey);
    if (raw) currentStats = JSON.parse(raw);
  } catch {}

  const updatedStats: VideoReactionStats = {
    likesCount: Math.max(
      0,
      (currentStats.likesCount || defaultLikes) + likesDelta
    ),
    dislikesCount: Math.max(0, (currentStats.dislikesCount || 0) + dislikesDelta),
  };

  localStorage.setItem(localStatsKey, JSON.stringify(updatedStats));
  if (newReaction) {
    localStorage.setItem(localUserKey, newReaction);
  } else {
    localStorage.removeItem(localUserKey);
  }

  if (isFirebaseConfigured() && db) {
    try {
      const reactionRef = doc(db, 'videoReactions', `${videoId}_${userId}`);
      if (newReaction) {
        await setDoc(reactionRef, {
          id: `${videoId}_${userId}`,
          videoId,
          userId,
          type: newReaction,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(reactionRef);
      }

      const statsRef = doc(db, 'videoStats', videoId);
      await setDoc(
        statsRef,
        {
          likesCount: updatedStats.likesCount,
          dislikesCount: updatedStats.dislikesCount,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error updating video reactions in Firestore:', err);
    }
  }

  return updatedStats;
}

/**
 * Baseline default notifications for initial user engagement
 */
function getDefaultNotifications(userId: string): UserNotification[] {
  return [
    {
      id: `notif_def_1_${userId}`,
      userId,
      type: 'subscriber',
      title: 'New Subscriber!',
      message: 'CodeCraft Academy subscribed to your channel.',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=CodeCraft',
      link: '/subscriptions',
      read: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    },
    {
      id: `notif_def_2_${userId}`,
      userId,
      type: 'video',
      title: 'Recommended Video',
      message: 'Trending in Tech: "Building with Gemini 4 and Antigravity"',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Gemini',
      link: '/watch/rsOiZE19RVo',
      read: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    },
  ];
}

/**
 * Real-time listener for user notifications
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void
): () => void {
  const localKey = `mytube_notifications_${userId}`;
  const getLocal = () => {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    const def = getDefaultNotifications(userId);
    localStorage.setItem(localKey, JSON.stringify(def));
    return def;
  };

  callback(getLocal());

  if (isFirebaseConfigured() && db) {
    try {
      const notifCol = collection(db, 'users', userId, 'notifications');
      const unsubscribe = onSnapshot(
        notifCol,
        (snap) => {
          if (!snap.empty) {
            const items = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as UserNotification[];
            items.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem(localKey, JSON.stringify(items));
            callback(items);
          } else {
            callback(getLocal());
          }
        },
        (err) => {
          console.warn('Notifications onSnapshot error:', err);
          callback(getLocal());
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Failed to listen to notifications in Firestore:', err);
    }
  }

  return () => {};
}

/**
 * Create a notification for a user in Firestore
 */
export async function createNotificationInFirestore(
  notifData: Omit<UserNotification, 'id' | 'createdAt'>
): Promise<UserNotification> {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newNotif: UserNotification = {
    ...notifData,
    id: notifId,
    createdAt: new Date().toISOString(),
  };

  const localKey = `mytube_notifications_${notifData.userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    const existing: UserNotification[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(localKey, JSON.stringify([newNotif, ...existing]));
  } catch {}

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(
        doc(db, 'users', notifData.userId, 'notifications', notifId),
        newNotif
      );
    } catch (err) {
      console.warn('Failed to write notification to Firestore:', err);
    }
  }

  return newNotif;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsReadInFirestore(
  userId: string,
  notificationId: string
): Promise<void> {
  const localKey = `mytube_notifications_${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: UserNotification[] = JSON.parse(raw);
      const updated = existing.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}

  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(
        doc(db, 'users', userId, 'notifications', notificationId),
        {
          read: true,
        }
      );
    } catch (err) {
      console.warn('Failed to mark notification read in Firestore:', err);
    }
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsReadInFirestore(
  userId: string
): Promise<void> {
  const localKey = `mytube_notifications_${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: UserNotification[] = JSON.parse(raw);
      const updated = existing.map((n) => ({ ...n, read: true }));
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {}

  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(
        collection(db, 'users', userId, 'notifications')
      );
      const batchPromises = snap.docs.map((d) =>
        updateDoc(d.ref, { read: true })
      );
      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Failed to mark all notifications read in Firestore:', err);
    }
  }
}

/* ==========================================================================
   STEP 8: SEARCH HISTORY & USER WATCH SETTINGS (FIRESTORE ENGINE)
   ========================================================================== */

export interface UserSettings {
  autoplayNext: boolean;
  playbackSpeed: number;
  isSearchHistoryPaused: boolean;
  isWatchHistoryPaused: boolean;
  theaterMode?: boolean;
  captionsEnabled?: boolean;
  preferredQuality?: string;
  volume?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  autoplayNext: true,
  playbackSpeed: 1,
  isSearchHistoryPaused: false,
  isWatchHistoryPaused: false,
  theaterMode: false,
  captionsEnabled: false,
  preferredQuality: 'auto',
  volume: 100,
};

const DEFAULT_RECENT_SEARCHES = [
  'React 19 Vite TypeScript',
  'Google Antigravity Gemini',
  'Cricket World Cup Highlights',
  'Lo-Fi Coding Beats 24/7',
];

/**
 * Get search history for user
 */
export async function getSearchHistoryFromFirestore(
  uid?: string
): Promise<string[]> {
  const localKey = uid
    ? `mytube_search_history_${uid}`
    : 'mytube_search_history_guest';
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return JSON.parse(raw);
  } catch {}

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && Array.isArray(snap.data().searchHistory)) {
        const history: string[] = snap.data().searchHistory;
        localStorage.setItem(localKey, JSON.stringify(history));
        return history;
      }
    } catch (err) {
      console.warn('Failed to get search history from Firestore:', err);
    }
  }

  return DEFAULT_RECENT_SEARCHES;
}

/**
 * Save a search query to search history
 */
export async function saveSearchQueryToFirestore(
  query: string,
  uid?: string
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const localKey = uid
    ? `mytube_search_history_${uid}`
    : 'mytube_search_history_guest';
  let history: string[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    history = raw ? JSON.parse(raw) : [...DEFAULT_RECENT_SEARCHES];
  } catch {
    history = [...DEFAULT_RECENT_SEARCHES];
  }

  // Deduplicate and place at front (max 15 items)
  history = [
    trimmed,
    ...history.filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase()
    ),
  ].slice(0, 15);
  localStorage.setItem(localKey, JSON.stringify(history));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { searchHistory: history });
    } catch (err) {
      console.warn('Failed to update search history in Firestore:', err);
    }
  }

  return history;
}

/**
 * Delete a single search query from search history
 */
export async function deleteSearchQueryFromFirestore(
  query: string,
  uid?: string
): Promise<string[]> {
  const localKey = uid
    ? `mytube_search_history_${uid}`
    : 'mytube_search_history_guest';
  let history: string[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) history = JSON.parse(raw);
  } catch {}

  history = history.filter(
    (item) => item.toLowerCase() !== query.toLowerCase()
  );
  localStorage.setItem(localKey, JSON.stringify(history));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { searchHistory: history });
    } catch (err) {
      console.warn('Failed to delete search item from Firestore:', err);
    }
  }

  return history;
}

/**
 * Clear all search history
 */
export async function clearSearchHistoryInFirestore(
  uid?: string
): Promise<void> {
  const localKey = uid
    ? `mytube_search_history_${uid}`
    : 'mytube_search_history_guest';
  localStorage.setItem(localKey, JSON.stringify([]));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { searchHistory: [] });
    } catch (err) {
      console.warn('Failed to clear search history in Firestore:', err);
    }
  }
}

/**
 * Get user settings (autoplay, playback speed, paused history)
 */
export async function getUserSettingsFromFirestore(
  uid?: string
): Promise<UserSettings> {
  const localKey = uid ? `mytube_settings_${uid}` : 'mytube_settings_guest';
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().settings) {
        const remote = snap.data().settings as Partial<UserSettings>;
        const merged = { ...DEFAULT_SETTINGS, ...remote };
        localStorage.setItem(localKey, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Failed to get user settings from Firestore:', err);
    }
  }

  return DEFAULT_SETTINGS;
}

/**
 * Update user settings
 */
export async function updateUserSettingsInFirestore(
  uid: string | undefined,
  partialSettings: Partial<UserSettings>
): Promise<UserSettings> {
  const localKey = uid ? `mytube_settings_${uid}` : 'mytube_settings_guest';
  let current = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) current = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}

  const updated: UserSettings = { ...current, ...partialSettings };
  localStorage.setItem(localKey, JSON.stringify(updated));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { settings: updated });
    } catch (err) {
      console.warn('Failed to update user settings in Firestore:', err);
    }
  }

  return updated;
}

export interface UserRecommendationPreferences {
  dismissedVideoIds: string[];
  preferredCategories: string[];
}

export const DEFAULT_RECOMMENDATION_PREFERENCES: UserRecommendationPreferences = {
  dismissedVideoIds: [],
  preferredCategories: ['For You', 'Trending', 'Music', 'Gaming', 'Technology'],
};

/**
 * Get user recommendation preferences
 */
export async function getUserRecommendationPreferences(
  uid?: string
): Promise<UserRecommendationPreferences> {
  const localKey = uid ? `mytube_rec_prefs_${uid}` : 'mytube_rec_prefs_guest';
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { ...DEFAULT_RECOMMENDATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {}

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().recommendationPreferences) {
        const remote = snap.data().recommendationPreferences;
        const merged = { ...DEFAULT_RECOMMENDATION_PREFERENCES, ...remote };
        localStorage.setItem(localKey, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch recommendation preferences from Firestore:', err);
    }
  }

  return DEFAULT_RECOMMENDATION_PREFERENCES;
}

/**
 * Dismiss a video ("Not Interested")
 */
export async function dismissVideoForUser(
  videoId: string,
  uid?: string
): Promise<string[]> {
  const current = await getUserRecommendationPreferences(uid);
  const updatedDismissed = Array.from(new Set([videoId, ...current.dismissedVideoIds]));
  const updatedPrefs: UserRecommendationPreferences = {
    ...current,
    dismissedVideoIds: updatedDismissed,
  };

  const localKey = uid ? `mytube_rec_prefs_${uid}` : 'mytube_rec_prefs_guest';
  localStorage.setItem(localKey, JSON.stringify(updatedPrefs));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { recommendationPreferences: updatedPrefs });
    } catch (err) {
      console.warn('Failed to update dismissed video in Firestore:', err);
    }
  }

  return updatedDismissed;
}

/**
 * Undo dismissing a video
 */
export async function undodismissVideoForUser(
  videoId: string,
  uid?: string
): Promise<string[]> {
  const current = await getUserRecommendationPreferences(uid);
  const updatedDismissed = current.dismissedVideoIds.filter((id) => id !== videoId);
  const updatedPrefs: UserRecommendationPreferences = {
    ...current,
    dismissedVideoIds: updatedDismissed,
  };

  const localKey = uid ? `mytube_rec_prefs_${uid}` : 'mytube_rec_prefs_guest';
  localStorage.setItem(localKey, JSON.stringify(updatedPrefs));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { recommendationPreferences: updatedPrefs });
    } catch (err) {
      console.warn('Failed to undo dismissed video in Firestore:', err);
    }
  }

  return updatedDismissed;
}

/**
 * Clear all recommendation preferences (reset dismissed videos)
 */
export async function clearRecommendationPreferences(
  uid?: string
): Promise<void> {
  const localKey = uid ? `mytube_rec_prefs_${uid}` : 'mytube_rec_prefs_guest';
  localStorage.setItem(localKey, JSON.stringify(DEFAULT_RECOMMENDATION_PREFERENCES));

  if (uid && isFirebaseConfigured() && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        recommendationPreferences: DEFAULT_RECOMMENDATION_PREFERENCES,
      });
    } catch (err) {
      console.warn('Failed to clear recommendation preferences in Firestore:', err);
    }
  }
}
