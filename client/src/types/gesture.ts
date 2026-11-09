// client/src/types/gesture.ts - Types for 3D Holographic Gesture Mode

export type GestureType =
  | 'OPEN_PALM'    // Pause
  | 'CLOSED_FIST'   // Play
  | 'SWIPE_RIGHT'   // Next Video
  | 'SWIPE_LEFT'    // Previous Video
  | 'PINCH'         // Volume Control
  | 'TWO_FINGERS'   // Fullscreen (V-sign)
  | 'THUMBS_UP';    // Like Video

export interface GestureDetectionResult {
  gesture: GestureType | null;
  confidence: number;
  pinchDistance?: number;
  handPosition?: { x: number; y: number; z: number };
  rawLandmarks?: Array<{ x: number; y: number; z: number }>;
}

export interface GestureSettings {
  enabled: boolean;
  sensitivity: 'low' | 'normal' | 'high';
  showHologramSkeleton: boolean;
  showFloatingControls: boolean;
  soundFeedback: boolean;
  showMiniCameraFeed: boolean;
  theme: 'cyber-cyan' | 'neon-purple' | 'matrix-green';
}

export interface GestureActionLog {
  gesture: GestureType;
  actionName: string;
  timestamp: number;
  iconName: string;
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}
