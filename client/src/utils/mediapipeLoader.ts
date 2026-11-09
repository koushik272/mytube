// client/src/utils/mediapipeLoader.ts - Safe Dynamic Loader for Google MediaPipe Hands & Camera Utils

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

let loadPromise: Promise<boolean> | null = null;

export function loadMediaPipeHands(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Hands && window.Camera) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise(async (resolve) => {
    try {
      // 1. Load Camera Utils if not present
      if (!window.Camera) {
        await loadScript(
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.4.1675466862/camera_utils.js',
          'mediapipe-camera-utils'
        );
      }

      // 2. Load Hands if not present
      if (!window.Hands) {
        await loadScript(
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js',
          'mediapipe-hands'
        );
      }

      // 3. Verify availability
      if (window.Hands && window.Camera) {
        resolve(true);
      } else {
        // Wait up to 2 seconds for global exposure
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.Hands && window.Camera) {
            clearInterval(interval);
            resolve(true);
          } else if (attempts > 20) {
            clearInterval(interval);
            console.warn('MediaPipe scripts loaded but globals not detected.');
            resolve(false);
          }
        }, 100);
      }
    } catch (err) {
      console.warn('Failed to load MediaPipe from CDN:', err);
      resolve(false);
    }
  });

  return loadPromise;
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => resolve();
    script.onerror = (err) => reject(err);

    document.head.appendChild(script);
  });
}
