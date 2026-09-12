'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, X } from 'lucide-react';

interface NationalSeal3DIntroProps {
  currentLang?: 'en' | 'hi';
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const NationalSeal3DIntro: React.FC<NationalSeal3DIntroProps> = ({
  currentLang = 'en',
  onComplete,
  forcePlay = false,
}) => {
  const [stage, setStage] = useState<'IDLE' | 'ENTER' | 'FLIP' | 'DOCK' | 'DONE'>('IDLE');
  const [isVisible, setIsVisible] = useState(false);

  const startAnimation = () => {
    setIsVisible(true);
    setStage('ENTER');

    // Stage 1: Enter & Flip (0ms -> 300ms)
    setTimeout(() => {
      setStage('FLIP');
    }, 200);

    // Stage 2: Glint & Hold in Center (300ms -> 1500ms)
    setTimeout(() => {
      setStage('DOCK');
    }, 1500);

    // Stage 3: Completed dock into header (1500ms -> 2300ms)
    setTimeout(() => {
      setStage('DONE');
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 2300);
  };

  useEffect(() => {
    if (forcePlay) {
      startAnimation();
      return;
    }

    // Check if played in current tab session
    const hasPlayed = sessionStorage.getItem('ssk_3d_intro_played');
    if (!hasPlayed) {
      sessionStorage.setItem('ssk_3d_intro_played', 'true');
      startAnimation();
    }
  }, [forcePlay]);

  const handleSkip = () => {
    setStage('DONE');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  if (!isVisible && stage === 'DONE') return null;
  if (!isVisible && stage === 'IDLE') return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-700 pointer-events-auto select-none ${
        stage === 'DOCK' ? 'bg-slate-950/20 backdrop-blur-[2px] opacity-0' : 'bg-slate-950/85 backdrop-blur-md opacity-100'
      }`}
      style={{ perspective: '1400px' }}
    >
      {/* Ambient Saffron & Emerald Radial Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className={`w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-500/20 via-emerald-500/25 to-orange-500/20 blur-3xl transition-all duration-1000 ${
            stage === 'FLIP' ? 'scale-125 opacity-100' : stage === 'DOCK' ? 'scale-50 opacity-0' : 'scale-75 opacity-40'
          }`}
        />
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-5 right-5 z-[110] px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold backdrop-blur border border-white/15 transition flex items-center gap-1.5 cursor-pointer shadow-lg"
      >
        <span>{currentLang === 'hi' ? 'छोड़ें (Skip)' : 'Skip Intro'}</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* 3D Coin Stage Container */}
      <div
        className="relative flex flex-col items-center justify-center transition-all duration-800 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform:
            stage === 'ENTER'
              ? 'perspective(1400px) rotateY(-180deg) rotateX(30deg) scale(0.4)'
              : stage === 'FLIP'
              ? 'perspective(1400px) rotateY(0deg) rotateX(0deg) scale(1.0)'
              : stage === 'DOCK'
              ? 'perspective(1400px) translate3d(-38vw, -44vh, 0) scale(0.16)'
              : 'perspective(1400px) scale(0)',
        }}
      >
        {/* The 3D Minted Coin */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 rounded-full shadow-[0_0_80px_rgba(234,179,8,0.45),0_0_120px_rgba(16,185,129,0.35)] flex items-center justify-center group">
          {/* Outer milled metallic golden edge rim */}
          <div className="absolute inset-0 rounded-full border-4 border-amber-300/80 shadow-inner pointer-events-none" />

          {/* Actual 3D Embossed Coin Artwork */}
          <Image
            src="/national-seal-coin.png"
            alt="National Seal Digital Mint Coin"
            width={352}
            height={352}
            className="w-full h-full object-contain filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)]"
            priority
          />

          {/* Holographic Specular Light Glint Sweep */}
          <div
            className={`absolute inset-0 rounded-full pointer-events-none overflow-hidden transition-opacity duration-500 ${
              stage === 'FLIP' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute -inset-full w-[250%] h-[250%] bg-gradient-to-r from-transparent via-white/40 to-transparent transform -rotate-45 animate-shimmer-sweep" />
          </div>
        </div>

        {/* Elegant Title Reveal Below Coin during FLIP stage */}
        <div
          className={`mt-8 text-center space-y-2 transition-all duration-500 ${
            stage === 'FLIP' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest backdrop-blur shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{currentLang === 'hi' ? 'राष्ट्रीय कल्याण सेतु डिजिटल मुद्रा' : 'Government of India Digital Mint'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            Scheme Seva Kendra
          </h2>
          <p className="text-emerald-300/90 text-xs sm:text-sm font-semibold max-w-md mx-auto">
            {currentLang === 'hi'
              ? 'योजना सेवा केंद्र — 100% निशुल्क प्रत्यक्ष सरकारी सब्सिडी व लोन'
              : 'Direct Subsidy & Collateral-Free Credit Discovery Platform'}
          </p>
        </div>
      </div>
    </div>
  );
};
