'use client';

import React from 'react';
import { Volume2, VolumeX, Pause, Play, Square, FastForward } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

export const TalkBackSpeechBar: React.FC = () => {
  const {
    talkBackActive,
    isSpeaking,
    isPaused,
    currentSpokenText,
    pauseSpeech,
    resumeSpeech,
    stopSpeech,
    talkBackSpeed,
    setTalkBackSpeed,
    setTalkBackActive,
  } = useAccessibility();

  if (!talkBackActive) return null;

  const cycleSpeed = () => {
    if (talkBackSpeed === 0.75) setTalkBackSpeed(1.0);
    else if (talkBackSpeed === 1.0) setTalkBackSpeed(1.25);
    else if (talkBackSpeed === 1.25) setTalkBackSpeed(1.5);
    else setTalkBackSpeed(0.75);
  };

  return (
    <div
      id="talkback-controller-bar"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-indigo-950/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-yellow-400/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300 no-print"
      role="region"
      aria-label="TalkBack Audio Controller"
    >
      {/* Left: Indicator & Spoken Text */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-yellow-400 text-indigo-950 flex items-center justify-center flex-shrink-0 shadow-md">
          {isSpeaking ? (
            <Volume2 className="w-5 h-5 animate-pulse" />
          ) : (
            <VolumeX className="w-5 h-5 text-indigo-900" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-wider uppercase text-yellow-400">
              TalkBack Active
            </span>
            <span className="text-[10px] text-indigo-300">
              {isSpeaking ? 'Speaking...' : isPaused ? 'Paused' : 'Hover over any text or card'}
            </span>
          </div>
          <p className="text-xs text-slate-100 font-medium truncate">
            {currentSpokenText || 'Hover over elements or use Tab key to read aloud'}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Play/Pause */}
        {isSpeaking ? (
          <button
            onClick={pauseSpeech}
            className="w-8 h-8 rounded-lg bg-indigo-800/80 hover:bg-indigo-700 text-white flex items-center justify-center transition border border-indigo-700 shadow-sm"
            title="Pause Speech"
            aria-label="Pause TalkBack"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : isPaused ? (
          <button
            onClick={resumeSpeech}
            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition border border-emerald-500 shadow-sm"
            title="Resume Speech"
            aria-label="Resume TalkBack"
          >
            <Play className="w-4 h-4 fill-white" />
          </button>
        ) : null}

        {/* Stop */}
        <button
          onClick={stopSpeech}
          className="w-8 h-8 rounded-lg bg-indigo-800/80 hover:bg-rose-900/60 text-slate-200 hover:text-white flex items-center justify-center transition border border-indigo-700 shadow-sm"
          title="Stop Speech (Esc)"
          aria-label="Stop current audio"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Speed toggle */}
        <button
          onClick={cycleSpeed}
          className="h-8 px-2 rounded-lg bg-indigo-800/80 hover:bg-indigo-700 text-yellow-300 text-xs font-bold transition border border-indigo-700 flex items-center gap-1"
          title="Change Voice Speed"
          aria-label={`Voice Speed: ${talkBackSpeed}x`}
        >
          <FastForward className="w-3 h-3" />
          <span>{talkBackSpeed}x</span>
        </button>

        {/* Turn Off TalkBack */}
        <button
          onClick={() => setTalkBackActive(false)}
          className="h-8 px-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-indigo-950 text-xs font-extrabold transition shadow-sm"
          title="Disable TalkBack"
          aria-label="Disable TalkBack Screen Reader"
        >
          Turn Off
        </button>
      </div>
    </div>
  );
};
