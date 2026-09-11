'use client';

import React, { useState } from 'react';
import { Search, Mic, Sparkles, Compass, Check } from 'lucide-react';
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

  const {
    isRecording,
    language: voiceLang,
    setLanguage: setVoiceLang,
    toggleRecording,
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-medium backdrop-blur-md border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>
            {currentLang === 'hi'
              ? 'त्वरित सरकारी सब्सिडी व संपार्श्विक-मुक्त ऋण खोज'
              : 'Instant Welfare Grants & Low-Interest Loans'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          {currentLang === 'hi'
            ? 'अपने काम व हुनर के लिए सरकारी योजना खोजें'
            : 'Find Government Grants & Loans for Your Work'}
        </h2>
        <p className="text-orange-200/90 text-sm sm:text-base font-medium">
          (बिना किसी फॉर्म के 1-क्लिक में सरकारी सब्सिडी व लोन)
        </p>
        <p className="text-slate-300 text-xs sm:text-sm">
          {currentLang === 'hi'
            ? 'कारीगरों, रेहड़ी-पटरी वालों, दुकानदारों, बुनकरों और पारंपरिक कामगारों के लिए विशेष रूप से निर्मित।'
            : 'Designed for artisans, street vendors, small shop owners, handloom weavers, and vocational workers.'}
        </p>
      </div>

      {/* Search Bar with Mic and Language Switcher */}
      <div className="relative z-10 max-w-3xl mx-auto mt-6">
        <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border-2 border-orange-500/80 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/20 transition-all">
          {/* Search Input */}
          <div className="flex items-center gap-2.5 flex-1 w-full px-3 py-1.5">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder={
                currentLang === 'hi'
                  ? 'अपना काम खोजें (उदा. चाय की दुकान, बढ़ई, सिलाई, कुम्हार, डेयरी...)'
                  : 'Search your trade, craft, or work (e.g. Chai stall, Carpenter, Tailor, Dairy...)'
              }
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium border-none focus:outline-none focus:ring-0"
            />
          </div>

          {/* Right Controls: Voice Lang Switcher + Voice Mic Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-2 pb-1 sm:pb-0">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setVoiceLang('hi-IN')}
                className={`px-2 py-1 rounded-md transition ${
                  voiceLang === 'hi-IN' ? 'bg-indigo-950 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇮🇳 हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setVoiceLang('en-IN')}
                className={`px-2 py-1 rounded-md transition ${
                  voiceLang === 'en-IN' ? 'bg-indigo-950 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={toggleRecording}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 whitespace-nowrap ${
                isRecording
                  ? 'bg-rose-600 ring-4 ring-rose-300 animate-pulse'
                  : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 shadow-orange-600/30'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>
                {isRecording
                  ? 'Listening... बोलिए'
                  : currentLang === 'hi'
                  ? 'बोलकर खोजें'
                  : 'Tap to Speak / बोलें'}
              </span>
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
                className={`group px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-2xs ${
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
            className="px-3.5 py-2 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40 transition-all flex items-center gap-1.5 active:scale-95"
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
