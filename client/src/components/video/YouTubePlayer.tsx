// client/src/components/video/YouTubePlayer.tsx - Advanced YouTube IFrame Player
// Supports Quality Selection, Subtitles/Captions, Theater Mode, Fullscreen, Volume Slider,
// Playback Speed, Position Preservation, and Rich Keyboard Shortcuts.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  FastForward,
  Rewind,
  Maximize,
  Minimize,
  Keyboard,
  Gauge,
  X,
  RotateCcw,
  Settings,
  Subtitles,
  RectangleHorizontal,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  savePlaybackPosition,
  getSavedPlaybackPosition,
  formatPlaybackSeconds,
} from '../../utils/playbackPosition';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const QUALITY_LABELS: Record<string, string> = {
  highres: '4K (2160p)',
  hd1440: '1440p HD',
  hd1080: '1080p HD',
  hd720: '720p HD',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
  auto: 'Auto',
};

export interface CaptionTrack {
  languageCode: string;
  languageName: string;
  displayName?: string;
  isDefault?: boolean;
}

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  onEnded?: () => void;
  nextVideo?: {
    id: string;
    title: string;
    thumbnailUrl: string;
    channelName?: string;
  } | null;
  onTriggerNext?: () => void;
  autoplayEnabled?: boolean;
  onToggleAutoplay?: () => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  theaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  preferredQuality?: string;
  onQualityChange?: (quality: string) => void;
  captionsEnabled?: boolean;
  onToggleCaptions?: (enabled: boolean) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  onEnded,
  nextVideo,
  onTriggerNext,
  autoplayEnabled = true,
  onToggleAutoplay,
  playbackSpeed = 1,
  onSpeedChange,
  theaterMode = false,
  onToggleTheaterMode,
  preferredQuality = 'auto',
  onQualityChange,
  captionsEnabled = false,
  onToggleCaptions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const positionIntervalRef = useRef<any>(null);

  // Player state
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Quality state
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const [currentQuality, setCurrentQuality] = useState<string>(preferredQuality || 'auto');

  // Captions state
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(captionsEnabled);
  const [activeCaptionLanguage, setActiveCaptionLanguage] = useState<string>('');

  // Settings Gear Menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'speed' | 'quality' | 'captions'>('main');
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Autoplay countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Transient HUD overlay indicator
  const [hudState, setHudState] = useState<{
    visible: boolean;
    icon: React.ReactNode;
    text: string;
  }>({
    visible: false,
    icon: null,
    text: '',
  });
  const hudTimeoutRef = useRef<any>(null);

  const showHud = useCallback((icon: React.ReactNode, text: string) => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setHudState({ visible: true, icon, text });
    hudTimeoutRef.current = setTimeout(() => {
      setHudState((prev) => ({ ...prev, visible: false }));
    }, 1100);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const startCountdown = useCallback(() => {
    if (!autoplayEnabled || !nextVideo || !onTriggerNext) return;
    setCountdown(5);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          onTriggerNext();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [autoplayEnabled, nextVideo, onTriggerNext]);

  // Clean countdown on unmount or videoId change
  useEffect(() => {
    cancelCountdown();
  }, [videoId, cancelCountdown]);

  // Listen to Fullscreen API changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close Settings Gear menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
        setSettingsView('main');
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Query and update available qualities and captions from the player
  const queryPlayerCapabilities = useCallback(() => {
    if (!playerRef.current) return;

    try {
      // 1. Quality options
      if (typeof playerRef.current.getAvailableQualityLevels === 'function') {
        const levels = playerRef.current.getAvailableQualityLevels();
        if (Array.isArray(levels) && levels.length > 0) {
          // Always ensure 'auto' is included
          const unique = Array.from(new Set(['auto', ...levels]));
          setAvailableQualities(unique);
        }
      }

      if (typeof playerRef.current.getPlaybackQuality === 'function') {
        const curQ = playerRef.current.getPlaybackQuality();
        if (curQ) setCurrentQuality(curQ);
      }

      // 2. Captions module
      if (typeof playerRef.current.loadModule === 'function') {
        playerRef.current.loadModule('captions');
      }

      if (typeof playerRef.current.getOption === 'function') {
        const tracklist = playerRef.current.getOption('captions', 'tracklist');
        if (Array.isArray(tracklist) && tracklist.length > 0) {
          const formatted: CaptionTrack[] = tracklist.map((t: any) => ({
            languageCode: t.languageCode || t.vss_id || 'en',
            languageName: t.languageName || t.displayName || t.name || 'English',
            displayName: t.displayName || t.languageName || 'English',
            isDefault: t.is_default || false,
          }));
          setCaptionTracks(formatted);
          setHasCaptions(true);
        } else {
          setCaptionTracks([]);
          setHasCaptions(false);
        }

        const activeTrack = playerRef.current.getOption('captions', 'track');
        if (activeTrack && activeTrack.languageCode) {
          setIsCaptionsOn(true);
          setActiveCaptionLanguage(activeTrack.languageCode);
        }
      }
    } catch (err) {
      console.warn('Error reading player capabilities:', err);
    }
  }, []);

  // Periodic position and state tracker
  useEffect(() => {
    positionIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);

          // Save playback position periodically
          if (cur > 3) {
            savePlaybackPosition(videoId, cur, dur);
          }
        } catch {}
      }
    }, 1500);

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [videoId]);

  // Save playback position on unmount or video change
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const cur = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (cur && cur > 3) {
            savePlaybackPosition(videoId, cur, dur);
          }
        } catch {}
      }
    };
  }, [videoId]);

  // Initialize official YouTube Player
  useEffect(() => {
    setErrorStatus(null);
    setIsLoading(true);
    setIsSettingsOpen(false);
    setSettingsView('main');

    let isMounted = true;

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!isMounted || !containerRef.current) return;

      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
            playsinline: 1,
            fs: 1,
            cc_load_policy: captionsEnabled ? 1 : 0,
          },
          events: {
            onReady: () => {
              if (isMounted) {
                setIsLoading(false);

                // 1. Restore playback speed
                if (playbackSpeed && playerRef.current.setPlaybackRate) {
                  playerRef.current.setPlaybackRate(playbackSpeed);
                }

                // 2. Restore playback position
                const savedPos = getSavedPlaybackPosition(videoId);
                if (savedPos > 3) {
                  try {
                    playerRef.current.seekTo(savedPos, true);
                    showHud(
                      <RotateCcw className="w-8 h-8 text-white fill-white" />,
                      `Resumed at ${formatPlaybackSeconds(savedPos)}`
                    );
                  } catch {}
                }

                // 3. Query initial quality & captions
                queryPlayerCapabilities();

                // 4. Set initial volume
                if (playerRef.current.getVolume) {
                  setVolume(playerRef.current.getVolume());
                }
                if (playerRef.current.isMuted) {
                  setIsMuted(playerRef.current.isMuted());
                }
              }
            },
            onStateChange: (event: any) => {
              // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
              if (event.data === 1) {
                setIsPlaying(true);
                queryPlayerCapabilities();
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                if (onEnded) onEnded();
                if (autoplayEnabled && nextVideo && onTriggerNext) {
                  startCountdown();
                }
              }
            },
            onPlaybackQualityChange: (event: any) => {
              if (event.data) {
                setCurrentQuality(event.data);
                showHud(
                  <Settings className="w-8 h-8 text-white" />,
                  `Quality: ${QUALITY_LABELS[event.data] || event.data}`
                );
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Player Error:', event.data);
              if (isMounted) {
                setErrorStatus(event.data);
                setIsLoading(false);
              }
            },
          },
        });
      } catch (err) {
        console.warn('Error instantiating YT Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      isMounted = false;
      cancelCountdown();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId, onEnded, autoplayEnabled, nextVideo, onTriggerNext, startCountdown, cancelCountdown]);

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return;
    try {
      const state = playerRef.current.getPlayerState();
      if (state === 1) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        showHud(<Pause className="w-8 h-8 text-white fill-white" />, 'Paused');
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        showHud(<Play className="w-8 h-8 text-white fill-white" />, 'Playing');
      }
    } catch {}
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted || playerRef.current.isMuted()) {
        playerRef.current.unMute();
        setIsMuted(false);
        showHud(<Volume2 className="w-8 h-8 text-white" />, 'Unmuted');
      } else {
        playerRef.current.mute();
        setIsMuted(true);
        showHud(<VolumeX className="w-8 h-8 text-white" />, 'Muted');
      }
    } catch {}
  };

  // Volume Change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (!playerRef.current || typeof playerRef.current.setVolume !== 'function') return;
    try {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else if (newVol === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch {}
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        showHud(<Minimize className="w-8 h-8 text-white" />, 'Exit Fullscreen');
      } else {
        const el: any = wrapperRef.current;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          el.mozRequestFullScreen();
        }
        showHud(<Maximize className="w-8 h-8 text-white" />, 'Fullscreen (f)');
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  // Select Quality
  const handleSelectQuality = (qualityCode: string) => {
    setCurrentQuality(qualityCode);
    setIsSettingsOpen(false);
    setSettingsView('main');
    if (onQualityChange) onQualityChange(qualityCode);

    if (playerRef.current && typeof playerRef.current.setPlaybackQuality === 'function') {
      try {
        playerRef.current.setPlaybackQuality(qualityCode);
        showHud(
          <Settings className="w-8 h-8 text-white" />,
          `Quality: ${QUALITY_LABELS[qualityCode] || qualityCode}`
        );
      } catch (err) {
        console.warn('Error setting playback quality:', err);
      }
    }
  };

  // Select Captions Language / Toggle
  const handleSelectCaptionTrack = (langCode: string | null) => {
    if (!playerRef.current) return;
    setIsSettingsOpen(false);
    setSettingsView('main');

    try {
      if (!langCode) {
        playerRef.current.setOption('captions', 'track', {});
        setIsCaptionsOn(false);
        setActiveCaptionLanguage('');
        if (onToggleCaptions) onToggleCaptions(false);
        showHud(<Subtitles className="w-8 h-8 text-neutral-400" />, 'Captions Off');
      } else {
        playerRef.current.setOption('captions', 'track', { languageCode: langCode });
        setIsCaptionsOn(true);
        setActiveCaptionLanguage(langCode);
        if (onToggleCaptions) onToggleCaptions(true);
        const matched = captionTracks.find((t) => t.languageCode === langCode);
        showHud(
          <Subtitles className="w-8 h-8 text-white" />,
          `Captions: ${matched?.displayName || langCode}`
        );
      }
    } catch (err) {
      console.warn('Error changing caption track:', err);
    }
  };

  // Quick Captions Button Toggle
  const toggleCaptionsQuick = () => {
    if (!hasCaptions || captionTracks.length === 0) {
      showHud(<Subtitles className="w-8 h-8 text-neutral-500" />, 'No captions available for this video');
      return;
    }
    if (isCaptionsOn) {
      handleSelectCaptionTrack(null);
    } else {
      const defaultTrack = captionTracks[0];
      handleSelectCaptionTrack(defaultTrack?.languageCode || 'en');
    }
  };

  // Playback Speed Handler
  const handleSelectSpeed = (speed: number) => {
    setIsSettingsOpen(false);
    setSettingsView('main');
    if (onSpeedChange) onSpeedChange(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(speed);
        showHud(<Gauge className="w-8 h-8 text-white" />, `${speed}x Speed`);
      } catch {}
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = (target?.tagName || '').toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target?.isContentEditable ||
        target?.getAttribute('role') === 'textbox'
      ) {
        return;
      }

      if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') {
        return;
      }

      // Space or K: Play / Pause
      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlayPause();
      }

      // T: Theater Mode
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (onToggleTheaterMode) {
          onToggleTheaterMode();
          showHud(
            <RectangleHorizontal className="w-8 h-8 text-white" />,
            !theaterMode ? 'Theater mode' : 'Default view'
          );
        }
      }

      // F: Fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }

      // M: Mute / Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }

      // C: Captions Toggle
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toggleCaptionsQuick();
      }

      // Left Arrow / J: Seek -5s / -10s
      if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        try {
          const delta = e.key === 'j' || e.key === 'J' ? 10 : 5;
          const cur = playerRef.current.getCurrentTime() || 0;
          const targetTime = Math.max(0, cur - delta);
          playerRef.current.seekTo(targetTime, true);
          showHud(<Rewind className="w-8 h-8 text-white fill-white" />, `-${delta} seconds`);
        } catch {}
      }

      // Right Arrow / L: Seek +5s / +10s
      if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        try {
          const delta = e.key === 'l' || e.key === 'L' ? 10 : 5;
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 999999;
          const targetTime = Math.min(dur, cur + delta);
          playerRef.current.seekTo(targetTime, true);
          showHud(<FastForward className="w-8 h-8 text-white fill-white" />, `+${delta} seconds`);
        } catch {}
      }

      // ArrowUp: Volume +5%
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        try {
          const curVol = playerRef.current.getVolume?.() ?? volume;
          const newVol = Math.min(100, curVol + 5);
          handleVolumeChange(newVol);
          showHud(<Volume2 className="w-8 h-8 text-white" />, `${newVol}% Volume`);
        } catch {}
      }

      // ArrowDown: Volume -5%
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        try {
          const curVol = playerRef.current.getVolume?.() ?? volume;
          const newVol = Math.max(0, curVol - 5);
          handleVolumeChange(newVol);
          showHud(
            newVol === 0 ? <VolumeX className="w-8 h-8 text-white" /> : <Volume1 className="w-8 h-8 text-white" />,
            `${newVol}% Volume`
          );
        } catch {}
      }

      // 0-9: Seek to percentage
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        try {
          const pct = parseInt(e.key, 10) / 10;
          const dur = playerRef.current.getDuration() || 0;
          if (dur > 0) {
            const targetTime = dur * pct;
            playerRef.current.seekTo(targetTime, true);
            showHud(
              <RotateCcw className="w-8 h-8 text-white" />,
              `${pct * 100}% (${formatPlaybackSeconds(targetTime)})`
            );
          }
        } catch {}
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHud, volume, isMuted, theaterMode, onToggleTheaterMode, hasCaptions, isCaptionsOn, captionTracks]);

  // Handle YouTube Error Codes
  if (
    errorStatus === 101 ||
    errorStatus === 150 ||
    errorStatus === 100 ||
    errorStatus === 2
  ) {
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center p-6 text-center text-white shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1">
          {errorStatus === 101 || errorStatus === 150
            ? 'Playback Restricted by YouTube Creator'
            : 'Video Unavailable or Restricted'}
        </h3>
        <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
          {errorStatus === 101 || errorStatus === 150
            ? 'The owner of this video has disabled embedded playback on third-party sites. You can watch it directly on YouTube with original audio and video.'
            : 'This video may be private, age-restricted, or removed by YouTube.'}
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-lg"
        >
          <span>Watch on YouTube.com</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl group select-none ${
        isFullscreen ? 'rounded-none max-h-screen' : ''
      }`}
    >
      {/* Player container mounted by YouTube IFrame API */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Fallback standard iframe if API is loading */}
      {isLoading && !playerRef.current && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
            window.location.origin
          )}&rel=0`}
          title={title || 'YouTube video player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0 absolute inset-0"
        />
      )}

      {/* Top Floating Control Bar (Autoplay & Speed Badge) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Autoplay Toggle Switch */}
        {onToggleAutoplay && (
          <button
            onClick={onToggleAutoplay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md transition-all cursor-pointer shadow-md ${
              autoplayEnabled
                ? 'bg-red-600 text-white'
                : 'bg-black/70 text-neutral-300 border border-white/20 hover:bg-black/90'
            }`}
            title="Toggle Autoplay next video"
          >
            <span>Autoplay</span>
            <span
              className={`w-2 h-2 rounded-full ${
                autoplayEnabled ? 'bg-white animate-pulse' : 'bg-neutral-500'
              }`}
            />
          </button>
        )}

        {/* Current Speed Badge */}
        <button
          onClick={() => {
            setIsSettingsOpen(true);
            setSettingsView('speed');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 hover:bg-black/90 transition-colors cursor-pointer shadow-md"
          title="Change playback speed"
        >
          <Gauge className="w-3.5 h-3.5 text-blue-400" />
          <span>{playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`}</span>
        </button>
      </div>

      {/* Bottom Interactive Control Bar Overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-6 flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Left Controls: Play/Pause, Rewind, Volume Slider, Time Display */}
        <div className="flex items-center gap-3 text-white">
          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title={isPlaying ? 'Pause (k)' : 'Play (k)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white" />
            )}
          </button>

          {/* Rewind 10s */}
          <button
            onClick={() => {
              if (playerRef.current?.getCurrentTime) {
                const cur = playerRef.current.getCurrentTime();
                playerRef.current.seekTo(Math.max(0, cur - 10), true);
                showHud(<Rewind className="w-8 h-8 text-white fill-white" />, '-10 seconds');
              }
            }}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Rewind 10 seconds (j)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Volume Control Pill (Icon + Interactive Slider) */}
          <div className="flex items-center gap-1.5 group/volume">
            <button
              onClick={toggleMute}
              className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-16 h-1 bg-white/40 accent-red-600 rounded-lg cursor-pointer transition-all opacity-80 hover:opacity-100"
              title="Volume"
            />
          </div>

          {/* Time Display */}
          <span className="text-xs font-medium text-neutral-300 ml-1">
            {formatPlaybackSeconds(currentTime)} / {formatPlaybackSeconds(duration)}
          </span>
        </div>

        {/* Right Controls: CC, Player Settings Gear, Theater Mode, Fullscreen */}
        <div className="flex items-center gap-2 text-white">
          {/* Subtitles / CC Toggle Button */}
          <button
            onClick={toggleCaptionsQuick}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold ${
              isCaptionsOn
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-neutral-300 hover:bg-white/20'
            }`}
            title={
              hasCaptions
                ? `Captions (c) - ${isCaptionsOn ? 'Enabled' : 'Disabled'}`
                : 'Captions unavailable for this video'
            }
          >
            <Subtitles className="w-4 h-4" />
          </button>

          {/* Settings Gear Menu */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => {
                setIsSettingsOpen((prev) => !prev);
                setSettingsView('main');
              }}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              title="Player Settings"
            >
              <Settings className={`w-4 h-4 ${isSettingsOpen ? 'rotate-45' : ''} transition-transform`} />
            </button>

            {/* In-Player Settings Popover Dialog */}
            {isSettingsOpen && (
              <div className="absolute right-0 bottom-10 w-64 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-2xl shadow-2xl py-2 z-50 text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-100">
                {/* 1. Main View */}
                {settingsView === 'main' && (
                  <div className="space-y-0.5">
                    {/* Speed Row */}
                    <button
                      onClick={() => setSettingsView('speed')}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Gauge className="w-4 h-4 text-neutral-400" />
                        <span>Playback Speed</span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400 font-semibold">
                        <span>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Quality Row */}
                    <button
                      onClick={() => setSettingsView('quality')}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-neutral-400" />
                        <span>Quality</span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400 font-semibold">
                        <span>{QUALITY_LABELS[currentQuality] || currentQuality}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Captions Row */}
                    <button
                      onClick={() => setSettingsView('captions')}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Subtitles className="w-4 h-4 text-neutral-400" />
                        <span>Subtitles / CC</span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400 font-semibold">
                        <span>
                          {isCaptionsOn
                            ? captionTracks.find((t) => t.languageCode === activeCaptionLanguage)?.displayName || 'On'
                            : 'Off'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Autoplay Row */}
                    {onToggleAutoplay && (
                      <div className="flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Play className="w-4 h-4 text-neutral-400" />
                          <span>Autoplay next</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={autoplayEnabled}
                          onChange={onToggleAutoplay}
                          className="accent-red-600 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Playback Speed Submenu */}
                {settingsView === 'speed' && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-700/60 mb-1">
                      <button
                        onClick={() => setSettingsView('main')}
                        className="p-1 rounded-full hover:bg-white/10"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-neutral-300">Playback speed</span>
                    </div>
                    {PLAYBACK_SPEEDS.map((sp) => (
                      <button
                        key={sp}
                        onClick={() => handleSelectSpeed(sp)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <span>{sp === 1 ? 'Normal' : `${sp}x`}</span>
                        {playbackSpeed === sp && <Check className="w-3.5 h-3.5 text-red-500 font-bold" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. Quality Submenu */}
                {settingsView === 'quality' && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-700/60 mb-1">
                      <button
                        onClick={() => setSettingsView('main')}
                        className="p-1 rounded-full hover:bg-white/10"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-neutral-300">Video Quality</span>
                    </div>
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSelectQuality(q)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <span>{QUALITY_LABELS[q] || q}</span>
                        {currentQuality === q && <Check className="w-3.5 h-3.5 text-red-500 font-bold" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. Captions Submenu */}
                {settingsView === 'captions' && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-700/60 mb-1">
                      <button
                        onClick={() => setSettingsView('main')}
                        className="p-1 rounded-full hover:bg-white/10"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-neutral-300">Subtitles / CC</span>
                    </div>
                    <button
                      onClick={() => handleSelectCaptionTrack(null)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <span>Off</span>
                      {!isCaptionsOn && <Check className="w-3.5 h-3.5 text-red-500 font-bold" />}
                    </button>
                    {captionTracks.map((tr) => (
                      <button
                        key={tr.languageCode}
                        onClick={() => handleSelectCaptionTrack(tr.languageCode)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <span>{tr.displayName || tr.languageName}</span>
                        {isCaptionsOn && activeCaptionLanguage === tr.languageCode && (
                          <Check className="w-3.5 h-3.5 text-red-500 font-bold" />
                        )}
                      </button>
                    ))}
                    {!hasCaptions && (
                      <p className="px-4 py-3 text-[11px] text-neutral-500 text-center">
                        No subtitle tracks available from creator
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theater Mode Toggle Button */}
          {onToggleTheaterMode && (
            <button
              onClick={onToggleTheaterMode}
              className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer ${
                theaterMode ? 'text-red-500' : 'text-neutral-300'
              }`}
              title="Theater mode (t)"
            >
              <RectangleHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fullscreen (f)"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Autoplay Next Countdown Overlay */}
      {countdown !== null && nextVideo && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-40 animate-in fade-in duration-200">
          <div className="relative mb-3">
            <img
              src={nextVideo.thumbnailUrl}
              alt={nextVideo.title}
              className="w-40 sm:w-56 aspect-video rounded-xl object-cover ring-2 ring-red-600 shadow-2xl"
            />
            {/* Circular Countdown Badge */}
            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-red-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xl ring-2 ring-black">
              {countdown}
            </div>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white max-w-md truncate">
            Up next: {nextVideo.title}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {nextVideo.channelName || 'YouTube Creator'} • Autoplaying in {countdown}s
          </p>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={cancelCountdown}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={() => {
                cancelCountdown();
                onTriggerNext?.();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Transient HUD Key Action Feedback Overlay */}
      {hudState.visible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in-75 duration-100">
          <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 shadow-2xl">
            {hudState.icon}
            <span className="text-sm font-bold text-white tracking-wide">
              {hudState.text}
            </span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint Bar (visible on hover) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xs border border-white/10 text-neutral-300 text-[10px]">
          <Keyboard className="w-3 h-3 text-red-500" />
          <span>Space/k: Play • t: Theater • f: Fullscreen • c: CC • m: Mute • ←/→: 5s</span>
        </div>
      </div>
    </div>
  );
};
