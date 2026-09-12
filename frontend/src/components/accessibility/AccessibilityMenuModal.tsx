'use client';

import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Contrast,
  ZoomIn,
  Type,
  BookOpen,
  RotateCcw,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

export const AccessibilityMenuModal: React.FC = () => {
  const {
    isA11yMenuOpen,
    setIsA11yMenuOpen,
    highContrast,
    setHighContrast,
    zoomLevel,
    setZoomLevel,
    magnifierLensActive,
    setMagnifierLensActive,
    fontSize,
    setFontSize,
    dyslexiaFont,
    setDyslexiaFont,
    readingGuideActive,
    setReadingGuideActive,
    talkBackActive,
    setTalkBackActive,
    talkBackSpeed,
    setTalkBackSpeed,
    speakText,
    resetDefaults,
  } = useAccessibility();

  if (!isA11yMenuOpen) return null;

  return (
    <div
      id="a11y-modal-drawer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
    >
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-indigo-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-indigo-950 flex items-center justify-center font-black shadow-md">
              <span className="text-xl">♿</span>
            </div>
            <div>
              <h2 id="a11y-title" className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Accessibility Menu
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  सुगमता मेनू
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Android-style assistive controls for screen reading, contrast & magnification
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsA11yMenuOpen(false)}
            className="w-8 h-8 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-slate-200 hover:text-white flex items-center justify-center transition border border-indigo-700"
            title="Close Menu (Esc)"
            aria-label="Close Accessibility Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Feature Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Card 1: TalkBack Screen Reader */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition hover:border-indigo-300">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${talkBackActive ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 text-slate-700'}`}>
                  {talkBackActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    TalkBack Screen Reader
                    <span className="text-xs font-normal text-slate-500">(बोलकर सुनाने वाला)</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    Speaks aloud focused cards, buttons & text as you hover or tab
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <button
                onClick={() => setTalkBackActive(!talkBackActive)}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                  talkBackActive
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                aria-pressed={talkBackActive}
              >
                {talkBackActive ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{talkBackActive ? 'ACTIVE (चालू)' : 'DISABLED (बंद)'}</span>
              </button>
            </div>

            {/* TalkBack Sub-controls */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Voice Speed:</span>
                {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setTalkBackSpeed(speed)}
                    className={`h-7 px-2 rounded-md text-xs font-semibold border transition ${
                      talkBackSpeed === speed
                        ? 'bg-indigo-950 text-white border-indigo-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => speakText('Namaste. Scheme Seva Kendra TalkBack speech system is working perfectly in your browser.', true)}
                className="h-7 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>Test Voice (जांचें)</span>
              </button>
            </div>
          </div>

          {/* Card 2: High Contrast Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition hover:border-indigo-300">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-yellow-300 flex items-center justify-center">
                <Contrast className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  High Contrast Colors
                  <span className="text-xs font-normal text-slate-500">(उच्च कंट्रास्ट रंग)</span>
                </h3>
                <p className="text-xs text-slate-600">
                  WCAG AAA compliant color combinations for low vision and color blindness
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Standard */}
              <button
                onClick={() => setHighContrast('none')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition text-left ${
                  highContrast === 'none'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 border border-slate-300 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">Standard (मानक)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Default theme</div>
                </div>
              </button>

              {/* Yellow on Black */}
              <button
                onClick={() => setHighContrast('yellow-black')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition text-left ${
                  highContrast === 'yellow-black'
                    ? 'border-yellow-400 bg-black text-yellow-300 ring-2 ring-yellow-400/30 shadow-xs'
                    : 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-black'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-yellow-400 border border-black flex-shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">Yellow on Black</div>
                  <div className="text-[10px] text-yellow-300/70 font-normal">WCAG AAA Dark</div>
                </div>
              </button>

              {/* Monochrome */}
              <button
                onClick={() => setHighContrast('black-white')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition text-left ${
                  highContrast === 'black-white'
                    ? 'border-black bg-white text-black ring-2 ring-black/20 shadow-xs'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-black border border-slate-300 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">Black on White</div>
                  <div className="text-[10px] text-slate-500 font-normal">Stark Monochrome</div>
                </div>
              </button>
            </div>
          </div>

          {/* Card 3: Screen Magnification & Zoom */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition hover:border-indigo-300">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <ZoomIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Magnification & Zoom
                    <span className="text-xs font-normal text-slate-500">(स्क्रीन आवर्धक)</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    Scale page size or enable cursor spotlight lens
                  </p>
                </div>
              </div>

              {/* Magnifier Lens Toggle */}
              <button
                onClick={() => setMagnifierLensActive(!magnifierLensActive)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  magnifierLensActive
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Magnifier Lens: {magnifierLensActive ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Zoom Levels */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Zoom Scale:</span>
              {[100, 125, 150, 175, 200].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setZoomLevel(lvl)}
                  className={`h-7 px-2.5 rounded-md font-semibold text-xs border transition ${
                    zoomLevel === lvl
                      ? 'bg-indigo-950 text-white border-indigo-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Text Size & Reading Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Text Size */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-slate-900">Font Size (फॉन्ट आकार)</h3>
              </div>
              <div className="flex gap-2">
                {(['normal', 'large', 'xlarge'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setFontSize(tier)}
                    className={`flex-1 h-8 rounded-lg text-xs font-semibold border capitalize transition ${
                      fontSize === tier
                        ? 'bg-indigo-950 text-white border-indigo-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tier === 'normal' ? 'Normal (1x)' : tier === 'large' ? 'Large (A+)' : 'Max (A++)'}
                  </button>
                ))}
              </div>

              {/* Dyslexia Toggle */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">Dyslexia Font</span>
                <button
                  onClick={() => setDyslexiaFont(!dyslexiaFont)}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold border ${
                    dyslexiaFont
                      ? 'bg-indigo-950 text-white border-indigo-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {dyslexiaFont ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Reading Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Reading Guide (रीडिंग गाइड)</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Focus ruler bar that tracks cursor for easy line-by-line reading
              </p>
              <button
                onClick={() => setReadingGuideActive(!readingGuideActive)}
                className={`w-full h-8 rounded-lg text-xs font-semibold border transition ${
                  readingGuideActive
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {readingGuideActive ? '✓ Reading Guide ON' : 'Turn ON Reading Guide'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={resetDefaults}
            className="h-8 px-2.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 transition hover:bg-slate-200/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults (डिफ़ॉल्ट रीसेट)</span>
          </button>

          <button
            onClick={() => setIsA11yMenuOpen(false)}
            className="h-9 px-4 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold transition shadow-xs"
          >
            Save & Close (लागू करें)
          </button>
        </div>
      </div>
    </div>
  );
};
