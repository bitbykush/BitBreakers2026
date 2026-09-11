'use client';

import React, { useEffect, useState } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';

export const MagnifierLens: React.FC = () => {
  const { magnifierLensActive, readingGuideActive } = useAccessibility();
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -500, y: -500 });
  const [targetSnippet, setTargetSnippet] = useState<string>('');

  useEffect(() => {
    if (!magnifierLensActive && !readingGuideActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      if (magnifierLensActive) {
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (target && target.innerText && target.id !== 'magnifier-lens' && target.id !== 'reading-guide') {
          const text = target.innerText.slice(0, 140).trim();
          setTargetSnippet(text);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [magnifierLensActive, readingGuideActive]);

  return (
    <>
      {/* 1. Android-Style Reading Guide (Horizontal Focus Ruler) */}
      {readingGuideActive && (
        <div
          id="reading-guide"
          className="pointer-events-none fixed left-0 right-0 z-50 transition-all duration-75 ease-out no-print"
          style={{ top: `${pos.y - 20}px` }}
        >
          <div className="h-10 bg-yellow-300/15 border-y-2 border-yellow-400 shadow-sm backdrop-contrast-125 flex items-center justify-end px-4">
            <span className="text-[10px] font-black uppercase text-yellow-600 bg-white/90 px-2 py-0.5 rounded shadow-2xs border border-yellow-400">
              Reading Guide
            </span>
          </div>
        </div>
      )}

      {/* 2. Interactive Magnifier Lens (Cursor Zoom Spotlight) */}
      {magnifierLensActive && pos.x >= 0 && (
        <div
          id="magnifier-lens"
          className="pointer-events-none fixed z-50 w-48 h-48 rounded-full border-4 border-indigo-950 bg-white/95 shadow-2xl overflow-hidden flex flex-col justify-center items-center p-3 text-center transition-transform duration-75 no-print"
          style={{
            left: `${pos.x - 96}px`,
            top: `${pos.y - 120}px`,
            boxShadow: '0 0 0 4px rgba(255, 230, 0, 0.9), 0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full mb-1 border border-indigo-200">
            🔍 Magnifier 2x
          </div>
          <p className="text-sm font-black text-indigo-950 leading-tight line-clamp-4">
            {targetSnippet || 'Move over text to magnify'}
          </p>
        </div>
      )}
    </>
  );
};
