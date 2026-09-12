'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ApplicantProfile,
} from '@/types';
import {
  ALL_SCHEMES_DATABASE,
  evaluateSchemeEligibility,
  SchemeEvaluationReport,
} from '@/lib/schemeEvaluator';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Loader2,
  Info,
  ShieldAlert,
  ArrowDownCircle,
} from 'lucide-react';

interface UnmatchedSchemesDropdownProps {
  profile: ApplicantProfile;
  verifiedDocCodes: string[];
  currentLang: 'en' | 'hi';
  matchedSchemeIds: string[];
}

export function UnmatchedSchemesDropdown({
  profile,
  verifiedDocCodes,
  currentLang,
  matchedSchemeIds,
}: UnmatchedSchemesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Set of matched scheme IDs normalized
  const matchedSet = useMemo(() => {
    return new Set(matchedSchemeIds.map((id) => id.toLowerCase().trim()));
  }, [matchedSchemeIds]);

  // Compute evaluation reports for all unmatched schemes
  const unmatchedSchemesData = useMemo(() => {
    const list: { scheme: any; report: SchemeEvaluationReport }[] = [];

    for (const scheme of ALL_SCHEMES_DATABASE) {
      const isAlreadyMatched =
        matchedSet.has(scheme.id.toLowerCase().trim()) ||
        matchedSet.has(scheme.code.toLowerCase().trim());

      if (!isAlreadyMatched) {
        const report = evaluateSchemeEligibility(scheme, profile, verifiedDocCodes);
        list.push({ scheme, report });
      }
    }

    return list;
  }, [profile, verifiedDocCodes, matchedSet]);

  // Filter schemes based on search query and filter category
  const filteredSchemes = useMemo(() => {
    let result = unmatchedSchemesData;

    if (activeFilter !== 'ALL') {
      result = result.filter(
        (item) => item.report.primaryDisqualificationType === activeFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.scheme.nameEn.toLowerCase().includes(q) ||
          item.scheme.nameHi.toLowerCase().includes(q) ||
          item.scheme.ministryEn.toLowerCase().includes(q) ||
          item.scheme.categoryBadge.toLowerCase().includes(q) ||
          (item.report.primaryDisqualificationReasonEn || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [unmatchedSchemesData, activeFilter, searchQuery]);

  // Handle infinite scroll inside container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop - clientHeight < 120 &&
      !isLoadingMore &&
      visibleCount < filteredSchemes.length
    ) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 6, filteredSchemes.length));
        setIsLoadingMore(false);
      }, 200);
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    // Reset visible count on reopen
    if (!isOpen) {
      setVisibleCount(6);
    }
  };

  const visibleSchemes = filteredSchemes.slice(0, visibleCount);
  const totalUnmatchedCount = unmatchedSchemesData.length;

  return (
    <div className="bg-white rounded-3xl border-2 border-amber-200/80 shadow-md overflow-hidden transition-all duration-200">
      {/* ========================================================================= */}
      {/* DROPDOWN TRIGGER / HEADER ACCORDION                                       */}
      {/* ========================================================================= */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle()}
        className="w-full p-5 sm:p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-amber-50/40 transition select-none"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-300 shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                {totalUnmatchedCount} {currentLang === 'hi' ? 'अपात्र / असंबद्ध योजनाएं' : 'Unmatched Schemes'}
              </span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {currentLang === 'hi' ? 'कारण एवं शर्त विश्लेषण' : 'Statutory Reason Audit'}
              </span>
            </div>
            <h4 className="text-lg sm:text-xl font-black text-slate-900">
              {currentLang === 'hi'
                ? 'वे योजनाएं जो आपकी वर्तमान पात्रता से मेल नहीं खातीं'
                : 'Schemes Not Matched for Your Current Profile'}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentLang === 'hi'
                ? 'देखें कि कौन सी शर्तें पूरी नहीं हुईं और किन कारणों से ये योजनाएं स्वीकृत नहीं हुईं।'
                : 'Audit why other central & state welfare schemes were disqualified and see specific condition breakdowns.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs font-bold text-amber-800 hidden sm:inline">
            {isOpen
              ? (currentLang === 'hi' ? 'सूची बंद करें' : 'Hide Unmatched List')
              : (currentLang === 'hi' ? 'सूची देखें' : 'View Unmatched List')}
          </span>
          <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPANDED DROPDOWN BODY                                                    */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-6 space-y-4 animate-fadeIn">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(6);
                }}
                placeholder={
                  currentLang === 'hi'
                    ? 'अपात्र योजनाओं में खोजें (नाम या मंत्रालय)...'
                    : 'Search unmatched schemes by name, ministry, or reason...'
                }
                className="w-full h-10 pl-9 pr-3.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-2xs"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1 flex-shrink-0">
                <SlidersHorizontal className="w-3 h-3" /> Filter:
              </span>
              {[
                { id: 'ALL', labelEn: 'All', labelHi: 'सभी' },
                { id: 'trade', labelEn: 'Trade Mismatch', labelHi: 'व्यवसाय बेमेल' },
                { id: 'income', labelEn: 'Income Cap', labelHi: 'आय सीमा' },
                { id: 'category', labelEn: 'Category', labelHi: 'वर्ग प्रतिबंध' },
                { id: 'gender', labelEn: 'Gender', labelHi: 'लिंग' },
                { id: 'education', labelEn: 'Education', labelHi: 'शिक्षा' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(pill.id);
                    setVisibleCount(6);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    activeFilter === pill.id
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {currentLang === 'hi' ? pill.labelHi : pill.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Scheme Counter & Performance Guarantee Notice */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
            <span>
              {currentLang === 'hi'
                ? `प्रदर्शित: ${Math.min(visibleCount, filteredSchemes.length)} / ${filteredSchemes.length} योजनाएं`
                : `Showing ${Math.min(visibleCount, filteredSchemes.length)} of ${filteredSchemes.length} unmatched schemes`}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-amber-600" />
              {currentLang === 'hi' ? 'नीचे स्क्रॉल करने पर और लोड होंगी' : 'Scroll down to load more dynamically'}
            </span>
          </div>

          {/* ========================================================================= */}
          {/* INFINITE SCROLL CONTAINER                                                 */}
          {/* ========================================================================= */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="max-h-[620px] overflow-y-auto pr-1 sm:pr-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-100/60 p-3 sm:p-4"
          >
            {filteredSchemes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold">
                  {currentLang === 'hi'
                    ? 'कोई अपात्र योजना इस फ़िल्टर से मेल नहीं खाती।'
                    : 'No unmatched schemes found matching the selected filter.'}
                </p>
                <p className="text-xs text-slate-400">
                  {currentLang === 'hi' ? 'फ़िल्टर या खोज शब्द बदलें।' : 'Try resetting your search query or filter.'}
                </p>
              </div>
            ) : (
              visibleSchemes.map(({ scheme, report }) => {
                const isCardExpanded = expandedCardId === scheme.id;

                return (
                  <div
                    key={scheme.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3.5"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {scheme.ministryEn}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {scheme.categoryBadge}
                          </span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            {currentLang === 'hi' ? 'अपात्र / असंबद्ध' : 'Ineligible / Unmatched'}
                          </span>
                        </div>
                        <h5 className="text-base sm:text-lg font-black text-slate-900">
                          {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
                        </h5>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {currentLang === 'hi' ? scheme.descriptionHi : scheme.descriptionEn}
                        </p>
                      </div>

                      <div className="flex items-center sm:flex-col justify-between sm:justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center gap-1 sm:w-28 flex-shrink-0">
                        <span className="text-sm font-black text-rose-600 font-mono">0.0%</span>
                        <span className="text-[10px] font-bold text-slate-500">Compatibility</span>
                      </div>
                    </div>

                    {/* Primary Reason for Ineligibility Banner */}
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase tracking-wide text-[10px] text-rose-700">
                          {currentLang === 'hi' ? 'अपात्रता का मुख्य कारण (Primary Disqualification):' : 'Primary Disqualification Reason:'}
                        </span>
                        <span className="text-xs font-medium text-rose-900">
                          {currentLang === 'hi'
                            ? report.primaryDisqualificationReasonHi || report.primaryDisqualificationReasonEn
                            : report.primaryDisqualificationReasonEn}
                        </span>
                      </div>
                    </div>

                    {/* Conditions Breakdown Toggle */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        {report.conditionsFailed.length} {currentLang === 'hi' ? 'अपूर्ण शर्तें' : 'Conditions Failed'} • {report.conditionsMet.length} {currentLang === 'hi' ? 'शर्तें पूर्ण' : 'Conditions Met'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isCardExpanded ? null : scheme.id)}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>
                          {isCardExpanded
                            ? (currentLang === 'hi' ? 'शर्त विवरण छिपाएं' : 'Hide Condition Audit')
                            : (currentLang === 'hi' ? 'शर्त विवरण देखें' : 'View Condition Audit')}
                        </span>
                        {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Collapsible Detailed Condition Breakdown */}
                    {isCardExpanded && (
                      <div className="space-y-3 pt-2 border-t border-slate-100 animate-fadeIn">
                        {/* Conditions Failed Section */}
                        {report.conditionsFailed.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black text-rose-800 uppercase tracking-wide flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              {currentLang === 'hi' ? 'अपूर्ण पात्रता शर्तें (Conditions Not Met):' : 'Conditions Not Met:'}
                            </span>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {report.conditionsFailed.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-950 space-y-0.5"
                                >
                                  <span className="font-bold block text-rose-900">
                                    ✕ {currentLang === 'hi' ? c.labelHi : c.labelEn}
                                  </span>
                                  <span className="text-[11px] text-rose-800 leading-tight block">
                                    {currentLang === 'hi' ? c.detailHi : c.detailEn}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conditions Met Section */}
                        {report.conditionsMet.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {currentLang === 'hi' ? 'संतुष्ट पात्रता शर्तें (Conditions Satisfied):' : 'Conditions Satisfied:'}
                            </span>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {report.conditionsMet.slice(0, 4).map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-950 space-y-0.5"
                                >
                                  <span className="font-bold block text-emerald-900">
                                    ✓ {currentLang === 'hi' ? c.labelHi : c.labelEn}
                                  </span>
                                  <span className="text-[11px] text-emerald-800 leading-tight block">
                                    {currentLang === 'hi' ? c.detailHi : c.detailEn}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading Indicator for Infinite Scroll */}
            {isLoadingMore && (
              <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-slate-600 flex items-center justify-center gap-2 text-xs font-bold shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>
                  {currentLang === 'hi' ? 'डेटाबेस से और योजनाएं लोड हो रही हैं...' : 'Loading more schemes from database...'}
                </span>
              </div>
            )}

            {/* Manual Load More Button if User Prefers Clicking */}
            {!isLoadingMore && visibleCount < filteredSchemes.length && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                      setVisibleCount((prev) => Math.min(prev + 6, filteredSchemes.length));
                      setIsLoadingMore(false);
                    }, 150);
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {currentLang === 'hi'
                    ? `और लोड करें (${filteredSchemes.length - visibleCount} शेष)`
                    : `Load Next 6 Schemes (${filteredSchemes.length - visibleCount} remaining)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
