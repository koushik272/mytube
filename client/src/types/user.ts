export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  handle: string;
  subscribersCount: number;
  createdAt: string;
  likedVideos: string[];
  watchLaterVideos: string[];
  subscribedChannels: string[];
  isHistoryPaused?: boolean;
}

export type AuthModalMode = 'login' | 'signup';
