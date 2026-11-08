import { Router, Request, Response } from 'express';
import { SAMPLE_VIDEOS, CATEGORIES } from '../data/videos.js';

const router = Router();

// GET all videos (optional filtering by category or search query)
router.get('/', (req: Request, res: Response) => {
  const { category, q } = req.query;
  let results = [...SAMPLE_VIDEOS];

  if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
    results = results.filter(
      (v) => v.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    results = results.filter(
      (v) =>
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.channel.name.toLowerCase().includes(query) ||
        v.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

// GET categories
router.get('/categories', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: CATEGORIES,
  });
});

// GET single video by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const video = SAMPLE_VIDEOS.find((v) => v.id === id);

  if (!video) {
    return res.status(404).json({
      success: false,
      message: 'Video not found',
    });
  }

  const related = SAMPLE_VIDEOS.filter((v) => v.id !== id && (v.category === video.category || true)).slice(0, 6);

  res.json({
    success: true,
    data: video,
    related,
  });
});

export default router;
