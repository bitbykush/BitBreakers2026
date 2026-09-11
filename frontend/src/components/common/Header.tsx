'use client';

import React from 'react';
import { ShieldCheck, Sparkles, Building2, Accessibility } from 'lucide-react';
import { StorageService } from '@/lib/storage';
import { useAccessibility } from '@/context/AccessibilityContext';

interface HeaderProps {
  currentLang: 'en' | 'hi';
  onLangChange: (lang: 'en' | 'hi') => void;
  isLargerFont?: boolean;
  onToggleFont?: () => void;
  onOpenDigiLocker?: () => void;
  onTripleTapLogo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLangChange,
  isLargerFont,
  onToggleFont,
  onOpenDigiLocker,
  onTripleTapLogo,
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
            <span className="hidden md:inline bg-indigo-900/80 text-orange-300 px-2 py-0.5 rounded border border-orange-500/30">
              🔒 {currentLang === 'hi' ? 'जीरो-लॉगिन खुली पहुंच' : 'Zero-Login Open Access'}
            </span>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-950 via-indigo-900 to-orange-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-orange-300" />
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

          {/* Right Controls: Accessibility & Lang Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Single Unified Accessibility Button */}
            <button
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-indigo-200/90 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-950 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs group cursor-pointer"
              onClick={() => setIsA11yMenuOpen(true)}
              title="Accessibility Menu (TalkBack Screen Reader, High Contrast, Zoom) / सुगमता मेनू"
              aria-label="Open Accessibility Menu"
            >
              <Accessibility className="w-4 h-4 text-indigo-700 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-extrabold text-xs text-indigo-950">Accessibility</span>
              <span className="hidden md:inline text-slate-500 font-normal text-[11px]">| सुगमता</span>
            </button>

            {/* Bilingual Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  currentLang === 'en'
                    ? 'bg-indigo-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => onLangChange('en')}
              >
                EN
              </button>
              <button
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
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
