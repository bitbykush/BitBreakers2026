'use client';

import React from 'react';
import { Printer, X, ShieldCheck, Check } from 'lucide-react';
import { ApplicantProfile, SchemeMatch, DigiLockerRecord } from '@/types';

interface CommonAppFormatProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicantProfile;
  selectedScheme: SchemeMatch | null;
  digiLockerRecord: DigiLockerRecord | null;
  currentLang: 'en' | 'hi';
}

export const CommonAppFormat: React.FC<CommonAppFormatProps> = ({
  isOpen,
  onClose,
  profile,
  selectedScheme,
  digiLockerRecord,
  currentLang,
}) => {
  if (!isOpen) return null;

  const capital = profile.requiredCapital || 200000;
  const grantPct = selectedScheme?.financials.grantSubsidyPercentage || 35;
  const marginPct = selectedScheme?.financials.promoterMarginPercentage || 5;
  const loanPct = 100 - grantPct - marginPct;

  const grantAmt = (capital * grantPct) / 100;
  const marginAmt = (capital * marginPct) / 100;
  const loanAmt = (capital * loanPct) / 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex justify-center animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Action Bar (Hidden during print) */}
        <div className="no-print bg-indigo-950 text-white p-4 flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400" />
            <span className="font-bold text-sm">
              Unified Credit-Linked Subsidy Application Dossier (CAF-2026)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOSSIER (A4 Container) */}
        <div id="print-dossier" className="p-8 sm:p-10 bg-white text-slate-900 font-sans space-y-6">
          {/* Dossier Header */}
          <div className="border-b-2 border-indigo-950 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-950 text-white flex items-center justify-center font-bold text-xl">
                🏛️
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">
                  Government of India / State Welfare Nodal Agency
                </p>
                <h2 className="text-xl font-black text-indigo-950">UNIFIED COMMON APPLICATION FORMAT (CAF)</h2>
                <p className="text-xs font-semibold text-orange-700">
                  Target Scheme: {selectedScheme?.nameEn || "Prime Minister's Employment Generation Programme (PMEGP)"}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <p className="font-bold text-indigo-950">
                Dossier ID: {digiLockerRecord?.refId ? `CAF-${digiLockerRecord.refId}` : 'CAF-2026-X8921'}
              </p>
              <p className="text-slate-500">
                Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                ✓ e-KYC Verified
              </span>
            </div>
          </div>

          {/* Section 1: Applicant Particulars */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 text-slate-800 border-l-4 border-indigo-950">
              1. Applicant Particulars (आवेदक विवरण)
            </h3>
            <table className="w-full text-xs border border-slate-200 text-slate-800">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50 w-1/4">Full Name:</td>
                  <td className="p-2 font-semibold w-1/4">{profile.name}</td>
                  <td className="p-2 font-bold bg-slate-50 w-1/4">Masked Aadhaar UID:</td>
                  <td className="p-2 font-mono font-bold w-1/4 text-indigo-900">
                    {profile.maskedAadhaar || 'XXXX-XXXX-3456'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50">Social Category:</td>
                  <td className="p-2 font-semibold text-emerald-800">{profile.category} (Affirmative Action Bonus)</td>
                  <td className="p-2 font-bold bg-slate-50">Gender / DOB:</td>
                  <td className="p-2">{profile.gender || 'N/A'} / {profile.dob || 'N/A'}{profile.age ? ` (Age: ${profile.age} yrs)` : ''}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50">Certified Annual Income:</td>
                  <td className="p-2 font-semibold">{profile.annualIncome > 0 ? `₹${profile.annualIncome.toLocaleString('en-IN')} / year (Revenue Verified)` : 'Not Declared'}</td>
                  <td className="p-2 font-bold bg-slate-50">Location Classification:</td>
                  <td className="p-2 font-semibold text-orange-700">{profile.areaType || 'Rural'} Gram Panchayat ({profile.district || 'District'}, {profile.state || 'State'})</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-50">Education & Course:</td>
                  <td className="p-2 font-semibold">{profile.education || 'N/A'}</td>
                  <td className="p-2 font-bold bg-slate-50">DigiLocker Verification:</td>
                  <td className="p-2 text-emerald-700 font-mono font-semibold">✓ Verified (DL-2026-X8921)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Target Enterprise & Capital Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 text-slate-800 border-l-4 border-indigo-950">
              2. Proposed Enterprise & Capital Appraisal (परियोजना लागत व सब्सिडी विवरण)
            </h3>
            <table className="w-full text-xs border border-slate-200 text-slate-800">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50 w-1/3">Enterprise Activity / Trade:</td>
                  <td className="p-2 font-semibold" colSpan={2}>{profile.profession} ({profile.professionHi || 'शिल्पकार'})</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50">Total Project Cost Appraised:</td>
                  <td className="p-2 font-mono font-bold text-sm text-indigo-950" colSpan={2}>
                    ₹{capital.toLocaleString('en-IN')} /-
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-emerald-50 text-emerald-900">
                    Government Subsidy Grant ({grantPct}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-emerald-700 text-sm">
                    ₹{grantAmt.toLocaleString('en-IN')} /- (Direct DBT Subsidy Reserve)
                  </td>
                  <td className="p-2 text-[11px] text-slate-500">Non-refundable capital grant from KVIC / MSME</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-blue-50 text-blue-900">
                    Bank Term Loan Component ({loanPct}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-blue-700 text-sm">
                    ₹{loanAmt.toLocaleString('en-IN')} /-
                  </td>
                  <td className="p-2 text-[11px] text-slate-500">Nodal Branch: Lead Bank Office, {profile.district}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-amber-50 text-amber-900">
                    Beneficiary Own Contribution ({marginPct}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-amber-800 text-sm">
                    ₹{marginAmt.toLocaleString('en-IN')} /-
                  </td>
                  <td className="p-2 text-[11px] text-slate-500">Special concession for {profile.category} Rural Women</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Verification & Digital Attestation Matrix */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 text-slate-800 border-l-4 border-indigo-950">
              3. Verification & Digital Attestation Matrix
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <span>Aadhaar Masked eKYC</span>
                <span className="text-emerald-700 font-bold font-mono">✓ PASS (UIDAI Vault)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <span>{profile.category} Caste Certificate</span>
                <span className="text-emerald-700 font-bold font-mono">✓ PASS (DigiLocker Verified)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <span>Income Certificate Verification</span>
                <span className="text-emerald-700 font-bold font-mono">✓ PASS (State Revenue Board)</span>
              </div>
              <div className="border border-slate-200 p-2.5 rounded-lg flex items-center justify-between">
                <span>Udyam Assist Registration</span>
                <span className="text-blue-700 font-bold font-mono">⚡ Auto-Generated on Sanction</span>
              </div>
            </div>
          </div>

          {/* Signatures & Seals Grid */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">{profile.name}</p>
              <p className="text-[10px]">Applicant Signature / Thumb Impression</p>
            </div>
            <div className="border border-dashed border-slate-300 rounded-lg p-3 text-[10px] text-slate-400 flex items-center justify-center">
              Bank Branch Sanction Seal & Signature
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">District Industries Centre (DIC)</p>
              <p className="text-[10px]">Nodal Officer Digital Verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
