'use client';

import React from 'react';
import { X, Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SchemeMatch, ApplicantProfile } from '@/types';

interface FinancialAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: SchemeMatch | null;
  profile: ApplicantProfile;
  onProceedPathway2?: () => void;
  currentLang: 'en' | 'hi';
}

export const FinancialAnalysisDrawer: React.FC<FinancialAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  scheme,
  profile,
  onProceedPathway2,
  currentLang,
}) => {
  if (!isOpen || !scheme) return null;

  const capital = profile.requiredCapital || 200000;
  const grantAmount = Math.min(
    (capital * scheme.financials.grantSubsidyPercentage) / 100,
    scheme.financials.maxGrantAmount || capital
  );
  const ownMargin = (capital * scheme.financials.promoterMarginPercentage) / 100;
  const loanAmount = capital - grantAmount - ownMargin;

  return (
    <div className="fixed inset-0 z-50 flex no-print animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">
                  {currentLang === 'hi' ? 'योजना वित्तीय व सब्सिडी विश्लेषण' : 'Scheme Financial & Subsidy Breakdown'}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                  वित्तीय विश्लेषण
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-sm">
                {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                  {scheme.nodalAgency}
                </span>
                <h4 className="font-extrabold text-indigo-950 text-base mt-1">
                  {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                {scheme.compatibilityPercentage}% Match
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              {currentLang === 'hi' ? scheme.descriptionHi : scheme.descriptionEn}
            </p>
          </div>

          {/* Capital Allocation Breakdown Grid */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Capital Appraisal & Financing Split (₹{capital.toLocaleString('en-IN')} Total Cost)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Govt Grant */}
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                  Govt Grant ({scheme.financials.grantSubsidyPercentage}%)
                </span>
                <div className="text-base font-black text-emerald-800 font-mono">
                  ₹{grantAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-emerald-700">100% Non-refundable direct subsidy</p>
              </div>

              {/* Bank Term Loan */}
              <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-950 space-y-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Bank Term Loan</span>
                <div className="text-base font-black text-blue-800 font-mono">
                  ₹{loanAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-blue-700">
                  {scheme.financials.subsidizedInterestRate
                    ? `@ ${scheme.financials.subsidizedInterestRate}% subsidized rate`
                    : 'Standard bank MCLR'}
                </p>
              </div>

              {/* Own Margin */}
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase">
                  Own Margin ({scheme.financials.promoterMarginPercentage}%)
                </span>
                <div className="text-base font-black text-amber-800 font-mono">
                  ₹{ownMargin.toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-amber-700">Special concession for OBC/SC/ST</p>
              </div>
            </div>
          </div>

          {/* Key Eligibility Highlights */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scheme Safeguards & Perks:</h5>
            <div className="space-y-1.5 text-xs text-slate-600">
              {scheme.eligibilityHighlights.map((hl, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-9 px-5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            {currentLang === 'hi' ? 'बंद करें (Close)' : 'Close (बंद करें)'}
          </button>
        </div>
      </div>
    </div>
  );
};
