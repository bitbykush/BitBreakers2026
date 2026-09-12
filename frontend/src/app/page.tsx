'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  FileCheck2,
  SlidersHorizontal,
  Banknote,
  ArrowRight,
  ArrowLeft,
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
import { TargetedOcrUpload } from '@/components/ocr/TargetedOcrUpload';
import { CompareDrawer } from '@/components/compare/CompareDrawer';
import { FinancialAnalysisDrawer } from '@/components/compare/FinancialAnalysisDrawer';
import { CommonAppFormat } from '@/components/caf/CommonAppFormat';
import { DevDebugDrawer } from '@/components/dev/DevDebugDrawer';
import { NationalSeal3DIntro } from '@/components/common/NationalSeal3DIntro';
import { SchemeConditionBreakdown } from '@/components/dashboard/SchemeConditionBreakdown';
import { UnmatchedSchemesDropdown } from '@/components/dashboard/UnmatchedSchemesDropdown';

import { StorageService, DEFAULT_PROFILE } from '@/lib/storage';
import { ApiService } from '@/lib/api';
import { calculateAge, formatDobForInput } from '@/lib/dateUtils';
import { MOCK_SCHEMES } from '@/lib/mockData';
import {
  ApplicantProfile,
  SchemeMatch,
  SocialCategory,
  Gender,
  AreaType,
  EducationLevel,
  OcrExtractedData,
  DocumentRecord,
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
  const [selectedSchemeForCompare, setSelectedSchemeForCompare] = useState<SchemeMatch | null>(null);
  const [selectedSchemeForCaf, setSelectedSchemeForCaf] = useState<SchemeMatch | null>(null);

  // Modals & Drawers State
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isFinancialAnalysisOpen, setIsFinancialAnalysisOpen] = useState(false);
  const [isCafModalOpen, setIsCafModalOpen] = useState(false);
  const [play3DIntro, setPlay3DIntro] = useState(false);

  // Dev HUD Engine Overrides
  const { isOpen: isDevHudOpen, setIsOpen: setIsDevHudOpen, toggle: toggleDevHud, handleTripleTap } = useDevHUD();
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');
  const [verifiedDocCodes, setVerifiedDocCodes] = useState<string[]>([]);

  // Hydrate from LocalStorage on mount
  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    const savedLang = StorageService.getLanguage();
    setProfile(savedProfile);
    setCurrentLang(savedLang);

    // Initial match computation
    const docs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    setVerifiedDocCodes(docs);
    ApiService.matchSchemes(savedProfile, docs).then(setSchemes);
  }, []);

  const handleDocumentsUpdated = (newCodes: string[]) => {
    setVerifiedDocCodes(newCodes);
    ApiService.matchSchemes(profile, newCodes).then(setSchemes);
  };

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
    const trimmed = query ? query.trim() : '';
    if (trimmed.length > 0) {
      setHasSearchedOrSelectedTrade(true);
    } else {
      setHasSearchedOrSelectedTrade(false);
    }
    const updated = StorageService.saveProfile({
      profession: query,
      professionHi: query,
    });
    setProfile(updated);

    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    if (trimmed.length > 1) {
      ApiService.matchSchemes(updated, verifiedDocs).then(setSchemes);
    } else if (trimmed.length === 0) {
      ApiService.matchSchemes({ ...updated, profession: '' }, verifiedDocs).then(setSchemes);
    }
  };

  // Transition from Pathway 1 into Pathway 2
  const handleSwitchToPathway2 = () => {
    setPathwayMode('pathway2');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scoped OCR Auto-Fill Callback
  const handleOcrExtracted = (extracted: OcrExtractedData, fileDataUrl?: string, fileName?: string) => {
    const patch: Partial<ApplicantProfile> = {};

    if (extracted.name) patch.name = extracted.name;
    if (extracted.dob) patch.dob = extracted.dob;
    if (extracted.gender) patch.gender = extracted.gender;
    if (extracted.masked_aadhaar) patch.maskedAadhaar = extracted.masked_aadhaar;
    if (extracted.category) patch.category = extracted.category;
    if (extracted.annual_income) patch.annualIncome = extracted.annual_income;
    if (extracted.certificate_number) {
      if (extracted.doc_type === 'INCOME') {
        patch.incomeCertificateNo = extracted.certificate_number;
      } else if (extracted.doc_type === 'CASTE') {
        patch.casteCertificateNo = extracted.certificate_number;
      }
    }
    if (extracted.marks_percentage) patch.marksPercentage = extracted.marks_percentage;
    if (extracted.highest_education) patch.education = extracted.highest_education;
    if (extracted.state) patch.state = extracted.state;
    if (extracted.district) patch.district = extracted.district;
    if (extracted.address) patch.address = extracted.address;
    if (extracted.pincode) patch.pincode = extracted.pincode;

    const updated = StorageService.saveProfile(patch);
    setProfile(updated);

    const engineSource: DocumentRecord['verificationSource'] =
      extracted.engine === 'Gemini_1.5_Flash' ? 'GEMINI' : 'RAPIDOCR';
    const refId = extracted.masked_aadhaar || extracted.certificate_number || `VER-${Date.now().toString().slice(-6)}`;

    // If file image is available, save full uploaded document record
    if (fileDataUrl && fileName) {
      StorageService.saveUploadedDocument(
        extracted.doc_type,
        fileDataUrl,
        fileName,
        'Attached',
        refId,
        engineSource
      );
    } else {
      // Register verified document status
      if (extracted.doc_type === 'AADHAAR') {
        StorageService.verifyDocument('DOC_AADHAAR', engineSource, extracted.masked_aadhaar || 'UIDAI-MASKED');
      } else if (extracted.doc_type === 'CASTE') {
        StorageService.verifyDocument('DOC_CASTE', engineSource, extracted.certificate_number || 'CASTE-CERT');
      } else if (extracted.doc_type === 'INCOME') {
        StorageService.verifyDocument('DOC_INCOME', engineSource, extracted.certificate_number || 'INC-CERT');
      } else if (extracted.doc_type === 'MARKSHEET') {
        StorageService.verifyDocument('DOC_MARKSHEET', engineSource, 'MARKS-VERIFIED');
      }
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
    setHasSearchedOrSelectedTrade(false);
    const verifiedDocs = StorageService.getDocuments().filter((d) => d.isVerified).map((d) => d.code);
    ApiService.matchSchemes(DEFAULT_PROFILE, verifiedDocs).then(setSchemes);
    setPathwayMode('pathway1');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* 3D Holographic National Seal Coin Intro */}
      <NationalSeal3DIntro
        currentLang={currentLang}
        forcePlay={play3DIntro}
        onComplete={() => setPlay3DIntro(false)}
      />

      {/* Header */}
      <Header
        currentLang={currentLang}
        onLangChange={handleLanguageChange}
        isLargerFont={isLargerFont}
        onToggleFont={handleToggleFont}
        onTripleTapLogo={handleTripleTap}
        onReplayIntro={() => setPlay3DIntro(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back navigation button - only visible when in Pathway 2 to return to Pathway 1 */}
        {pathwayMode === 'pathway2' && (
          <div className="max-w-4xl mx-auto no-print">
            <button
              type="button"
              onClick={() => setPathwayMode('pathway1')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-orange-500" />
              <span>{currentLang === 'hi' ? 'वापस योजना खोज पर जाएं' : 'Back to Scheme Discovery'}</span>
            </button>
          </div>
        )}

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

            {/* Instant Baseline Match Preview - Always visible on Pathway 1 */}
            <div className="animate-fadeIn">
              <BaselineMatchPreview
                currentLang={currentLang}
                selectedTradeName={
                  profile.profession && profile.profession.trim().length > 0
                    ? `${profile.profession} (${profile.professionHi || ''})`
                    : currentLang === 'hi'
                    ? 'सभी लोकप्रिय सरकारी योजनाएं (All Priority Welfare Schemes)'
                    : 'All Priority Welfare Schemes (सभी लोकप्रिय सरकारी योजनाएं)'
                }
                schemes={schemes}
                onFillCustomDetails={handleSwitchToPathway2}
                onOpenCompare={(scheme) => {
                  setSelectedSchemeForCompare(scheme);
                  setIsCompareOpen(true);
                }}
                onOpenFinancialAnalysis={handleOpenFinancialAnalysis}
                onSwitchToPathway2={handleSwitchToPathway2}
                onOpenCaf={(scheme) => {
                  setSelectedSchemeForCaf(scheme);
                  setIsCafModalOpen(true);
                }}
              />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: PATHWAY 2 (FULL ASSISTED FORM WITH SCOPED OCR)                  */}
        {/* ========================================================================= */}
        {pathwayMode === 'pathway2' && (
          <section className="space-y-6 animate-fadeIn">
            {/* Step 2 Header */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-950 text-white text-sm font-bold flex items-center justify-center shadow-xs">
                  2
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                    {currentLang === 'hi' ? 'चरण 2' : 'Step 2'}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-indigo-950 mt-0.5">
                    {currentLang === 'hi' ? 'श्रेणी एवं आय विवरण (Category & Income)' : 'Category & Income'}
                  </h3>
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
                      placeholder={currentLang === 'hi' ? 'दस्तावेज़ से स्वतः भरा जाएगा या टाइप करें' : 'Auto-filled from OCR or type manually'}
                      value={profile.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
                    />
                  </div>
                </div>

                {/* Date of Birth with Automatic Age Calculation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {currentLang === 'hi' ? 'जन्म तिथि (DOB)' : 'Date of Birth (जन्म तिथि)'}
                    </label>
                    {profile.age !== undefined && profile.age !== null && (
                      <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {currentLang === 'hi' ? `आयु: ${profile.age} वर्ष` : `Age: ${profile.age} yrs`}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={formatDobForInput(profile.dob)}
                    onChange={(e) => handleFormChange('dob', e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 bg-white"
                  />
                </div>

                {/* Gender Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'लिंग (Gender)' : 'Gender (लिंग)'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Male', 'Female', 'Other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleFormChange('gender', g)}
                        className={`h-9 sm:h-10 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          profile.gender === g
                            ? 'border border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-2xs'
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'सामाजिक वर्ग (Category)' : 'Social Category (सामाजिक वर्ग)'}
                  </label>
                  <select
                    value={profile.category}
                    onChange={(e) => handleFormChange('category', e.target.value as SocialCategory)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 bg-white"
                  >
                    <option value="" disabled>
                      {currentLang === 'hi' ? '-- वर्ग चुनें (Select Category) --' : '-- Select Category --'}
                    </option>
                    <option value="OBC-NCL">
                      {currentLang === 'hi' ? 'OBC-NCL - गैर मलाईदार परत' : 'OBC-NCL - Non-Creamy Layer'}
                    </option>
                    <option value="OBC">OBC - Other Backward Class (अन्य पिछड़ा वर्ग)</option>
                    <option value="SC">SC - Scheduled Caste (अनुसूचित जाति)</option>
                    <option value="ST">ST - Scheduled Tribe (अनुसूचित जनजाति)</option>
                    <option value="SCT">
                      {currentLang === 'hi' ? 'SCT - अनुसूचित जाति / जनजाति' : 'SCT - Scheduled Caste / Tribe'}
                    </option>
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
                      value={profile.annualIncome > 0 ? `₹${profile.annualIncome.toLocaleString('en-IN')} / year` : ''}
                      placeholder={currentLang === 'hi' ? '₹0 (स्वतः भरा या टाइप करें)' : '₹0 (auto-filled or type)'}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        handleFormChange('annualIncome', raw ? Number(raw) : 0);
                      }}
                      className="w-1/2 h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 bg-white"
                    />
                    <div className="w-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 120000)}
                        className={`flex-1 h-9 text-[11px] font-semibold rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          profile.annualIncome > 0 && profile.annualIncome <= 150000
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        &lt; ₹1.5L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 240000)}
                        className={`flex-1 h-9 text-[11px] font-semibold rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          profile.annualIncome > 150000 && profile.annualIncome <= 300000
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ₹1.5-3L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('annualIncome', 420000)}
                        className={`flex-1 h-9 text-[11px] font-semibold rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          profile.annualIncome > 300000
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        &gt; ₹3L
                      </button>
                    </div>
                  </div>
                </div>

                {/* State (राज्य) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'राज्य (State)' : 'State (राज्य)'}
                  </label>
                  <input
                    type="text"
                    placeholder={currentLang === 'hi' ? 'उदा. Uttar Pradesh' : 'e.g. Uttar Pradesh (from Aadhaar)'}
                    value={profile.state}
                    onChange={(e) => handleFormChange('state', e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
                  />
                </div>

                {/* District (ज़िला) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'ज़िला (District)' : 'District (ज़िला)'}
                  </label>
                  <input
                    type="text"
                    placeholder={currentLang === 'hi' ? 'उदा. Gorakhpur' : 'e.g. Gorakhpur (from Aadhaar)'}
                    value={profile.district}
                    onChange={(e) => handleFormChange('district', e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
                  />
                </div>

                {/* Educational Qualification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'शैक्षणिक योग्यता (Qualification)' : 'Educational Qualification (शैक्षणिक योग्यता)'}
                  </label>
                  <select
                    value={profile.education || 'N/A'}
                    onChange={(e) => handleFormChange('education', e.target.value as EducationLevel)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white"
                  >
                    <option value="N/A">N/A</option>
                    <option value="10th">10th</option>
                    <option value="12th">12th</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                  </select>
                </div>

                {/* Target Enterprise Display */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {currentLang === 'hi' ? 'प्रस्तावित व्यवसाय' : 'Target Enterprise / Trade (प्रस्तावित व्यवसाय)'}
                  </label>
                  <input
                    type="text"
                    value={profile.profession ? (profile.professionHi ? `${profile.profession} (${profile.professionHi})` : profile.profession) : ''}
                    placeholder={currentLang === 'hi' ? 'ऊपर से व्यापार चुनें या खोजें' : 'Select trade above or search'}
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
                  className="w-full h-11 sm:h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {currentLang === 'hi' ? 'योजनाएं देखें' : 'Show Schemes (योजनाएं देखें)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
                    Stage 3: Matched Scheme Allocations (अंतिम चरण: योजना आवंटन)
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-indigo-950">
                    Matched Welfare Schemes
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Central & state scheme matches aggregated based on your profile and OCR-collected documents. Ready for bank sanction.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-semibold">
                    👤 {profile.name || (currentLang === 'hi' ? 'आवेदक' : 'Applicant')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-xs font-semibold">
                    🏷️ {[profile.category, profile.gender, profile.areaType, profile.district].filter(Boolean).join(' ') || (currentLang === 'hi' ? 'सामान्य' : 'General')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    💰 ₹{profile.requiredCapital.toLocaleString('en-IN')} Capital Need
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                    🏺 {profile.profession || (currentLang === 'hi' ? 'स्वरोजगार' : 'Self Employed')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchemeForCompare(schemes[0] || null);
                    setIsCompareOpen(true);
                  }}
                  className="h-9 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                  <span>{currentLang === 'hi' ? 'योजनाओं की तुलना' : 'Compare Schemes'}</span>
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
                          {[profile.category, profile.gender, profile.areaType].filter(Boolean).join(' + ') || 'General Eligibility'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DYNAMIC FUNCTIONAL ELIGIBILITY CONDITION BREAKDOWN */}
                  <SchemeConditionBreakdown
                    scheme={scheme}
                    profile={profile}
                    verifiedDocCodes={verifiedDocCodes}
                    currentLang={currentLang}
                    onDocumentsUpdated={handleDocumentsUpdated}
                  />

                  {/* Document Readiness Checklist */}
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-3xl">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {currentLang === 'hi' ? 'सत्यापित संलग्न दस्तावेज:' : 'Attached Verified Documents:'}
                    </h5>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(scheme.requiredDocuments && scheme.requiredDocuments.length > 0
                        ? scheme.requiredDocuments
                        : ['Aadhaar Card', 'Caste Certificate', 'Income Certificate']
                      ).map((doc: string, docIdx: number) => {
                        const isDocVerified =
                          verifiedDocCodes.includes(doc) ||
                          (doc.toLowerCase().includes('aadhaar') && verifiedDocCodes.some((c) => c.toLowerCase().includes('aadhaar'))) ||
                          (doc.toLowerCase().includes('caste') && verifiedDocCodes.some((c) => c.toLowerCase().includes('caste'))) ||
                          (doc.toLowerCase().includes('income') && verifiedDocCodes.some((c) => c.toLowerCase().includes('income'))) ||
                          (doc.toLowerCase().includes('bank') && verifiedDocCodes.some((c) => c.toLowerCase().includes('bank'))) ||
                          (doc.toLowerCase().includes('residence') && verifiedDocCodes.some((c) => c.toLowerCase().includes('residence') || c.toLowerCase().includes('rural'))) ||
                          (doc.toLowerCase().includes('report') && verifiedDocCodes.some((c) => c.toLowerCase().includes('report') || c.toLowerCase().includes('project'))) ||
                          (doc.toLowerCase().includes('marksheet') && verifiedDocCodes.some((c) => c.toLowerCase().includes('marksheet') || c.toLowerCase().includes('education')));

                        return (
                          <div
                            key={docIdx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shadow-2xs transition ${
                              isDocVerified
                                ? 'bg-white border-emerald-200 text-emerald-900'
                                : 'bg-amber-50/70 border-amber-200 text-amber-900'
                            }`}
                          >
                            <CheckCircle2
                              className={`w-4 h-4 flex-shrink-0 ${
                                isDocVerified ? 'text-emerald-600' : 'text-amber-500'
                              }`}
                            />
                            <span className="truncate">{doc}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Card Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span>{currentLang === 'hi' ? 'पात्रता स्वीकृत (Statutory Verified)' : '100% Eligible & Sanction Ready'}</span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchemeForCompare(scheme);
                            setIsCompareOpen(true);
                          }}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                          <span>{currentLang === 'hi' ? 'योजना की तुलना करें' : 'Compare Scheme'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenFinancialAnalysis(scheme.id)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Financial Breakdown</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchemeForCaf(scheme);
                            setIsCafModalOpen(true);
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <FileText className="w-4 h-4 text-orange-400" />
                          <span>{currentLang === 'hi' ? 'सी.ए.एफ. आवेदन पत्र (CAF) 📄' : 'Generate Scheme CAF Dossier 📄'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UNMATCHED & INELIGIBLE WELFARE SCHEMES (INFINITE-SCROLL LAZY LOADER) */}
            <UnmatchedSchemesDropdown
              profile={profile}
              verifiedDocCodes={verifiedDocCodes}
              currentLang={currentLang}
              matchedSchemeIds={schemes.map((s) => s.id)}
            />
          </section>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <CompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        schemes={schemes.length > 0 ? schemes : MOCK_SCHEMES}
        initialScheme={selectedSchemeForCompare}
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
        onResetSession={handleResetSession}
      />

      {/* Footer */}
      <Footer currentLang={currentLang} />
    </div>
  );
}
