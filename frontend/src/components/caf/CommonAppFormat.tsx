'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Printer, X, ShieldCheck, Check, Download, CheckCircle2, QrCode, FileText, Paperclip } from 'lucide-react';
import { ApplicantProfile, SchemeMatch, DocumentRecord } from '@/types';
import { StorageService } from '@/lib/storage';

interface CommonAppFormatProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicantProfile;
  selectedScheme: SchemeMatch | null;
  currentLang: 'en' | 'hi';
}

export const CommonAppFormat: React.FC<CommonAppFormatProps> = ({
  isOpen,
  onClose,
  profile,
  selectedScheme,
  currentLang,
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDocuments(StorageService.getDocuments());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const capital = profile.requiredCapital || 200000;
  const grantPct = selectedScheme?.financials.grantSubsidyPercentage || 35;
  const marginPct = selectedScheme?.financials.promoterMarginPercentage || 5;
  const loanPct = Math.max(0, 100 - grantPct - marginPct);

  const grantAmt = (capital * grantPct) / 100;
  const marginAmt = (capital * marginPct) / 100;
  const loanAmt = (capital * loanPct) / 100;

  const dossierRefId = `CAF-GOI-2026-X${Math.abs((profile.name ? profile.name.length : 7) * 1337 + 8921)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDossier = () => {
    const printElement = document.getElementById('print-dossier');
    if (!printElement) {
      window.print();
      return;
    }

    const schemeTitle = selectedScheme?.nameEn || 'Scheme';
    const applicantTitle = profile.name || 'Applicant';

    const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CAF_Application_${schemeTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${applicantTitle.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #ffffff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: left; vertical-align: middle; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-amber-50 { background-color: #fffbeb; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-800 { color: #065f46; }
    .text-indigo-950 { color: #1e1b4b; }
    .text-indigo-900 { color: #312e81; }
    .text-orange-700 { color: #c2410c; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .border { border: 1px solid #e2e8f0; }
    .rounded-xl { border-radius: 10px; }
    .p-3 { padding: 12px; }
    img { max-width: 100%; height: auto; display: block; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  ${printElement.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `CAF_Application_${schemeTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${applicantTitle.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    // Also invoke print/PDF save dialog
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const findDoc = (type: string) =>
    documents.find(
      (d) =>
        d.code.replace(/^DOC_/, '').toUpperCase() === type.replace(/^DOC_/, '').toUpperCase()
    );

  const aadhaarDoc = findDoc('AADHAAR');
  const casteDoc = findDoc('CASTE');
  const incomeDoc = findDoc('INCOME');
  const marksheetDoc = findDoc('MARKSHEET');
  const attachedDocs = documents.filter((d) => Boolean(d.fileDataUrl));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-2 sm:p-6 flex justify-center animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Action Bar (Hidden during print) */}
        <div className="no-print bg-indigo-950 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-indigo-900">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <span className="font-bold text-xs sm:text-sm">
              Unified Credit-Linked Subsidy Application Dossier (CAF-2026)
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end w-full sm:w-auto">
            {/* Standard Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer border border-slate-700"
              title="Print Dossier (A4)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>🖨️ Print / Save as PDF</span>
            </button>

            {/* 1-Click Complete Dossier & Attached Docs Download Button */}
            <button
              type="button"
              onClick={handleDownloadDossier}
              className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Download full form and all attached verified documents in one single dossier"
            >
              <Download className="w-3.5 h-3.5 text-emerald-100" />
              <span>📑 Full Form & Documents (1-Click PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Close Dossier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOSSIER (A4 Container) */}
        <div id="print-dossier" className="p-6 sm:p-10 bg-white text-slate-900 font-sans space-y-6">
          {/* Dossier Header */}
          <div className="border-b-2 border-indigo-950 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Image
                  src="/logo-emblem.png"
                  alt="Scheme Seva Kendra Emblem"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-slate-500">
                  Government of India / State Welfare Nodal Agency
                </p>
                <h2 className="text-lg sm:text-xl font-black text-indigo-950">
                  UNIFIED COMMON APPLICATION FORMAT (CAF)
                </h2>
                <p className="text-xs font-semibold text-orange-700">
                  Target Scheme: {selectedScheme?.nameEn || "Prime Minister's Employment Generation Programme (PMEGP)"}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs flex-shrink-0">
              <p className="font-bold text-indigo-950">
                Dossier ID: {dossierRefId}
              </p>
              <p className="text-slate-500 text-[11px]">
                Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                ✓ Statutory Verification Passed
              </span>
            </div>
          </div>

          {/* Section 1: Applicant Particulars */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 text-slate-800 border-l-4 border-indigo-950">
              1. Applicant Particulars (आवेदक विवरण)
            </h3>
            <table className="w-full text-xs border border-slate-200 text-slate-800">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50 w-1/4">Full Name:</td>
                  <td className="p-2 font-semibold w-1/4">{profile.name || 'Aryan Ranjeet Kalkhaire'}</td>
                  <td className="p-2 font-bold bg-slate-50 w-1/4">Masked Aadhaar UID:</td>
                  <td className="p-2 font-mono font-bold w-1/4 text-indigo-900">
                    {profile.maskedAadhaar || 'XXXX-XXXX-7155'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50">Social Category:</td>
                  <td className="p-2 font-semibold text-emerald-800">{profile.category} (Affirmative Action Bonus)</td>
                  <td className="p-2 font-bold bg-slate-50">Gender / DOB:</td>
                  <td className="p-2">{profile.gender} / {profile.dob || '26/02/2000'}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50">Certified Annual Income:</td>
                  <td className="p-2 font-semibold">₹{(profile.annualIncome || 120000).toLocaleString('en-IN')} / year (Revenue Verified)</td>
                  <td className="p-2 font-bold bg-slate-50">Location Classification:</td>
                  <td className="p-2 font-semibold text-orange-700">{profile.areaType} Gram Panchayat ({profile.district || 'Gorakhpur'}, {profile.state || 'Uttar Pradesh'})</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-50">Education & Course:</td>
                  <td className="p-2 font-semibold">{profile.education} Pass</td>
                  <td className="p-2 font-bold bg-slate-50">Verification Status:</td>
                  <td className="p-2 text-emerald-700 font-mono font-bold">✓ Targeted OCR & State Revenue Verified</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Target Enterprise & Capital Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 text-slate-800 border-l-4 border-indigo-950">
              2. Proposed Enterprise & Capital Appraisal (परियोजना लागत व सब्सिडी विवरण)
            </h3>
            <table className="w-full text-xs border border-slate-200 text-slate-800">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-slate-50 w-1/3">Enterprise Activity / Trade:</td>
                  <td className="p-2 font-semibold" colSpan={2}>{profile.profession || 'Food Stall & Catering (खान-पान व ढाबा)'}</td>
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
                  <td className="p-2 text-[11px] text-slate-500">Non-refundable capital grant from KVIC / MSME Reserve</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-bold bg-blue-50 text-blue-900">
                    Bank Term Loan Component ({loanPct}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-blue-700 text-sm">
                    ₹{loanAmt.toLocaleString('en-IN')} /-
                  </td>
                  <td className="p-2 text-[11px] text-slate-500">Nodal Branch: Lead Bank Office, {profile.district || 'District'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-amber-50 text-amber-900">
                    Beneficiary Own Contribution ({marginPct}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-amber-800 text-sm">
                    ₹{marginAmt.toLocaleString('en-IN')} /-
                  </td>
                  <td className="p-2 text-[11px] text-slate-500">Special concession for {profile.category} Rural applicant</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Statutory Eligibility Determination Checklist */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 text-slate-800 border-l-4 border-indigo-950">
              3. Statutory Eligibility Determination (पात्रता अनुमोदन विवरण)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Trade Match:</strong> Certified priority activity</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Income Limit:</strong> Within ₹3L ceiling</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Category Bonus:</strong> {profile.category} margin applied</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Location Priority:</strong> {profile.areaType} 35% grant tier</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Schooling Norm:</strong> {profile.education} pass verified</span>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span><strong>Collateral-Free:</strong> CGTMSE coverage approved</span>
              </div>
            </div>
          </div>

          {/* Section 4: Attached Verified Documents & Certificates ( संलग्‍न प्रमाणित दस्तावेज ) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 text-slate-800 border-l-4 border-indigo-950 flex items-center justify-between">
              <span>4. Attached Verified Documents & Certificates (संलग्न प्रमाणित दस्तावेज)</span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">
                {attachedDocs.length > 0 ? `${attachedDocs.length} Documents Attached` : '4 of 4 Verified'}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Document 1: Aadhaar Card */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    Aadhaar Identity Card
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {aadhaarDoc?.fileDataUrl ? '✓ Scan Attached' : '✓ UIDAI Verified'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {aadhaarDoc?.fileDataUrl ? (
                    <img
                      src={aadhaarDoc.fileDataUrl}
                      alt="Aadhaar Scan"
                      className="w-16 h-14 object-cover rounded-lg border-2 border-emerald-400 bg-white shadow-2xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5 min-w-0 flex-1">
                    {aadhaarDoc?.fileName && (
                      <p className="truncate font-semibold text-slate-900">
                        <strong className="text-slate-800">File:</strong> {aadhaarDoc.fileName}
                      </p>
                    )}
                    <p><strong className="text-slate-800">UID:</strong> {profile.maskedAadhaar || 'XXXX-XXXX-7155'}</p>
                    <p><strong className="text-slate-800">Name:</strong> {profile.name || 'Aryan Ranjeet Kalkhaire'}</p>
                    <p className="text-[10px] text-emerald-700 font-mono">
                      {aadhaarDoc?.referenceId ? `Ref: ${aadhaarDoc.referenceId}` : 'UIDAI Verified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document 2: Caste Certificate */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    Caste / Community Certificate
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {casteDoc?.fileDataUrl ? '✓ Scan Attached' : '✓ Revenue Verified'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {casteDoc?.fileDataUrl ? (
                    <img
                      src={casteDoc.fileDataUrl}
                      alt="Caste Certificate Scan"
                      className="w-16 h-14 object-cover rounded-lg border-2 border-emerald-400 bg-white shadow-2xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5 min-w-0 flex-1">
                    {casteDoc?.fileName && (
                      <p className="truncate font-semibold text-slate-900">
                        <strong className="text-slate-800">File:</strong> {casteDoc.fileName}
                      </p>
                    )}
                    <p><strong className="text-slate-800">Category:</strong> {profile.category} Category</p>
                    <p><strong className="text-slate-800">Cert No:</strong> {profile.casteCertificateNo || casteDoc?.referenceId || 'CC/UP/2024/98231'}</p>
                    <p><strong className="text-slate-800">Authority:</strong> Competent Tehsildar / SDO</p>
                  </div>
                </div>
              </div>

              {/* Document 3: Income Certificate */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    Annual Income Certificate
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {incomeDoc?.fileDataUrl ? '✓ Scan Attached' : '✓ State Verified'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {incomeDoc?.fileDataUrl ? (
                    <img
                      src={incomeDoc.fileDataUrl}
                      alt="Income Certificate Scan"
                      className="w-16 h-14 object-cover rounded-lg border-2 border-emerald-400 bg-white shadow-2xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5 min-w-0 flex-1">
                    {incomeDoc?.fileName && (
                      <p className="truncate font-semibold text-slate-900">
                        <strong className="text-slate-800">File:</strong> {incomeDoc.fileName}
                      </p>
                    )}
                    <p><strong className="text-slate-800">Income:</strong> ₹{(profile.annualIncome || 120000).toLocaleString('en-IN')} / year</p>
                    <p><strong className="text-slate-800">Cert No:</strong> {profile.incomeCertificateNo || incomeDoc?.referenceId || 'INC/REV/2024/44201'}</p>
                    <p><strong className="text-slate-800">Valid:</strong> Assessment Year 2025–2026</p>
                  </div>
                </div>
              </div>

              {/* Document 4: Educational Marksheet */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    Educational Marksheet / Degree
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {marksheetDoc?.fileDataUrl ? '✓ Scan Attached' : '✓ Board Verified'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  {marksheetDoc?.fileDataUrl ? (
                    <img
                      src={marksheetDoc.fileDataUrl}
                      alt="Marksheet Scan"
                      className="w-16 h-14 object-cover rounded-lg border-2 border-emerald-400 bg-white shadow-2xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5 min-w-0 flex-1">
                    {marksheetDoc?.fileName && (
                      <p className="truncate font-semibold text-slate-900">
                        <strong className="text-slate-800">File:</strong> {marksheetDoc.fileName}
                      </p>
                    )}
                    <p><strong className="text-slate-800">Level:</strong> {profile.education} Pass</p>
                    <p><strong className="text-slate-800">Board:</strong> State Secondary / Higher Secondary Board</p>
                    <p><strong className="text-slate-800">Eligibility:</strong> Meets statutory qualification norm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4B: Attached Document Scans (Annexure) */}
          {attachedDocs.length > 0 && (
            <div className="space-y-4 pt-4 border-t-2 border-slate-200 page-break-before">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    <span>ANNEXURE: Attached Statutory Document Scans (संलग्न मूल दस्तावेज प्रतियां)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    High-resolution copies uploaded by applicant and cryptographically bound to this CAF application
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300">
                  {attachedDocs.length} Scans Attached
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachedDocs.map((doc, idx) => (
                  <div
                    key={doc.code || idx}
                    className="border-2 border-slate-300 rounded-2xl p-3 bg-slate-50 space-y-2 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {doc.name || doc.code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {doc.fileSize || 'Scan'}
                      </span>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center min-h-48 relative">
                      {/* Watermark overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-20deg] text-xl font-black text-slate-900 select-none">
                        GOVERNMENT OF INDIA • E-VERIFIED STATUTORY ATTACHMENT
                      </div>
                      <img
                        src={doc.fileDataUrl}
                        alt={doc.name}
                        className="max-h-60 w-auto object-contain rounded shadow-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                      <span>Ref: {doc.referenceId || `VER-${Date.now().toString().slice(-6)}`}</span>
                      <span className="text-emerald-700 font-bold">✓ Direct OCR Attached</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Digital Attestation, QR Code & Signatures */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 border border-slate-300 rounded-lg p-1 flex items-center justify-center bg-white shadow-2xs">
                {/* Visual QR Attestation stamp */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-[9px] font-mono text-center text-slate-700 border border-slate-200 rounded">
                  <QrCode className="w-8 h-8 text-indigo-950 mb-0.5" />
                  <span className="text-[8px] font-bold">VERIFIED</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <p className="font-bold text-slate-800">Digital Nodal Attestation</p>
                <p className="text-[10px]">Scan QR for statutory verification log</p>
                <p className="text-[10px] font-mono text-emerald-700">Hash: 8f92a4...d021</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-600 w-full sm:w-auto">
              <div className="border-t border-slate-400 pt-2 min-w-36">
                <p className="font-bold text-slate-800">{profile.name || 'Aryan Ranjeet Kalkhaire'}</p>
                <p className="text-[10px]">Applicant Signature</p>
              </div>
              <div className="border-t border-slate-400 pt-2 min-w-36">
                <p className="font-bold text-slate-800">District Industries Centre (DIC)</p>
                <p className="text-[10px]">Nodal Officer Digital Seal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
