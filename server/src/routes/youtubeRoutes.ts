// server/src/routes/youtubeRoutes.ts - Validated & Rate-Protected YouTube Endpoints
import { Router, Request, Response } from 'express';
import { youtubeService } from '../services/youtubeService.js';
import {
  validateSearchQuery,
  validateVideoIdParam,
  validateTrendingQuery,
  validateRecommendationsBody,
} from '../middleware/validator.js';

const router = Router();

// Note: Global API rate limiting is enforced in index.ts (/api)

// GET /api/youtube/suggestions - Live search autocomplete
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').slice(0, 100);
    const suggestions = await youtubeService.getSuggestions(q);
    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Error fetching search suggestions',
    });
  }
});

// GET /api/youtube/search - Validated search with multi-filters and pagination
router.get('/search', validateSearchQuery, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const pageToken = req.query.pageToken as string | undefined;
    const type = req.query.type as 'all' | 'video' | 'channel' | 'playlist' | undefined;
    const order = req.query.order as 'relevance' | 'date' | 'viewCount' | 'rating' | undefined;
    const videoDuration = req.query.videoDuration as 'any' | 'short' | 'medium' | 'long' | undefined;
    const publishedAfter = req.query.publishedAfter as string | undefined;
    const uploadDate = req.query.uploadDate as 'any' | 'hour' | 'today' | 'week' | 'month' | 'year' | undefined;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 18;

    const result = await youtubeService.search({
      q,
      pageToken,
      type,
      order,
      videoDuration,
      publishedAfter,
      uploadDate,
      maxResults,
    });

    res.json({
      success: true,
      data: result.items,
      nextPageToken: result.nextPageToken,
      prevPageToken: result.prevPageToken,
      totalResults: result.totalResults,
      query: q,
      filters: {
        type: type || 'all',
        order: order || 'relevance',
        videoDuration: videoDuration || 'any',
        uploadDate: uploadDate || 'any',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Search Service Error',
      message: error.message || 'Error searching YouTube videos',
    });
  }
});

// GET /api/youtube/videos/:id - Real YouTube video details
router.get('/videos/:id', validateVideoIdParam, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const video = await youtubeService.getVideoDetails(id.trim());

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video Not Found',
        message: 'This video is unavailable, private, deleted, or embedding is restricted by the creator.',
        videoId: id,
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Video Details Error',
      message: error.message || 'Error fetching video details',
    });
  }
});

// GET /api/youtube/videos/:id/related - Contextual recommendations for watch page
router.get('/videos/:id/related', validateVideoIdParam, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const related = await youtubeService.getRelated(id.trim());

    res.json({
      success: true,
      data: related,
      totalResults: related.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Related Videos Error',
      message: error.message || 'Error fetching related videos',
    });
  }
});

// GET /api/youtube/playlists/:id - Official YouTube playlist episodes
router.get('/playlists/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Playlist ID is required.',
      });
    }

    const playlist = await youtubeService.getPlaylist(id.trim());

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: 'Playlist Not Found',
        message: 'The requested YouTube playlist was not found or is private.',
        playlistId: id,
      });
    }

    res.json({
      success: true,
      data: playlist,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Playlist Error',
      message: error.message || 'Error fetching playlist',
    });
  }
});

// GET /api/youtube/shorts - Real vertical YouTube Shorts
router.get('/shorts', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10))) : 20;
    const shorts = await youtubeService.getShorts(limit);
    res.json({
      success: true,
      data: shorts,
      totalResults: shorts.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Shorts Error',
      message: error.message || 'Error fetching YouTube shorts',
    });
  }
});

// GET /api/youtube/channels/:id - Channel header, stats, banner & avatar
router.get('/channels/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Channel ID or handle is required.',
      });
    }

    const channel = await youtubeService.getChannelDetails(id.trim());

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel Not Found',
        message: 'The requested YouTube channel could not be found.',
        channelId: id,
      });
    }

    res.json({
      success: true,
      data: channel,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Channel Error',
      message: error.message || 'Error fetching channel details',
    });
  }
});

// GET /api/youtube/channels/:id/content - Channel tabs (videos, shorts, playlists)
router.get('/channels/:id/content', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tab = (req.query.tab as 'videos' | 'shorts' | 'playlists') || 'videos';
    if (!['videos', 'shorts', 'playlists'].includes(tab)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Tab must be "videos", "shorts", or "playlists".',
      });
    }

    const content = await youtubeService.getChannelContent(id.trim(), tab);

    res.json({
      success: true,
      data: content,
      tab,
      totalResults: content.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Channel Content Error',
      message: error.message || 'Error fetching channel content',
    });
  }
});

// GET /api/youtube/subscriptions/feed - Aggregated subscriptions feed
router.get('/subscriptions/feed', async (req: Request, res: Response) => {
  try {
    const channelsParam = req.query.channels as string | undefined;
    const channelIds = channelsParam ? channelsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const feed = await youtubeService.getSubscriptionsFeed(channelIds);

    res.json({
      success: true,
      data: feed,
      totalResults: feed.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Subscriptions Feed Error',
      message: error.message || 'Error fetching subscriptions feed',
    });
  }
});

// GET /api/youtube/trending - Region-based trending with category tabs
router.get('/trending', validateTrendingQuery, async (req: Request, res: Response) => {
  try {
    const regionCode = ((req.query.regionCode as string) || 'IN').toUpperCase();
    const category = (req.query.category as any) || 'all';
    const pageToken = req.query.pageToken as string | undefined;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 24;

    const result = await youtubeService.getTrending({
      regionCode,
      category,
      pageToken,
      maxResults,
    });

    res.json({
      success: true,
      data: result.items,
      nextPageToken: result.nextPageToken,
      prevPageToken: result.prevPageToken,
      totalResults: result.totalResults,
      regionCode,
      category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Trending Service Error',
      message: error.message || 'Error fetching trending videos',
    });
  }
});

// POST /api/youtube/recommendations - Activity-based personalized recommendations
router.post('/recommendations', validateRecommendationsBody, async (req: Request, res: Response) => {
  try {
    const {
      recentVideos,
      likedVideoIds,
      subscribedChannels,
      recentSearches,
      dismissedVideoIds,
      refreshSeed,
      limit,
    } = req.body || {};

    const result = await youtubeService.getPersonalizedRecommendations({
      recentVideos,
      likedVideoIds,
      subscribedChannels,
      recentSearches,
      dismissedVideoIds,
      refreshSeed,
      limit,
    });

    res.json({
      success: true,
      data: result.items,
      totalResults: result.totalResults,
      refreshedAt: result.refreshedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Recommendation Engine Error',
      message: error.message || 'Error generating recommendations',
    });
  }
});

export default router;
