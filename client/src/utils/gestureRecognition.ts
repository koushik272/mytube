// client/src/utils/gestureRecognition.ts - Mathematical Gesture Recognition on 3D Landmarks

import { GestureType, GestureDetectionResult, Landmark3D } from '../types/gesture';

interface PositionHistoryPoint {
  x: number;
  y: number;
  time: number;
}

export class GestureClassifier {
  private history: PositionHistoryPoint[] = [];
  private lastSwipeTime: number = 0;
  private swipeCooldownMs: number = 900;

  // Calculates Euclidean distance between two 3D landmarks
  private distance(p1: Landmark3D, p2: Landmark3D): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));
  }

  // 2D distance for screen plane geometry
  private distance2D(p1: Landmark3D, p2: Landmark3D): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  /**
   * Evaluates the current frame of 21 3D hand landmarks
   */
  public classify(landmarks: Landmark3D[], sensitivity: 'low' | 'normal' | 'high' = 'normal'): GestureDetectionResult {
    if (!landmarks || landmarks.length < 21) {
      return { gesture: null, confidence: 0 };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];

    const indexTip = landmarks[8];
    const indexDIP = landmarks[7];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];

    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const middleMCP = landmarks[9];

    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const ringMCP = landmarks[13];

    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    const pinkyMCP = landmarks[17];

    const handCenter = {
      x: (wrist.x + indexMCP.x + pinkyMCP.x) / 3,
      y: (wrist.y + indexMCP.y + pinkyMCP.y) / 3,
      z: (wrist.z + indexMCP.z + pinkyMCP.z) / 3,
    };

    // Keep position history for dynamic swipe recognition
    const now = Date.now();
    this.history.push({ x: handCenter.x, y: handCenter.y, time: now });
    // Keep only last 400ms of history
    this.history = this.history.filter((pt) => now - pt.time <= 400);

    // Dynamic swipe detection
    const swipe = this.detectSwipe(now, sensitivity);
    if (swipe) {
      return {
        gesture: swipe,
        confidence: 0.95,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    // Finger Extension Checks
    // A finger is extended when TIP distance to WRIST is greater than PIP distance to WRIST
    const indexDistToWrist = this.distance(indexTip, wrist);
    const indexPipDistToWrist = this.distance(indexPIP, wrist);
    const isIndexExtended = indexDistToWrist > indexPipDistToWrist * 1.15 && indexTip.y < indexPIP.y;

    const middleDistToWrist = this.distance(middleTip, wrist);
    const middlePipDistToWrist = this.distance(middlePIP, wrist);
    const isMiddleExtended = middleDistToWrist > middlePipDistToWrist * 1.15 && middleTip.y < middlePIP.y;

    const ringDistToWrist = this.distance(ringTip, wrist);
    const ringPipDistToWrist = this.distance(ringPIP, wrist);
    const isRingExtended = ringDistToWrist > ringPipDistToWrist * 1.15 && ringTip.y < ringPIP.y;

    const pinkyDistToWrist = this.distance(pinkyTip, wrist);
    const pinkyPipDistToWrist = this.distance(pinkyPIP, wrist);
    const isPinkyExtended = pinkyDistToWrist > pinkyPipDistToWrist * 1.15 && pinkyTip.y < pinkyPIP.y;

    // Finger Curled Checks (Tips are closer to wrist/MCP)
    const isIndexCurled = indexTip.y > indexPIP.y || indexDistToWrist < indexPipDistToWrist * 1.05;
    const isMiddleCurled = middleTip.y > middlePIP.y || middleDistToWrist < middlePipDistToWrist * 1.05;
    const isRingCurled = ringTip.y > ringPIP.y || ringDistToWrist < ringPipDistToWrist * 1.05;
    const isPinkyCurled = pinkyTip.y > pinkyPIP.y || pinkyDistToWrist < pinkyPipDistToWrist * 1.05;

    const allFourCurled = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;

    // Gesture 1: THUMBS_UP (Like Video)
    // Thumb is pointing up (tip y is higher than IP and MCP), while other 4 fingers are curled into fist
    const isThumbUpward = thumbTip.y < thumbIP.y - 0.03 && thumbIP.y < thumbMCP.y;
    const isThumbAboveWrist = thumbTip.y < wrist.y - 0.12;
    if (isThumbUpward && isThumbAboveWrist && allFourCurled) {
      return {
        gesture: 'THUMBS_UP',
        confidence: 0.94,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    // Gesture 2: CLOSED_FIST (Play Video)
    // All 4 fingers curled tightly, thumb folded across fingers
    const thumbFolded = this.distance(thumbTip, indexPIP) < 0.14 || this.distance(thumbTip, middleMCP) < 0.16;
    if (allFourCurled && (thumbFolded || thumbTip.y > indexPIP.y)) {
      return {
        gesture: 'CLOSED_FIST',
        confidence: 0.95,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    // Pinch Detection: distance between thumb tip and index tip (only when not in full fist)
    const pinchDistance = this.distance(thumbTip, indexTip);
    const pinchThreshold = sensitivity === 'high' ? 0.08 : sensitivity === 'low' ? 0.045 : 0.06;

    if (pinchDistance < pinchThreshold && (!allFourCurled || isIndexExtended)) {
      return {
        gesture: 'PINCH',
        confidence: Math.max(0.6, 1 - pinchDistance / pinchThreshold),
        pinchDistance,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    // Gesture 3: TWO_FINGERS (V-Sign / Peace Sign: Fullscreen)
    // Index and Middle are extended, Ring and Pinky are curled
    const vSpread = this.distance2D(indexTip, middleTip);
    if (isIndexExtended && isMiddleExtended && isRingCurled && isPinkyCurled) {
      const confidence = vSpread > 0.03 ? 0.95 : 0.85;
      return {
        gesture: 'TWO_FINGERS',
        confidence,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    // Gesture 4: OPEN_PALM (Pause Video)
    // All 4 fingers extended, thumb extended outward
    const thumbExtendedFromPinky = this.distance(thumbTip, pinkyMCP) > 0.18;
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && thumbExtendedFromPinky) {
      return {
        gesture: 'OPEN_PALM',
        confidence: 0.96,
        handPosition: handCenter,
        rawLandmarks: landmarks,
      };
    }

    return {
      gesture: null,
      confidence: 0,
      handPosition: handCenter,
      rawLandmarks: landmarks,
    };
  }

  /**
   * Detects rapid left-to-right or right-to-left hand velocity
   */
  private detectSwipe(now: number, sensitivity: 'low' | 'normal' | 'high'): GestureType | null {
    if (now - this.lastSwipeTime < this.swipeCooldownMs) return null;
    if (this.history.length < 5) return null;

    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];
    const dt = (newest.time - oldest.time) / 1000;
    if (dt < 0.08 || dt > 0.45) return null;

    const dx = newest.x - oldest.x;
    const dy = Math.abs(newest.y - oldest.y);

    const threshold = sensitivity === 'high' ? 0.10 : sensitivity === 'low' ? 0.18 : 0.13;

    // Movement must be predominantly horizontal (dx >> dy)
    if (Math.abs(dx) > threshold && Math.abs(dx) > dy * 1.5) {
      this.lastSwipeTime = now;
      this.history = [];
      // Note: In webcam video, mirrored x:
      // Moving hand to user's right corresponds to negative dx in unmirrored or positive dx in mirrored.
      // We normalize so:
      // dx > 0: Swipe Right -> Next Video
      // dx < 0: Swipe Left -> Previous Video
      return dx > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT';
    }

    return null;
  }

  public reset() {
    this.history = [];
  }
}
