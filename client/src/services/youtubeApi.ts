import { Video } from '../types/video';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface SearchFilters {
  type?: 'all' | 'video' | 'channel' | 'playlist';
  order?: 'relevance' | 'date' | 'viewCount' | 'rating';
  videoDuration?: 'any' | 'short' | 'medium' | 'long';
  publishedAfter?: string;
  uploadDate?: 'any' | 'hour' | 'today' | 'week' | 'month' | 'year';
  pageToken?: string;
}

export interface SearchResult {
  items: Video[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults: number;
  error?: string;
}

/**
 * Get real-time search suggestions from YouTube
 */
export async function getYouTubeSearchSuggestions(query: string): Promise<string[]> {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE}/youtube/suggestions?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('Error fetching search suggestions:', err);
    return [];
  }
}

/**
 * Searches real YouTube videos through the secure backend YouTube Data API v3 proxy
 */
export async function searchYouTubeVideos(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: query,
  });

  if (filters.pageToken) params.append('pageToken', filters.pageToken);
  if (filters.type && filters.type !== 'all') params.append('type', filters.type);
  if (filters.order) params.append('order', filters.order);
  if (filters.videoDuration && filters.videoDuration !== 'any') {
    params.append('videoDuration', filters.videoDuration);
  }
  if (filters.uploadDate && filters.uploadDate !== 'any') {
    params.append('uploadDate', filters.uploadDate);
  }
  if (filters.publishedAfter) params.append('publishedAfter', filters.publishedAfter);

  try {
    const res = await fetch(`${API_BASE}/youtube/search?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    if (data.success && Array.isArray(data.data)) {
      const videos: Video[] = data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'All',
        channel: {
          id: item.channel?.id || 'ch-yt',
          name: item.channel?.name || 'YouTube Creator',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Channel`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      }));

      return {
        items: videos,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken,
        totalResults: data.totalResults || videos.length,
      };
    }
  } catch (err: any) {
    console.warn('Failed to fetch from YouTube backend proxy:', err);
    return {
      items: [],
      totalResults: 0,
      error: err.message || 'Unable to connect to YouTube search service',
    };
  }

  return { items: [], totalResults: 0 };
}

/**
 * Get video details by real YouTube ID
 */
export async function getYouTubeVideoById(videoId: string): Promise<Video | null> {
  try {
    const res = await fetch(`${API_BASE}/youtube/videos/${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.success && data.data) {
      const item = data.data;
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'All',
        channel: {
          id: item.channel?.id || 'ch-yt',
          name: item.channel?.name || 'YouTube Creator',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Channel`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      };
    }
  } catch (err) {
    console.warn('Error fetching YouTube video by ID:', err);
  }
  return null;
}

/**
 * Get related YouTube video recommendations
 */
export async function getYouTubeRelatedVideos(videoId: string): Promise<Video[]> {
  try {
    const res = await fetch(`${API_BASE}/youtube/videos/${videoId}/related`);
    if (!res.ok) return [];
    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'All',
        channel: {
          id: item.channel?.id || 'ch-yt',
          name: item.channel?.name || 'YouTube Creator',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Channel`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      }));
    }
  } catch (err) {
    console.warn('Error fetching related videos:', err);
  }
  return [];
}

export interface YouTubeChannel {
  id: string;
  title: string;
  handle: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  joinedDate: string;
  country?: string;
  verified: boolean;
}

export interface YouTubeShort {
  id: string;
  title: string;
  thumbnailUrl: string;
  viewsText: string;
  views: number;
  likes: number;
  channel: {
    id: string;
    name: string;
    avatar: string;
  };
}

/**
 * Get YouTube Playlist and items
 */
export async function getYouTubePlaylist(playlistId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/youtube/playlists/${playlistId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (err) {
    console.warn('Error fetching playlist:', err);
    return null;
  }
}

/**
 * Get real YouTube Shorts
 */
export async function getYouTubeShorts(limit = 20): Promise<YouTubeShort[]> {
  try {
    const res = await fetch(`${API_BASE}/youtube/shorts?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn('Error fetching YouTube shorts:', err);
    return [];
  }
}

/**
 * Get real YouTube Channel Details
 */
export async function getYouTubeChannelDetails(channelId: string): Promise<YouTubeChannel | null> {
  try {
    const res = await fetch(`${API_BASE}/youtube/channels/${encodeURIComponent(channelId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.data ? data.data : null;
  } catch (err) {
    console.warn('Error fetching YouTube channel:', err);
    return null;
  }
}

/**
 * Get real YouTube Channel Content (Videos, Shorts, Playlists)
 */
export async function getYouTubeChannelContent(
  channelId: string,
  tab: 'videos' | 'shorts' | 'playlists' = 'videos'
): Promise<Video[]> {
  try {
    const res = await fetch(`${API_BASE}/youtube/channels/${encodeURIComponent(channelId)}/content?tab=${tab}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'All',
        channel: {
          id: item.channel?.id || channelId,
          name: item.channel?.name || 'Channel',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Channel`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      }));
    }
  } catch (err) {
    console.warn('Error fetching channel content:', err);
  }
  return [];
}

/**
 * Get unified real YouTube Subscriptions Feed
 */
export async function getYouTubeSubscriptionsFeed(channelIds: string[]): Promise<Video[]> {
  try {
    const params = channelIds.length > 0 ? `?channels=${encodeURIComponent(channelIds.join(','))}` : '';
    const res = await fetch(`${API_BASE}/youtube/subscriptions/feed${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'All',
        channel: {
          id: item.channel?.id || 'ch-sub',
          name: item.channel?.name || 'Channel',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Channel`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      }));
    }
  } catch (err) {
    console.warn('Error fetching subscriptions feed:', err);
  }
  return [];
}

export interface TrendingFilters {
  regionCode?: string;
  category?: 'all' | 'music' | 'gaming' | 'sports' | 'entertainment' | 'news';
  pageToken?: string;
  maxResults?: number;
}

export interface RecommendationSignals {
  recentVideos?: { id: string; title: string; category?: string; channelName?: string }[];
  likedVideoIds?: string[];
  subscribedChannels?: string[];
  recentSearches?: string[];
  dismissedVideoIds?: string[];
  refreshSeed?: number | string;
  limit?: number;
}

/**
 * Fetches popular trending videos by region (default India 'IN') and categories
 */
export async function getYouTubeTrending(
  filters: TrendingFilters = {}
): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (filters.regionCode) params.append('regionCode', filters.regionCode);
  if (filters.category) params.append('category', filters.category);
  if (filters.pageToken) params.append('pageToken', filters.pageToken);
  if (filters.maxResults) params.append('maxResults', String(filters.maxResults));

  try {
    const res = await fetch(`${API_BASE}/youtube/trending?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      const items: Video[] = data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Trending',
        category: (item.category as any) || 'Trending',
        channel: {
          id: item.channel?.id || 'ch-trend',
          name: item.channel?.name || 'Creator',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Trending`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
      }));

      return {
        items,
        nextPageToken: data.nextPageToken,
        prevPageToken: data.prevPageToken,
        totalResults: data.totalResults || items.length,
      };
    }
  } catch (err) {
    console.warn('Error fetching trending videos:', err);
  }

  return { items: [], totalResults: 0 };
}

/**
 * Fetches personalized recommendations tailored to user watch activity, likes, and searches
 */
export async function getYouTubePersonalizedRecommendations(
  signals: RecommendationSignals = {}
): Promise<Video[]> {
  try {
    const res = await fetch(`${API_BASE}/youtube/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signals),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        duration: item.duration,
        views: item.views || 0,
        likes: item.likes || 0,
        uploadedAt: item.uploadedAt || 'Recently',
        category: (item.category as any) || 'For You',
        channel: {
          id: item.channel?.id || 'ch-rec',
          name: item.channel?.name || 'Creator',
          avatar: item.channel?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=Rec`,
          subscribers: '1M',
          verified: item.channel?.verified ?? true,
        },
        commentsCount: item.commentsCount || 0,
        tags: item.tags || [],
        recommendationReason: item.recommendationReason,
      }));
    }
  } catch (err) {
    console.warn('Error fetching personalized recommendations:', err);
  }

  return [];
}
