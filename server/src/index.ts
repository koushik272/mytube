import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videoRoutes from './routes/videoRoutes.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Render, Vercel, Cloudflare) for accurate client IP derivation
app.set('trust proxy', 1);

// Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Dynamic Production CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, health checks)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin ${origin} blocked by policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global API Rate Limiter: 300 requests per 15 minutes per IP
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 300,
  message: 'MyTube API rate limit reached. Please wait before making more requests.',
});
app.use('/api', apiRateLimiter);

// Health Check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'MyTube Backend API with YouTube Data API v3',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
    apiConfigured: Boolean(
      process.env.YOUTUBE_API_KEY &&
      process.env.YOUTUBE_API_KEY !== 'your_api_key_here'
    ),
  });
});

// YouTube Data API routes
app.use('/api/youtube', youtubeRoutes);

// Legacy Video Routes (preserved for backwards compatibility)
app.use('/api/videos', videoRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint Not Found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred processing your request.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MyTube API server running on http://localhost:${PORT}`);
  console.log(`🎬 YouTube Search & Playback endpoints active at http://localhost:${PORT}/api/youtube`);
});
