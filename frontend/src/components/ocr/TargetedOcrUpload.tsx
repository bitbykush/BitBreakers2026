'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  FileCheck,
  Banknote,
  GraduationCap,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { OcrDocType, OcrExtractedData } from '@/types';
import { ApiService } from '@/lib/api';
import { useAccessibility } from '@/context/AccessibilityContext';

interface TargetedOcrUploadProps {
  currentLang: 'en' | 'hi';
  onExtractSuccess: (data: OcrExtractedData) => void;
}

type UploadStatus = 'idle' | 'scanning' | 'verifying' | 'needs_permission' | 'verified' | 'unverified';

export const TargetedOcrUpload: React.FC<TargetedOcrUploadProps> = ({
  currentLang,
  onExtractSuccess,
}) => {
  const { speakText, talkBackActive } = useAccessibility();
  const [activeDocType, setActiveDocType] = useState<OcrDocType>('AADHAAR');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [unverifiedMessage, setUnverifiedMessage] = useState<string>('');
  const [extractedData, setExtractedData] = useState<OcrExtractedData | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingResult, setPendingResult] = useState<OcrExtractedData | null>(null);
  const [permissionPromptMessage, setPermissionPromptMessage] = useState<string>('');

  const docTabs: { type: OcrDocType; nameEn: string; nameHi: string; icon: React.ReactNode }[] = [
    { type: 'AADHAAR', nameEn: 'Aadhaar Card', nameHi: 'आधार कार्ड', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { type: 'CASTE', nameEn: 'Caste Certificate', nameHi: 'जाति प्रमाण पत्र', icon: <FileCheck className="w-3.5 h-3.5" /> },
    { type: 'INCOME', nameEn: 'Income Certificate', nameHi: 'आय प्रमाण पत्र', icon: <Banknote className="w-3.5 h-3.5" /> },
    { type: 'MARKSHEET', nameEn: 'Marksheet / Degree', nameHi: 'अंकतालिका / डिग्री', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  const hasEssentialFields = (data: OcrExtractedData): boolean => {
    if (data.doc_type === 'AADHAAR') {
      return Boolean(data.name || data.masked_aadhaar);
    }
    if (data.doc_type === 'CASTE') {
      return Boolean(data.category || data.certificate_number);
    }
    if (data.doc_type === 'INCOME') {
      return Boolean(data.annual_income || data.certificate_number);
    }
    if (data.doc_type === 'MARKSHEET') {
      return Boolean(data.marks_percentage || data.highest_education);
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setSelectedFileNames(files.map((f) => f.name));
    setUploadStatus('scanning');
    setExtractedData(null);
    setPendingResult(null);

    if (talkBackActive) {
      speakText(
        currentLang === 'hi'
          ? 'दस्तावेज़ स्कैन हो रहा है, कृपया प्रतीक्षा करें।'
          : 'Scanning document locally with RapidOCR, please wait.'
      );
    }

    try {
      // Step 1: Run local extraction
      const result = await ApiService.extractTargetedOcr(files, activeDocType, 'AUTO', false);

      // Transition to explicit verification step
      setUploadStatus('verifying');

      // Check if permission required for cloud fallback
      if (result.needs_permission) {
        setPendingFiles(files);
        setPendingResult(result);
        setUploadStatus('needs_permission');
        const promptMsg =
          result.prompt_message ||
          (currentLang === 'hi'
            ? `दस्तावेज़ की स्पष्टता कम (${result.confidence}%) है। क्या आप उच्च सटीकता के लिए Google Gemini Cloud AI का उपयोग करना चाहते हैं?`
            : `Local OCR scan had low confidence (${result.confidence}%). Would you like to use Google Gemini Cloud AI for high-accuracy extraction?`);
        setPermissionPromptMessage(promptMsg);
        if (talkBackActive) {
          speakText(promptMsg, true);
        }
        return;
      }

      // Check if verification succeeded
      const isValid = result.is_verified !== false && hasEssentialFields(result) && result.confidence >= 40;

      if (isValid) {
        setUploadStatus('verified');
        setExtractedData(result);
        onExtractSuccess(result);
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? `दस्तावेज़ सत्यापित हुआ। ${result.name ? 'नाम: ' + result.name : ''}`
              : `Document verified successfully. ${result.name ? 'Name: ' + result.name : ''}`
          );
        }
      } else {
        setUploadStatus('unverified');
        setPendingFiles(files);
        setPendingResult(result);
        setUnverifiedMessage(
          result.error_message ||
            (currentLang === 'hi'
              ? 'दस्तावेज़ से स्पष्ट विवरण नहीं पढ़े जा सके। कृपया एक साफ़ फोटो अपलोड करें या नीचे फ़ॉर्म में जानकारी टाइप करें।'
              : 'Could not extract verifiable information from the document. Please upload a clear, legible photo or enter details manually below.')
        );
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? 'दस्तावेज़ सत्यापित नहीं हो सका। कृपया पुनः प्रयास करें।'
              : 'Document could not be verified. Please try again with a clearer image.'
          );
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setUploadStatus('unverified');
      setUnverifiedMessage(
        currentLang === 'hi'
          ? 'स्कैन प्रक्रिया में तकनीकी समस्या आई। कृपया पुनः प्रयास करें।'
          : 'Technical error during document scan. Please try again.'
      );
      if (talkBackActive) {
        speakText(
          currentLang === 'hi'
            ? 'दस्तावेज़ स्कैन करने में त्रुटि हुई।'
            : 'Error occurred while scanning document.'
        );
      }
    } finally {
      e.target.value = '';
    }
  };

  const handleAcceptGemini = async () => {
    if (pendingFiles.length === 0) return;
    setUploadStatus('scanning');

    if (talkBackActive) {
      speakText(
        currentLang === 'hi'
          ? 'Google Gemini Cloud AI द्वारा उच्च सटीकता स्कैन किया जा रहा है।'
          : 'Scanning with Google Gemini Cloud AI for high-accuracy extraction.'
      );
    }

    try {
      const result = await ApiService.extractTargetedOcr(pendingFiles, activeDocType, 'AUTO', true);
      setUploadStatus('verifying');

      const isValid = result.is_verified !== false && hasEssentialFields(result);

      if (isValid) {
        setUploadStatus('verified');
        setExtractedData(result);
        onExtractSuccess(result);
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? `Gemini AI द्वारा दस्तावेज़ सत्यापित हुआ। ${result.name ? 'नाम: ' + result.name : ''}`
              : `Document verified with Gemini Cloud AI. ${result.name ? 'Name: ' + result.name : ''}`
          );
        }
      } else {
        setUploadStatus('unverified');
        setUnverifiedMessage(
          currentLang === 'hi'
            ? 'Cloud AI भी आवश्यक विवरण नहीं पढ़ सका। कृपया साफ़ दस्तावेज़ अपलोड करें।'
            : 'Cloud AI could not read required details clearly. Please upload a clearer document.'
        );
      }
    } catch (err) {
      console.error('Gemini Fallback Error:', err);
      setUploadStatus('unverified');
      setUnverifiedMessage(
        currentLang === 'hi' ? 'Cloud AI स्कैन में समस्या आई।' : 'Error occurred during Cloud AI extraction.'
      );
    }
  };

  const handleDeclineGemini = () => {
    if (pendingResult && hasEssentialFields(pendingResult)) {
      setUploadStatus('verified');
      setExtractedData(pendingResult);
      onExtractSuccess(pendingResult);
      if (talkBackActive) {
        speakText(
          currentLang === 'hi'
            ? 'स्थानीय स्कैन डेटा का उपयोग किया जा रहा है।'
            : 'Using local scan data.'
        );
      }
    } else {
      setUploadStatus('unverified');
      setUnverifiedMessage(
        currentLang === 'hi'
          ? 'दस्तावेज़ सत्यापित नहीं हुआ। कृपया मैन्युअल विवरण भरें।'
          : 'Document was not verified. Please fill details manually below.'
      );
    }
  };

  const handleResetUpload = () => {
    setUploadStatus('idle');
    setExtractedData(null);
    setSelectedFileNames([]);
    setPendingFiles([]);
    setPendingResult(null);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-indigo-950 text-base">
            {currentLang === 'hi'
              ? 'सरकारी दस्तावेज़ से स्वतः जानकारी भरें'
              : 'Auto-Fill from Official Documents'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLang === 'hi'
              ? 'प्रमाण पत्र या पहचान पत्र का फोटो अपलोड करें — सत्यापन के बाद ही विवरण भरे जाएंगे'
              : 'Upload certificate or ID photo — verified locally with UIDAI masking before auto-filling'}
          </p>
        </div>
      </div>

      {/* Scoped Document Tabs (User-Centric Sizing) */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100" role="tablist" aria-label="Document Type Selection">
        {docTabs.map((tab) => {
          const isActive = activeDocType === tab.type;
          const label = currentLang === 'hi' ? tab.nameHi : tab.nameEn;
          return (
            <button
              key={tab.type}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => {
                setActiveDocType(tab.type);
                handleResetUpload();
                if (talkBackActive) {
                  speakText(currentLang === 'hi' ? `${tab.nameHi} चुना गया` : `${tab.nameEn} selected`);
                }
              }}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-indigo-950 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Zone / Verification Card */}
      {uploadStatus === 'idle' && (
        <div className="border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 sm:p-5 text-center bg-slate-50/70 hover:bg-indigo-50/30 transition-all cursor-pointer relative group">
          <input
            type="file"
            accept="image/*"
            multiple={activeDocType === 'AADHAAR'}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleFileUpload}
            aria-label="Upload document image"
          />

          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="font-bold text-slate-900 text-sm">
                {activeDocType === 'AADHAAR'
                  ? currentLang === 'hi'
                    ? 'आधार कार्ड फ़ोटो चुनें (आगे और पीछे का फ़ोटो)'
                    : 'Select Aadhaar Photo (Front & Back supported)'
                  : currentLang === 'hi'
                  ? `${docTabs.find((d) => d.type === activeDocType)?.nameHi} की फ़ोटो चुनें`
                  : `Select photo of ${docTabs.find((d) => d.type === activeDocType)?.nameEn}`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PNG, JPG or WEBP • Auto-downscaled for secure local privacy
              </p>
            </div>

            <span className="mt-1 h-8 px-3.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 pointer-events-none">
              <Upload className="w-3.5 h-3.5" />
              <span>{currentLang === 'hi' ? 'फ़ोटो चुनें या यहाँ खींचें' : 'Choose Photo or Drag Here'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Scanning State */}
      {uploadStatus === 'scanning' && (
        <div className="border border-indigo-200 rounded-xl p-4 text-center bg-indigo-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="font-bold text-sm text-indigo-950">
            {currentLang === 'hi'
              ? 'दस्तावेज़ का विश्लेषण हो रहा है...'
              : 'Scanning Document with Local RapidOCR...'}
          </p>
          <span className="text-xs text-slate-500">
            {selectedFileNames.length > 0 ? selectedFileNames.join(', ') : 'Processing image buffer'}
          </span>
        </div>
      )}

      {/* Verifying State */}
      {uploadStatus === 'verifying' && (
        <div className="border border-amber-200 rounded-xl p-4 text-center bg-amber-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <p className="font-bold text-sm text-amber-950">
            {currentLang === 'hi'
              ? 'विवरण का सत्यापन किया जा रहा है...'
              : 'Verifying Document Authenticity & Fields...'}
          </p>
          <span className="text-xs text-slate-500">
            Checking UIDAI pattern, certificate authenticity, and confidence score
          </span>
        </div>
      )}

      {/* Cloud AI Consent State (Waiting for user decision) */}
      {uploadStatus === 'needs_permission' && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                <span>{currentLang === 'hi' ? 'क्लाउड एआई उपयोग की अनुमति' : 'Cloud AI Permission Required'}</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono">
                  Gemini 1.5 Flash
                </span>
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                {permissionPromptMessage}
              </p>
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <span>🔒</span>
                <span>
                  {currentLang === 'hi'
                    ? 'आपकी अनुमति के बिना कोई भी दस्तावेज़ बाहरी सर्वर पर नहीं भेजा जाता।'
                    : 'Privacy Safeguard: No document data is sent externally without your explicit confirmation.'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleDeclineGemini}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              {currentLang === 'hi' ? 'नहीं, स्थानीय डेटा रखें' : 'No, Keep Local Data'}
            </button>
            <button
              type="button"
              onClick={handleAcceptGemini}
              className="h-8 px-3.5 rounded-lg text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-white transition shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              <span>{currentLang === 'hi' ? 'हाँ, Gemini AI से जांचें' : 'Yes, Verify with Gemini AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Unverified / Error State (Truthful feedback without false success) */}
      {uploadStatus === 'unverified' && (
        <div className="border border-rose-200 bg-rose-50/60 rounded-xl p-4 space-y-2.5 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-rose-950">
                {currentLang === 'hi' ? 'दस्तावेज़ सत्यापन अधूरा रहा' : 'Document Verification Incomplete'}
              </p>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                {unverifiedMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60">
            <button
              type="button"
              onClick={handleResetUpload}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{currentLang === 'hi' ? 'दूसरा फोटो अपलोड करें' : 'Try Another Photo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Verified Success State (ONLY shown when actually verified) */}
      {uploadStatus === 'verified' && extractedData && (
        <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <div>
                <p className="font-bold text-sm text-emerald-950">
                  {currentLang === 'hi' ? 'दस्तावेज़ सफलतापूर्वक सत्यापित हुआ!' : 'Document Verified & Parsed!'}
                </p>
                <p className="text-[11px] text-emerald-800">
                  {currentLang === 'hi'
                    ? 'विवरण नीचे फ़ॉर्म में भर दिए गए हैं।'
                    : 'Details successfully verified and populated in the form below.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetUpload}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition self-start sm:self-auto cursor-pointer"
            >
              {currentLang === 'hi' ? 'नया दस्तावेज़ अपलोड करें' : 'Upload Another'}
            </button>
          </div>

          {/* Extracted Details Pill */}
          <div className="bg-white/80 border border-emerald-200 rounded-lg p-2.5 flex flex-wrap items-center gap-1.5 text-xs text-emerald-950">
            <span className="font-bold text-emerald-900">
              {extractedData.doc_type === 'AADHAAR' && 'Aadhaar:'}
              {extractedData.doc_type === 'CASTE' && 'Caste:'}
              {extractedData.doc_type === 'INCOME' && 'Income:'}
              {extractedData.doc_type === 'MARKSHEET' && 'Merit:'}
            </span>

            {extractedData.name && (
              <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {extractedData.name}
              </span>
            )}

            {extractedData.masked_aadhaar && (
              <span className="font-mono font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {extractedData.masked_aadhaar}
              </span>
            )}

            {extractedData.district && (
              <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                Dist: {extractedData.district}
              </span>
            )}

            {extractedData.category && (
              <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {extractedData.category}
              </span>
            )}

              {(extractedData.marks_percentage !== undefined && extractedData.marks_percentage !== null || extractedData.highest_education) && (
                <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                  {extractedData.highest_education ? `${extractedData.highest_education} Pass ` : ''}
                  {extractedData.marks_percentage !== undefined && extractedData.marks_percentage !== null ? `(${extractedData.marks_percentage}%)` : ''}
                </span>
              )}

            <span className="text-emerald-700 ml-auto text-[11px] font-medium">
              Confidence: {extractedData.confidence}% • {extractedData.engine}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

