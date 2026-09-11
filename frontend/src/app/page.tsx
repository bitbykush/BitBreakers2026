'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  FileCheck2,
  SlidersHorizontal,
  Banknote,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Star,
  ChevronRight,
  Sparkles,
  UserCheck,
} from 'lucide-react';

import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { TradeSearchAndPills } from '@/components/pathway1/TradeSearchAndPills';
import { BaselineMatchPreview } from '@/components/pathway1/BaselineMatchPreview';
import { UpgradeBanner } from '@/components/pathway1/UpgradeBanner';
import { TargetedOcrUpload } from '@/components/ocr/TargetedOcrUpload';
import { DigiLockerModal } from '@/components/kyc/DigiLockerModal';
import { CompareDrawer } from '@/components/compare/CompareDrawer';
import { FinancialAnalysisDrawer } from '@/components/compare/FinancialAnalysisDrawer';
import { CommonAppFormat } from '@/components/caf/CommonAppFormat';
import { DevDebugDrawer } from '@/components/dev/DevDebugDrawer';

import { StorageService, DEFAULT_PROFILE } from '@/lib/storage';
import { ApiService } from '@/lib/api';
import {
  ApplicantProfile,
  SchemeMatch,
  SocialCategory,
  Gender,
  AreaType,
  EducationLevel,
  OcrExtractedData,
  DigiLockerRecord,
} from '@/types';
import { useDevHUD } from '@/hooks/useDevHUD';

export default function Home() {
  // Global State
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isLargerFont, setIsLargerFont] = useState(false);
  const [pathwayMode, setPathwayMode] = useState<'pathway1' | 'pathway2' | 'dashboard'>('pathway1');

  // Applicant Profile State
  const [profile, setProfile] = useState<ApplicantProfile>(DEFAULT_PROFILE);
  const [hasSearchedOrSelectedTrade, setHasSearchedOrSelectedTrade] = useState(false);

  // Scheme Matches
  const [schemes, setSchemes] = useState<SchemeMatch[]>([]);
  const [selectedSchemeForAnalysis, setSelectedSchemeForAnalysis] = useState<SchemeMatch | null>(null);

  // Modals & Drawers State
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isFinancialAnalysisOpen, setIsFinancialAnalysisOpen] = useState(false);
  const [isCafModalOpen, setIsCafModalOpen] = useState(false);
  const [digiLockerRecord, setDigiLockerRecord] = useState<DigiLockerRecord | null>(null);

  // Dev HUD Engine Overrides
  const { isOpen: isDevHudOpen, setIsOpen: setIsDevHudOpen, toggle: toggleDevHud, handleTripleTap } = useDevHUD();
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');

  // Hydrate from LocalStorage on mount
  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    const savedLang = StorageService.getLanguage();
    const savedDl = StorageService.getDigiLockerState();
    setProfile(savedProfile);
    setCurrentLang(savedLang);
    setDigiLockerRecord(savedDl);

    // Initial match computation
    const docs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(savedProfile, docs).then(setSchemes);
  }, []);

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setCurrentLang(lang);
    StorageService.setLanguage(lang);
  };

  const handleToggleFont = () => {
    setIsLargerFont((prev) => !prev);
    if (typeof document !== 'undefined') {
      if (!isLargerFont) {
        document.body.classList.add('a-plus');
      } else {
        document.body.classList.remove('a-plus');
      }
    }
  };

  // Trade Selection in Pathway 1
  const handleSelectTrade = (tradeEn: string, tradeHi: string) => {
    setHasSearchedOrSelectedTrade(true);
    const updated = StorageService.saveProfile({
      profession: tradeEn,
      professionHi: tradeHi,
    });
    setProfile(updated);

    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(updated, verifiedDocs).then(setSchemes);
  };

  const handleSearchTrade = (query: string) => {
    if (query && query.trim().length > 0) {
      setHasSearchedOrSelectedTrade(true);
    }
    handleFormChange('profession', query);
  };

  // Transition from Pathway 1 into Pathway 2
  const handleSwitchToPathway2 = () => {
    setPathwayMode('pathway2');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scoped OCR Auto-Fill Callback
  const handleOcrExtracted = (extracted: OcrExtractedData) => {
    const patch: Partial<ApplicantProfile> = {};

    if (extracted.name) patch.name = extracted.name;
    if (extracted.dob) patch.dob = extracted.dob;
    if (extracted.gender) patch.gender = extracted.gender;
    if (extracted.masked_aadhaar) patch.maskedAadhaar = extracted.masked_aadhaar;
    if (extracted.category) patch.category = extracted.category;
    if (extracted.annual_income) patch.annualIncome = extracted.annual_income;
    if (extracted.certificate_number) patch.casteCertificateNo = extracted.certificate_number;
    if (extracted.marks_percentage) patch.marksPercentage = extracted.marks_percentage;
    if (extracted.highest_education) patch.education = extracted.highest_education;

    const updated = StorageService.saveProfile(patch);
    setProfile(updated);

    // Register verified document
    if (extracted.doc_type === 'AADHAAR') {
      StorageService.verifyDocument('DOC_AADHAAR', 'RAPIDOCR', extracted.masked_aadhaar || 'UIDAI-MASKED');
    } else if (extracted.doc_type === 'CASTE') {
      StorageService.verifyDocument('DOC_CASTE', 'RAPIDOCR', extracted.certificate_number || 'CASTE-CERT');
    } else if (extracted.doc_type === 'INCOME') {
      StorageService.verifyDocument('DOC_INCOME', 'RAPIDOCR', extracted.certificate_number || 'INC-CERT');
    } else if (extracted.doc_type === 'MARKSHEET') {
      StorageService.verifyDocument('DOC_MARKSHEET', 'RAPIDOCR', 'MARKS-VERIFIED');
    }

    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(updated, verifiedDocs).then(setSchemes);
  };

  // Capital Slider change
  const handleCapitalChange = (amount: number) => {
    const updated = StorageService.saveProfile({ requiredCapital: amount });
    setProfile(updated);
  };

  // Form Field Updates
  const handleFormChange = (key: keyof ApplicantProfile, val: any) => {
    const updated = StorageService.saveProfile({ [key]: val });
    setProfile(updated);
  };

  // Calculate Eligibility & Show Stage 3 Dashboard
  const handleCalculateAndShowResults = async () => {
    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    const results = await ApiService.matchSchemes(profile, verifiedDocs);
    setSchemes(results);
    setPathwayMode('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenFinancialAnalysis = (schemeId: string) => {
    const matched = schemes.find((s) => s.id === schemeId) || schemes[0];
    setSelectedSchemeForAnalysis(matched);
    setIsFinancialAnalysisOpen(true);
  };

  const handleResetSession = () => {
    StorageService.clearSession();
    setProfile(DEFAULT_PROFILE);
    setDigiLockerRecord(null);
    setHasSearchedOrSelectedTrade(false);
    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(DEFAULT_PROFILE, verifiedDocs).then(setSchemes);
    setPathwayMode('pathway1');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <Header
        currentLang={currentLang}
        onLangChange={handleLanguageChange}
        isLargerFont={isLargerFont}
        onToggleFont={handleToggleFont}
        onOpenDigiLocker={() => setIsDigiLockerOpen(true)}
        onTripleTapLogo={handleTripleTap}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Explicit Pathway Mode Switcher */}
        <section className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-sm max-w-4xl mx-auto no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Pathway 1 Button */}
            <button
              type="button"
              onClick={() => setPathwayMode('pathway1')}
              className={`relative flex items-start sm:items-center gap-3 p-3 sm:p-3.5 rounded-xl text-left transition-all ${
                pathwayMode === 'pathway1'
                  ? 'border-2 border-orange-500 bg-orange-50/60 shadow-xs'
                  : 'border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {currentLang === 'hi'
                      ? 'पाथवे 1: 1-क्लिक त्वरित खोज'
                      : 'Pathway 1: Zero-Paperwork 1-Tap Discovery'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    1-क्लिक खोज
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant match • No login required • Voice & trade bubbles
                </p>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                  pathwayMode === 'pathway1' ? 'bg-orange-500' : 'bg-transparent border border-slate-300'
                }`}
              />
            </button>

            {/* Pathway 2 Button */}
            <button
              type="button"
              onClick={() => setPathwayMode('pathway2')}
              className={`relative flex items-start sm:items-center gap-3 p-3 sm:p-3.5 rounded-xl text-left transition-all ${
                pathwayMode === 'pathway2' || pathwayMode === 'dashboard'
                  ? 'border-2 border-indigo-600 bg-indigo-50/60 shadow-xs'
                  : 'border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {currentLang === 'hi'
                      ? 'पाथवे 2: विस्तृत फॉर्म एवं ई-केवाईसी'
                      : 'Pathway 2: Assisted eKYC & Form Application'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    विस्तृत फॉर्म
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aadhaar OCR scan • 95%+ accuracy • Bank-ready CAF dossier
                </p>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                  pathwayMode === 'pathway2' || pathwayMode === 'dashboard'
                    ? 'bg-indigo-600'
                    : 'bg-transparent border border-slate-300'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SCREEN 1: PATHWAY 1 (ZERO-PAPERWORK 1-TAP & VOICE DISCOVERY)             */}
        {/* ========================================================================= */}
        {pathwayMode === 'pathway1' && (
          <section className="space-y-6 animate-fadeIn">
            {/* Search & Trade Bubbles */}
            <TradeSearchAndPills
              currentLang={currentLang}
              selectedTrade={`${profile.profession} (${profile.professionHi || ''})`}
              onSelectTrade={handleSelectTrade}
              onSearchChange={handleSearchTrade}
            />

            {/* Instant Baseline Match Preview - Only visible when user searches or clicks trade */}
            {hasSearchedOrSelectedTrade && (
              <div className="animate-fadeIn">
                <BaselineMatchPreview
                  currentLang={currentLang}
                  selectedTradeName={`${profile.profession} (${profile.professionHi || 'कुम्हार'})`}
                  schemes={schemes}
                  onOpenCompare={() => setIsCompareOpen(true)}
                  onOpenFinancialAnalysis={handleOpenFinancialAnalysis}
                  onSwitchToPathway2={handleSwitchToPathway2}
                />
              </div>
            )}

            {/* Upgrade Banner */}
            <UpgradeBanner currentLang={currentLang} onSwitchToPathway2={handleSwitchToPathway2} />
          </section>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: PATHWAY 2 (FULL ASSISTED FORM WITH SCOPED OCR)                  */}
        {/* ========================================================================= */}
        {pathwayMode === 'pathway2' && (
          <section className="space-y-6 animate-fadeIn">
            {/* Stepper Indicator */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    ✓
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Step 1</p>
                    <p className="text-xs font-bold text-slate-800">1. Basics (बुनियादी)</p>
                  </div>
                </div>
                <div className="w-10 sm:w-16 h-0.5 bg-emerald-500" />
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-950 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[11px] text-indigo-600 font-semibold uppercase">Active Step</p>
                    <p className="text-xs font-bold text-indigo-950">2. Category & Income</p>
                  </div>
                </div>
                <div className="w-10 sm:w-16 h-0.5 bg-slate-200" />
                <div className="flex items-center gap-2 opacity-60">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Step 3</p>
                    <p className="text-xs font-bold text-slate-800">3. Education</p>
                  </div>
                </div>
                <div className="w-10 sm:w-16 h-0.5 bg-slate-200" />
                <div className="flex items-center gap-2 opacity-60">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Step 4</p>
                    <p className="text-xs font-bold text-slate-800">4. Project Capital</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Targeted Scoped OCR Auto-Fill Dropzone */}
            <TargetedOcrUpload currentLang={currentLang} onExtractSuccess={handleOcrExtracted} />

            {/* Verified Form Fields */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <h4 className="font-bold text-indigo-950 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                <span>
                  {currentLang === 'hi' ? 'सत्यापित आवेदक विवरण (Verified Details)' : 'Verified Applicant Details (आवेदक विवरण)'}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'पूरा नाम (जैसा आधार में है)' : 'Full Name (पूरा नाम जैसा आधार में है)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
                    />
                    <span className="absolute right-3 top-3 text-emerald-600 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> OCR Verified
                    </span>
                  </div>
                </div>

                {/* Gender Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'लिंग (Gender)' : 'Gender (लिंग)'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Male', 'Female', 'Other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleFormChange('gender', g)}
                        className={`h-11 rounded-xl text-xs font-bold transition ${
                          profile.gender === g
                            ? 'border-2 border-indigo-600 bg-indigo-50 text-indigo-950'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {g === 'Male' ? 'Male (पुरुष)' : g === 'Female' ? 'Female (महिला)' : 'Transgender'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>{currentLang === 'hi' ? 'सामाजिक वर्ग (Category)' : 'Social Category (सामाजिक वर्ग)'}</span>
                    <span className="text-[11px] text-indigo-600 font-semibold">Special 35% Subsidy for SC/ST/OBC/Women</span>
                  </label>
                  <select
                    value={profile.category}
                    onChange={(e) => handleFormChange('category', e.target.value as SocialCategory)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 bg-white"
                  >
                    <option value="OBC">OBC - Other Backward Class (अन्य पिछड़ा वर्ग)</option>
                    <option value="SC">SC - Scheduled Caste (अनुसूचित जाति)</option>
                    <option value="ST">ST - Scheduled Tribe (अनुसूचित जनजाति)</option>
                    <option value="EWS">EWS - Economically Weaker Section (आर्थिक कमजोर)</option>
                    <option value="Minority">Minority Community (अल्पसंख्यक)</option>
                    <option value="General">General / Open Category (सामान्य)</option>
                  </select>
                </div>

                {/* Annual Household Income Quick Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'वार्षिक पारिवारिक आय' : 'Annual Family Income (वार्षिक पारिवारिक आय)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`₹${profile.annualIncome.toLocaleString('en-IN')} / year`}
                      readOnly
                      className="w-1/2 h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50"
                    />
                    <div className="w-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 120000)}
                        className={`flex-1 text-[11px] font-bold rounded-lg border transition ${
                          profile.annualIncome <= 150000
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        &lt; ₹1.5L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 240000)}
                        className={`flex-1 text-[11px] font-bold rounded-lg border transition ${
                          profile.annualIncome > 150000 && profile.annualIncome <= 300000
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        ₹1.5-3L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 420000)}
                        className={`flex-1 text-[11px] font-bold rounded-lg border transition ${
                          profile.annualIncome > 300000
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        &gt; ₹3L
                      </button>
                    </div>
                  </div>
                </div>

                {/* Educational Qualification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'शैक्षणिक योग्यता' : 'Highest Educational Qualification (शैक्षणिक योग्यता)'}
                  </label>
                  <select
                    value={profile.education}
                    onChange={(e) => handleFormChange('education', e.target.value as EducationLevel)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white"
                  >
                    <option value="10th">Class 10th / Secondary School (हाईस्कूल)</option>
                    <option value="12th">Class 12th / Intermediate (इंटरमीडिएट)</option>
                    <option value="ITI">ITI / Polytechnic Diploma (डिप्लोमा)</option>
                    <option value="Graduate">Graduate / Bachelor&apos;s Degree (स्नातक)</option>
                    <option value="Literate">Literate / Traditional Skill (पारंपरिक हुनर)</option>
                  </select>
                </div>

                {/* Target Enterprise Display */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'प्रस्तावित व्यवसाय' : 'Target Enterprise / Trade (प्रस्तावित व्यवसाय)'}
                  </label>
                  <input
                    type="text"
                    value={`${profile.profession} (${profile.professionHi || 'कुम्हार'})`}
                    readOnly
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              {/* Project Capital Needed Slider */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      {currentLang === 'hi' ? 'आवश्यक पूंजी / लोन राशि' : 'Project Capital / Loan Needed (आवश्यक पूंजी / लोन राशि)'}
                    </label>
                    <p className="text-xs text-slate-500">
                      Estimated cost of machines, raw materials, or workshop setup
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-indigo-950 font-mono">
                      ₹{profile.requiredCapital.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[11px] text-emerald-600 font-bold">
                      Eligible for 35% PMEGP Subsidy
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="50000"
                  max="2500000"
                  step="25000"
                  value={profile.requiredCapital}
                  onChange={(e) => handleCapitalChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />

                <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
                  <span>₹50,000 (Micro Mudra)</span>
                  <span>₹5,00,000 (Kishore)</span>
                  <span>₹10,00,000</span>
                  <span>₹25,00,000 (PMEGP Max)</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleCalculateAndShowResults}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>
                    {currentLang === 'hi' ? '100% पात्र योजनाएं देखें' : 'Calculate 100% Eligible Schemes (योजनाएं देखें)'}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-xs text-slate-500 mt-2">
                  Zero fee • No credit bureau hit • Direct Government of India portal integration
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: STAGE 3 SCHEME RECOMMENDATION DASHBOARD & CAF DOSSIER LAUNCHER  */}
        {/* ========================================================================= */}
        {pathwayMode === 'dashboard' && (
          <section className="space-y-6 animate-fadeIn">
            {/* Summary Header Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Stage 3: Verified Scheme Allocations (अंतिम चरण: योजना आवंटन)
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-indigo-950">
                    Verified Welfare Allocations & Bank-Ready CAF Dossier
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  All central & state scheme allocations aggregated with 95%+ e-KYC accuracy. Ready for bank sanction.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-semibold">
                    👤 {profile.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-xs font-semibold">
                    🏷️ {profile.category} {profile.gender} ({profile.areaType} {profile.district})
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    💰 ₹{profile.requiredCapital.toLocaleString('en-IN')} Capital Need
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                    🏺 {profile.profession}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCafModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-indigo-950 text-white text-xs font-bold hover:bg-indigo-900 transition flex items-center justify-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span>Generate CAF Dossier (सी.ए.एफ फ़ाइल)</span>
                </button>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-5 border border-indigo-900 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">
                      All Eligible Central Schemes Ready for Direct Submission
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      Ready for Bank Sanction
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Check comparative loan ceilings, subsidy grants, and effective interest rates before generating the
                    print CAF dossier.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsCafModalOpen(true)}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
                >
                  <span>Open Print Dossier (CAF)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ranked Scheme Cards */}
            <div className="space-y-5">
              {schemes.map((scheme, idx) => (
                <div
                  key={scheme.id}
                  className={`bg-white rounded-3xl p-6 sm:p-8 border-2 shadow-md relative overflow-hidden transition ${
                    idx === 0 ? 'border-emerald-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {idx === 0 && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-bl-2xl shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> TOP SUBSIDY MATCH
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Left Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-indigo-100 text-indigo-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {scheme.ministryEn}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          100% Collateral-Free
                        </span>
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {scheme.financials.grantSubsidyPercentage > 0
                            ? `Govt Grant ${scheme.financials.grantSubsidyPercentage}%`
                            : 'Interest Subsidized'}
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

                    {/* Right Radial Compatibility Gauge */}
                    <div className="flex flex-row lg:flex-col items-center justify-center bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-center gap-3 lg:w-44 flex-shrink-0">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          />
                          <path
                            className="text-emerald-500 stroke-current"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            strokeDasharray={`${scheme.compatibilityPercentage}, 100`}
                            strokeLinecap="round"
                            strokeWidth="3.5"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-lg sm:text-xl font-black text-slate-900 leading-none">
                            {scheme.compatibilityPercentage}%
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">Match</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800">High Eligibility</span>
                        <p className="text-[10px] text-slate-500">
                          {profile.category} {profile.gender} + {profile.areaType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Readiness Checklist */}
                  <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-3xl">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Required Document Readiness:
                    </h5>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Aadhaar (OCR Masked)</span>
                      </div>

                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Caste Cert (DigiLocker)</span>
                      </div>

                      {scheme.missingDocuments.length > 0 ? (
                        <div
                          onClick={() => setIsDigiLockerOpen(true)}
                          className="flex items-center justify-between gap-2 bg-amber-50 px-3 py-2 rounded-xl border border-amber-300 text-xs text-amber-900 font-semibold cursor-pointer hover:bg-amber-100 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="truncate">Rural Cert (Tap to Verify)</span>
                          </div>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">eKYC</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">All Documents Verified</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Card Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setIsDigiLockerOpen(true)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-700 bg-white hover:bg-blue-50 text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Verify via DigiLocker Sandbox</span>
                      </button>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsCompareOpen(true)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm transition active:scale-95"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                          <span>Compare Scheme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenFinancialAnalysis(scheme.id)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Financial Breakdown</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsCafModalOpen(true)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-orange-400" />
                          <span>Generate CAF Dossier 📄</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <DigiLockerModal
        isOpen={isDigiLockerOpen}
        onClose={() => setIsDigiLockerOpen(false)}
        onVerified={(record) => {
          setDigiLockerRecord(record);
          const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
          ApiService.matchSchemes(profile, verifiedDocs).then(setSchemes);
        }}
        currentLang={currentLang}
      />

      <CompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onProceedPathway2={handleSwitchToPathway2}
        currentLang={currentLang}
      />

      <FinancialAnalysisDrawer
        isOpen={isFinancialAnalysisOpen}
        onClose={() => setIsFinancialAnalysisOpen(false)}
        scheme={selectedSchemeForAnalysis || schemes[0] || null}
        profile={profile}
        onProceedPathway2={handleSwitchToPathway2}
        currentLang={currentLang}
      />

      <CommonAppFormat
        isOpen={isCafModalOpen}
        onClose={() => setIsCafModalOpen(false)}
        profile={profile}
        selectedScheme={schemes[0] || null}
        digiLockerRecord={digiLockerRecord}
        currentLang={currentLang}
      />

      <DevDebugDrawer
        isOpen={isDevHudOpen}
        onToggle={toggleDevHud}
        ocrEngine={ocrEngine}
        setOcrEngine={setOcrEngine}
        matcherEngine={matcherEngine}
        setMatcherEngine={setMatcherEngine}
        onResetSession={handleResetSession}
      />

      {/* Footer */}
      <Footer currentLang={currentLang} />
    </div>
  );
}
