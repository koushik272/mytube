// client/src/types/interaction.ts - Types for Comments, Reactions, and Notifications

export type ReactionType = 'like' | 'dislike';

export interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  likesCount: number;
  dislikesCount: number;
  parentId: string | null;
  replyCount?: number;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

export interface VideoReaction {
  id: string;
  videoId: string;
  userId: string;
  type: ReactionType;
  updatedAt: string;
}

export interface VideoReactionStats {
  likesCount: number;
  dislikesCount: number;
}

export type NotificationType = 'reply' | 'subscriber' | 'playlist' | 'video';

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  avatar: string;
  link: string;
  read: boolean;
  createdAt: string;
}
