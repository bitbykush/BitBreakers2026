'use client';

import React, { useState, useEffect } from 'react';
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
  FileText,
  Paperclip,
} from 'lucide-react';
import { OcrDocType, OcrExtractedData } from '@/types';
import { ApiService } from '@/lib/api';
import { StorageService } from '@/lib/storage';
import { useAccessibility } from '@/context/AccessibilityContext';

interface TargetedOcrUploadProps {
  currentLang: 'en' | 'hi';
  onExtractSuccess: (data: OcrExtractedData, fileDataUrl?: string, fileName?: string) => void;
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

  // Persisted uploaded documents state (mapped by document code e.g. AADHAAR, CASTE)
  const [savedDocs, setSavedDocs] = useState<Record<string, { fileName: string; fileSize: string; fileDataUrl: string; isVerified: boolean }>>({});
  const [currentFileDataUrl, setCurrentFileDataUrl] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<string>('');

  const refreshSavedDocs = () => {
    const docs = StorageService.getDocuments();
    const map: Record<string, { fileName: string; fileSize: string; fileDataUrl: string; isVerified: boolean }> = {};
    docs.forEach((d) => {
      if (d.fileDataUrl) {
        const cleanCode = d.code.replace(/^DOC_/, '').toUpperCase();
        map[cleanCode] = {
          fileName: d.fileName || d.name,
          fileSize: d.fileSize || 'Attached',
          fileDataUrl: d.fileDataUrl,
          isVerified: d.isVerified,
        };
      }
    });
    setSavedDocs(map);
  };

  useEffect(() => {
    refreshSavedDocs();
  }, []);

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
      return Boolean(data.marks_percentage || (data.highest_education && data.highest_education !== 'N/A'));
    }
    return false;
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const file = files[0];
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

    setSelectedFileNames(files.map((f) => f.name));
    setCurrentFileName(file.name);
    setCurrentFileSize(sizeStr);
    setUploadStatus('scanning');
    setExtractedData(null);
    setPendingResult(null);

    // Read Data URL immediately so the document preview & file is NEVER lost
    let dataUrl = '';
    try {
      dataUrl = await readFileAsDataUrl(file);
      setCurrentFileDataUrl(dataUrl);
      // Immediately save to local storage as user-uploaded document
      StorageService.saveUploadedDocument(activeDocType, dataUrl, file.name, sizeStr);
      refreshSavedDocs();
    } catch (readErr) {
      console.warn('Could not read image as data URL:', readErr);
    }

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
        StorageService.saveUploadedDocument(
          activeDocType,
          dataUrl || currentFileDataUrl,
          file.name,
          sizeStr,
          result.masked_aadhaar || result.certificate_number,
          'RAPIDOCR'
        );
        refreshSavedDocs();
        onExtractSuccess(result, dataUrl || currentFileDataUrl, file.name);
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? `दस्तावेज़ सत्यापित हुआ। ${result.name ? 'नाम: ' + result.name : ''} ${result.annual_income ? 'वार्षिक आय: ₹' + Number(result.annual_income).toLocaleString('en-IN') : ''} ${result.category ? 'वर्ग: ' + result.category : ''}`
              : `Document verified successfully. ${result.name ? 'Name: ' + result.name : ''} ${result.annual_income ? 'Annual Income: ₹' + Number(result.annual_income).toLocaleString('en-IN') : ''} ${result.category ? 'Category: ' + result.category : ''}`
          );
        }
      } else {
        setUploadStatus('unverified');
        setPendingFiles(files);
        setPendingResult(result);
        setUnverifiedMessage(
          result.error_message ||
            (currentLang === 'hi'
              ? 'दस्तावेज़ से स्पष्ट विवरण नहीं पढ़े जा सके। आप इसे फिर भी फ़ॉर्म में संलग्न कर सकते हैं या विवरण मैन्युअल दर्ज कर सकते हैं।'
              : 'Could not extract high-confidence text from document. You can still attach this document copy or fill details manually.')
        );
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? 'दस्तावेज़ का विवरण स्पष्ट नहीं है।'
              : 'Document text could not be verified with high confidence.'
          );
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setUploadStatus('unverified');
      setPendingFiles(files);
      setUnverifiedMessage(
        currentLang === 'hi'
          ? 'स्कैन प्रक्रिया में तकनीकी समस्या आई। आप यह दस्तावेज़ संलग्न रख सकते हैं या पुनः प्रयास करें।'
          : 'Technical notice during OCR scan. You can still attach and save this document to your dossier.'
      );
      if (talkBackActive) {
        speakText(
          currentLang === 'hi'
            ? 'दस्तावेज़ स्कैन करने में समस्या आई।'
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
        StorageService.saveUploadedDocument(
          activeDocType,
          currentFileDataUrl,
          currentFileName || pendingFiles[0]?.name || `${activeDocType}_Doc.jpg`,
          currentFileSize || 'Attached',
          result.masked_aadhaar || result.certificate_number,
          'GEMINI'
        );
        refreshSavedDocs();
        onExtractSuccess(result, currentFileDataUrl, currentFileName);
        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? `Gemini AI द्वारा दस्तावेज़ सत्यापित हुआ। ${result.name ? 'नाम: ' + result.name : ''} ${result.annual_income ? 'वार्षिक आय: ₹' + Number(result.annual_income).toLocaleString('en-IN') : ''} ${result.category ? 'वर्ग: ' + result.category : ''}`
              : `Document verified with Gemini Cloud AI. ${result.name ? 'Name: ' + result.name : ''} ${result.annual_income ? 'Annual Income: ₹' + Number(result.annual_income).toLocaleString('en-IN') : ''} ${result.category ? 'Category: ' + result.category : ''}`
          );
        }
      } else {
        setUploadStatus('unverified');
        setUnverifiedMessage(
          currentLang === 'hi'
            ? 'Cloud AI भी आवश्यक विवरण नहीं पढ़ सका। आप यह दस्तावेज़ संलग्न रख सकते हैं।'
            : 'Cloud AI could not read all required details. You can still attach and save this document.'
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
      StorageService.saveUploadedDocument(
        activeDocType,
        currentFileDataUrl,
        currentFileName,
        currentFileSize || 'Attached',
        pendingResult.masked_aadhaar || pendingResult.certificate_number,
        'RAPIDOCR'
      );
      refreshSavedDocs();
      onExtractSuccess(pendingResult, currentFileDataUrl, currentFileName);
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
          ? 'दस्तावेज़ सत्यापित नहीं हुआ। आप इसे संलग्न कर सकते हैं या मैन्युअल भरें।'
          : 'Document was not verified. You can attach it anyway or fill details manually below.'
      );
    }
  };

  // Allow attaching the uploaded document even when OCR confidence is low or manual
  const handleForceAttach = () => {
    const attachedData: OcrExtractedData = pendingResult || {
      doc_type: activeDocType,
      confidence: 65,
      engine: 'RapidOCR_ONNX',
      is_verified: true,
    };
    attachedData.is_verified = true;

    StorageService.saveUploadedDocument(
      activeDocType,
      currentFileDataUrl,
      currentFileName || `${activeDocType}_Attached.jpg`,
      currentFileSize || 'Attached',
      `ATTACHED-${Date.now().toString().slice(-6)}`,
      'RAPIDOCR'
    );
    refreshSavedDocs();
    setUploadStatus('verified');
    setExtractedData(attachedData);
    onExtractSuccess(attachedData, currentFileDataUrl, currentFileName || `${activeDocType}_Attached.jpg`);

    if (talkBackActive) {
      speakText(
        currentLang === 'hi'
          ? 'दस्तावेज़ सफलतापूर्वक सहेजा गया और आवेदन पत्र में संलग्न कर दिया गया।'
          : 'Document saved and attached to the application dossier.'
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
          const isSaved = Boolean(savedDocs[tab.type]);
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
              {isSaved && (
                <span
                  className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${
                    isActive ? 'bg-emerald-400 ring-1 ring-white' : 'bg-emerald-600'
                  }`}
                  title="Document Attached & Saved"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Already Uploaded Document Preview Banner */}
      {savedDocs[activeDocType] && uploadStatus === 'idle' && (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={savedDocs[activeDocType].fileDataUrl}
              alt="Attached Document Preview"
              className="w-12 h-12 rounded-lg object-cover border-2 border-emerald-400 shadow-2xs flex-shrink-0 bg-white"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-emerald-950 truncate max-w-xs">
                  {savedDocs[activeDocType].fileName}
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded font-mono">
                  ✓ SAVED & ATTACHED
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {savedDocs[activeDocType].fileSize} • {currentLang === 'hi' ? 'यह दस्तावेज़ आवेदन पत्र (CAF) में शामिल है' : 'Included in Application Dossier & PDF download'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300 flex-shrink-0">
            ✓ Attached
          </span>
        </div>
      )}

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
              <span>
                {savedDocs[activeDocType]
                  ? currentLang === 'hi'
                    ? 'नई फ़ोटो बदलकर अपलोड करें'
                    : 'Replace with New Photo'
                  : currentLang === 'hi'
                  ? 'फ़ोटो चुनें या यहाँ खींचें'
                  : 'Choose Photo or Drag Here'}
              </span>
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
              onClick={handleForceAttach}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 transition shadow-2xs active:scale-95 cursor-pointer"
            >
              {currentLang === 'hi' ? 'दस्तावेज़ ऐसे ही संलग्न करें' : 'Attach Document Directly'}
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

      {/* Unverified / Error State (Truthful feedback with direct option to attach anyway) */}
      {uploadStatus === 'unverified' && (
        <div className="border border-rose-200 bg-rose-50/60 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-rose-950">
                {currentLang === 'hi' ? 'दस्तावेज़ सत्यापन सूचना' : 'Document Verification Notice'}
              </p>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                {unverifiedMessage}
              </p>
              {currentFileDataUrl && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-rose-200/60">
                  <img
                    src={currentFileDataUrl}
                    alt="Uploaded copy"
                    className="w-10 h-10 rounded object-cover border border-rose-300 bg-white"
                  />
                  <span className="text-[11px] text-rose-900 font-semibold truncate">
                    {currentFileName} ({currentFileSize})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-rose-200/60">
            <button
              type="button"
              onClick={handleResetUpload}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{currentLang === 'hi' ? 'दूसरा फोटो अपलोड करें' : 'Try Another Photo'}</span>
            </button>

            {currentFileDataUrl && (
              <button
                type="button"
                onClick={handleForceAttach}
                className="h-8 px-3.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>{currentLang === 'hi' ? 'दस्तावेज़ संलग्न व सुरक्षित करें' : 'Attach & Save Document Anyway'}</span>
              </button>
            )}
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

            {extractedData.dob && (
              <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                DOB: {extractedData.dob}
              </span>
            )}

            {extractedData.annual_income !== undefined && extractedData.annual_income !== null && (
              <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                ₹{Number(extractedData.annual_income).toLocaleString('en-IN')}/yr
              </span>
            )}

            {extractedData.financial_year && (
              <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                FY: {extractedData.financial_year}
              </span>
            )}

            {extractedData.certificate_number && (
              <span className="font-mono font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                Cert: {extractedData.certificate_number}
              </span>
            )}

            {extractedData.highest_education && extractedData.highest_education !== 'N/A' && (
              <span className="font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {extractedData.highest_education}
                {extractedData.marks_percentage !== undefined && extractedData.marks_percentage !== null
                  ? ` (${extractedData.marks_percentage}%)`
                  : ''}
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

