'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  FileCheck2,
  ArrowRight,
  ArrowLeft,
  Info,
  Calendar,
  Award,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Check,
  ThumbsUp,
  ThumbsDown,
  Sun,
  Layers,
  FileQuestion,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';

import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { StorageService, DEFAULT_PROFILE } from '@/lib/storage';
import { MOCK_SCHEMES } from '@/lib/mockData';
import { SchemeMatch, ApplicantProfile } from '@/types';
import { useDevHUD } from '@/hooks/useDevHUD';
import { DevDebugDrawer } from '@/components/dev/DevDebugDrawer';
import { CompareDrawer } from '@/components/compare/CompareDrawer';
import { CommonAppFormat } from '@/components/caf/CommonAppFormat';

type NavTabId =
  | 'details'
  | 'benefits'
  | 'eligibility'
  | 'application-process'
  | 'documents-required'
  | 'faqs'
  | 'sources'
  | 'feedback';

interface TabItem {
  id: NavTabId;
  labelEn: string;
  labelHi: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_TABS: TabItem[] = [
  { id: 'details', labelEn: 'Details', labelHi: 'विवरण', icon: Info },
  { id: 'benefits', labelEn: 'Benefits', labelHi: 'लाभ', icon: Award },
  { id: 'eligibility', labelEn: 'Eligibility', labelHi: 'पात्रता', icon: ShieldCheck },
  { id: 'application-process', labelEn: 'Application Process', labelHi: 'आवेदन प्रक्रिया', icon: Layers },
  { id: 'documents-required', labelEn: 'Documents Required', labelHi: 'आवश्यक दस्तावेज', icon: FileText },
  { id: 'faqs', labelEn: 'Frequently Asked Questions', labelHi: 'अक्सर पूछे जाने वाले प्रश्न', icon: FileQuestion },
  { id: 'sources', labelEn: 'Sources And References', labelHi: 'स्रोत एवं संदर्भ', icon: BookOpen },
  { id: 'feedback', labelEn: 'Feedback', labelHi: 'प्रतिक्रिया', icon: HelpCircle },
];

export default function SchemeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const schemeId = (params?.id as string) || 'nssfp';

  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isLargerFont, setIsLargerFont] = useState(false);
  const [profile, setProfile] = useState<ApplicantProfile>(DEFAULT_PROFILE);

  // Active navigation tab (updates with scroll or click)
  const [activeTab, setActiveTab] = useState<NavTabId>('details');

  // Accordion state for FAQs: first 2 items open by default
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0, 1]);

  // Feedback widget state
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<null | 'helpful' | 'unhelpful'>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isCafModalOpen, setIsCafModalOpen] = useState(false);

  // Dev HUD
  const { isOpen: isDevHudOpen, toggle: toggleDevHud, handleTripleTap } = useDevHUD();
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');

  useEffect(() => {
    setProfile(StorageService.getProfile());
    setCurrentLang(StorageService.getLanguage());
  }, []);

  const scheme: SchemeMatch =
    MOCK_SCHEMES.find((s) => s.id === schemeId || s.code.toLowerCase() === schemeId.toLowerCase()) ||
    MOCK_SCHEMES[0];

  const handleLanguageChange = (lang: 'en' | 'hi') => {
    setCurrentLang(lang);
    StorageService.setLanguage(lang);
  };

  const handleToggleFont = () => {
    setIsLargerFont((prev) => !prev);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('a-plus', !isLargerFont);
    }
  };

  const scrollToSection = (tabId: NavTabId) => {
    setActiveTab(tabId);
    if (typeof document !== 'undefined') {
      const element = document.getElementById(tabId);
      if (element) {
        const offset = 90;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  // ScrollSpy to keep active tab highlighted as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (let i = NAV_TABS.length - 1; i >= 0; i--) {
        const tab = NAV_TABS[i];
        const el = document.getElementById(tab.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveTab(tab.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Detailed Document Definitions
  const DOCUMENT_DETAILS: Record<
    string,
    { nameEn: string; nameHi: string; authority: string; reason: string; mandatory: boolean }
  > = {
    DOC_AADHAAR: {
      nameEn: 'Aadhaar Card (Front & Back)',
      nameHi: 'आधार कार्ड (आगे व पीछे)',
      authority: 'Unique Identification Authority of India (UIDAI)',
      reason: 'Mandatory proof of identity, age validation, and Indian nationality verification.',
      mandatory: true,
    },
    DOC_CASTE: {
      nameEn: 'Caste / Community Certificate',
      nameHi: 'जाति प्रमाण पत्र',
      authority: 'Tehsildar / Sub-Divisional Magistrate (SDM) / Revenue Dept',
      reason: 'Required for claiming applicable age and fee relaxations under GOI guidelines.',
      mandatory: false,
    },
    DOC_INCOME: {
      nameEn: 'Annual Income Certificate / BPL Card',
      nameHi: 'आय प्रमाण पत्र / राशन कार्ड',
      authority: 'Tehsildar / District Revenue Officer / SDO',
      reason: 'Verifies annual household income satisfies scheme criteria.',
      mandatory: false,
    },
    DOC_RURAL: {
      nameEn: 'Rural Area Certificate',
      nameHi: 'ग्रामीण क्षेत्र प्रमाण पत्र',
      authority: 'Gram Pradhan / Panchayat Secretary / Block Development Officer (BDO)',
      reason: 'Enables rural quota rate and location-specific benefits.',
      mandatory: false,
    },
    DOC_MARKSHEET: {
      nameEn: 'Highest Degree Certificate & Marksheets (Ph.D. / M.Tech. / Master)',
      nameHi: 'शैक्षणिक योग्यता प्रमाण पत्र (पीएच.डी. / एम.टेक. / मास्टर)',
      authority: 'Recognized University / Institute / UGC / AICTE',
      reason: 'Mandatory proof of qualifying degree and demonstrated research credentials in science/engineering.',
      mandatory: true,
    },
    DOC_PROJECT_REPORT: {
      nameEn: 'Research Proposal & Host Institution Endorsement',
      nameHi: 'अनुसंधान प्रस्ताव एवं मेजबान संस्थान पृष्ठांकन',
      authority: 'Head of Host Institution (IIT / IISc / NIT / Central Research Lab)',
      reason: 'Mandatory research synopsis detailing solar science objectives, methodology, and host lab commitment.',
      mandatory: true,
    },
  };

  const requiredDocList = scheme.requiredDocuments.map((code) => {
    return (
      DOCUMENT_DETAILS[code] || {
        nameEn: code,
        nameHi: code,
        authority: 'Competent Government Authority',
        reason: 'Statutory verification requirement.',
        mandatory: true,
      }
    );
  });

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800">
      {/* Official Top Header */}
      <Header
        currentLang={currentLang}
        onLangChange={handleLanguageChange}
        isLargerFont={isLargerFont}
        onToggleFont={handleToggleFont}
        onTripleTapLogo={handleTripleTap}
      />

      {/* Main Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-blue-900 transition flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentLang === 'hi' ? 'होम' : 'Home'}</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 hover:text-slate-900 transition truncate max-w-xs">
              {currentLang === 'hi' ? scheme.ministryHi : scheme.ministryEn}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-900 font-bold truncate max-w-xs sm:max-w-md">
              {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
            </span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCafModalOpen(true)}
              className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-100" />
              <span>{currentLang === 'hi' ? '📑 आवेदन पत्र डाउनलोड करें (CAF)' : '📑 Download Scheme Form (CAF)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-950 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
              <span>{currentLang === 'hi' ? 'योजना की तुलना करें' : 'Compare Scheme'}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/apply')}
              className="h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <span>{currentLang === 'hi' ? 'कस्टम विवरण भरें' : 'Fill Custom Details'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scheme Hero Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold tracking-wide flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-blue-600" />
              {scheme.tags && scheme.tags.length > 0 ? scheme.tags[0] : 'Education & Learning'}
            </span>
            {scheme.tags &&
              scheme.tags.slice(1).map((t) => (
                <span key={t} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                  {t}
                </span>
              ))}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCafModalOpen(true)}
                className="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{currentLang === 'hi' ? '📑 आवेदन पत्र डाउनलोड करें' : '📑 Download Application Form'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCompareOpen(true)}
                className="px-3 py-1 rounded-full bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                <span>{currentLang === 'hi' ? 'अन्य योजना से तुलना' : 'Compare Scheme'}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {scheme.compatibilityPercentage}% Match Score
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {currentLang === 'hi' ? scheme.nameHi : scheme.nameEn}
            </h1>
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>{currentLang === 'hi' ? scheme.ministryHi : scheme.ministryEn}</span>
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLang === 'hi' ? 'शुभारंभ: फरवरी 2011' : 'Launched: February 2011'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLang === 'hi' ? 'श्रेणी: राष्ट्रीय विज्ञान फेलोशिप' : 'Category: National Science Fellowship'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{currentLang === 'hi' ? '100% प्रत्यक्ष अनुदान (Direct Grant)' : '100% Direct Fellowship Grant'}</span>
            </div>
          </div>
        </div>

        {/* 3-Column Layout: Left Navigation, Center Content, Right Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Vertical Navigation Menu (myScheme standard) */}
          <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm lg:sticky lg:top-6">
            <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              {currentLang === 'hi' ? 'योजना अनुभाग' : 'Scheme Navigation'}
            </div>

            {/* Desktop vertical list / Mobile scrollable tabs */}
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {NAV_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => scrollToSection(tab.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition whitespace-nowrap lg:whitespace-normal cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-600 font-extrabold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                    <span className="flex-1">{currentLang === 'hi' ? tab.labelHi : tab.labelEn}</span>
                    {isActive && (
                      <span className="hidden lg:inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Center Scrollable Content Panel */}
          <div className="lg:col-span-9 space-y-6">
            {/* 1. DETAILS SECTION */}
            <section
              id="details"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'विवरण (Details)' : 'Details'}</span>
                </h2>
              </div>

              {/* EXACT text from user prompt */}
              <div className="text-slate-700 leading-relaxed text-sm sm:text-base space-y-4 font-normal">
                <p>
                  The “National Solar Science Fellowship Programme” of the Ministry of New &amp; Renewable Energy was launched in February 2011. The programme is meant for an Indian Scientist desirous of working in the forefront areas of solar energy science, engineering, and technology with a focus on science, technology, and product development in collaboration with selected prestigious institutions in India. The aim of the National Solar Science Fellowship Programme is to provide a platform to top quality scientists and engineers in the area of solar energy research, to use and expand the resources available at the identified schools/ institutions in the country and abroad to address the complex problems of solar energy utilization for various end uses including power generation.
                </p>
              </div>

              {/* Key Pillars Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-blue-600" /> Core Research Scope
                  </span>
                  <p className="text-xs text-slate-700 leading-normal">
                    Forefront areas of solar photovoltaics, solar thermal, energy storage, and product development.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" /> Host Collaborations
                  </span>
                  <p className="text-xs text-slate-700 leading-normal">
                    Selected prestigious universities, IITs, IISc, NITs, and premier national laboratories in India.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. BENEFITS SECTION */}
            <section
              id="benefits"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'लाभ (Benefits)' : 'Benefits'}</span>
                </h2>
              </div>

              <div className="space-y-3">
                {(
                  scheme.benefits || [
                    'Monthly Fellowship Grant of ₹1,00,000 per month for selected scientists and researchers.',
                    'Annual Research Contingency Grant of up to ₹5,00,000 per year for project equipment, consumables, and publications.',
                    'Institutional support and overhead grant to host universities and national laboratories.',
                    'Tenure of fellowship for 3 years, extendable up to 2 additional years based on performance review.',
                    'Access to premier laboratory infrastructure across India and international academic exchange.',
                  ]
                ).map((benefit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1">
                <span className="text-xs font-bold text-amber-900 block">DBT Fellowship Disbursement</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Stipend and research contingency grants are directly disbursed through PFMS / Direct Benefit Transfer (DBT) into the fellow's Aadhaar-seeded bank account.
                </p>
              </div>
            </section>

            {/* 3. ELIGIBILITY SECTION */}
            <section
              id="eligibility"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'पात्रता (Eligibility)' : 'Eligibility'}</span>
                </h2>
              </div>

              <div className="space-y-3">
                {(
                  scheme.eligibilityCriteria || [
                    'Applicant must be an Indian citizen.',
                    'Must possess a Ph.D. or M.Tech./M.S. in engineering, science, or allied disciplines.',
                    'Must have demonstrated research & development track record in the forefront areas of solar energy.',
                    'Candidates from all categories (General, OBC, SC, ST, EWS) are eligible to apply.',
                    'Identified host institution in India willing to provide laboratory facilities and research environment.',
                  ]
                ).map((crit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{crit}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                <span className="font-bold block">Social Category Inclusivity</span>
                <p className="leading-relaxed">
                  General category applicants, along with SC, ST, OBC, and EWS candidates, are eligible to apply. Standard Central Government age relaxations apply for reserved and women applicants.
                </p>
              </div>
            </section>

            {/* 4. APPLICATION PROCESS SECTION */}
            <section
              id="application-process"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'आवेदन प्रक्रिया (Application Process)' : 'Application Process'}</span>
                </h2>
              </div>

              <div className="space-y-4">
                {(
                  scheme.applicationProcess || [
                    'Step 1: Obtain the official application proforma from the Ministry of New & Renewable Energy (MNRE) portal (mnre.gov.in).',
                    'Step 2: Prepare a comprehensive research proposal focusing on solar energy science, engineering, or technology.',
                    'Step 3: Secure formal endorsement from the Head of the identified host institution in India.',
                    'Step 4: Submit the complete application dossier with verified educational degrees, research publications, and identity proofs.',
                    'Step 5: Review and shortlisting by the National Solar Science Fellowship Search-cum-Selection Committee, followed by final selection interview.',
                  ]
                ).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex-1">
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCafModalOpen(true)}
                  className="w-full sm:w-1/2 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-200" />
                  <span>{currentLang === 'hi' ? '📑 आवेदन पत्र डाउनलोड करें (CAF Dossier)' : '📑 Download Application Form (CAF Dossier)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/apply')}
                  className="w-full sm:w-1/2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <span>{currentLang === 'hi' ? 'ऑनलाइन कस्टम विवरण भरें' : 'Fill Custom Details & Apply'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* 5. DOCUMENTS REQUIRED SECTION */}
            <section
              id="documents-required"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'आवश्यक दस्तावेज (Documents Required)' : 'Documents Required'}</span>
                </h2>
              </div>

              <div className="space-y-3">
                {requiredDocList.map((doc, idx) => {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-blue-600" />
                          {currentLang === 'hi' ? doc.nameHi : doc.nameEn}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {doc.mandatory ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold">
                              Mandatory
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-medium">
                              Optional / Relaxations
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{doc.reason}</p>

                      <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Issuing Authority: <strong className="text-slate-700">{doc.authority}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 6. FREQUENTLY ASKED QUESTIONS SECTION (EXACT 10 QUESTIONS FROM USER SCREENSHOT) */}
            <section
              id="faqs"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-1 border-b border-slate-100 flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न (FAQ)' : 'Frequently Asked Questions'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Official queries &amp; answers published by the Ministry regarding eligibility, qualification, and fellowship terms.
                </p>
              </div>

              {/* Expandable Accordion List */}
              <div className="space-y-3">
                {(
                  scheme.faqs || [
                    {
                      question: 'What is the aim of the scheme?',
                      answer:
                        'The aim of the National Solar Science Fellowship Programme is to provide a platform to top quality scientists and engineers in the area of solar energy research, to use and expand the resources available at the identified schools/ institutions in the country and abroad to address the complex problems of solar energy utilization for various end uses including power generation.',
                    },
                    {
                      question: 'Which department has launched this scheme?',
                      answer:
                        'The scheme has been launched by the Ministry of New and Renewable Energy (MNRE), Government of India.',
                    },
                    {
                      question: 'When was this scheme launched?',
                      answer: 'The National Solar Science Fellowship Programme was launched in February 2011.',
                    },
                    {
                      question: 'Who is eligible to get the benefits under the scheme?',
                      answer:
                        'The programme is meant for an Indian Scientist desirous of working in the forefront areas of solar energy science, engineering, and technology with a focus on science, technology, and product development in collaboration with selected prestigious institutions in India.',
                    },
                    {
                      question: 'Can a general category applicant be eligible to apply under this scheme?',
                      answer:
                        'Yes, general category applicants are fully eligible to apply under this scheme, along with applicants from all other categories (OBC, SC, ST, EWS), provided they satisfy the technical qualification and research requirements.',
                    },
                    {
                      question: 'What is the minimum qualification required to apply under the scheme?',
                      answer:
                        'Applicants must possess a Ph.D. or an M.Tech./M.S. degree in engineering, science, or allied fields with a demonstrable background and track record of research in the area of solar energy.',
                    },
                    {
                      question: 'Can an M.Tech. or M.S. degree holder candidate be eligible to apply under the scheme?',
                      answer:
                        'Yes, an M.Tech. or M.S. degree holder candidate is eligible to apply under the scheme, provided they possess relevant research competence and background in solar energy science or technology.',
                    },
                    {
                      question:
                        'Is it mandatory for a candidate to have an appropriate background in academics and experience in R&D in the area of solar energy?',
                      answer:
                        'Yes, it is mandatory for candidates to have an appropriate background in academics and relevant research & development experience in the area of solar energy science and technology.',
                    },
                    {
                      question: 'Will there be any age bar for the candidates to apply under the programme?',
                      answer:
                        'Candidates should ordinarily be below 35-40 years of age at the time of application, with applicable relaxations for reserved categories (SC/ST/OBC/Women/PwD) per Government of India guidelines.',
                    },
                    {
                      question: 'What is the benefit of the scheme?',
                      answer:
                        'The scheme provides a monthly fellowship stipend of ₹1,00,000, an annual research contingency grant of up to ₹5,00,000, overhead support to host institutions, and access to leading national labs and academic networks.',
                    },
                  ]
                ).map((faq, index) => {
                  const isOpen = openFaqIndices.includes(index);
                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isOpen
                          ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 cursor-pointer focus:outline-none"
                      >
                        <span className="leading-snug">
                          <span className="text-blue-600 mr-2">Q{index + 1}.</span>
                          {faq.question}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${
                            isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-blue-100/60 font-normal">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 7. SOURCES AND REFERENCES SECTION */}
            <section
              id="sources"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'स्रोत एवं संदर्भ (Sources & References)' : 'Sources And References'}</span>
                </h2>
              </div>

              <div className="space-y-3">
                {(
                  scheme.sourcesAndReferences || [
                    { title: 'Ministry of New & Renewable Energy (MNRE) Official Portal', url: 'https://mnre.gov.in' },
                    { title: 'myScheme Government of India Portal', url: 'https://www.myscheme.gov.in/schemes/nssfp' },
                    { title: 'National Institute of Solar Energy (NISE)', url: 'https://nise.res.in' },
                  ]
                ).map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 transition flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <span className="text-sm font-bold text-blue-900 group-hover:text-blue-700 block">
                        {source.title}
                      </span>
                      {source.url && <span className="text-xs text-slate-500">{source.url}</span>}
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </section>

            {/* 8. FEEDBACK SECTION */}
            <section
              id="feedback"
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pb-2 border-b border-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span>{currentLang === 'hi' ? 'प्रतिक्रिया (Feedback)' : 'Feedback'}</span>
                </h2>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Was this scheme information helpful to you?
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your feedback helps us continuously improve the accuracy and completeness of scheme dossiers.
                </p>

                {feedbackSubmitted ? (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-700" />
                    Thank you! Your feedback has been recorded.
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFeedbackSubmitted('helpful')}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 text-slate-800 text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <ThumbsUp className="w-4 h-4 text-emerald-600" />
                      <span>Yes, very helpful</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackSubmitted('unhelpful')}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-500 text-slate-800 text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <ThumbsDown className="w-4 h-4 text-rose-600" />
                      <span>Needs improvement</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer currentLang={currentLang} />

      {/* Side-by-side Scheme Comparison Drawer */}
      <CompareDrawer
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        schemes={MOCK_SCHEMES}
        initialScheme={scheme}
        onProceedPathway2={() => router.push('/apply')}
        currentLang={currentLang}
      />

      {/* Printable Common Application Format Modal */}
      <CommonAppFormat
        isOpen={isCafModalOpen}
        onClose={() => setIsCafModalOpen(false)}
        profile={profile}
        selectedScheme={scheme}
        currentLang={currentLang}
      />

      {/* Hidden Dev Debug HUD */}
      <DevDebugDrawer
        isOpen={isDevHudOpen}
        onToggle={toggleDevHud}
        ocrEngine={ocrEngine}
        setOcrEngine={setOcrEngine}
        matcherEngine={matcherEngine}
        setMatcherEngine={setMatcherEngine}
        onResetSession={() => {
          StorageService.clearSession();
          router.push('/');
        }}
      />
    </div>
  );
}