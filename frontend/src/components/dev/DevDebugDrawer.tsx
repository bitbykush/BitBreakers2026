'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Cpu, ShieldAlert, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { ApiService } from '@/lib/api';
import { StorageService } from '@/lib/storage';

interface DevDebugDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  ocrEngine: 'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK';
  setOcrEngine: (mode: 'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK') => void;
  matcherEngine: 'FASTEMBED' | 'MOCK';
  setMatcherEngine: (mode: 'FASTEMBED' | 'MOCK') => void;
  onResetSession: () => void;
}

export const DevDebugDrawer: React.FC<DevDebugDrawerProps> = ({
  isOpen,
  onToggle,
  ocrEngine,
  setOcrEngine,
  matcherEngine,
  setMatcherEngine,
  onResetSession,
}) => {
  const [memoryStats, setMemoryStats] = useState<{ rss_mb: number; max_limit_mb: number; percent_used: number }>({
    rss_mb: 184,
    max_limit_mb: 512,
    percent_used: 35.9,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const data = await ApiService.getDevHealth();
      setMemoryStats(data);
    } catch {}
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-3 right-3 z-50 p-2.5 bg-slate-900 text-slate-400 hover:text-white rounded-full opacity-40 hover:opacity-100 transition-all shadow-xl no-print hover:scale-110"
        title="SIH Jury / Developer HUD (Ctrl+Shift+D)"
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  const memoryPercent = Math.min(100, Math.round((memoryStats.rss_mb / memoryStats.max_limit_mb) * 100));

  return (
    <div className="fixed bottom-4 right-4 z-50 w-84 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-4 text-white text-xs font-mono no-print animate-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
        <span className="font-bold text-amber-400 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> SIH Jury / Dev Debug Panel
        </span>
        <button onClick={onToggle} className="text-slate-400 hover:text-white text-sm">
          ✕
        </button>
      </div>

      {/* Live RAM Telemetry */}
      <div className="bg-slate-900 p-3 rounded-xl mb-3 border border-slate-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Server RAM (512MB Ceiling)
          </span>
          <button onClick={fetchHealth} title="Refresh Server RAM">
            <RefreshCw className={`w-3 h-3 text-slate-400 hover:text-white ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="text-base font-black text-emerald-400">
          {memoryStats.rss_mb} MB <span className="text-xs text-slate-500 font-normal">/ {memoryStats.max_limit_mb} MB</span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full mt-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              memoryPercent > 80 ? 'bg-rose-500' : memoryPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${memoryPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {memoryPercent}% budget utilized ({512 - memoryStats.rss_mb}MB headroom free)
        </p>
      </div>

      {/* OCR Engine Selector */}
      <div className="mb-3 space-y-1">
        <label className="text-slate-400 font-semibold block text-[11px]">OCR Engine Override:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['AUTO', 'RAPIDOCR', 'GEMINI', 'MOCK'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setOcrEngine(mode)}
              className={`p-1.5 rounded-lg text-center font-bold text-[11px] transition ${
                ocrEngine === mode
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Matcher Selector */}
      <div className="mb-3 space-y-1">
        <label className="text-slate-400 font-semibold block text-[11px]">Vector Matcher Engine:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['FASTEMBED', 'MOCK'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMatcherEngine(mode)}
              className={`p-1.5 rounded-lg text-center font-bold text-[11px] transition ${
                matcherEngine === mode
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Reset State Action */}
      <button
        type="button"
        onClick={onResetSession}
        className="w-full py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Reset Local Session State</span>
      </button>

      <p className="text-[10px] text-slate-500 text-center mt-2.5">
        Toggle Shortcut: <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Ctrl+Shift+D</kbd> or triple-tap logo
      </p>
    </div>
  );
};
