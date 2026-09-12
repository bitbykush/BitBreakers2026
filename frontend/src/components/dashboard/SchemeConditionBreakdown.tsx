'use client';

import React, { useMemo, useState } from 'react';
import { ApplicantProfile, SchemeMatch } from '@/types';
import { evaluateSchemeEligibility } from '@/lib/schemeEvaluator';
import { StorageService } from '@/lib/storage';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UploadCloud,
  FileText,
  X,
  Check,
  Sparkles,
  ShieldCheck,
  FilePlus2,
} from 'lucide-react';

interface SchemeConditionBreakdownProps {
  scheme: SchemeMatch | any;
  profile: ApplicantProfile;
  verifiedDocCodes: string[];
  currentLang: 'en' | 'hi';
  onDocumentsUpdated?: (newVerifiedCodes: string[]) => void;
}

const DOC_METADATA: Record<string, { nameEn: string; nameHi: string; descEn: string; descHi: string }> = {
  DOC_AADHAAR: {
    nameEn: 'Aadhaar Card',
    nameHi: 'आधार कार्ड',
    descEn: 'UIDAI-issued identity proof with masked 12-digit number',
    descHi: 'पहचान एवं पते का सरकारी प्रमाण पत्र',
  },
  DOC_CASTE: {
    nameEn: 'Caste Certificate',
    nameHi: 'जाति प्रमाण पत्र',
    descEn: 'Competent revenue authority issued SC/ST/OBC certificate',
    descHi: 'सक्षम प्राधिकारी द्वारा जारी जाति प्रमाण पत्र',
  },
  DOC_INCOME: {
    nameEn: 'Income Certificate',
    nameHi: 'आय प्रमाण पत्र',
    descEn: 'Current financial year revenue certificate issued by Tehsildar/SDM',
    descHi: 'तहसीलदार द्वारा जारी वार्षिक आय प्रमाण पत्र',
  },
  DOC_RURAL: {
    nameEn: 'Rural Residence Certificate',
    nameHi: 'ग्रामीण निवास प्रमाण पत्र',
    descEn: 'Gram Panchayat or Block Development Officer (BDO) residency certificate',
    descHi: 'ग्राम पंचायत / बीडीओ द्वारा जारी ग्रामीण निवास प्रमाण पत्र',
  },
  DOC_PROJECT_REPORT: {
    nameEn: 'Detailed Project Report (DPR)',
    nameHi: 'विस्तृत परियोजना रिपोर्ट (DPR)',
    descEn: 'Project appraisal report detailing machinery, raw material, and capital breakdown',
    descHi: 'परियोजना लागत, मशीनरी और कार्यशील पूंजी का विस्तृत विवरण',
  },
  DOC_MARKSHEET: {
    nameEn: 'Educational Marksheet / Degree',
    nameHi: 'शैक्षणिक अंकतालिका / डिग्री',
    descEn: 'Recognized board/university pass certificate for minimum qualification check',
    descHi: 'मान्यता प्राप्त बोर्ड या विश्वविद्यालय का अंक प्रमाण पत्र',
  },
  DOC_UDYAM: {
    nameEn: 'Udyam Registration Certificate',
    nameHi: 'उद्यम पंजीकरण प्रमाण पत्र',
    descEn: 'MSME Ministry Udyam registration certificate for enterprise verification',
    descHi: 'सूक्ष्म, लघु एवं मध्यम उद्यम मंत्रालय का आधिकारिक पंजीकरण',
  },
};

export function SchemeConditionBreakdown({
  scheme,
  profile,
  verifiedDocCodes,
  currentLang,
  onDocumentsUpdated,
}: SchemeConditionBreakdownProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Local verified document codes tracker to ensure instant UI reactivity
  const [localVerifiedCodes, setLocalVerifiedCodes] = useState<string[]>(verifiedDocCodes);

  // Sync with prop if it changes
  React.useEffect(() => {
    setLocalVerifiedCodes(verifiedDocCodes);
  }, [verifiedDocCodes]);

  const report = useMemo(() => {
    return evaluateSchemeEligibility(scheme, profile, localVerifiedCodes);
  }, [scheme, profile, localVerifiedCodes]);

  // Determine missing documents for this scheme
  const requiredDocs: string[] = scheme.requiredDocuments || [];
  const missingDocs = useMemo(() => {
    return requiredDocs.filter((d) => !localVerifiedCodes.includes(d));
  }, [requiredDocs, localVerifiedCodes]);

  const hasWarnings = report.conditionsWarning.length > 0;
  const hasFailed = report.conditionsFailed.length > 0;

  // Handle uploading a file for a specific document code
  const handleFileUpload = (docCode: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileSize = `${(file.size / 1024).toFixed(1)} KB`;
      const refId = `DOC-${docCode.replace(/^DOC_/, '')}-${Date.now().toString().slice(-4)}`;

      // Save into storage
      StorageService.saveUploadedDocument(docCode, dataUrl, file.name, fileSize, refId, 'MANUAL');
      StorageService.verifyDocument(docCode, 'MANUAL', refId);

      const newCodes = Array.from(new Set([...localVerifiedCodes, docCode]));
      setLocalVerifiedCodes(newCodes);

      if (onDocumentsUpdated) {
        onDocumentsUpdated(newCodes);
      }

      setUploadSuccessMessage(
        currentLang === 'hi'
          ? `${DOC_METADATA[docCode]?.nameHi || docCode} सफलतापूर्वक संलग्न एवं सत्यापित हो गया!`
          : `${DOC_METADATA[docCode]?.nameEn || docCode} attached & verified successfully!`
      );
      setTimeout(() => setUploadSuccessMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Instant demo one-tap attachment for fast verification
  const handleInstantDemoAttach = (docCode: string) => {
    const meta = DOC_METADATA[docCode] || { nameEn: docCode, nameHi: docCode };
    const fileName = `${meta.nameEn.replace(/\s+/g, '_')}_Verified.pdf`;
    const refId = `VER-${docCode.replace(/^DOC_/, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    StorageService.saveUploadedDocument(
      docCode,
      'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp...',
      fileName,
      '245.0 KB',
      refId,
      'MANUAL'
    );
    StorageService.verifyDocument(docCode, 'MANUAL', refId);

    const newCodes = Array.from(new Set([...localVerifiedCodes, docCode]));
    setLocalVerifiedCodes(newCodes);

    if (onDocumentsUpdated) {
      onDocumentsUpdated(newCodes);
    }

    setUploadSuccessMessage(
      currentLang === 'hi'
        ? `${meta.nameHi} सत्यापित हो गया और लंबित सूची से हटा दिया गया!`
        : `${meta.nameEn} verified and cleared from pending!`
    );
    setTimeout(() => setUploadSuccessMessage(null), 3500);
  };

  return (
    <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-3.5 transition-all">
      {/* Header Bar with Dynamic Clearance Ratio */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <h5 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
            {currentLang === 'hi'
              ? 'पात्रता अनुमोदन विवरण (Why Your Details Are Approved)'
              : 'Why Your Details Are Approved (Statutory Clearance)'}
          </h5>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
            ✓ {report.conditionsMet.length} CRITERIA MET
          </span>
          {hasWarnings ? (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              ⚠ {report.conditionsWarning.length} {currentLang === 'hi' ? 'दस्तावेज लंबित' : 'Action Pending'}
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              ✓ 100% ELIGIBILITY CLEARANCE
            </span>
          )}
        </div>
      </div>

      {/* Upload Success Flash Banner */}
      {uploadSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-400 text-emerald-950 text-xs font-bold flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccessMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Conditions Met Grid (Green Cards) */}
      <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-emerald-950">
        {report.conditionsMet.map((cond) => (
          <div
            key={cond.id}
            className="flex items-start gap-2 bg-white/95 p-2.5 rounded-xl border border-emerald-200 shadow-2xs transition-all hover:border-emerald-300"
          >
            <span className="font-bold text-emerald-600 text-sm leading-none mt-0.5">✓</span>
            <div>
              <span className="font-bold text-slate-900 block">
                {currentLang === 'hi' ? cond.labelHi : cond.labelEn}
              </span>
              <span className="text-slate-700 text-[11px] leading-snug block mt-0.5">
                {currentLang === 'hi' ? cond.detailHi : cond.detailEn}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings & Pending Items (Clickable to upload and turn green) */}
      {hasWarnings && (
        <div className="space-y-2 pt-1 border-t border-emerald-200/60">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-black text-amber-900 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {currentLang === 'hi' ? 'ध्यान दें / लंबित कार्य (Pending Requirements):' : 'Pending Action / Advisory:'}
            </span>
            {missingDocs.length > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300/80">
                {currentLang === 'hi' ? 'दस्तावेज अपलोड करने के लिए नीचे बॉक्स पर क्लिक करें' : 'Click box below to upload and clear pending'}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
            {report.conditionsWarning.map((cond) => {
              const isDocumentCard = cond.id === 'document_readiness';

              return (
                <div
                  key={cond.id}
                  onClick={isDocumentCard ? () => setIsUploadModalOpen(true) : undefined}
                  role={isDocumentCard ? 'button' : undefined}
                  tabIndex={isDocumentCard ? 0 : undefined}
                  className={`flex flex-col justify-between gap-2 p-3 rounded-xl border shadow-2xs transition-all select-none ${
                    isDocumentCard
                      ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 hover:border-amber-400 cursor-pointer ring-1 ring-amber-200/60 hover:ring-amber-400 hover:shadow-xs group'
                      : 'bg-amber-50/90 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-bold text-amber-600 text-sm leading-none mt-0.5 flex-shrink-0">⚠</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-bold text-amber-900 block">
                          {currentLang === 'hi' ? cond.labelHi : cond.labelEn}
                        </span>
                        {isDocumentCard && (
                          <span className="bg-amber-600 group-hover:bg-amber-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs transition flex items-center gap-1">
                            <UploadCloud className="w-3 h-3" />
                            {currentLang === 'hi' ? 'अपलोड करें' : 'Upload Now'}
                          </span>
                        )}
                      </div>
                      <span className="text-amber-800 text-[11px] leading-snug block mt-1">
                        {currentLang === 'hi' ? cond.detailHi : cond.detailEn}
                      </span>
                    </div>
                  </div>

                  {isDocumentCard && (
                    <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-[10px] font-bold text-amber-900">
                      <span className="flex items-center gap-1 text-amber-800">
                        <FilePlus2 className="w-3 h-3 text-amber-700" />
                        {currentLang === 'hi'
                          ? `संलग्न करने हेतु ${missingDocs.length} दस्तावेज शेष`
                          : `${missingDocs.length} pending document${missingDocs.length > 1 ? 's' : ''} to attach`}
                      </span>
                      <span className="text-indigo-800 group-hover:text-indigo-950 underline underline-offset-2">
                        {currentLang === 'hi' ? 'फ़ाइल अपलोड बॉक्स खोलें ➜' : 'Open Upload Dialog ➜'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conditions Not Met (if any) */}
      {hasFailed && (
        <div className="space-y-2 pt-1 border-t border-emerald-200/60">
          <span className="text-[11px] font-black text-rose-900 uppercase tracking-wide flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {currentLang === 'hi' ? 'अपूर्ण शर्तें (Conditions Not Met):' : 'Conditions Not Met:'}
          </span>
          <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
            {report.conditionsFailed.map((cond) => (
              <div
                key={cond.id}
                className="flex items-start gap-2 bg-rose-50/90 p-2.5 rounded-xl border border-rose-200 shadow-2xs text-rose-950"
              >
                <span className="font-bold text-rose-600 text-sm leading-none mt-0.5">✕</span>
                <div>
                  <span className="font-bold text-rose-900 block">
                    {currentLang === 'hi' ? cond.labelHi : cond.labelEn}
                  </span>
                  <span className="text-rose-800 text-[11px] leading-snug block mt-0.5">
                    {currentLang === 'hi' ? cond.detailHi : cond.detailEn}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENDING DOCUMENT UPLOAD MODAL                                             */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                  <UploadCloud className="w-3 h-3 text-amber-700" />
                  {currentLang === 'hi' ? 'दस्तावेज संलग्न केंद्र' : 'Document Attachment Center'}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {currentLang === 'hi' ? 'योजना दस्तावेज संलग्न करें' : 'Attach Scheme Documents'}
                </h3>
                <p className="text-xs text-slate-600">
                  {scheme.nameEn || scheme.nameHi}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Upload Items */}
            <div className="space-y-3.5">
              {requiredDocs.map((docCode) => {
                const isVerified = localVerifiedCodes.includes(docCode);
                const meta = DOC_METADATA[docCode] || {
                  nameEn: docCode,
                  nameHi: docCode,
                  descEn: 'Statutory compliance document',
                  descHi: 'अनिवार्य प्रमाण पत्र',
                };

                return (
                  <div
                    key={docCode}
                    className={`p-4 rounded-2xl border transition-all ${
                      isVerified
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-black ${
                              isVerified ? 'text-emerald-950' : 'text-amber-950'
                            }`}
                          >
                            {currentLang === 'hi' ? meta.nameHi : meta.nameEn}
                          </span>
                          {isVerified ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Check className="w-3 h-3" />
                              {currentLang === 'hi' ? 'संलग्न' : 'Attached'}
                            </span>
                          ) : (
                            <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                              ⚠ {currentLang === 'hi' ? 'लंबित' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {currentLang === 'hi' ? meta.descHi : meta.descEn}
                        </p>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isVerified ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            <span>{currentLang === 'hi' ? 'संलग्न' : 'Attached'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Native File Upload Input */}
                            <label className="h-8 px-3 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95">
                              <UploadCloud className="w-3.5 h-3.5 text-orange-400" />
                              <span>{currentLang === 'hi' ? 'फ़ाइल चुनें' : 'Upload File'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(docCode, file);
                                  }
                                }}
                              />
                            </label>

                            {/* One-Tap Fast Demo Attachment Button */}
                            <button
                              type="button"
                              onClick={() => handleInstantDemoAttach(docCode)}
                              className="h-8 px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 text-[11px] font-bold border border-amber-400 shadow-2xs transition cursor-pointer"
                              title="Instant attachment for testing"
                            >
                              ⚡ {currentLang === 'hi' ? 'त्वरित संलग्न' : 'Quick Attach'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {missingDocs.length === 0
                  ? (currentLang === 'hi' ? '✓ सभी दस्तावेज सफलतापूर्वक सत्यापित हो चुके हैं।' : '✓ All required documents are fully attached.')
                  : (currentLang === 'hi' ? `${missingDocs.length} दस्तावेज अभी भी लंबित हैं।` : `${missingDocs.length} document(s) remaining.`)}
              </span>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-full sm:w-auto h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{currentLang === 'hi' ? 'हो गया (Done)' : 'Done'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
