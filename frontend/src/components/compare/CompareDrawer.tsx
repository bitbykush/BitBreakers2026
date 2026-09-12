'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  SlidersHorizontal,
  Info,
  Check,
  ArrowRightLeft,
  ArrowRight,
  ShieldCheck,
  FileText,
  Search,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { SchemeMatch } from '@/types';
import { MOCK_SCHEMES } from '@/lib/mockData';

export interface CompareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schemes?: SchemeMatch[];
  initialScheme?: SchemeMatch | null;
  onProceedPathway2?: (schemeId?: string) => void;
  currentLang: 'en' | 'hi';
}

const DOCUMENT_LABELS: Record<string, { en: string; hi: string }> = {
  DOC_AADHAAR: { en: 'Aadhaar Card (Front & Back)', hi: 'आधार कार्ड (आगे व पीछे)' },
  DOC_CASTE: { en: 'Caste / Community Certificate', hi: 'जाति प्रमाण पत्र' },
  DOC_INCOME: { en: 'Annual Income Certificate / BPL', hi: 'आय प्रमाण पत्र / राशन कार्ड' },
  DOC_RURAL: { en: 'Rural Area Certificate', hi: 'ग्रामीण क्षेत्र प्रमाण पत्र' },
  DOC_MARKSHEET: { en: 'Highest Degree / Marksheet', hi: 'शैक्षणिक योग्यता प्रमाण पत्र' },
  DOC_PROJECT_REPORT: { en: 'DPR / Project Report', hi: 'परियोजना रिपोर्ट (DPR)' },
};

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  isOpen,
  onClose,
  schemes = [],
  initialScheme = null,
  onProceedPathway2,
  currentLang,
}) => {
  // Always allow comparing against the full scheme catalog (29 schemes)
  const availableSchemes = useMemo(() => {
    const map = new Map<string, SchemeMatch>();
    MOCK_SCHEMES.forEach((s) => map.set(s.id, s));
    (schemes || []).forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  }, [schemes]);

  const [schemeAId, setSchemeAId] = useState<string>('');
  const [schemeBId, setSchemeBId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync state whenever drawer opens or initialScheme changes
  useEffect(() => {
    if (isOpen) {
      const defaultA = initialScheme?.id || (availableSchemes.length > 0 ? availableSchemes[0].id : '');
      setSchemeAId(defaultA);

      // If scheme B was previously matching scheme A, reset scheme B to null to prompt user
      if (schemeBId === defaultA) {
        setSchemeBId(null);
      }
      setSearchQuery('');
    }
  }, [isOpen, initialScheme, availableSchemes]);

  if (!isOpen) return null;

  const schemeA = availableSchemes.find((s) => s.id === schemeAId) || availableSchemes[0] || null;
  const schemeB = schemeBId ? availableSchemes.find((s) => s.id === schemeBId) || null : null;

  // Candidate schemes to compare against Scheme A
  const candidateSchemes = availableSchemes
    .filter((s) => s.id !== schemeA?.id)
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.nameEn.toLowerCase().includes(q) ||
        s.nameHi.toLowerCase().includes(q) ||
        s.ministryEn.toLowerCase().includes(q) ||
        s.categoryBadge.toLowerCase().includes(q)
      );
    });

  const handleSwapSchemes = () => {
    if (schemeA && schemeB) {
      const temp = schemeA.id;
      setSchemeAId(schemeB.id);
      setSchemeBId(temp);
    }
  };

  const formatRupees = (amount?: number) => {
    if (!amount || amount === 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Crore`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakh`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex no-print animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative ml-auto h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between border-b border-indigo-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">
                  {currentLang === 'hi' ? 'राष्ट्रीय योजनाओं की आमने-सामने तुलना' : 'Side-by-Side Scheme Comparison'}
                </h3>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/40 font-semibold">
                  {schemeB ? 'Strictly 2 Schemes' : 'Select Comparison'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentLang === 'hi'
                  ? 'सरकारी सब्सिडी, ऋण सीमा, ब्याज दर एवं अनिवार्य दस्तावेजों का प्रत्यक्ष 2-योजना विश्लेषण'
                  : 'Direct head-to-head comparison of capital subsidies, loan caps, interest subventions & documents'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TOP SELECTOR BAR                                                          */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Scheme A Selector */}
          <div className="w-full sm:flex-1">
            <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider mb-1">
              {currentLang === 'hi' ? 'प्राथमिक योजना (Scheme 1)' : 'Scheme 1 (Base Scheme)'}
            </label>
            <select
              value={schemeA?.id || ''}
              onChange={(e) => {
                setSchemeAId(e.target.value);
                if (schemeBId === e.target.value) {
                  setSchemeBId(null);
                }
              }}
              className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {availableSchemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {currentLang === 'hi' ? s.nameHi : s.nameEn} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button (Visible when Scheme B is selected) */}
          {schemeB && (
            <div className="flex items-center justify-center pt-2 sm:pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={handleSwapSchemes}
                className="h-9 px-3 rounded-xl bg-white border border-slate-300 text-indigo-950 hover:bg-indigo-50 transition flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                title="Swap Schemes / योजनाओं की स्थिति बदलें"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden md:inline">{currentLang === 'hi' ? 'अदला-बदली' : 'Swap'}</span>
              </button>
            </div>
          )}

          {/* Scheme B Selector / Prompt */}
          <div className="w-full sm:flex-1">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                {currentLang === 'hi' ? 'तुलना योजना (Scheme 2)' : 'Scheme 2 (Comparison Scheme)'}
              </label>
              {schemeB && (
                <button
                  type="button"
                  onClick={() => setSchemeBId(null)}
                  className="text-[11px] text-orange-600 hover:text-orange-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {currentLang === 'hi' ? 'दूसरी योजना बदलें' : 'Change Scheme 2'}
                </button>
              )}
            </div>

            {schemeB ? (
              <select
                value={schemeB.id}
                onChange={(e) => setSchemeBId(e.target.value)}
                className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {availableSchemes
                  .filter((s) => s.id !== schemeA?.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {currentLang === 'hi' ? s.nameHi : s.nameEn} ({s.code})
                    </option>
                  ))}
              </select>
            ) : (
              <div className="h-9 px-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 flex items-center text-xs text-orange-800 font-medium">
                {currentLang === 'hi' ? 'नीचे सूची में से योजना 2 का चयन करें...' : 'Select Scheme 2 from below...'}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: PROMPT VIEW (IF SCHEME B NOT SELECTED) OR COMPARISON MATRIX    */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ------------------------------------------------------------------- */}
          {/* STEP 1: PROMPT USER TO PICK WHICH SCHEME TO COMPARE WITH SCHEME 1   */}
          {/* ------------------------------------------------------------------- */}
          {!schemeB ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Question Banner */}
              <div className="bg-gradient-to-br from-orange-50 via-amber-50/50 to-indigo-50/40 border-2 border-orange-200 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    ?
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-100 px-3 py-1 rounded-full">
                    {currentLang === 'hi' ? 'योजना चयन आवश्यक' : 'Select Scheme to Compare'}
                  </span>
                </div>

                <h4 className="text-lg sm:text-xl font-black text-indigo-950 leading-snug">
                  {currentLang === 'hi'
                    ? `"${schemeA ? schemeA.nameHi : 'योजना'}" की तुलना आप किस योजना से करना चाहते हैं?`
                    : `Which scheme would you like to compare with "${schemeA ? schemeA.nameEn : 'Scheme 1'}"?`}
                </h4>

                <p className="text-xs sm:text-sm text-slate-600">
                  {currentLang === 'hi'
                    ? 'कृपया नीचे दी गई राष्ट्रीय कल्याण योजनाओं में से किसी एक का चयन करें। चयन के बाद दोनों योजनाओं के बीच सब्सिडी राशि, ऋण सीमा, ब्याज दर और पात्रता की आमने-सामने तुलना प्रदर्शित की जाएगी।'
                    : 'Select a second welfare credit or grant scheme from below to compare loan ceilings, non-refundable subsidies, collateral waivers, and document checklists side-by-side.'}
                </p>

                {/* Search candidate filter */}
                <div className="pt-2">
                  <div className="relative max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        currentLang === 'hi'
                          ? 'योजना का नाम या मंत्रालय खोजें...'
                          : 'Search scheme name or ministry to compare...'
                      }
                      className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Candidate Schemes Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {currentLang === 'hi'
                      ? `उपलब्ध योजनाएं (${candidateSchemes.length})`
                      : `Available Schemes to Compare (${candidateSchemes.length})`}
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    {currentLang === 'hi' ? 'किसी एक पर क्लिक करें' : 'Click to select and compare'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidateSchemes.map((cand) => (
                    <div
                      key={cand.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 hover:border-orange-500 hover:shadow-md transition group flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {cand.ministryEn}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {cand.compatibilityPercentage}% Match
                          </span>
                        </div>

                        <div>
                          <h6 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-950 transition">
                            {currentLang === 'hi' ? cand.nameHi : cand.nameEn}
                          </h6>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {currentLang === 'hi' ? cand.descriptionHi : cand.descriptionEn}
                          </p>
                        </div>

                        {/* Quick Highlights Matrix */}
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-100">
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Grant / Subsidy</span>
                            <span className="font-bold text-emerald-700">
                              {cand.financials.grantSubsidyPercentage > 0
                                ? `${cand.financials.grantSubsidyPercentage}% (Up to ${formatRupees(cand.financials.maxGrantAmount)})`
                                : 'Interest Relief'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Max Loan / Credit</span>
                            <span className="font-bold text-indigo-950">
                              {formatRupees(cand.financials.maxGrantAmount * 2 || 500000)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% Collateral-Free
                        </span>

                        <button
                          type="button"
                          onClick={() => setSchemeBId(cand.id)}
                          className="h-8 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <span>{currentLang === 'hi' ? 'तुलना के लिए चुनें' : 'Compare with this'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------------- */
            /* STEP 2: STRICT 2-SCHEME SIDE-BY-SIDE COMPARATIVE MATRIX             */
            /* ------------------------------------------------------------------- */
            <div className="space-y-6 animate-fadeIn">
              {/* Active Comparison Status Banner */}
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-orange-300">
                      {currentLang === 'hi' ? 'प्रत्यक्ष 2-योजना तुलना सक्रिय' : 'Direct 2-Scheme Comparison Active'}
                    </div>
                    <div className="text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                      <span>{currentLang === 'hi' ? schemeA?.nameHi : schemeA?.nameEn}</span>
                      <span className="text-orange-400 font-black">VS</span>
                      <span>{currentLang === 'hi' ? schemeB.nameHi : schemeB.nameEn}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwapSchemes}
                    className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" />
                    <span>{currentLang === 'hi' ? 'अदला-बदली' : 'Swap'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemeBId(null)}
                    className="h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{currentLang === 'hi' ? 'दूसरी योजना बदलें' : 'Change Scheme 2'}</span>
                  </button>
                </div>
              </div>

              {/* SIDE-BY-SIDE 2-COLUMN MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* ------------------------------------------------------------- */}
                {/* COLUMN 1: SCHEME A                                            */}
                {/* ------------------------------------------------------------- */}
                {schemeA && (
                  <div className="bg-white rounded-3xl border-2 border-indigo-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
                    <div className="space-y-5">
                      {/* Top Header */}
                      <div className="pb-4 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full">
                            {schemeA.categoryBadge}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            {schemeA.compatibilityPercentage}% Match
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-indigo-950 mt-2">
                          {currentLang === 'hi' ? schemeA.nameHi : schemeA.nameEn}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {currentLang === 'hi' ? schemeA.ministryHi : schemeA.ministryEn}
                        </p>
                      </div>

                      {/* Dimension 1: Direct Capital Subsidy / Grant */}
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                          1. Non-Refundable Capital Subsidy (पूंजी अनुदान)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-black text-emerald-900 font-mono">
                            {schemeA.financials.grantSubsidyPercentage}%
                          </span>
                          <span className="text-xs font-bold text-emerald-800">
                            Max {formatRupees(schemeA.financials.maxGrantAmount)}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          {schemeA.financials.grantSubsidyPercentage > 0
                            ? 'Government funded non-repayable direct subsidy'
                            : 'Subsidized interest assistance on bank term loans'}
                        </p>
                      </div>

                      {/* Dimension 2: Loan Component & Ceiling */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          2. Bank Term Loan & Credit Window (ऋण सीमा)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-black text-indigo-950 font-mono">
                            {schemeA.financials.loanPercentage}% Share
                          </span>
                          <span className="text-xs font-bold text-indigo-900">
                            Ceiling: {formatRupees(schemeA.financials.maxGrantAmount * 2 || 300000)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Routed through scheduled commercial & regional rural banks
                        </p>
                      </div>

                      {/* Dimension 3: Own Promoter Margin */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          3. Beneficiary Own Contribution (स्वयं का अंशदान)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-black text-slate-900 font-mono">
                            {schemeA.financials.promoterMarginPercentage}% of project cost
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {schemeA.financials.promoterMarginPercentage <= 5 ? 'Minimal Burden' : 'Standard Share'}
                          </span>
                        </div>
                      </div>

                      {/* Dimension 4: Interest Rate & Subvention */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          4. Subsidized Interest Rate (ब्याज दर)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-black text-indigo-950 font-mono">
                            {schemeA.financials.subsidizedInterestRate
                              ? `${schemeA.financials.subsidizedInterestRate}% Flat`
                              : 'Normal Bank MCLR'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Moratorium: {schemeA.financials.moratoriumPeriodMonths || 3} Mos
                          </span>
                        </div>
                      </div>

                      {/* Dimension 5: Collateral Requirement */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          5. Collateral & Security (संपार्श्विक गारंटी)
                        </span>
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>
                            {schemeA.financials.collateralRequired
                              ? 'Third-party guarantee required'
                              : '100% Collateral-Free (CGTMSE Covered)'}
                          </span>
                        </div>
                      </div>

                      {/* Dimension 6: Mandatory Documents */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                          6. Mandatory Documents Required (आवश्यक दस्तावेज)
                        </span>
                        <div className="space-y-1.5">
                          {schemeA.requiredDocuments.map((docCode) => (
                            <div
                              key={docCode}
                              className="flex items-center gap-2 text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-slate-700"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">
                                {currentLang === 'hi'
                                  ? DOCUMENT_LABELS[docCode]?.hi || docCode
                                  : DOCUMENT_LABELS[docCode]?.en || docCode}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dimension 7: Key Highlights */}
                      {schemeA.eligibilityHighlights && schemeA.eligibilityHighlights.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Key Highlights (मुख्य बिंदु)
                          </span>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {schemeA.eligibilityHighlights.slice(0, 3).map((hl, i) => (
                              <li key={i} className="line-clamp-2">
                                {hl}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions for Scheme A */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                      <Link
                        href={`/schemes/${schemeA.id}`}
                        className="w-full sm:flex-1 h-9 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <span>{currentLang === 'hi' ? 'पूरा विवरण' : 'View Details'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      {onProceedPathway2 && (
                        <button
                          type="button"
                          onClick={() => onProceedPathway2(schemeA.id)}
                          className="w-full sm:flex-1 h-9 px-3 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-400" />
                          <span>{currentLang === 'hi' ? 'आवेदन करें' : 'Apply Now'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* COLUMN 2: SCHEME B                                            */}
                {/* ------------------------------------------------------------- */}
                {schemeB && (
                  <div className="bg-white rounded-3xl border-2 border-orange-200 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
                    <div className="space-y-5">
                      {/* Top Header */}
                      <div className="pb-4 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 px-2.5 py-0.5 rounded-full">
                            {schemeB.categoryBadge}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            {schemeB.compatibilityPercentage}% Match
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mt-2">
                          {currentLang === 'hi' ? schemeB.nameHi : schemeB.nameEn}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {currentLang === 'hi' ? schemeB.ministryHi : schemeB.ministryEn}
                        </p>
                      </div>

                      {/* Dimension 1: Direct Capital Subsidy / Grant */}
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                          1. Non-Refundable Capital Subsidy (पूंजी अनुदान)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-black text-emerald-900 font-mono">
                            {schemeB.financials.grantSubsidyPercentage}%
                          </span>
                          <span className="text-xs font-bold text-emerald-800">
                            Max {formatRupees(schemeB.financials.maxGrantAmount)}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          {schemeB.financials.grantSubsidyPercentage > 0
                            ? 'Government funded non-repayable direct subsidy'
                            : 'Subsidized interest assistance on bank term loans'}
                        </p>
                      </div>

                      {/* Dimension 2: Loan Component & Ceiling */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          2. Bank Term Loan & Credit Window (ऋण सीमा)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-black text-indigo-950 font-mono">
                            {schemeB.financials.loanPercentage}% Share
                          </span>
                          <span className="text-xs font-bold text-indigo-900">
                            Ceiling: {formatRupees(schemeB.financials.maxGrantAmount * 2 || 300000)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Routed through scheduled commercial & regional rural banks
                        </p>
                      </div>

                      {/* Dimension 3: Own Promoter Margin */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          3. Beneficiary Own Contribution (स्वयं का अंशदान)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-black text-slate-900 font-mono">
                            {schemeB.financials.promoterMarginPercentage}% of project cost
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {schemeB.financials.promoterMarginPercentage <= 5 ? 'Minimal Burden' : 'Standard Share'}
                          </span>
                        </div>
                      </div>

                      {/* Dimension 4: Interest Rate & Subvention */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          4. Subsidized Interest Rate (ब्याज दर)
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-black text-indigo-950 font-mono">
                            {schemeB.financials.subsidizedInterestRate
                              ? `${schemeB.financials.subsidizedInterestRate}% Flat`
                              : 'Normal Bank MCLR'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Moratorium: {schemeB.financials.moratoriumPeriodMonths || 3} Mos
                          </span>
                        </div>
                      </div>

                      {/* Dimension 5: Collateral Requirement */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                          5. Collateral & Security (संपार्श्विक गारंटी)
                        </span>
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>
                            {schemeB.financials.collateralRequired
                              ? 'Third-party guarantee required'
                              : '100% Collateral-Free (CGTMSE Covered)'}
                          </span>
                        </div>
                      </div>

                      {/* Dimension 6: Mandatory Documents */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                          6. Mandatory Documents Required (आवश्यक दस्तावेज)
                        </span>
                        <div className="space-y-1.5">
                          {schemeB.requiredDocuments.map((docCode) => (
                            <div
                              key={docCode}
                              className="flex items-center gap-2 text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-slate-700"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">
                                {currentLang === 'hi'
                                  ? DOCUMENT_LABELS[docCode]?.hi || docCode
                                  : DOCUMENT_LABELS[docCode]?.en || docCode}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dimension 7: Key Highlights */}
                      {schemeB.eligibilityHighlights && schemeB.eligibilityHighlights.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Key Highlights (मुख्य बिंदु)
                          </span>
                          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                            {schemeB.eligibilityHighlights.slice(0, 3).map((hl, i) => (
                              <li key={i} className="line-clamp-2">
                                {hl}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions for Scheme B */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                      <Link
                        href={`/schemes/${schemeB.id}`}
                        className="w-full sm:flex-1 h-9 px-3 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-950 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <span>{currentLang === 'hi' ? 'पूरा विवरण' : 'View Details'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      {onProceedPathway2 && (
                        <button
                          type="button"
                          onClick={() => onProceedPathway2(schemeB.id)}
                          className="w-full sm:flex-1 h-9 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-200" />
                          <span>{currentLang === 'hi' ? 'आवेदन करें' : 'Apply Now'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {schemeB ? (
              <span>
                {currentLang === 'hi' ? '2 योजनाओं की तुलना सक्रिय' : 'Side-by-side evaluation of 2 schemes'}
              </span>
            ) : (
              <span>
                {currentLang === 'hi' ? 'तुलना के लिए दूसरी योजना चुनें' : 'Choose Scheme 2 to start comparison'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            {currentLang === 'hi' ? 'बंद करें (Close)' : 'Close (बंद करें)'}
          </button>
        </div>
      </div>
    </div>
  );
};
