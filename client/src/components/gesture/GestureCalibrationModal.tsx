// client/src/components/gesture/GestureCalibrationModal.tsx
// Interactive Holographic Calibration Screen & Gesture Guide

import React from 'react';
import {
  X,
  Hand,
  Play,
  Pause,
  FastForward,
  Rewind,
  Volume2,
  Maximize,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  Camera,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { GestureType } from '../../types/gesture';

interface GestureCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDetectedGesture: GestureType | null;
  cameraActive: boolean;
  onToggleCamera: () => void;
}

interface GestureGuideItem {
  id: GestureType;
  title: string;
  action: string;
  icon: React.ReactNode;
  gestureDescription: string;
  tip: string;
}

const GESTURE_GUIDES: GestureGuideItem[] = [
  {
    id: 'OPEN_PALM',
    title: 'Open Palm',
    action: 'Pause Video',
    icon: <Pause className="w-5 h-5 text-amber-400" />,
    gestureDescription: 'Open all 5 fingers flat facing the camera.',
    tip: 'Hold your palm steady for 0.3s to freeze playback.',
  },
  {
    id: 'CLOSED_FIST',
    title: 'Closed Fist',
    action: 'Play Video',
    icon: <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />,
    gestureDescription: 'Curl all fingers into a tight fist with thumb folded.',
    tip: 'Clench your fist to resume playback instantly.',
  },
  {
    id: 'SWIPE_RIGHT',
    title: 'Swipe Right',
    action: 'Next Video',
    icon: <FastForward className="w-5 h-5 text-cyan-400" />,
    gestureDescription: 'Wave your open hand swiftly from left to right.',
    tip: 'A crisp horizontal swipe advances to the next video.',
  },
  {
    id: 'SWIPE_LEFT',
    title: 'Swipe Left',
    action: 'Previous Video',
    icon: <Rewind className="w-5 h-5 text-blue-400" />,
    gestureDescription: 'Wave your hand from right to left across the screen.',
    tip: 'Replays or jumps to the previous video.',
  },
  {
    id: 'PINCH',
    title: 'Pinch Distance',
    action: 'Volume Control',
    icon: <Volume2 className="w-5 h-5 text-yellow-400" />,
    gestureDescription: 'Touch thumb and index fingertips together.',
    tip: 'Move your hand up/down or spread fingers to adjust volume.',
  },
  {
    id: 'TWO_FINGERS',
    title: 'Two Fingers (V Sign)',
    action: 'Toggle Fullscreen',
    icon: <Maximize className="w-5 h-5 text-purple-400" />,
    gestureDescription: 'Raise Index & Middle fingers like a peace sign.',
    tip: 'Instantly expands or exits holographic cinema fullscreen.',
  },
  {
    id: 'THUMBS_UP',
    title: 'Thumbs Up',
    action: 'Like Video',
    icon: <ThumbsUp className="w-5 h-5 text-pink-400 fill-pink-400" />,
    gestureDescription: 'Make a fist with your thumb pointing upright.',
    tip: 'Triggers a golden holographic burst and likes the video.',
  },
];

export const GestureCalibrationModal: React.FC<GestureCalibrationModalProps> = ({
  isOpen,
  onClose,
  currentDetectedGesture,
  cameraActive,
  onToggleCamera,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-[#0b101b] via-[#080d16] to-[#04070c] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden text-neutral-100">
        {/* Hologram Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                3D Holographic Gesture Calibration & Guide
              </h2>
              <p className="text-xs text-neutral-400">
                Practice each gesture in front of your camera. Watch cards illuminate in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleCamera}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                cameraActive
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(0,255,157,0.3)]'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera: {cameraActive ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Detected Banner */}
        <div className="px-6 py-2.5 bg-cyan-950/30 border-b border-cyan-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-neutral-400 font-medium">Live Neural Detector:</span>
            <span className="font-extrabold text-cyan-300 uppercase tracking-wide">
              {currentDetectedGesture
                ? `${currentDetectedGesture.replace('_', ' ')} (Active)`
                : 'Awaiting Hand Gesture...'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% On-Device Neural Processing</span>
          </div>
        </div>

        {/* Gestures Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {GESTURE_GUIDES.map((item) => {
              const isMatched = currentDetectedGesture === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                    isMatched
                      ? 'bg-gradient-to-br from-cyan-950/60 to-emerald-950/40 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)] scale-[1.02]'
                      : 'bg-black/40 border-cyan-900/40 hover:border-cyan-700/50'
                  }`}
                >
                  {isMatched && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-extrabold animate-pulse">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>DETECTED</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-white/10 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </h4>
                      <p className="text-xs font-semibold text-cyan-300 mt-0.5">
                        {item.action}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                    {item.gestureDescription}
                  </p>
                  <p className="text-[11px] text-neutral-400 italic mt-1.5 bg-white/5 p-1.5 rounded-lg border border-white/5">
                    💡 {item.tip}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Optimal Setup Instructions */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Optimal 3D Tracking Environment
                </h5>
                <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                  Position your webcam 1.5 – 3 feet away. Maintain clear ambient room lighting and keep your hand within the center frame.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] shrink-0 cursor-pointer"
            >
              Start Hologram Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
