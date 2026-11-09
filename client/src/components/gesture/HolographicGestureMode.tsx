// client/src/components/gesture/HolographicGestureMode.tsx
// Complete 3D Holographic Gesture Controller for MyTube

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  Volume1,
  ThumbsUp,
  Settings,
  HelpCircle,
  X,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Search,
  Keyboard,
} from 'lucide-react';
import { GestureType, Landmark3D, GestureSettings, HoloModeView } from '../../types/gesture';
import { Video } from '../../types/video';
import { GestureClassifier } from '../../utils/gestureRecognition';
import { loadMediaPipeHands } from '../../utils/mediapipeLoader';
import { HolographicCanvas } from './HolographicCanvas';
import { HolographicKeyboard } from './HolographicKeyboard';
import { GestureCalibrationModal } from './GestureCalibrationModal';
import { hologramAudio } from '../../utils/hologramSounds';

interface HolographicGestureModeProps {
  isOpen: boolean;
  onClose: () => void;
  // Video player control hooks
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onLike?: () => void;
  isLiked?: boolean;
  videoTitle?: string;
  onSelectVideo?: (video: Video) => void;
}

export const HolographicGestureMode: React.FC<HolographicGestureModeProps> = ({
  isOpen,
  onClose,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  volume,
  onVolumeChange,
  onToggleFullscreen,
  isFullscreen = false,
  onLike,
  isLiked = false,
  videoTitle = 'MyTube Holographic Experience',
  onSelectVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const cameraUtilRef = useRef<any>(null);
  const classifierRef = useRef<GestureClassifier>(new GestureClassifier());

  // View state: Controls Mode vs 3D Virtual Keyboard & Search Mode
  const [activeView, setActiveView] = useState<HoloModeView>('controls');

  // Camera & Tracking State
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Gesture Data
  const [currentLandmarks, setCurrentLandmarks] = useState<Landmark3D[] | null>(null);
  const [detectedGesture, setDetectedGesture] = useState<GestureType | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

  // Gesture Lock-on & Cooldown State
  const [lockOnProgress, setLockOnProgress] = useState<number>(0);
  const lockOnTimerRef = useRef<any>(null);
  const candidateGestureRef = useRef<GestureType | null>(null);
  const lastActionTimeRef = useRef<number>(0);
  const actionCooldownMs = 1200; // Anti-accidental repeated action delay

  // Transient HUD action banner
  const [actionBanner, setActionBanner] = useState<{
    text: string;
    icon: React.ReactNode;
    color: string;
  } | null>(null);
  const bannerTimeoutRef = useRef<any>(null);

  // Gesture Settings
  const [settings, setSettings] = useState<GestureSettings>({
    enabled: true,
    sensitivity: 'normal',
    showHologramSkeleton: true,
    showFloatingControls: true,
    soundFeedback: true,
    showMiniCameraFeed: true,
    theme: 'cyber-cyan',
  });

  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync audio engine enabled state
  useEffect(() => {
    hologramAudio.setEnabled(settings.soundFeedback);
  }, [settings.soundFeedback]);

  const showActionBanner = useCallback((text: string, icon: React.ReactNode, color: string = 'cyan') => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setActionBanner({ text, icon, color });
    bannerTimeoutRef.current = setTimeout(() => {
      setActionBanner(null);
    }, 1400);
  }, []);

  // Dispatch video action cleanly
  const executeGestureAction = useCallback(
    (gesture: GestureType, pinchDist?: number, landmarks?: Landmark3D[]) => {
      const now = Date.now();

      // Continuous Pinch -> Volume control
      if (gesture === 'PINCH') {
        if (landmarks && landmarks.length >= 21) {
          // Use vertical hand position for smooth volume control
          const yPos = landmarks[8].y; // 0 (top of screen) to 1 (bottom)
          const newVol = Math.round(Math.min(100, Math.max(0, (1 - yPos) * 100)));
          onVolumeChange(newVol);
          hologramAudio.playVolumeTick();
          showActionBanner(
            `VOLUME: ${newVol}%`,
            <Volume2 className="w-6 h-6 text-yellow-400" />,
            'yellow'
          );
        }
        return;
      }

      // Discrete Gestures with cooldown to prevent accidental repeat
      if (now - lastActionTimeRef.current < actionCooldownMs) return;

      switch (gesture) {
        case 'OPEN_PALM':
          if (isPlaying) {
            onPause();
            lastActionTimeRef.current = now;
            hologramAudio.playGestureConfirmed();
            showActionBanner('PAUSED', <Pause className="w-6 h-6 text-amber-400" />, 'amber');
          }
          break;

        case 'CLOSED_FIST':
          if (!isPlaying) {
            onPlay();
            lastActionTimeRef.current = now;
            hologramAudio.playGestureConfirmed();
            showActionBanner('PLAYING', <Play className="w-6 h-6 text-emerald-400 fill-emerald-400" />, 'emerald');
          }
          break;

        case 'SWIPE_RIGHT':
          if (onNext) {
            onNext();
            lastActionTimeRef.current = now;
            hologramAudio.playSwipeWhoosh();
            showActionBanner('NEXT VIDEO', <FastForward className="w-6 h-6 text-cyan-400" />, 'cyan');
          }
          break;

        case 'SWIPE_LEFT':
          if (onPrev) {
            onPrev();
            lastActionTimeRef.current = now;
            hologramAudio.playSwipeWhoosh();
            showActionBanner('PREVIOUS VIDEO', <Rewind className="w-6 h-6 text-blue-400" />, 'blue');
          }
          break;

        case 'TWO_FINGERS':
          if (onToggleFullscreen) {
            onToggleFullscreen();
            lastActionTimeRef.current = now;
            hologramAudio.playGestureConfirmed();
            showActionBanner(
              isFullscreen ? 'EXIT FULLSCREEN' : 'HOLOGRAPHIC FULLSCREEN',
              <Maximize2 className="w-6 h-6 text-purple-400" />,
              'purple'
            );
          }
          break;

        case 'THUMBS_UP':
          if (onLike) {
            onLike();
            lastActionTimeRef.current = now;
            hologramAudio.playGestureConfirmed();
            showActionBanner(
              isLiked ? 'REACTION UPDATED' : 'LIKED VIDEO 👍',
              <ThumbsUp className="w-6 h-6 text-pink-400 fill-pink-400" />,
              'pink'
            );
          }
          break;
      }
    },
    [isPlaying, onPlay, onPause, onNext, onPrev, onVolumeChange, onToggleFullscreen, isFullscreen, onLike, isLiked, showActionBanner]
  );

  // Stop Webcam Stream cleanly and release hardware
  const stopCameraStream = useCallback(() => {
    if (cameraUtilRef.current) {
      try {
        cameraUtilRef.current.stop();
      } catch {}
      cameraUtilRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setCurrentLandmarks(null);
    setDetectedGesture(null);
  }, []);

  // Request camera access and initialize MediaPipe Hands
  const startCamera = async () => {
    setIsCameraLoading(true);
    setErrorMessage(null);

    try {
      // 1. Check navigator.mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media devices API is not supported in this browser environment.');
      }

      // 2. Request user permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 3. Load MediaPipe Hands scripts
      const loaded = await loadMediaPipeHands();
      if (!loaded || !window.Hands) {
        console.warn('MediaPipe loaded in local fallback mode.');
      } else {
        // Instantiate MediaPipe Hands
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        hands.onResults((results: any) => {
          if (!settings.enabled) return;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const raw = results.multiHandLandmarks[0];
            const landmarks: Landmark3D[] = raw.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z || 0,
            }));
            setCurrentLandmarks(landmarks);

            // Classify gesture
            const evalResult = classifierRef.current.classify(landmarks, settings.sensitivity);
            const gesture = evalResult.gesture;
            setDetectedGesture(gesture);
            setConfidence(evalResult.confidence);

            if (gesture) {
              // Pinch triggers continuous volume adjustment immediately
              if (gesture === 'PINCH') {
                executeGestureAction('PINCH', evalResult.pinchDistance, landmarks);
                return;
              }

              // Discrete gestures require a brief hold lock-on (0.22s) to prevent false fires
              if (candidateGestureRef.current === gesture) {
                setLockOnProgress((prev) => {
                  const next = prev + 0.25;
                  if (next >= 1) {
                    executeGestureAction(gesture, undefined, landmarks);
                    candidateGestureRef.current = null;
                    return 0;
                  }
                  return next;
                });
              } else {
                candidateGestureRef.current = gesture;
                setLockOnProgress(0.2);
                hologramAudio.playLockOn();
              }
            } else {
              candidateGestureRef.current = null;
              setLockOnProgress(0);
            }
          } else {
            setCurrentLandmarks(null);
            setDetectedGesture(null);
            setConfidence(0);
            candidateGestureRef.current = null;
            setLockOnProgress(0);
          }
        });

        handsRef.current = hands;

        // Camera Utils loop
        if (window.Camera && videoRef.current) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsRef.current) {
                try {
                  await handsRef.current.send({ image: videoRef.current });
                } catch {}
              }
            },
            width: 640,
            height: 480,
          });
          camera.start();
          cameraUtilRef.current = camera;
        }
      }

      setIsCameraActive(true);
      hologramAudio.playPowerOn();
      showActionBanner('HOLOGRAPHIC CAMERA ACTIVE', <Sparkles className="w-6 h-6 text-cyan-400" />, 'cyan');
    } catch (err: any) {
      console.warn('Webcam activation error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setErrorMessage('Camera access was declined. You can enable camera in browser settings or use manual controls below.');
      } else {
        setErrorMessage(err.message || 'Unable to access laptop webcam.');
      }
      stopCameraStream();
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Toggle Camera Switch
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCameraStream();
      showActionBanner('CAMERA DEACTIVATED', <CameraOff className="w-6 h-6 text-neutral-400" />, 'neutral');
    } else {
      startCamera();
    }
  };

  // Cleanup on unmount or when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      if (lockOnTimerRef.current) clearTimeout(lockOnTimerRef.current);
    };
  }, [isOpen, stopCameraStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-xl text-neutral-100 select-none animate-in fade-in duration-300">
      {/* 1. Cyber Ambient Holographic Background Grid & Particle Canvas */}
      <HolographicCanvas
        landmarks={currentLandmarks}
        detectedGesture={detectedGesture}
        volumePercent={volume}
        isPlaying={isPlaying}
        theme={settings.theme}
        showSkeleton={settings.showHologramSkeleton}
        showFloatingControls={settings.showFloatingControls}
      />

      {/* 2. Top Futuristic HUD Header */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-cyan-500/30 bg-black/50 backdrop-blur-md">
        {/* Left: Hologram Branding */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-emerald-500/30 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 uppercase">
                MyTube 3D Holographic Gesture Mode
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                AI Vision v2.0
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-sm sm:max-w-md mt-0.5">
              Control: <span className="text-neutral-200 font-semibold">{videoTitle}</span>
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher & Live Gesture HUD Pill */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher: Player Controls vs 3D Virtual Keyboard & Search */}
          <div className="flex items-center p-0.5 rounded-full bg-neutral-950/80 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <button
              onClick={() => setActiveView('controls')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeView === 'controls'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3" />
              <span className="hidden sm:inline">3D Controls</span>
            </button>
            <button
              onClick={() => setActiveView('search_keyboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeView === 'search_keyboard'
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.5)] font-extrabold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>3D Keyboard & Search</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-300">
              {detectedGesture ? (
                <span className="font-extrabold tracking-wide text-emerald-300">
                  GESTURE: {detectedGesture.replace('_', ' ')} ({(confidence * 100).toFixed(0)}%)
                </span>
              ) : isCameraActive ? (
                'AWAITING HAND GESTURE...'
              ) : (
                'CAMERA STANDBY'
              )}
            </span>
            {lockOnProgress > 0 && (
              <div className="w-12 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, lockOnProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2">
          {/* Camera ON/OFF Switch */}
          <button
            onClick={toggleCamera}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
              isCameraActive
                ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-[0_0_15px_rgba(0,255,157,0.3)]'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white'
            }`}
            title="Toggle Webcam Tracking"
          >
            {isCameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            <span>Camera {isCameraActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Gesture Guide & Calibration Modal Button */}
          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            title="Gesture Guide & Calibration"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Settings Gear Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Hologram Settings"
            >
              <Settings className={`w-4 h-4 ${isSettingsOpen ? 'rotate-45' : ''} transition-transform`} />
            </button>

            {/* In-HUD Settings Dropdown Menu */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-11 w-64 p-3 bg-neutral-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.25)] text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="font-bold text-cyan-300 pb-2 mb-2 border-b border-neutral-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Hologram Options</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>

                {/* Sensitivity Selector */}
                <div className="mb-3">
                  <span className="text-neutral-400 block mb-1.5">Gesture Sensitivity</span>
                  <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-lg border border-neutral-800">
                    {(['low', 'normal', 'high'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSettings((s) => ({ ...s, sensitivity: lvl }))}
                        className={`py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          settings.sensitivity === lvl
                            ? 'bg-cyan-500 text-black shadow-xs'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Show 3D Skeleton */}
                <label className="flex items-center justify-between py-1.5 cursor-pointer text-neutral-300">
                  <span>3D Hand Skeleton</span>
                  <input
                    type="checkbox"
                    checked={settings.showHologramSkeleton}
                    onChange={(e) => setSettings((s) => ({ ...s, showHologramSkeleton: e.target.checked }))}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                {/* Toggle Floating 3D Controls */}
                <label className="flex items-center justify-between py-1.5 cursor-pointer text-neutral-300">
                  <span>Floating 3D Controls</span>
                  <input
                    type="checkbox"
                    checked={settings.showFloatingControls}
                    onChange={(e) => setSettings((s) => ({ ...s, showFloatingControls: e.target.checked }))}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                {/* Toggle Sound Effects */}
                <label className="flex items-center justify-between py-1.5 cursor-pointer text-neutral-300">
                  <span>Futuristic Sound FX</span>
                  <input
                    type="checkbox"
                    checked={settings.soundFeedback}
                    onChange={(e) => setSettings((s) => ({ ...s, soundFeedback: e.target.checked }))}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                {/* Toggle Mini Camera Feed */}
                <label className="flex items-center justify-between py-1.5 cursor-pointer text-neutral-300">
                  <span>Mini Camera HUD</span>
                  <input
                    type="checkbox"
                    checked={settings.showMiniCameraFeed}
                    onChange={(e) => setSettings((s) => ({ ...s, showMiniCameraFeed: e.target.checked }))}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Close Gesture Mode */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer ml-1"
            title="Exit Holographic Gesture Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. Center Workspace Area */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {/* Action Confirmation Banner Overlay */}
        {actionBanner && (
          <div className="absolute top-4 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-cyan-400/60 shadow-[0_0_35px_rgba(0,240,255,0.4)] animate-in fade-in zoom-in-95 duration-150">
            {actionBanner.icon}
            <span className="text-base font-extrabold tracking-wider text-white uppercase">
              {actionBanner.text}
            </span>
          </div>
        )}

        {/* VIEW 1: 3D VIRTUAL KEYBOARD & VIDEO SEARCH VIEW */}
        {activeView === 'search_keyboard' ? (
          <div className="w-full flex justify-center py-2 animate-in fade-in zoom-in-95 duration-200">
            <HolographicKeyboard
              landmarks={currentLandmarks}
              detectedGesture={detectedGesture}
              onSelectVideo={(video) => {
                if (onSelectVideo) onSelectVideo(video);
                setActiveView('controls');
                showActionBanner(`NOW PLAYING`, <Play className="w-6 h-6 text-emerald-400 fill-emerald-400" />, 'emerald');
              }}
              onClose={onClose}
              onSwitchToControls={() => setActiveView('controls')}
            />
          </div>
        ) : (
          /* VIEW 2: 3D PLAYER CONTROLS VIEW */
          <>
            {/* Initial Camera Permission Card (Shown when camera is inactive) */}
            {!isCameraActive && (
              <div className="relative z-30 max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0b1424]/90 via-[#060b14]/90 to-[#02050a]/90 border border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                  <Camera className="w-8 h-8" />
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2">
                  Activate 3D Holographic Hand Vision
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto mb-5">
                  Control video playback, volume, fullscreen, and mid-air search using your laptop webcam and on-device MediaPipe AI hand tracking.
                </p>

                {/* Privacy Guarantee Pill */}
                <div className="mb-6 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3 text-left">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Privacy Guarantee</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                      Your webcam stream is analyzed 100% locally in your browser. No video, images, or audio are ever recorded or sent to any server.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 text-left">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={startCamera}
                    disabled={isCameraLoading}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-extrabold text-xs tracking-wider transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCameraLoading ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin text-black" />
                        <span>Initializing MediaPipe...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>Grant Camera & Start</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveView('search_keyboard')}
                    className="w-full sm:w-auto px-5 py-3 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>Open 3D Keyboard</span>
                  </button>

                  <button
                    onClick={() => setIsCalibrationOpen(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View Guide
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Hidden Camera Video Capture Element (or Mini HUD View) */}
        <div
          className={`absolute bottom-20 left-6 z-30 transition-all duration-300 ${
            isCameraActive && settings.showMiniCameraFeed
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <div className="relative w-44 aspect-video rounded-2xl overflow-hidden bg-black/80 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            {/* Cyber Reticle Overlay */}
            <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none flex flex-col justify-between p-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
                <span>{detectedGesture || 'SEARCHING'}</span>
              </div>
              <div className="text-[8px] font-mono text-neutral-400 text-right">
                30 FPS • MediaPipe
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Bottom Manual Fallback Control Bar */}
      <footer className="relative z-30 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8 py-3.5 border-t border-cyan-500/30 bg-black/60 backdrop-blur-md">
        {/* Left: Quick Status & Gesture Prompt */}
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-neutral-400">
            {isCameraActive ? (
              <span>
                Active Gesture:{' '}
                <strong className="text-cyan-300 uppercase">
                  {detectedGesture ? detectedGesture.replace('_', ' ') : 'None'}
                </strong>
              </span>
            ) : (
              'Manual Touch & Mouse Fallback Controls Active'
            )}
          </span>
        </div>

        {/* Center: High-Tech Floating Holographic Media Controls (Manual Fallback) */}
        <div className="flex items-center gap-2 bg-neutral-950/80 p-1.5 rounded-full border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          {/* Previous Video (Swipe Left Fallback) */}
          {onPrev && (
            <button
              onClick={() => {
                onPrev();
                hologramAudio.playSwipeWhoosh();
                showActionBanner('PREVIOUS VIDEO', <Rewind className="w-5 h-5 text-blue-400" />, 'blue');
              }}
              className="p-2 rounded-full hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Previous Video (Swipe Left)"
            >
              <Rewind className="w-4 h-4" />
            </button>
          )}

          {/* Play / Pause (Fist / Palm Fallback) */}
          <button
            onClick={() => {
              if (isPlaying) {
                onPause();
                hologramAudio.playGestureConfirmed();
                showActionBanner('PAUSED', <Pause className="w-5 h-5 text-amber-400" />, 'amber');
              } else {
                onPlay();
                hologramAudio.playGestureConfirmed();
                showActionBanner('PLAYING', <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />, 'emerald');
              }
            }}
            className="p-2.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            title={isPlaying ? 'Pause (Open Palm)' : 'Play (Closed Fist)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-cyan-300" />
            ) : (
              <Play className="w-5 h-5 fill-cyan-300 ml-0.5" />
            )}
          </button>

          {/* Next Video (Swipe Right Fallback) */}
          {onNext && (
            <button
              onClick={() => {
                onNext();
                hologramAudio.playSwipeWhoosh();
                showActionBanner('NEXT VIDEO', <FastForward className="w-5 h-5 text-cyan-400" />, 'cyan');
              }}
              className="p-2 rounded-full hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Next Video (Swipe Right)"
            >
              <FastForward className="w-4 h-4" />
            </button>
          )}

          {/* Volume Slider (Pinch Fallback) */}
          <div className="flex items-center gap-1.5 px-3 border-l border-neutral-800">
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onVolumeChange(val);
                hologramAudio.playVolumeTick();
              }}
              className="w-20 h-1 bg-white/20 accent-cyan-400 rounded-lg cursor-pointer"
              title="Volume (Pinch Gesture)"
            />
            <span className="text-[10px] font-mono text-cyan-300 w-7 text-right">
              {volume}%
            </span>
          </div>

          {/* Fullscreen (Two Fingers Fallback) */}
          {onToggleFullscreen && (
            <button
              onClick={() => {
                onToggleFullscreen();
                hologramAudio.playGestureConfirmed();
                showActionBanner(
                  isFullscreen ? 'EXIT FULLSCREEN' : 'HOLOGRAPHIC FULLSCREEN',
                  <Maximize2 className="w-5 h-5 text-purple-400" />,
                  'purple'
                );
              }}
              className="p-2 rounded-full hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Toggle Fullscreen (Two Fingers V-Sign)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Like Video (Thumbs Up Fallback) */}
          {onLike && (
            <button
              onClick={() => {
                onLike();
                hologramAudio.playGestureConfirmed();
                showActionBanner(
                  isLiked ? 'REACTION UPDATED' : 'LIKED VIDEO 👍',
                  <ThumbsUp className="w-5 h-5 text-pink-400 fill-pink-400" />,
                  'pink'
                );
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-400/50 shadow-[0_0_12px_rgba(255,0,128,0.4)]'
                  : 'hover:bg-cyan-500/20 text-neutral-300 hover:text-pink-400'
              }`}
              title="Like Video (Thumbs Up Gesture)"
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Right: 3D Keyboard Quick Toggle & Calibration */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView(activeView === 'search_keyboard' ? 'controls' : 'search_keyboard')}
            className="px-3 py-1.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{activeView === 'search_keyboard' ? 'Back to Controls' : 'Open 3D Keyboard'}</span>
          </button>

          <button
            onClick={() => setIsCalibrationOpen(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Calibrate Gestures</span>
          </button>
        </div>
      </footer>

      {/* 5. Gesture Calibration & Guide Modal */}
      <GestureCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentDetectedGesture={detectedGesture}
        cameraActive={isCameraActive}
        onToggleCamera={toggleCamera}
      />
    </div>
  );
};
