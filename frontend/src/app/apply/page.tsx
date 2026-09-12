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
    if (extracted.certificate_number) patch.casteCertificateNo = extracted.certificate_number;
    if (extracted.marks_percentage) patch.marksPercentage = extracted.marks_percentage;
    if (extracted.highest_education) patch.education = extracted.highest_education;
    if (extracted.state) patch.state = extracted.state;
    if (extracted.district) patch.district = extracted.district;

    const updated = StorageService.saveProfile(patch);
    setProfile(updated);
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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-950 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to 1-Tap Discovery
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
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
                <option value="OBC">OBC - Other Backward Class</option>
                <option value="SC">SC - Scheduled Caste</option>
                <option value="ST">ST - Scheduled Tribe</option>
                <option value="EWS">EWS - Economically Weaker Section</option>
                <option value="Minority">Minority Community</option>
                <option value="General">General Category</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Annual Family Income</label>
              <input
                type="text"
                value={`₹${profile.annualIncome ? profile.annualIncome.toLocaleString('en-IN') : 0}`}
                readOnly
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50"
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
                value={profile.education}
                onChange={(e) => handleFormChange('education', e.target.value as EducationLevel)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 bg-white"
              >
                <option value="10th">Class 10th Pass (10वीं)</option>
                <option value="12th">Class 12th Pass (12वीं / Inter)</option>
                <option value="ITI">ITI / Diploma (डिप्लोमा)</option>
                <option value="Graduate">Graduate / Degree (स्नातक)</option>
                <option value="PostGraduate">Post Graduate / Master&apos;s (परास्नातक)</option>
                <option value="Literate">Literate / Traditional Skill</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Academic Marks / Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g. 89.0 (Auto-filled from Marksheet)"
                value={profile.marksPercentage !== undefined && profile.marksPercentage !== null ? profile.marksPercentage : ''}
                onChange={(e) => handleFormChange('marksPercentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Trade (लक्षित व्यवसाय / पेशा)</label>
              <input
                type="text"
                value={profile.profession ? `${profile.profession} (${profile.professionHi || ''})` : 'Traditional Artisan'}
                readOnly
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-slate-50"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Calculate 100% Eligible Schemes</span>
            <ArrowRight className="w-5 h-5" />
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
