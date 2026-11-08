// server/src/middleware/validator.ts - Request Validation & Parameter Sanitization
import { Request, Response, NextFunction } from 'express';

const VALID_TYPES = ['all', 'video', 'channel', 'playlist'] as const;
const VALID_ORDERS = ['relevance', 'date', 'viewCount', 'rating'] as const;
const VALID_DURATIONS = ['any', 'short', 'medium', 'long'] as const;
const VALID_UPLOAD_DATES = ['any', 'hour', 'today', 'week', 'month', 'year'] as const;
const VALID_TRENDING_CATEGORIES = ['all', 'music', 'gaming', 'sports', 'entertainment', 'news'] as const;

// YouTube video ID regex: exactly 11 base64url characters
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function validateSearchQuery(req: Request, res: Response, next: NextFunction) {
  const q = req.query.q as string | undefined;

  // Sanitize query string
  if (q !== undefined) {
    if (typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Query parameter "q" must be a string.',
      });
    }

    if (q.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Query parameter "q" is too long (maximum 200 characters).',
      });
    }
  }

  // Validate type filter
  const type = req.query.type as string | undefined;
  if (type && !VALID_TYPES.includes(type as any)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid type filter "${type}". Allowed values: ${VALID_TYPES.join(', ')}.`,
    });
  }

  // Validate order filter
  const order = req.query.order as string | undefined;
  if (order && !VALID_ORDERS.includes(order as any)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid order filter "${order}". Allowed values: ${VALID_ORDERS.join(', ')}.`,
    });
  }

  // Validate duration filter
  const videoDuration = req.query.videoDuration as string | undefined;
  if (videoDuration && !VALID_DURATIONS.includes(videoDuration as any)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid videoDuration filter "${videoDuration}". Allowed values: ${VALID_DURATIONS.join(', ')}.`,
    });
  }

  // Validate uploadDate filter
  const uploadDate = req.query.uploadDate as string | undefined;
  if (uploadDate && !VALID_UPLOAD_DATES.includes(uploadDate as any)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid uploadDate filter "${uploadDate}". Allowed values: ${VALID_UPLOAD_DATES.join(', ')}.`,
    });
  }

  // Validate maxResults
  const maxResults = req.query.maxResults as string | undefined;
  if (maxResults !== undefined) {
    const num = parseInt(maxResults, 10);
    if (isNaN(num) || num < 1 || num > 50) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Parameter "maxResults" must be an integer between 1 and 50.',
      });
    }
  }

  next();
}

export function validateVideoIdParam(req: Request, res: Response, next: NextFunction) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Video ID parameter is required.',
    });
  }

  const trimmed = id.trim();
  if (!YOUTUBE_VIDEO_ID_REGEX.test(trimmed)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid YouTube video ID format: "${trimmed}". Expected an 11-character YouTube video ID.`,
    });
  }

  next();
}

export function validateTrendingQuery(req: Request, res: Response, next: NextFunction) {
  const regionCode = req.query.regionCode as string | undefined;
  if (regionCode && !/^[a-zA-Z]{2}$/.test(regionCode.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Parameter "regionCode" must be a 2-letter ISO country code (e.g., IN, US, GB).',
    });
  }

  const category = req.query.category as string | undefined;
  if (category && !VALID_TRENDING_CATEGORIES.includes(category.toLowerCase() as any)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: `Invalid category "${category}". Allowed values: ${VALID_TRENDING_CATEGORIES.join(', ')}.`,
    });
  }

  next();
}

export function validateRecommendationsBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Request body must be a valid JSON object.',
    });
  }

  next();
}
