// client/src/utils/youtube.ts
// Robust YouTube Video ID extraction, Embed URL generation, and Duration parsing

/**
 * Extracts standard 11-character YouTube video ID from any format:
 * - 11-char direct ID: dQw4w9WgXcQ
 * - Standard URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - Short URL: https://youtu.be/dQw4w9WgXcQ
 * - Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
 * - Shorts URL: https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - Live stream URL: https://www.youtube.com/live/dQw4w9WgXcQ
 * - Mobile URL: https://m.youtube.com/watch?v=dQw4w9WgXcQ
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already an 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for YouTube URLs
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);

  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
}

/**
 * Converts various duration representations to total seconds:
 * - '3:33' -> 213
 * - '10:00' -> 600
 * - '1:15:30' -> 4530
 * - ISO 8601: 'PT3M33S' -> 213, 'PT1H2M10S' -> 3730
 * - number: 213 -> 213
 */
export function parseDurationToSeconds(duration: string | number | undefined | null): number {
  if (typeof duration === 'number') {
    return isNaN(duration) ? 0 : Math.max(0, duration);
  }
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const trimmed = duration.trim();

  // ISO 8601 duration format (PT#H#M#S)
  if (trimmed.startsWith('P') || trimmed.startsWith('PT')) {
    const matches = trimmed.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (matches) {
      const hours = parseInt(matches[1] || '0', 10);
      const minutes = parseInt(matches[2] || '0', 10);
      const seconds = parseInt(matches[3] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  // HH:MM:SS or MM:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Builds the official YouTube embed URL with optimal configuration
 */
export function getYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    origin?: string;
    enablejsapi?: boolean;
    rel?: number;
    controls?: number;
  } = {}
): string {
  const {
    autoplay = false,
    origin = typeof window !== 'undefined' ? window.location.origin : '',
    enablejsapi = true,
    rel = 0,
    controls = 1,
  } = options;

  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (enablejsapi) params.set('enablejsapi', '1');
  if (origin) params.set('origin', origin);
  params.set('rel', rel.toString());
  params.set('playsinline', '1');
  params.set('controls', controls.toString());
  params.set('modestbranding', '1');
  params.set('fs', '1');

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
