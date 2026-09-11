'use client';

import React from 'react';
import { SlidersHorizontal, Info, Banknote, ShieldCheck } from 'lucide-react';
import { SchemeMatch } from '@/types';

interface BaselineMatchPreviewProps {
  currentLang: 'en' | 'hi';
  selectedTradeName: string;
  schemes: SchemeMatch[];
  onOpenCompare: () => void;
  onOpenFinancialAnalysis: (schemeId: string) => void;
  onSwitchToPathway2: () => void;
}

export const BaselineMatchPreview: React.FC<BaselineMatchPreviewProps> = ({
  currentLang,
  selectedTradeName,
  schemes,
  onOpenCompare,
  onOpenFinancialAnalysis,
  onSwitchToPathway2,
}) => {
  const topSchemes = schemes.slice(0, 2);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
              1
            </span>
            <h4 className="font-bold text-indigo-950 text-base">
              {currentLang === 'hi'
                ? 'प्राथमिक अनुमानित योजनाएं (Instant Baseline Matches)'
                : 'Instant Baseline Matches (प्राथमिक अनुमानित योजनाएं)'}
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLang === 'hi' ? 'चयनित व्यवसाय: ' : 'Matched for selected trade: '}
            <span className="font-bold text-indigo-900">{selectedTradeName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            70% Estimated Accuracy
          </span>
        </div>
      </div>

      {/* Baseline Scheme Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {topSchemes.map((scheme) => (
          <div
            key={scheme.id}
            className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between hover:bg-indigo-50/20 transition group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100/80 px-2 py-0.5 rounded">
                    {scheme.ministryEn}
                  </span>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">
                    {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
                  </h5>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold whitespace-nowrap">
                  {scheme.compatibilityPercentage}% Match
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                {currentLang === 'hi' ? scheme.descriptionHi : scheme.descriptionEn}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Collateral-Free
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenFinancialAnalysis(scheme.id)}
                  className="text-xs font-bold text-indigo-900 hover:text-orange-600 bg-indigo-50 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-indigo-200/80 transition flex items-center gap-1"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{currentLang === 'hi' ? 'वित्तीय विश्लेषण' : 'Financial Breakdown'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
