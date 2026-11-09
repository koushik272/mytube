// client/src/components/gesture/HolographicKeyboard.tsx
// Futuristic 3D Virtual Holographic Keyboard & Hand-Gesture Video Selector

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Delete,
  X,
  Play,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Flame,
  Volume2,
  Check,
  Zap,
  CornerDownLeft,
} from 'lucide-react';
import { Landmark3D, HandCursor } from '../../types/gesture';
import { hologramAudio } from '../../utils/hologramSounds';
import { searchYouTubeVideos, getYouTubeSearchSuggestions } from '../../services/youtubeApi';
import { Video } from '../../types/video';
import { formatViews } from '../../utils/formatters';

interface HolographicKeyboardProps {
  landmarks: Landmark3D[] | null;
  detectedGesture: string | null;
  onSelectVideo: (video: Video) => void;
  onClose?: () => void;
  onSwitchToControls?: () => void;
}

// 4 Rows QWERTY Virtual Keyboard Layout
const KEYBOARD_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'BACKSPACE'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'CLEAR'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'SPACE', 'SEARCH'],
];

// Quick Search Topic Chips for rapid selection
const QUICK_SEARCH_CHIPS = [
  'Virat Kohli',
  'Cricket highlights',
  'Technology',
  'Music hits',
  'Trending news',
  'Movie trailers',
  'Gaming',
];

export const HolographicKeyboard: React.FC<HolographicKeyboardProps> = ({
  landmarks,
  detectedGesture,
  onSelectVideo,
  onClose,
  onSwitchToControls,
}) => {
  // Search query & typing state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'keyboard' | 'results'>('keyboard');

  // Hand pointer cursor state
  const [cursor, setCursor] = useState<HandCursor>({
    screenX: window.innerWidth / 2,
    screenY: window.innerHeight / 2,
    normX: 0.5,
    normY: 0.5,
    isPinching: false,
    pinchDistance: 1,
    isHandPresent: false,
  });

  // Smoothing refs for cursor
  const smoothXRef = useRef<number>(window.innerWidth / 2);
  const smoothYRef = useRef<number>(window.innerHeight / 2);

  // Dwell timer & hit-testing state
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0); // 0 to 1
  const dwellTimerRef = useRef<any>(null);
  const dwellTargetRef = useRef<string | null>(null);
  const lastKeyActionTimeRef = useRef<number>(0);

  // Key feedback animation states
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Registry of bounding boxes of interactable keys & video cards
  const elementsRegistryRef = useRef<Map<string, { rect: DOMRect; onTrigger: () => void }>>(new Map());

  // 1. Hand Tracking Cursor Calculation
  useEffect(() => {
    if (!landmarks || landmarks.length < 21) {
      setCursor((prev) => ({ ...prev, isHandPresent: false, isPinching: false }));
      setHoveredElementId(null);
      setDwellProgress(0);
      return;
    }

    // Landmark 8 = Index Fingertip
    const indexTip = landmarks[8];
    // Landmark 4 = Thumb Tip
    const thumbTip = landmarks[4];

    // Mirror X coordinate because webcam is front-facing
    const normX = 1 - Math.min(1, Math.max(0, indexTip.x));
    const normY = Math.min(1, Math.max(0, indexTip.y));

    // Target screen coordinates
    const targetX = normX * window.innerWidth;
    const targetY = normY * window.innerHeight;

    // Exponential moving average for buttery smooth 60fps tracking
    const alpha = 0.35;
    smoothXRef.current = smoothXRef.current * (1 - alpha) + targetX * alpha;
    smoothYRef.current = smoothYRef.current * (1 - alpha) + targetY * alpha;

    // Euclidean distance between Thumb Tip (4) and Index Tip (8)
    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const dz = (indexTip.z || 0) - (thumbTip.z || 0);
    const pinchDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const isPinching = pinchDist < 0.055 || detectedGesture === 'PINCH';

    setCursor({
      screenX: smoothXRef.current,
      screenY: smoothYRef.current,
      normX,
      normY,
      isPinching,
      pinchDistance: pinchDist,
      isHandPresent: true,
    });
  }, [landmarks, detectedGesture]);

  // 2. Fetch live YouTube suggestions as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const suggs = await getYouTubeSearchSuggestions(searchQuery.trim());
        setSuggestions(suggs.slice(0, 4));
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Execute YouTube Search
  const handleExecuteSearch = useCallback(
    async (queryToSearch?: string) => {
      const q = (queryToSearch || searchQuery).trim();
      if (!q) return;

      setIsSearching(true);
      setHasSearched(true);
      setActiveTab('results');
      hologramAudio.playSearchWhoosh();

      try {
        const res = await searchYouTubeVideos(q);
        setSearchResults(res.items || []);
      } catch (err) {
        console.error('Holographic search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery]
  );

  // 4. Handle Key Input (via Hand Gesture or Mouse)
  const handleKeyAction = useCallback(
    (key: string) => {
      const now = Date.now();
      // Debounce key presses slightly (220ms) to avoid double registration
      if (now - lastKeyActionTimeRef.current < 220) return;
      lastKeyActionTimeRef.current = now;

      setPressedKey(key);
      setTimeout(() => setPressedKey(null), 180);

      if (key === 'BACKSPACE') {
        hologramAudio.playKeyDelete();
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (key === 'CLEAR') {
        hologramAudio.playKeyDelete();
        setSearchQuery('');
        setSuggestions([]);
      } else if (key === 'SPACE') {
        hologramAudio.playKeyClick();
        setSearchQuery((prev) => prev + ' ');
      } else if (key === 'SEARCH') {
        handleExecuteSearch();
      } else {
        hologramAudio.playKeyClick();
        setSearchQuery((prev) => prev + key);
      }
    },
    [handleExecuteSearch]
  );

  // 5. Select Video with Hand Gesture or Click
  const handleSelectVideo = useCallback(
    (video: Video) => {
      hologramAudio.playVideoSelect();
      onSelectVideo(video);
      if (onSwitchToControls) {
        onSwitchToControls();
      }
    },
    [onSelectVideo, onSwitchToControls]
  );

  // 6. Hit Testing between Cursor (Index Fingertip) and Interactable Elements
  useEffect(() => {
    if (!cursor.isHandPresent) {
      if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      setHoveredElementId(null);
      setDwellProgress(0);
      return;
    }

    const cx = cursor.screenX;
    const cy = cursor.screenY;

    // Check collision with registered interactable DOM rectangles
    let hitId: string | null = null;
    let hitTrigger: (() => void) | null = null;

    for (const [id, entry] of elementsRegistryRef.current.entries()) {
      const r = entry.rect;
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        hitId = id;
        hitTrigger = entry.onTrigger;
        break;
      }
    }

    setHoveredElementId(hitId);

    // If pinching while hovering an element -> trigger immediately!
    if (hitId && hitTrigger && cursor.isPinching) {
      const now = Date.now();
      if (now - lastKeyActionTimeRef.current > 300) {
        lastKeyActionTimeRef.current = now;
        hitTrigger();
        setDwellProgress(0);
        return;
      }
    }

    // Dwell Lock-on Timer (380ms hover to auto-type)
    if (hitId && hitTrigger) {
      if (dwellTargetRef.current !== hitId) {
        dwellTargetRef.current = hitId;
        setDwellProgress(0.15);
      } else {
        setDwellProgress((prev) => {
          const next = prev + 0.15;
          if (next >= 1) {
            hitTrigger!();
            dwellTargetRef.current = null;
            return 0;
          }
          return next;
        });
      }
    } else {
      dwellTargetRef.current = null;
      setDwellProgress(0);
    }
  }, [cursor.screenX, cursor.screenY, cursor.isHandPresent, cursor.isPinching]);

  // Helper to register interactable DOM bounding boxes
  const registerElement = (id: string, el: HTMLElement | null, onTrigger: () => void) => {
    if (!el) {
      elementsRegistryRef.current.delete(id);
      return;
    }
    const rect = el.getBoundingClientRect();
    elementsRegistryRef.current.set(id, { rect, onTrigger });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center z-40 select-none px-4">
      {/* 3D Hand Cursor Pointer Overlay */}
      {cursor.isHandPresent && (
        <div
          style={{
            transform: `translate3d(${cursor.screenX - 24}px, ${cursor.screenY - 24}px, 0)`,
            transition: 'transform 0.04s cubic-bezier(0.1, 0.9, 0.2, 1)',
          }}
          className="fixed top-0 left-0 pointer-events-none z-50 flex items-center justify-center w-12 h-12"
        >
          {/* Outer Pulsing Reticle */}
          <div
            className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${
              cursor.isPinching
                ? 'border-yellow-400 bg-yellow-400/20 scale-125 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                : hoveredElementId
                ? 'border-cyan-300 bg-cyan-400/20 scale-110 shadow-[0_0_25px_rgba(0,240,255,0.7)] animate-pulse'
                : 'border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
            }`}
          />

          {/* Dwell Progress Ring SVG */}
          {dwellProgress > 0 && (
            <svg className="absolute w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="rgba(0, 240, 255, 0.25)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="3.5"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 * (1 - dwellProgress)}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>
          )}

          {/* Center Target Dot */}
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              cursor.isPinching ? 'bg-yellow-300 scale-150' : 'bg-cyan-300'
            }`}
          />

          {/* Coordinate Readout Badge */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 whitespace-nowrap shadow-xs">
            {cursor.isPinching ? '⚡ PINCH TAP' : hoveredElementId ? '🎯 LOCK-ON' : '👆 INDEX POINTER'}
          </div>
        </div>
      )}

      {/* Top Holographic Navigation Header & Mode Toggles */}
      <div className="w-full flex items-center justify-between mb-3 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
        {/* Left: Futuristic Mode Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-xs font-mono font-bold text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
            <span>3D GESTURE KEYBOARD</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-neutral-400">
            <span>Point Index Finger • Pinch or Hover to Type</span>
          </div>
        </div>

        {/* Center / Right: Tab switcher (Keyboard vs Results) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('keyboard')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'keyboard'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-neutral-900/80 text-neutral-300 hover:text-white border border-neutral-700'
            }`}
          >
            Virtual Keyboard
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'results'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'bg-neutral-900/80 text-neutral-300 hover:text-white border border-neutral-700'
            }`}
          >
            <span>Search Results</span>
            {searchResults.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-900 text-[10px] text-cyan-300">
                {searchResults.length}
              </span>
            )}
          </button>

          {onSwitchToControls && (
            <button
              onClick={onSwitchToControls}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
            >
              Player Controls
            </button>
          )}
        </div>
      </div>

      {/* Holographic Glowing Search Input Display */}
      <div className="w-full relative mb-4">
        <div className="relative flex items-center w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0b1426]/90 via-[#07111e]/90 to-[#0b1426]/90 border-2 border-cyan-400/80 shadow-[0_0_35px_rgba(0,240,255,0.35)] backdrop-blur-xl">
          <Search className="w-5 h-5 text-cyan-400 shrink-0 mr-3 animate-pulse" />

          {/* Typed text or placeholder */}
          <div className="flex-1 flex items-center text-lg sm:text-xl font-mono tracking-wider text-white overflow-hidden whitespace-nowrap">
            {searchQuery ? (
              <span className="text-cyan-100 font-bold">{searchQuery}</span>
            ) : (
              <span className="text-neutral-500 italic">Type query with 3D hand gestures or select a topic below...</span>
            )}
            {/* Blinking Sci-Fi Cursor */}
            <span className="w-2.5 h-6 bg-cyan-400 ml-1 rounded-xs animate-pulse shadow-[0_0_8px_#00f0ff]" />
          </div>

          {/* Quick Clear Button */}
          {searchQuery && (
            <button
              ref={(el) => registerElement('search_clear_btn', el, () => handleKeyAction('CLEAR'))}
              onClick={() => handleKeyAction('CLEAR')}
              className={`p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-red-400 transition-colors mr-2 cursor-pointer ${
                hoveredElementId === 'search_clear_btn' ? 'ring-2 ring-red-400 bg-red-500/20' : ''
              }`}
              title="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Trigger Button */}
          <button
            ref={(el) => registerElement('search_trigger_btn', el, () => handleExecuteSearch())}
            onClick={() => handleExecuteSearch()}
            disabled={!searchQuery.trim() || isSearching}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-extrabold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-40 ${
              hoveredElementId === 'search_trigger_btn' ? 'ring-2 ring-yellow-300 scale-105' : ''
            }`}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>SEARCHING...</span>
              </>
            ) : (
              <>
                <span>SEARCH</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Live Auto-Complete Suggestions Bar */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 flex flex-wrap gap-2 p-2 bg-neutral-950/90 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <span className="text-[10px] font-mono text-cyan-400 self-center px-2">Suggestions:</span>
            {suggestions.map((sugg, idx) => {
              const id = `sugg_${idx}`;
              return (
                <button
                  key={id}
                  ref={(el) =>
                    registerElement(id, el, () => {
                      setSearchQuery(sugg);
                      handleExecuteSearch(sugg);
                    })
                  }
                  onClick={() => {
                    setSearchQuery(sugg);
                    handleExecuteSearch(sugg);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono text-cyan-200 bg-cyan-950/60 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all cursor-pointer ${
                    hoveredElementId === id ? 'ring-2 ring-yellow-400 bg-cyan-500/40 scale-105' : ''
                  }`}
                >
                  {sugg}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Search Topic Pills */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <Flame className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
        <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
          Trending Topics:
        </span>
        {QUICK_SEARCH_CHIPS.map((chip, idx) => {
          const chipId = `chip_${idx}`;
          return (
            <button
              key={chipId}
              ref={(el) =>
                registerElement(chipId, el, () => {
                  setSearchQuery(chip);
                  handleExecuteSearch(chip);
                })
              }
              onClick={() => {
                setSearchQuery(chip);
                handleExecuteSearch(chip);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                hoveredElementId === chipId
                  ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)] scale-105'
                  : 'bg-neutral-900/70 hover:bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-cyan-500/50'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: 3D VIRTUAL KEYBOARD */}
      {activeTab === 'keyboard' && (
        <div
          style={{
            perspective: '1200px',
            transformStyle: 'preserve-3d',
          }}
          className="w-full flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#060c18]/90 via-[#040810]/90 to-[#020408]/90 border border-cyan-500/40 shadow-[0_0_60px_rgba(0,240,255,0.2)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Isometric 3D Tilted Keyboard Bed */}
          <div
            style={{
              transform: 'rotateX(8deg)',
              transformStyle: 'preserve-3d',
            }}
            className="w-full flex flex-col gap-2.5 max-w-4xl"
          >
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={`row-${rIdx}`} className="flex items-center justify-center gap-1.5 sm:gap-2">
                {row.map((k) => {
                  const keyId = `key_${k}`;
                  const isHovered = hoveredElementId === keyId;
                  const isPressed = pressedKey === k;
                  const isSpecial = k === 'BACKSPACE' || k === 'CLEAR' || k === 'SPACE' || k === 'SEARCH';

                  let widthClass = 'w-10 sm:w-14';
                  if (k === 'SPACE') widthClass = 'w-48 sm:w-64';
                  else if (k === 'BACKSPACE' || k === 'SEARCH') widthClass = 'w-20 sm:w-28';
                  else if (k === 'CLEAR') widthClass = 'w-16 sm:w-20';

                  return (
                    <button
                      key={keyId}
                      ref={(el) => registerElement(keyId, el, () => handleKeyAction(k))}
                      onClick={() => handleKeyAction(k)}
                      style={{
                        transform: isPressed
                          ? 'translateZ(-6px) scale(0.94)'
                          : isHovered
                          ? 'translateZ(14px) scale(1.08)'
                          : 'translateZ(0px)',
                      }}
                      className={`relative h-11 sm:h-13 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center transition-all duration-100 cursor-pointer border select-none ${widthClass} ${
                        isPressed
                          ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.8)]'
                          : isHovered
                          ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.8)]'
                          : isSpecial
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/60'
                          : 'bg-black/60 text-white border-neutral-700/80 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/20'
                      }`}
                    >
                      {/* Dwell Progress Indicator on the Hovered Key */}
                      {isHovered && dwellProgress > 0 && (
                        <div
                          style={{ width: `${dwellProgress * 100}%` }}
                          className="absolute bottom-0 left-0 h-1 bg-yellow-400 rounded-b transition-all duration-75"
                        />
                      )}

                      {k === 'BACKSPACE' ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Delete className="w-4 h-4" />
                          <span className="hidden sm:inline">BACK</span>
                        </span>
                      ) : k === 'CLEAR' ? (
                        <span className="text-[11px]">CLEAR</span>
                      ) : k === 'SPACE' ? (
                        <span className="text-[11px] text-cyan-400">SPACE ␣</span>
                      ) : k === 'SEARCH' ? (
                        <span className="flex items-center gap-1 text-black font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 px-2.5 py-1 rounded-lg">
                          <Search className="w-3.5 h-3.5" />
                          <span>SEARCH</span>
                        </span>
                      ) : (
                        <span>{k}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Instructions Bar at the Base of the Keyboard */}
          <div className="w-full mt-5 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {cursor.isHandPresent ? (
                  <span className="text-cyan-300 font-bold">Hand Vision Active</span>
                ) : (
                  <span>Camera standby • Point your hand to type</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-neutral-300">
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-cyan-300">
                  Pinch
                </span>
                <span>or</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-cyan-300">
                  Hold 0.4s
                </span>
                <span>to type</span>
              </span>
              <span className="hidden sm:inline text-neutral-500">•</span>
              <span className="text-neutral-400">Mouse clicks also supported</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 3D HOLOGRAPHIC SEARCH RESULTS & VIDEO SELECTOR */}
      {activeTab === 'results' && (
        <div className="w-full flex flex-col items-center p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#060c18]/90 via-[#040810]/90 to-[#020408]/90 border border-cyan-500/40 shadow-[0_0_60px_rgba(0,240,255,0.2)] backdrop-blur-xl animate-in fade-in duration-200">
          {/* Header */}
          <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {isSearching ? (
                  <span>Fetching Real YouTube Results...</span>
                ) : (
                  <span>
                    Results for "{searchQuery}" ({searchResults.length} videos)
                  </span>
                )}
              </h3>
            </div>

            <button
              onClick={() => setActiveTab('keyboard')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              ← Back to 3D Keyboard
            </button>
          </div>

          {/* Loading State */}
          {isSearching && (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              <p className="text-xs font-mono text-cyan-300 tracking-wider">
                TRANSMITTING HOLOGRAPHIC DATA PACKETS...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isSearching && searchResults.length === 0 && (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-center">
              <Search className="w-10 h-10 text-neutral-600 mb-1" />
              <p className="text-sm font-bold text-white">No Videos Found</p>
              <p className="text-xs text-neutral-400 max-w-sm">
                Try typing a different topic like "Virat Kohli", "Cricket highlights", or "Music hits".
              </p>
              <button
                onClick={() => setActiveTab('keyboard')}
                className="mt-3 px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs cursor-pointer"
              >
                Open 3D Keyboard
              </button>
            </div>
          )}

          {/* Floating 3D Video Results Grid */}
          {!isSearching && searchResults.length > 0 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
              {searchResults.map((video, idx) => {
                const cardId = `video_card_${video.id}`;
                const isHovered = hoveredElementId === cardId;

                return (
                  <div
                    key={cardId}
                    ref={(el) => registerElement(cardId, el, () => handleSelectVideo(video))}
                    onClick={() => handleSelectVideo(video)}
                    style={{
                      transform: isHovered ? 'scale(1.03) translateZ(10px)' : 'scale(1)',
                    }}
                    className={`relative group rounded-2xl overflow-hidden bg-black/70 border transition-all duration-200 cursor-pointer flex flex-col ${
                      isHovered
                        ? 'border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.4)] ring-2 ring-cyan-300'
                        : 'border-neutral-800 hover:border-cyan-500/50'
                    }`}
                  >
                    {/* Dwell Progress Line */}
                    {isHovered && dwellProgress > 0 && (
                      <div
                        style={{ width: `${dwellProgress * 100}%` }}
                        className="absolute top-0 left-0 h-1 bg-yellow-400 z-30 transition-all duration-75 shadow-[0_0_8px_#facc15]"
                      />
                    )}

                    {/* Thumbnail Container */}
                    <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Video Duration Badge */}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                          {video.duration}
                        </div>
                      )}

                      {/* Sci-Fi Hologram Overlay on Hover */}
                      <div
                        className={`absolute inset-0 bg-cyan-950/50 backdrop-blur-xs flex flex-col items-center justify-center gap-2 transition-opacity ${
                          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_20px_#00f0ff] animate-pulse">
                          <Play className="w-6 h-6 fill-black ml-0.5" />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-cyan-200 bg-black/80 px-2 py-0.5 rounded-full border border-cyan-400/50">
                          {cursor.isPinching ? '⚡ LAUNCHING' : 'PINCH OR HOLD TO PLAY'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                        {video.title}
                      </h4>

                      <div className="mt-2 text-[11px] text-neutral-400 flex flex-col gap-0.5">
                        <span className="text-neutral-300 font-medium truncate">
                          {video.channel?.name || 'YouTube Creator'}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          {video.views !== undefined && <span>{formatViews(video.views)}</span>}
                          {video.uploadedAt && (
                            <>
                              <span>•</span>
                              <span>{video.uploadedAt}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Guidance */}
          <div className="w-full mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>Hover index finger over any video card • Pinch or Hold 0.4s to watch</span>
            <button
              onClick={() => setActiveTab('keyboard')}
              className="text-cyan-400 hover:underline font-bold"
            >
              Search Another Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
