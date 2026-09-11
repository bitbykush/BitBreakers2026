'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  FileCheck,
  Banknote,
  GraduationCap,
  Upload,
  Lock,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { OcrDocType, OcrExtractedData } from '@/types';
import { ApiService } from '@/lib/api';

interface TargetedOcrUploadProps {
  currentLang: 'en' | 'hi';
  onExtractSuccess: (data: OcrExtractedData) => void;
}

export const TargetedOcrUpload: React.FC<TargetedOcrUploadProps> = ({
  currentLang,
  onExtractSuccess,
}) => {
  const [activeDocType, setActiveDocType] = useState<OcrDocType>('AADHAAR');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<OcrExtractedData | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionPromptMessage, setPermissionPromptMessage] = useState<string>('');

  const docTabs: { type: OcrDocType; nameEn: string; nameHi: string; icon: React.ReactNode }[] = [
    { type: 'AADHAAR', nameEn: 'Aadhaar Card', nameHi: 'आधार कार्ड', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { type: 'CASTE', nameEn: 'Caste Certificate', nameHi: 'जाति प्रमाण पत्र', icon: <FileCheck className="w-3.5 h-3.5" /> },
    { type: 'INCOME', nameEn: 'Income Certificate', nameHi: 'आय प्रमाण पत्र', icon: <Banknote className="w-3.5 h-3.5" /> },
    { type: 'MARKSHEET', nameEn: 'Marksheet / Degree', nameHi: 'अंकतालिका / डिग्री', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsLoading(true);
    setShowPermissionPrompt(false);

    try {
      // Step 1: Execute with allow_gemini_fallback=false (requires explicit consent if confidence is low)
      const result = await ApiService.extractTargetedOcr(files, activeDocType, 'AUTO', false);
      setExtractedData(result);

      if (result.needs_permission) {
        setPendingFiles(files);
        setShowPermissionPrompt(true);
        setPermissionPromptMessage(
          result.prompt_message ||
            (currentLang === 'hi'
              ? `दस्तावेज़ की स्पष्टता कम (${result.confidence}%) है। क्या आप उच्च सटीकता के लिए Google Gemini Cloud AI का उपयोग करना चाहते हैं?`
              : `Local OCR scan had low confidence (${result.confidence}%). Would you like to use Google Gemini Cloud AI for high-accuracy extraction?`)
        );
      } else {
        onExtractSuccess(result);
      }
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsLoading(false);
      // Reset input value so same files can be re-selected if necessary
      e.target.value = '';
    }
  };

  const handleAcceptGemini = async () => {
    if (pendingFiles.length === 0) return;
    setIsLoading(true);
    setShowPermissionPrompt(false);
    try {
      // Step 2: User explicitly gave permission in the prompt -> execute Gemini fallback!
      const result = await ApiService.extractTargetedOcr(pendingFiles, activeDocType, 'AUTO', true);
      setExtractedData(result);
      onExtractSuccess(result);
    } catch (err) {
      console.error('Gemini Fallback Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineGemini = () => {
    setShowPermissionPrompt(false);
    if (extractedData) {
      onExtractSuccess(extractedData);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-xs font-bold">
              Fast-Fill OCR
            </span>
            <h3 className="font-bold text-indigo-950 text-lg">
              {currentLang === 'hi'
                ? 'सरकारी दस्तावेज़ से स्वतः जानकारी भरें'
                : 'Auto-Fill from Official Documents'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLang === 'hi'
              ? 'प्रमाण पत्र या पहचान पत्र का फोटो अपलोड करें — हमारा AI स्थानीय स्तर पर सुरक्षित विवरण पढ़ेगा'
              : 'Upload a photo of your certificate or ID — our AI reads it locally with masked privacy'}
          </p>
        </div>

        <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 self-start">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          UIDAI 12-Digit Aadhaar Masking Guarantee
        </span>
      </div>

      {/* Scoped Document Tabs */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        {docTabs.map((tab) => {
          const isActive = activeDocType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => {
                setActiveDocType(tab.type);
                setShowPermissionPrompt(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              <span>{currentLang === 'hi' ? tab.nameHi : tab.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Dropzone (Click opens native file explorer; no artificial mock prefill) */}
      <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-indigo-50/30 transition-all cursor-pointer relative">
        <input
          type="file"
          accept="image/*"
          multiple={activeDocType === 'AADHAAR'}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={handleFileUpload}
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-indigo-700">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            <p className="font-bold text-sm">
              {currentLang === 'hi'
                ? 'RapidOCR ONNX से दस्तावेज़ का विश्लेषण हो रहा है...'
                : 'Locally Parsing Document with RapidOCR & Masking UIDAI Aadhaar...'}
            </p>
            <span className="text-xs text-slate-500">Processing on local lightweight runtime (&lt; 280MB RAM)</span>
          </div>
        ) : extractedData ? (
          <div className="flex flex-col items-center justify-center gap-2 py-2 text-emerald-800">
            <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </span>
            <p className="font-bold text-sm">
              {currentLang === 'hi' ? 'दस्तावेज़ सफलतापूर्वक स्कैन हुआ!' : 'Document Scanned Successfully!'}
            </p>
            <p className="text-xs text-emerald-700">
              {currentLang === 'hi'
                ? 'नीचे दिए गए फ़ील्ड भर दिए गए हैं। दूसरा दस्तावेज़ अपलोड करने के लिए क्लिक करें।'
                : 'Fields extracted below. Click or drop to upload another document.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-3 text-slate-600">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                {activeDocType === 'AADHAAR'
                  ? currentLang === 'hi'
                    ? 'आधार कार्ड अपलोड करें (आगे और पीछे का फोटो, या दोनों एक साथ)'
                    : 'Click to upload Aadhaar (Select 1 or 2 images: Front & Back)'
                  : currentLang === 'hi'
                  ? `यहाँ क्लिक करके ${docTabs.find((d) => d.type === activeDocType)?.nameHi} की फोटो अपलोड करें`
                  : `Click to upload or snap photo of ${docTabs.find((d) => d.type === activeDocType)?.nameEn}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeDocType === 'AADHAAR'
                  ? 'Supports 2 files (Front + Back) or single combined photo • Auto-downscaled to 1280px'
                  : 'PNG, JPG or WEBP up to 10MB • Auto-downscaled to 1280px'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Permission Prompt Card for Gemini Cloud AI Fallback */}
      {showPermissionPrompt && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-md space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                <span>{currentLang === 'hi' ? 'क्लाउड एआई उपयोग की अनुमति' : 'Cloud AI Permission Required'}</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono">
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
                    ? 'गोपनीयता सुरक्षा: आपके स्पष्ट अनुमोदन (Yes) के बिना कोई भी दस्तावेज़ बाहरी सर्वर पर नहीं भेजा जाएगा।'
                    : 'Privacy Safeguard: No document data will be sent to external cloud AI without your explicit consent.'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleDeclineGemini}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-100 text-slate-700 border border-amber-300 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              {currentLang === 'hi' ? 'नहीं, स्थानीय डेटा रखें' : 'No, Keep Local Data'}
            </button>
            <button
              type="button"
              onClick={handleAcceptGemini}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-950 hover:bg-indigo-900 text-white transition shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-300" />
              <span>{currentLang === 'hi' ? 'हाँ, Gemini AI का उपयोग करें' : 'Yes, Use Gemini AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Extracted Information Pill */}
      {extractedData && !showPermissionPrompt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold">
                {extractedData.doc_type === 'AADHAAR' && 'Aadhaar Parsed:'}
                {extractedData.doc_type === 'CASTE' && 'Caste Category Parsed:'}
                {extractedData.doc_type === 'INCOME' && 'Annual Income Parsed:'}
                {extractedData.doc_type === 'MARKSHEET' && 'Academic Merit Parsed:'}
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

              {extractedData.state && (
                <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                  State: {extractedData.state}
                </span>
              )}

              {extractedData.category && (
                <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                  {extractedData.category}
                </span>
              )}

              {extractedData.annual_income && (
                <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                  ₹{extractedData.annual_income.toLocaleString('en-IN')} / year
                </span>
              )}

              {extractedData.marks_percentage && (
                <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                  {extractedData.marks_percentage}% Marks ({extractedData.highest_education})
                </span>
              )}

              <span className="text-emerald-700 ml-1">
                | Confidence: {extractedData.confidence}% | Engine: {extractedData.engine}
              </span>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 self-end sm:self-center">
            <Sparkles className="w-3.5 h-3.5" /> Auto-filled below
          </span>
        </div>
      )}
    </div>
  );
};

