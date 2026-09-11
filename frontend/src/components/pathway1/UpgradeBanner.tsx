'use client';

import React from 'react';
import { ScanLine, ArrowRightCircle, ArrowRight } from 'lucide-react';

interface UpgradeBannerProps {
  currentLang: 'en' | 'hi';
  onSwitchToPathway2: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ currentLang, onSwitchToPathway2 }) => {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 p-5 sm:p-7 text-white shadow-xl border-2 border-orange-500/40 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
          <ScanLine className="w-7 h-7" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-1">
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>READY FOR BANK APPLICATION?</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white">
            {currentLang === 'hi'
              ? '95%+ बैंक सटीकता व प्री-फिल्ड फॉर्म के लिए विस्तृत मोड चुनें'
              : 'Switch to Pathway 2 for 95%+ Accuracy & Pre-Filled Bank Dossier'}
          </h4>
          <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">
            {currentLang === 'hi'
              ? 'आधार या जाति प्रमाण पत्र अपलोड करें। हमारा AI 10 सेकंड में आपकी सारी जानकारी सुरक्षित भर देगा!'
              : 'Upload your Aadhaar or Caste Certificate. Our AI auto-fills everything in 10 seconds with masked privacy!'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToPathway2}
        className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <span>{currentLang === 'hi' ? 'विस्तृत मोड पर जाएं' : 'Switch to Pathway 2'}</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};
