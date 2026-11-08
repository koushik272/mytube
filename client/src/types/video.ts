export type Category = 
  | 'For You'
  | 'Trending'
  | 'All' 
  | 'Music' 
  | 'Gaming' 
  | 'Sports'
  | 'Cricket'
  | 'Entertainment'
  | 'Movies'
  | 'Technology' 
  | 'Education' 
  | 'News'
  | 'Podcasts';

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
  verified: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  views: number;
  likes: number;
  uploadedAt: string;
  category: Category;
  channel: Channel;
  commentsCount: number;
  tags: string[];
  recommendationReason?: string;
}

export interface ShortVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  channel: Channel;
  likes: string;
  comments: string;
  views: string;
}

export interface HistoryItem extends Video {
  watchedAt: string;
}

export interface CustomPlaylist {
  id: string;
  title: string;
  description: string;
  isPrivate: boolean;
  videoIds: string[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  ownerUid: string;
  ownerName: string;
}
