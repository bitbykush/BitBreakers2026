'use client';

import React, { useState, useEffect } from 'react';
import { Search, Mic, Compass, Check, X, ArrowRight } from 'lucide-react';
import { TRADE_PRESETS } from '@/lib/mockData';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface TradeSearchAndPillsProps {
  currentLang: 'en' | 'hi';
  selectedTrade: string;
  onSelectTrade: (tradeEn: string, tradeHi: string) => void;
  onSearchChange: (query: string) => void;
}

export const TradeSearchAndPills: React.FC<TradeSearchAndPillsProps> = ({
  currentLang,
  selectedTrade,
  onSelectTrade,
  onSearchChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTrades, setShowAllTrades] = useState(false);

  const PLACEHOLDERS_HI = [
    "उदा. 'माटी के बर्तन बनाने के लिए 2 लाख का लोन'...",
    "उदा. 'सिलाई मशीन व महिला सहायता 35% सब्सिडी'...",
    "उदा. 'पीएम विश्वकर्मा ₹15,000 टूलकिट अनुदान'...",
    "उदा. 'पीएम सूर्य घर सोलर रूफटॉप योजना'...",
    "उदा. 'चाय की दुकान, फल विक्रेता पीएम स्वनिधि लोन'...",
    "उदा. 'डेयरी फार्मिंग, दूध उत्पादन व पशुपालन ऋण'...",
  ];

  const PLACEHOLDERS_EN = [
    "e.g. 'Women Tailoring Machine 35% Subsidy'...",
    "e.g. 'PM Vishwakarma Toolkit ₹15,000 Free'...",
    "e.g. 'PM Surya Ghar Solar Rooftop Grant'...",
    "e.g. 'Terracotta pottery workshop ₹2 Lakh loan'...",
    "e.g. 'PM SVANidhi Street Vendor Credit'...",
    "e.g. 'Dairy farming & animal husbandry loan'...",
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (searchQuery) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS_EN.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [searchQuery, PLACEHOLDERS_EN.length]);

  const activePlaceholder = currentLang === 'hi'
    ? PLACEHOLDERS_HI[placeholderIndex]
    : PLACEHOLDERS_EN[placeholderIndex];

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearchChange('');
  };

  const {
    isRecording,
    language: voiceLang,
    setLanguage: setVoiceLang,
    toggleRecording,
    errorMessage,
  } = useSpeechRecognition((transcript) => {
    setSearchQuery(transcript);
    onSearchChange(transcript);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearchChange(val);
  };

  const handleChipClick = (tradeEn: string, tradeHi: string) => {
    setSearchQuery(currentLang === 'hi' ? `${tradeHi} (${tradeEn})` : `${tradeEn} (${tradeHi})`);
    onSelectTrade(tradeEn, tradeHi);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/80">
      {/* Background ambient lighting */}
      <div className="absolute -right-16 -top-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          {currentLang === 'hi'
            ? 'अपने काम व हुनर के लिए सरकारी योजना खोजें'
            : 'Find Government Grants & Loans for Your Work'}
        </h2>
        <p className="text-orange-200/90 text-sm sm:text-base font-medium">
          (बिना किसी फॉर्म के 1-क्लिक में सरकारी सब्सिडी व लोन)
        </p>
      </div>

      {/* Search Bar with Mic and Language Switcher */}
      <div className="relative z-10 max-w-3xl mx-auto mt-6">
        <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border-2 border-orange-400/90 ring-4 ring-orange-500/25 shadow-orange-500/10 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/30 transition-all">
          {/* Search Input with Framed Lens & Clear Button */}
          <div className="flex items-center gap-2.5 flex-1 w-full px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 shadow-2xs border border-orange-100">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchChange(searchQuery);
                }
              }}
              placeholder={activePlaceholder}
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium border-none focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer flex-shrink-0"
                title={currentLang === 'hi' ? 'खोज हटाएं' : 'Clear search'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Controls: Language Switcher + Voice Mic + Primary Search CTA */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-1 sm:px-1.5 pb-1 sm:pb-0 flex-shrink-0">
            {/* Bilingual Voice Lang Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold flex-shrink-0">
              <button
                type="button"
                onClick={() => setVoiceLang('hi-IN')}
                className={`h-7 px-2.5 rounded-md transition text-xs font-bold cursor-pointer ${
                  voiceLang === 'hi-IN' ? 'bg-indigo-950 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇳 हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setVoiceLang('en-IN')}
                className={`h-7 px-2.5 rounded-md transition text-xs font-bold cursor-pointer ${
                  voiceLang === 'en-IN' ? 'bg-indigo-950 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white ring-4 ring-rose-300 animate-pulse'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200/80'
              }`}
              title={currentLang === 'hi' ? 'बोलकर खोजें (Voice Search)' : 'Voice Search'}
            >
              <Mic className="w-4 h-4 text-indigo-700" />
              <span className="hidden sm:inline">
                {isRecording ? 'बोलिए...' : currentLang === 'hi' ? 'बोलें' : 'Voice'}
              </span>
            </button>

            {/* Primary Search CTA Button - Anchored at the far right */}
            <button
              type="button"
              onClick={() => onSearchChange(searchQuery)}
              className="h-9 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer flex-shrink-0"
              title={currentLang === 'hi' ? 'खोजें (Search)' : 'Search'}
            >
              <span>{currentLang === 'hi' ? 'खोजें' : 'Search'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Animated Soundwave Listening Banner */}
        {isRecording && (
          <div className="mt-3 mx-auto flex items-center justify-center gap-2 bg-black/50 px-4 py-2 rounded-xl border border-white/10 backdrop-blur w-fit">
            <span className="text-xs font-mono text-orange-400 font-bold animate-pulse">
              {currentLang === 'hi'
                ? 'सुन रहे हैं... बोलिए (जैसे: "मुझे कुम्हार के काम के लिए लोन चाहिए")'
                : 'Listening... (e.g., "I need a loan for pottery workshop")'}
            </span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-3 bg-orange-400 rounded-full wave-bar" />
              <div className="w-1.5 h-6 bg-amber-400 rounded-full wave-bar" />
              <div className="w-1.5 h-7 bg-orange-500 rounded-full wave-bar" />
              <div className="w-1.5 h-4 bg-amber-300 rounded-full wave-bar" />
              <div className="w-1.5 h-2 bg-orange-400 rounded-full wave-bar" />
            </div>
          </div>
        )}

        {/* Error / Status Feedback */}
        {errorMessage && !isRecording && (
          <div className="mt-2 text-center animate-fadeIn">
            <span className="inline-block text-xs font-medium text-amber-200 bg-black/60 px-3.5 py-1.5 rounded-xl border border-amber-500/30 backdrop-blur shadow-sm">
              ℹ️ {errorMessage}
            </span>
          </div>
        )}
      </div>

      {/* Trade Bubble Pills Container */}
      <div className="relative z-10 max-w-4xl mx-auto mt-6 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-orange-300 tracking-wide uppercase flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            {currentLang === 'hi' ? 'काम चुनें (Quick Select Trade):' : 'Quick Select Trade / काम चुनें:'}
          </span>
          <span className="text-[11px] text-slate-300 hidden sm:inline">
            {currentLang === 'hi' ? 'तुरंत योजनाएं देखने के लिए किसी भी व्यवसाय पर क्लिक करें' : 'Tap any chip to reveal instant grants'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TRADE_PRESETS.slice(0, showAllTrades ? TRADE_PRESETS.length : 6).map((trade) => {
            const isSelected = selectedTrade.includes(trade.nameEn) || selectedTrade.includes(trade.nameHi);
            return (
              <button
                key={trade.nameEn}
                type="button"
                onClick={() => handleChipClick(trade.nameEn, trade.nameHi)}
                className={`group h-8 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs ${
                  isSelected
                    ? 'bg-orange-500 text-white border-2 border-orange-300 shadow-md scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                }`}
              >
                <span className="text-sm">{trade.icon}</span>
                <span>
                  {trade.nameEn} ({trade.nameHi})
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAllTrades((prev) => !prev)}
            className="h-8 px-3 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40 transition-all flex items-center gap-1.5 active:scale-95"
          >
            {showAllTrades ? (
              <span>− {currentLang === 'hi' ? 'कम देखें' : 'Show Less'}</span>
            ) : (
              <span>+ {currentLang === 'hi' ? 'और काम देखें' : 'View All Trades (और काम देखें)'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
