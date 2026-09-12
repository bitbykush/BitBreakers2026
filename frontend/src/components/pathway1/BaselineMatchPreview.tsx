'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, PenSquare, ArrowRight, SlidersHorizontal, SearchX } from 'lucide-react';
import { SchemeMatch } from '@/types';

interface BaselineMatchPreviewProps {
  currentLang: 'en' | 'hi';
  selectedTradeName: string;
  schemes: SchemeMatch[];
  onFillCustomDetails: (schemeId: string) => void;
  onOpenCompare?: (scheme: SchemeMatch) => void;
  onOpenFinancialAnalysis?: (schemeId: string) => void;
  onSwitchToPathway2?: () => void;
  onOpenCaf?: (scheme: SchemeMatch) => void;
}

export const BaselineMatchPreview: React.FC<BaselineMatchPreviewProps> = ({
  currentLang,
  selectedTradeName,
  schemes,
  onFillCustomDetails,
  onOpenCompare,
  onOpenFinancialAnalysis,
  onSwitchToPathway2,
  onOpenCaf,
}) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayedSchemes = showAll ? schemes : schemes.slice(0, 6);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
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
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {schemes.length} {currentLang === 'hi' ? 'योजनाएं' : 'Schemes'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLang === 'hi' ? 'चयनित व्यवसाय / प्राथमिकता: ' : 'Showing matches for: '}
            <span className="font-bold text-indigo-900">{selectedTradeName}</span>
          </p>
        </div>

        {schemes.length > 0 && onOpenCompare && (
          <button
            type="button"
            onClick={() => onOpenCompare(schemes[0])}
            className="h-8 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-950 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
            <span>{currentLang === 'hi' ? 'योजनाओं की तुलना करें' : 'Compare Schemes'}</span>
          </button>
        )}
      </div>

      {/* Baseline Scheme Cards or Empty State */}
      {displayedSchemes.length === 0 ? (
        <div className="py-8 px-4 text-center space-y-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <SearchX className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-slate-800 text-sm sm:text-base">
              {currentLang === 'hi'
                ? 'कोई योजना नहीं मिली (No Matching Schemes Found)'
                : 'No Matching Schemes Found'}
            </h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {currentLang === 'hi'
                ? `"${selectedTradeName}" के लिए कोई सरकारी योजना उपलब्ध नहीं है। कृपया सही व्यवसाय (जैसे: कुम्हार, सिलाई, बढ़ई, रेहड़ी-पटरी, सोलर, डेयरी, छात्रवृत्ति) टाइप करें या ऊपर दिए गए विकल्पों में से चुनें।`
                : `No government welfare schemes match "${selectedTradeName}". Please enter a recognized trade (e.g. Potter, Tailor, Carpenter, Street Vendor, Solar, Dairy, Student) or select from the trade chips above.`}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between hover:bg-indigo-50/20 hover:border-indigo-200 transition group shadow-2xs"
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

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Fill Custom Details -> Goes to Pathway 2 */}
                    <button
                      type="button"
                      onClick={() => onFillCustomDetails(scheme.id)}
                      className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold text-white bg-indigo-950 hover:bg-indigo-900 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <PenSquare className="w-3.5 h-3.5 text-orange-300" />
                      <span>{currentLang === 'hi' ? 'कस्टम विवरण' : 'Fill Details'}</span>
                    </button>

                    {/* Arrow Button -> Opens new Scheme Details page */}
                    <Link
                      href={`/schemes/${scheme.id}`}
                      title={currentLang === 'hi' ? 'योजना का पूरा विवरण एवं पात्रता देखें' : 'View Scheme Details & Eligibility'}
                      className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition flex items-center justify-center group active:scale-95"
                    >
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {schemes.length > 6 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
              >
                {showAll ? (
                  <span>− {currentLang === 'hi' ? 'कम योजनाएं देखें' : 'Show Fewer Schemes'}</span>
                ) : (
                  <span>+ {currentLang === 'hi' ? `सभी ${schemes.length} योजनाएं देखें` : `View All ${schemes.length} Schemes`}</span>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
