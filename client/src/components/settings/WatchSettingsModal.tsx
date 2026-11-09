// client/src/components/settings/WatchSettingsModal.tsx - User Watch Settings & Preferences Dialog

import React from 'react';
import {
  X,
  Settings,
  Play,
  Gauge,
  History,
  Trash2,
  PauseCircle,
  PlayCircle,
  Check,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  RectangleHorizontal,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useVideo } from '../../context/VideoContext';
import { useAuth } from '../../context/AuthContext';

const PLAYBACK_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITY_PREFERENCE_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'hd1080', label: '1080p' },
  { id: 'hd720', label: '720p' },
  { id: 'large', label: '480p' },
  { id: 'medium', label: '360p' },
];

export const WatchSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    settings,
    updateSettings,
    clearAllSearchQueries,
    searchHistory,
  } = useSettings();
  const {
    clearHistory,
    watchHistory,
    showToast,
    dismissedVideoIds,
    clearRecommendationHistory,
  } = useVideo();
  const { currentUser } = useAuth();

  if (!isSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Playback & Watch Settings
              </h2>
              <p className="text-xs text-neutral-500">
                Synced with Cloud Firestore and local preferences
              </p>
            </div>
          </div>
          <button
            onClick={closeSettingsModal}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. Autoplay Next Video */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-start gap-3">
              <Play className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Autoplay Next Video
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  When current playback ends, a 5-second countdown will start and automatically play the next video in queue or playlist.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await updateSettings({ autoplayNext: !settings.autoplayNext });
                showToast(
                  !settings.autoplayNext
                    ? 'Autoplay enabled 🔁'
                    : 'Autoplay disabled ⏸'
                );
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoplayNext
                  ? 'bg-red-600'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.autoplayNext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Default Playback Speed */}
          <div className="pb-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Default Playback Speed
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Select your preferred playback speed across all YouTube videos.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PLAYBACK_SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={async () => {
                    await updateSettings({ playbackSpeed: speed });
                    window.dispatchEvent(
                      new CustomEvent('mytube:player-action', {
                        detail: { action: 'speed', speed },
                      })
                    );
                    showToast(`Playback speed set to ${speed === 1 ? '1x (Normal)' : speed + 'x'} ⚡`);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    settings.playbackSpeed === speed
                      ? 'bg-red-600 text-white shadow-md scale-105 ring-2 ring-red-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {speed === 1 ? 'Normal' : `${speed}x`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Preferred Video Quality */}
          <div className="pb-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-red-600 shrink-0" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Preferred Video Quality
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Default suggested resolution. Videos will play in this quality when supported by YouTube.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {QUALITY_PREFERENCE_OPTIONS.map((q) => (
                <button
                  key={q.id}
                  onClick={async () => {
                    await updateSettings({ preferredQuality: q.id });
                    showToast(`Preferred quality set to ${q.label}`);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    (settings.preferredQuality || 'auto') === q.id
                      ? 'bg-red-600 text-white shadow-md scale-105'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Search History Settings */}
          <div className="pb-5 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <History className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Pause Search History
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    While paused, searches you make will not appear in recent search dropdown or sync to your Firestore profile.
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const nextState = !settings.isSearchHistoryPaused;
                  await updateSettings({ isSearchHistoryPaused: nextState });
                  showToast(
                    nextState
                      ? 'Search history paused ⏸'
                      : 'Search history resumed ▶'
                  );
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.isSearchHistoryPaused
                    ? 'bg-purple-600'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.isSearchHistoryPaused
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-500">
                Current history: <strong>{searchHistory.length} searches</strong>
              </span>
              <button
                onClick={() => {
                  if (confirm('Clear all search history permanently?')) {
                    clearAllSearchQueries();
                    showToast('Search history cleared 🗑️');
                  }
                }}
                disabled={searchHistory.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Search History</span>
              </button>
            </div>
          </div>

          {/* 4. Watch History Reset */}
          <div className="flex items-center justify-between pb-5 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Watch History ({watchHistory.length} videos)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Clear all watched videos and timestamps.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear all watch history?')) {
                  clearHistory();
                  showToast('Watch history cleared 🗑️');
                }
              }}
              disabled={watchHistory.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Clear Watch History</span>
            </button>
          </div>

          {/* 5. Recommendation Preferences & Dismissed History */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Recommendation History ({dismissedVideoIds.length} dismissed)
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Reset your "Not Interested" video preferences to restore dismissed content.
              </p>
            </div>
            <button
              onClick={async () => {
                if (confirm('Reset recommendation preferences and un-dismiss all videos?')) {
                  await clearRecommendationHistory();
                }
              }}
              disabled={dismissedVideoIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-40 transition-colors cursor-pointer border border-blue-300 dark:border-blue-800"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
              <span>Clear Recommendation History</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Automatic cloud sync active</span>
          </div>
          <button
            onClick={closeSettingsModal}
            className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
