'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck, Sparkles, Accessibility } from 'lucide-react';
import { StorageService } from '@/lib/storage';
import { useAccessibility } from '@/context/AccessibilityContext';

interface HeaderProps {
  currentLang: 'en' | 'hi';
  onLangChange: (lang: 'en' | 'hi') => void;
  isLargerFont?: boolean;
  onToggleFont?: () => void;
  onTripleTapLogo?: () => void;
  onReplayIntro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLangChange,
  isLargerFont,
  onToggleFont,
  onTripleTapLogo,
  onReplayIntro,
}) => {
  const { setIsA11yMenuOpen } = useAccessibility();
  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-indigo-950 text-indigo-200 text-xs py-1.5 px-3 sm:px-6 border-b border-indigo-900/60 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-100">
              {currentLang === 'hi'
                ? 'राष्ट्रीय कल्याण सेतु पोर्टल (National Welfare Matcher)'
                : 'National Welfare Matcher (राष्ट्रीय कल्याण सेतु पोर्टल)'}
            </span>
            <span className="hidden sm:inline text-indigo-400">
              | {currentLang === 'hi' ? 'प्रत्यक्ष सब्सिडी व संपार्श्विक-मुक्त ऋण' : 'Direct Subsidy & Collateral-Free Credit Discovery'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] flex-shrink-0">
            <span className="text-indigo-300">MoSJE & MoMSME Compatible</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transition-all no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 sm:py-0 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* Left: Logo & Title with triple tap trigger */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-shrink min-w-0 group"
            onClick={onTripleTapLogo}
            title="Click or triple-tap for Developer HUD"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-emerald-100 p-1 flex items-center justify-center shadow-xs shadow-indigo-950/10 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/logo-emblem.png"
                alt="Scheme Seva Kendra Logo"
                width={44}
                height={44}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-indigo-950 truncate">
                  Scheme Seva Kendra
                </h1>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap">
                  योजना सेवा केंद्र
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">
                {currentLang === 'hi' ? 'राष्ट्रीय कल्याण एवं सब्सिडी मंच' : 'National Welfare & Subsidy Discovery'}
              </p>
            </div>
          </div>

          {/* Right Controls: 3D Intro Replay, Accessibility & Lang Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* 3D Intro Replay Button */}
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="h-8 px-2 sm:px-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                title={currentLang === 'hi' ? '3D राष्ट्रीय मुद्रा एनीमेशन पुनः देखें' : 'Replay 3D National Seal Intro'}
              >
                <span className="text-sm">🪙</span>
                <span className="hidden sm:inline">{currentLang === 'hi' ? '3D एनीमेशन' : '3D Intro'}</span>
              </button>
            )}

            {/* Single Unified Accessibility Button */}
            <button
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs group cursor-pointer"
              onClick={() => setIsA11yMenuOpen(true)}
              title="Accessibility Menu (TalkBack Screen Reader, High Contrast, Zoom) / सुगमता मेनू"
              aria-label="Open Accessibility Menu"
            >
              <Accessibility className="w-3.5 h-3.5 text-indigo-700 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-bold text-xs text-slate-900">Accessibility</span>
              <span className="hidden md:inline text-slate-400 font-normal text-[11px]">| सुगमता</span>
            </button>

            {/* Bilingual Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                className={`px-2 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  currentLang === 'en'
                    ? 'bg-indigo-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => onLangChange('en')}
              >
                EN
              </button>
              <button
                className={`px-2 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  currentLang === 'hi'
                    ? 'bg-indigo-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => onLangChange('hi')}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
