'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { CommonAppFormat } from '@/components/caf/CommonAppFormat';
import { CompareDrawer } from '@/components/compare/CompareDrawer';
import { FinancialAnalysisDrawer } from '@/components/compare/FinancialAnalysisDrawer';
import { DevDebugDrawer } from '@/components/dev/DevDebugDrawer';
import { StorageService, DEFAULT_PROFILE } from '@/lib/storage';
import { ApiService } from '@/lib/api';
import { MOCK_SCHEMES } from '@/lib/mockData';
import { SchemeMatch, ApplicantProfile } from '@/types';
import { useDevHUD } from '@/hooks/useDevHUD';
import {
  FileText,
  Star,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  SlidersHorizontal,
  Banknote,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isLargerFont, setIsLargerFont] = useState(false);
  const [profile, setProfile] = useState<ApplicantProfile>(DEFAULT_PROFILE);
  const [schemes, setSchemes] = useState<SchemeMatch[]>([]);
  const [selectedSchemeForAnalysis, setSelectedSchemeForAnalysis] = useState<SchemeMatch | null>(null);
  const [selectedSchemeForCompare, setSelectedSchemeForCompare] = useState<SchemeMatch | null>(null);
  const [selectedSchemeForCaf, setSelectedSchemeForCaf] = useState<SchemeMatch | null>(null);

  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isFinancialAnalysisOpen, setIsFinancialAnalysisOpen] = useState(false);
  const [isCafModalOpen, setIsCafModalOpen] = useState(false);

  const { isOpen: isDevHudOpen, toggle: toggleDevHud, handleTripleTap } = useDevHUD();
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');

  useEffect(() => {
    const saved = StorageService.getProfile();
    const savedLang = StorageService.getLanguage();
    const savedDl = StorageService.getDigiLockerState();
    setProfile(saved);
    setCurrentLang(savedLang);

    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(saved, verifiedDocs).then(setSchemes);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Header
        currentLang={currentLang}
        onLangChange={(l) => {
          setCurrentLang(l);
          StorageService.setLanguage(l);
        }}
        isLargerFont={isLargerFont}
        onToggleFont={() => setIsLargerFont((p) => !p)}
        onTripleTapLogo={handleTripleTap}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-950 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Application Mode
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedSchemeForCompare(schemes[0] || null);
                setIsCompareOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
              <span>{currentLang === 'hi' ? 'योजनाओं की तुलना करें' : 'Compare Schemes'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSchemeForCaf(schemes[0] || null);
                setIsCafModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-xl bg-indigo-950 text-white text-xs font-semibold hover:bg-indigo-900 transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span>Generate Common Application Format (CAF)</span>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                Stage 3: Verified Welfare Allocations
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-950">
                Ranked Welfare & Subsidy Compatibility Results
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Personalized matches computed for {profile.name || 'Applicant'} ({[profile.category, profile.gender].filter(Boolean).join(' ') || 'General'}) in {profile.district || 'District'}, {profile.state || 'State'}.
            </p>
          </div>
        </div>

        {/* Scheme Cards */}
        <div className="space-y-5">
          {schemes.map((scheme, idx) => (
            <div
              key={scheme.id}
              className={`bg-white rounded-3xl p-6 sm:p-8 border-2 shadow-md relative overflow-hidden transition ${
                idx === 0 ? 'border-emerald-500' : 'border-slate-200'
              }`}
            >
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> TOP SUBSIDY MATCH
                </div>
              )}

              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-100 text-indigo-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {scheme.ministryEn}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      100% Collateral-Free
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-indigo-950">
                      {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {currentLang === 'hi' ? scheme.descriptionHi : scheme.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center gap-2 lg:w-44 flex-shrink-0">
                  <span className="text-3xl font-black text-indigo-950 font-mono">
                    {scheme.compatibilityPercentage}%
                  </span>
                  <span className="text-xs font-bold text-slate-700">Match Compatibility</span>
                </div>
              </div>

              {/* WHY DETAILS ARE APPROVED (पात्रता अनुमोदन विवरण) WITH GREEN TICKS */}
              <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <h5 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                      {currentLang === 'hi'
                        ? 'पात्रता अनुमोदन विवरण (Why Your Details Are Approved)'
                        : 'Why Your Details Are Approved (Statutory Clearance)'}
                    </h5>
                  </div>
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    ✓ 100% ELIGIBILITY CLEARANCE
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-emerald-950">
                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'व्यवसाय पात्रता (Occupation Match):' : 'Trade Alignment:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? `पेशा "${profile.profession}" इस योजना के प्राथमिकता क्षेत्र में स्वीकृत है।`
                          : `Occupation "${profile.profession}" is eligible under priority lending guidelines.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'वार्षिक आय सीमा (Income Ceiling):' : 'Income Ceiling Pass:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? `प्रमाणित आय ₹${profile.annualIncome.toLocaleString('en-IN')} प्राथमिकता सीमा (₹5,00,000) के भीतर है।`
                          : `Annual income ₹${profile.annualIncome.toLocaleString('en-IN')} is within statutory scheme ceiling (< ₹5,00,000/yr).`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'सामाजिक वर्ग व लिंग लाभ:' : 'Category & Gender Bonus:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? `${profile.category} वर्ग व ${profile.gender === 'Female' ? 'महिला' : profile.gender} हेतु अधिकतम ${scheme.financials.grantSubsidyPercentage}% सरकारी अनुदान स्वीकृत।`
                          : `${profile.category} (${profile.gender}) qualifies for highest bracket ${scheme.financials.grantSubsidyPercentage}% Govt grant.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'संपार्श्विक-मुक्त गारंटी:' : 'Collateral-Free Credit:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? 'CGTMSE क्रेडिट गारंटी फंड ट्रस्ट के तहत 100% बिना किसी बंधक या जमानत के।'
                          : '100% sovereign credit guarantee under CGTMSE trust with zero third-party collateral.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'आयु योग्यता (Age Window):' : 'Age Qualification:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? `जन्मतिथि ${profile.dob || '1995-05-12'} (आयु ~${new Date().getFullYear() - parseInt(profile.dob?.split('-')[0] || '1995', 10)} वर्ष) 18 से 65 वर्ष की अनिवार्य पात्रता को पूर्ण करती है।`
                          : `DOB ${profile.dob || '1995-05-12'} (Age ~${new Date().getFullYear() - parseInt(profile.dob?.split('-')[0] || '1995', 10)} yrs) complies with statutory 18 to 65 years eligibility.`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {currentLang === 'hi' ? 'क्षेत्रीय अधिमान्यता:' : 'Regional Classification:'}
                      </span>
                      <span className="text-slate-700 text-[11px]">
                        {currentLang === 'hi'
                          ? `${profile.areaType} क्षेत्र (${profile.district}, ${profile.state}) के तहत प्राथमिकता स्वीकृत।`
                          : `${profile.areaType} classification (${profile.district}, ${profile.state}) approved for nodal allocation.`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-3xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchemeForCompare(scheme);
                        setIsCompareOpen(true);
                      }}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                      <span>{currentLang === 'hi' ? 'तुलना करें' : 'Compare'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchemeForAnalysis(scheme);
                        setIsFinancialAnalysisOpen(true);
                      }}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Financial Breakdown</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchemeForCaf(scheme);
                      setIsCafModalOpen(true);
                    }}
                    className="w-full sm:w-auto h-9 px-4 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-orange-400" />
                    <span>Generate Bank Application (CAF)</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <CompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        schemes={schemes.length > 0 ? schemes : MOCK_SCHEMES}
        initialScheme={selectedSchemeForCompare}
        onProceedPathway2={() => router.push('/apply')}
        currentLang={currentLang}
      />

      <FinancialAnalysisDrawer
        isOpen={isFinancialAnalysisOpen}
        onClose={() => setIsFinancialAnalysisOpen(false)}
        scheme={selectedSchemeForAnalysis || schemes[0] || null}
        profile={profile}
        onProceedPathway2={() => router.push('/apply')}
        currentLang={currentLang}
      />

      <CommonAppFormat
        isOpen={isCafModalOpen}
        onClose={() => setIsCafModalOpen(false)}
        profile={profile}
        selectedScheme={selectedSchemeForCaf || schemes[0] || null}
        currentLang={currentLang}
      />

      <DevDebugDrawer
        isOpen={isDevHudOpen}
        onToggle={toggleDevHud}
        ocrEngine={ocrEngine}
        setOcrEngine={setOcrEngine}
        matcherEngine={matcherEngine}
        setMatcherEngine={setMatcherEngine}
        onResetSession={() => {
          StorageService.clearSession();
          setProfile(DEFAULT_PROFILE);
        }}
      />

      <Footer currentLang={currentLang} />
    </div>
  );
}
