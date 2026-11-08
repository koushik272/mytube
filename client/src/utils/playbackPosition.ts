// client/src/utils/playbackPosition.ts - Preserves video playback position across MyTube navigation

const STORAGE_PREFIX = 'mytube_playback_pos_';

export function savePlaybackPosition(videoId: string, seconds: number, duration?: number): void {
  if (!videoId || seconds < 3) return;

  // If user completed > 95% of video, reset so it replays from start next time
  if (duration && duration > 0 && seconds / duration > 0.95) {
    clearPlaybackPosition(videoId);
    return;
  }

  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${videoId}`, Math.floor(seconds).toString());
  } catch (err) {
    console.warn('Failed to save playback position to sessionStorage:', err);
  }
}

export function getSavedPlaybackPosition(videoId: string): number {
  if (!videoId) return 0;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${videoId}`);
    if (raw) {
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    }
  } catch {
    return 0;
  }
  return 0;
}

export function clearPlaybackPosition(videoId: string): void {
  if (!videoId) return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${videoId}`);
  } catch {}
}

export function formatPlaybackSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
