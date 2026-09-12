'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { TargetedOcrUpload } from '@/components/ocr/TargetedOcrUpload';
import { DigiLockerModal } from '@/components/kyc/DigiLockerModal';
import { DevDebugDrawer } from '@/components/dev/DevDebugDrawer';
import { StorageService, DEFAULT_PROFILE } from '@/lib/storage';
import { ApiService } from '@/lib/api';
import { calculateAge, formatDobForInput } from '@/lib/dateUtils';
import { ApplicantProfile, SocialCategory, Gender, EducationLevel, OcrExtractedData } from '@/types';
import { useDevHUD } from '@/hooks/useDevHUD';
import { UserCheck, CheckCircle2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ApplyPage() {
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isLargerFont, setIsLargerFont] = useState(false);
  const [profile, setProfile] = useState<ApplicantProfile>(DEFAULT_PROFILE);
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);

  const { isOpen: isDevHudOpen, toggle: toggleDevHud, handleTripleTap } = useDevHUD();
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');

  useEffect(() => {
    setProfile(StorageService.getProfile());
    setCurrentLang(StorageService.getLanguage());
  }, []);

  const handleFormChange = (key: keyof ApplicantProfile, val: any) => {
    const updated = StorageService.saveProfile({ [key]: val });
    setProfile(updated);
  };

  const handleOcrExtracted = (extracted: OcrExtractedData) => {
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

    const updated = StorageService.saveProfile(patch);
    setProfile(updated);

    // Register verified document in session
    if (extracted.doc_type === 'AADHAAR') {
      StorageService.verifyDocument('DOC_AADHAAR', 'RAPIDOCR', extracted.masked_aadhaar || 'UIDAI-MASKED');
    } else if (extracted.doc_type === 'CASTE') {
      StorageService.verifyDocument('DOC_CASTE', 'RAPIDOCR', extracted.certificate_number || 'CASTE-CERT');
    } else if (extracted.doc_type === 'INCOME') {
      StorageService.verifyDocument('DOC_INCOME', 'RAPIDOCR', extracted.certificate_number || 'INC-CERT');
    } else if (extracted.doc_type === 'MARKSHEET') {
      StorageService.verifyDocument('DOC_MARKSHEET', 'RAPIDOCR', 'MARKS-VERIFIED');
    }
  };

  const handleSubmit = () => {
    router.push('/dashboard');
  };

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
        onOpenDigiLocker={() => setIsDigiLockerOpen(true)}
        onTripleTapLogo={handleTripleTap}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-orange-500" />
            <span>Back to 1-Tap Discovery</span>
          </button>
          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Pathway 2: Assisted Mode
          </span>
        </div>

        {/* OCR Component */}
        <TargetedOcrUpload currentLang={currentLang} onExtractSuccess={handleOcrExtracted} />

        {/* Form Fields */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h4 className="font-bold text-indigo-950 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-orange-500" />
            Verified Applicant Details (आवेदक विवरण)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Auto-filled from OCR or type manually"
                value={profile.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
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
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Social Category</label>
              <select
                value={profile.category}
                onChange={(e) => handleFormChange('category', e.target.value as SocialCategory)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 focus:border-indigo-600 text-sm font-semibold text-slate-900 bg-white"
              >
                <option value="" disabled>-- Select Category --</option>
                <option value="OBC-NCL">OBC-NCL - Non-Creamy Layer</option>
                <option value="OBC">OBC - Other Backward Class</option>
                <option value="SC">SC - Scheduled Caste</option>
                <option value="ST">ST - Scheduled Tribe</option>
                <option value="SCT">SCT - Scheduled Caste / Tribe</option>
                <option value="EWS">EWS - Economically Weaker Section</option>
                <option value="Minority">Minority Community</option>
                <option value="General">General Category</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Annual Family Income</label>
              <input
                type="text"
                value={profile.annualIncome > 0 ? `₹${profile.annualIncome.toLocaleString('en-IN')}` : ''}
                placeholder="₹0 (auto-filled from OCR or enter manually)"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  handleFormChange('annualIncome', raw ? Number(raw) : 0);
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">State (राज्य)</label>
              <input
                type="text"
                placeholder="e.g. Uttar Pradesh (from Aadhaar)"
                value={profile.state}
                onChange={(e) => handleFormChange('state', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">District (ज़िला)</label>
              <input
                type="text"
                placeholder="e.g. Gorakhpur (from Aadhaar)"
                value={profile.district}
                onChange={(e) => handleFormChange('district', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Highest Qualification (शैक्षणिक योग्यता)</label>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Trade (लक्षित व्यवसाय / पेशा)</label>
              <input
                type="text"
                value={profile.profession ? (profile.professionHi ? `${profile.profession} (${profile.professionHi})` : profile.profession) : ''}
                placeholder="Select trade or enter manually"
                readOnly
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50"
              />
            </div>

            {/* Optional Mobile Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {currentLang === 'hi' ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number'}
                </label>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {currentLang === 'hi' ? 'वैकल्पिक (Optional)' : 'Optional'}
                </span>
              </div>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                maxLength={10}
                value={profile.mobileNumber || ''}
                onChange={(e) => handleFormChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
            </div>

            {/* Optional Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {currentLang === 'hi' ? 'ईमेल पता (Email ID)' : 'Email Address'}
                </label>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {currentLang === 'hi' ? 'वैकल्पिक (Optional)' : 'Optional'}
                </span>
              </div>
              <input
                type="email"
                placeholder="e.g. applicant@gmail.com"
                value={profile.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full h-11 sm:h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>{currentLang === 'hi' ? 'योजनाएं देखें' : 'Show Schemes'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      <DigiLockerModal
        isOpen={isDigiLockerOpen}
        onClose={() => setIsDigiLockerOpen(false)}
        onVerified={() => {}}
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
