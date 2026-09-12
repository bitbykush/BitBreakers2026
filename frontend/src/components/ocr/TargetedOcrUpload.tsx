'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  FileCheck,
  Banknote,
  GraduationCap,
  Upload,
  CheckCircle2,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { OcrDocType, OcrExtractedData } from '@/types';
import { ApiService } from '@/lib/api';
import { StorageService } from '@/lib/storage';
import { useAccessibility } from '@/context/AccessibilityContext';

interface TargetedOcrUploadProps {
  currentLang: 'en' | 'hi';
  onExtractSuccess: (data: OcrExtractedData, fileDataUrl?: string, fileName?: string) => void;
}

type UploadStatus = 'idle' | 'scanning' | 'processing' | 'needs_permission' | 'saved' | 'unverified';

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

  // Aadhaar Specific Multi-Side State (Front & Back)
  const [aadhaarFrontUploaded, setAadhaarFrontUploaded] = useState<boolean>(false);
  const [aadhaarBackUploaded, setAadhaarBackUploaded] = useState<boolean>(false);
  const [aadhaarFrontDataUrl, setAadhaarFrontDataUrl] = useState<string>('');
  const [aadhaarBackDataUrl, setAadhaarBackDataUrl] = useState<string>('');
  const [mergedAadhaarData, setMergedAadhaarData] = useState<OcrExtractedData | null>(null);

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

    // Hydrate Aadhaar side flags if profile already has fields
    const profile = StorageService.getProfile();
    if (profile.name || profile.maskedAadhaar || profile.dob) {
      setAadhaarFrontUploaded(true);
    }
    if (profile.address || profile.district || profile.pincode) {
      setAadhaarBackUploaded(true);
    }
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
      // Back side only gives address fields — those are valid too
      return Boolean(
        data.name ||
        data.masked_aadhaar ||
        data.address ||
        data.district ||
        data.state ||
        data.pincode ||
        data.dob ||
        data.gender
      );
    }
    if (data.doc_type === 'CASTE') {
      return Boolean(data.category || data.certificate_number);
    }
    if (data.doc_type === 'INCOME') {
      return Boolean(data.annual_income || data.certificate_number);
    }
    if (data.doc_type === 'MARKSHEET') {
      return Boolean(data.marks_percentage || (data.highest_education && data.highest_education !== 'N/A') || data.certificate_number);
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

  // Merge newly extracted Aadhaar fields into cumulative state
  const mergeAadhaarFields = (
    newExtract: OcrExtractedData,
    sideTarget?: 'FRONT' | 'BACK'
  ): OcrExtractedData => {
    const existing = mergedAadhaarData || extractedData || {
      doc_type: 'AADHAAR',
      confidence: newExtract.confidence || 85,
      engine: newExtract.engine || 'RapidOCR_ONNX',
      is_verified: true,
    };

    const merged: OcrExtractedData = {
      ...existing,
      doc_type: 'AADHAAR',
      engine: newExtract.engine || existing.engine || 'RapidOCR_ONNX',
      confidence: Math.max(existing.confidence || 0, newExtract.confidence || 0),
      is_verified: true,
    };

    // If Front side or Front fields are present: extract Name, DOB, Gender, Masked Aadhaar
    if (sideTarget === 'FRONT' || (sideTarget !== 'BACK' && newExtract.name)) {
      if (newExtract.name) merged.name = newExtract.name;
      if (newExtract.dob) merged.dob = newExtract.dob;
      if (newExtract.gender) merged.gender = newExtract.gender;
      if (newExtract.masked_aadhaar) merged.masked_aadhaar = newExtract.masked_aadhaar;
    }

    // If Back side or Back fields are present: extract Address, District, State, Pincode
    if (sideTarget === 'BACK' || (sideTarget !== 'FRONT' && (newExtract.address || newExtract.district || newExtract.state || newExtract.pincode))) {
      if (newExtract.address) merged.address = newExtract.address;
      if (newExtract.district) merged.district = newExtract.district;
      if (newExtract.state) merged.state = newExtract.state;
      if (newExtract.pincode) merged.pincode = newExtract.pincode;
      if (newExtract.masked_aadhaar && !merged.masked_aadhaar) {
        merged.masked_aadhaar = newExtract.masked_aadhaar;
      }
    }

    // If neither explicit sideTarget (e.g. combined photo), take all available fields
    if (!sideTarget) {
      if (newExtract.name) merged.name = newExtract.name;
      if (newExtract.dob) merged.dob = newExtract.dob;
      if (newExtract.gender) merged.gender = newExtract.gender;
      if (newExtract.masked_aadhaar) merged.masked_aadhaar = newExtract.masked_aadhaar;
      if (newExtract.address) merged.address = newExtract.address;
      if (newExtract.district) merged.district = newExtract.district;
      if (newExtract.state) merged.state = newExtract.state;
      if (newExtract.pincode) merged.pincode = newExtract.pincode;
    }

    setMergedAadhaarData(merged);
    return merged;
  };

  // Main file upload handler (handles single, multi, front-specific, and back-specific uploads)
  const processFiles = async (
    files: File[],
    docType: OcrDocType,
    sideTarget?: 'FRONT' | 'BACK'
  ) => {
    if (!files || files.length === 0) return;

    const mainFile = files[0];
    const sizeStr = `${(mainFile.size / 1024).toFixed(1)} KB`;

    setSelectedFileNames(files.map((f) => f.name));
    setCurrentFileName(mainFile.name);
    setCurrentFileSize(sizeStr);
    setUploadStatus('scanning');
    setPendingResult(null);

    let dataUrl = '';
    try {
      dataUrl = await readFileAsDataUrl(mainFile);
      setCurrentFileDataUrl(dataUrl);

      if (docType === 'AADHAAR') {
        if (sideTarget === 'FRONT') {
          setAadhaarFrontDataUrl(dataUrl);
          setAadhaarFrontUploaded(true);
        } else if (sideTarget === 'BACK') {
          setAadhaarBackDataUrl(dataUrl);
          setAadhaarBackUploaded(true);
        } else {
          setAadhaarFrontDataUrl(dataUrl);
          setAadhaarFrontUploaded(true);
        }
      }

      StorageService.saveUploadedDocument(docType, dataUrl, mainFile.name, sizeStr);
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
      const result = await ApiService.extractTargetedOcr(files, docType, 'AUTO', false);
      setUploadStatus('processing');

      if (result.needs_permission) {
        setPendingFiles(files);
        setPendingResult(result);
        setUploadStatus('needs_permission');
        const promptMsg =
          result.prompt_message ||
          (currentLang === 'hi'
            ? `दस्तावेज़ की स्पष्टता (${result.confidence}%) है। क्या आप उच्च सटीकता के लिए Google Gemini Cloud AI का उपयोग करना चाहते हैं?`
            : `Local OCR scan had confidence (${result.confidence}%). Would you like to use Google Gemini Cloud AI for enhanced extraction?`);
        setPermissionPromptMessage(promptMsg);
        if (talkBackActive) {
          speakText(promptMsg, true);
        }
        return;
      }

      const isValid = hasEssentialFields(result);

      if (isValid) {
        let finalData = result;
        if (docType === 'AADHAAR') {
          finalData = mergeAadhaarFields(result, sideTarget);
          if (result.name || result.dob || result.gender) setAadhaarFrontUploaded(true);
          if (result.address || result.district || result.pincode) setAadhaarBackUploaded(true);
        }

        setUploadStatus('saved');
        setExtractedData(finalData);

        StorageService.saveUploadedDocument(
          docType,
          dataUrl || currentFileDataUrl,
          mainFile.name,
          sizeStr,
          finalData.masked_aadhaar || finalData.certificate_number,
          'RAPIDOCR'
        );
        refreshSavedDocs();
        onExtractSuccess(finalData, dataUrl || currentFileDataUrl, mainFile.name);

        if (talkBackActive) {
          speakText(
            currentLang === 'hi'
              ? `दस्तावेज़ सहेजा गया। ${finalData.name ? 'नाम: ' + finalData.name : ''} ${finalData.district ? 'ज़िला: ' + finalData.district : ''}`
              : `Document scanned and saved. ${finalData.name ? 'Name: ' + finalData.name : ''} ${finalData.district ? 'District: ' + finalData.district : ''}`
          );
        }
      } else {
        setUploadStatus('unverified');
        setPendingFiles(files);
        setPendingResult(result);
        setUnverifiedMessage(
          result.error_message ||
            (currentLang === 'hi'
              ? 'दस्तावेज़ से स्पष्ट विवरण नहीं पढ़े जा सके। आप इसे फिर भी फ़ॉर्म में संलग्न कर सकते हैं।'
              : 'Could not extract text from document. You can still attach it to your dossier.')
        );
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setUploadStatus('unverified');
      setPendingFiles(files);
      setUnverifiedMessage(
        currentLang === 'hi'
          ? 'स्कैन में समस्या आई। आप यह दस्तावेज़ सीधे संलग्न कर सकते हैं।'
          : 'Could not read document. You can still attach it directly to your dossier.'
      );
    }
  };

  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    await processFiles(files, activeDocType);
    e.target.value = '';
  };

  const handleFrontSideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    await processFiles(files, 'AADHAAR', 'FRONT');
    e.target.value = '';
  };

  const handleBackSideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    await processFiles(files, 'AADHAAR', 'BACK');
    e.target.value = '';
  };

  const handleAcceptGemini = async () => {
    if (pendingFiles.length === 0) return;
    setUploadStatus('scanning');

    if (talkBackActive) {
      speakText(
        currentLang === 'hi'
          ? 'Google Gemini Cloud AI द्वारा स्कैन किया जा रहा है।'
          : 'Scanning with Google Gemini Cloud AI for enhanced extraction.'
      );
    }

    try {
      const result = await ApiService.extractTargetedOcr(pendingFiles, activeDocType, 'AUTO', true);

      const isValid = hasEssentialFields(result);

      if (isValid) {
        let finalData = result;
        if (activeDocType === 'AADHAAR') {
          finalData = mergeAadhaarFields(result);
          if (result.name || result.dob || result.gender) setAadhaarFrontUploaded(true);
          if (result.address || result.district || result.pincode) setAadhaarBackUploaded(true);
        }

        setUploadStatus('saved');
        setExtractedData(finalData);
        StorageService.saveUploadedDocument(
          activeDocType,
          currentFileDataUrl,
          currentFileName || pendingFiles[0]?.name || `${activeDocType}_Doc.jpg`,
          currentFileSize || 'Attached',
          finalData.masked_aadhaar || finalData.certificate_number,
          'GEMINI'
        );
        refreshSavedDocs();
        onExtractSuccess(finalData, currentFileDataUrl, currentFileName);
      } else {
        setUploadStatus('unverified');
        setUnverifiedMessage(
          currentLang === 'hi'
            ? 'Cloud AI भी विवरण नहीं पढ़ सका। आप यह दस्तावेज़ संलग्न कर सकते हैं।'
            : 'Cloud AI could not read details. You can still attach and save this document.'
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
      const finalData = activeDocType === 'AADHAAR' ? mergeAadhaarFields(pendingResult) : pendingResult;
      setUploadStatus('saved');
      setExtractedData(finalData);
      StorageService.saveUploadedDocument(
        activeDocType,
        currentFileDataUrl,
        currentFileName,
        currentFileSize || 'Attached',
        finalData.masked_aadhaar || finalData.certificate_number,
        'RAPIDOCR'
      );
      refreshSavedDocs();
      onExtractSuccess(finalData, currentFileDataUrl, currentFileName);
    } else {
      setUploadStatus('unverified');
      setUnverifiedMessage(
        currentLang === 'hi'
          ? 'दस्तावेज़ से विवरण नहीं पढ़े जा सके। आप इसे संलग्न कर सकते हैं।'
          : 'Could not extract details. You can attach it directly or fill manually below.'
      );
    }
  };

  const handleForceAttach = () => {
    const attachedData: OcrExtractedData = pendingResult || extractedData || {
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
    setUploadStatus('saved');
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
              ? 'आधार (आगे/पीछे), जाति, आय या अंकतालिका अपलोड करें — नाम आगे से और पता पीछे से स्वतः निकाला जाएगा'
              : 'Upload Aadhaar (Front/Back), Caste, Income, or Marksheet — Name from front and Address from back extracted accurately'}
          </p>
        </div>
      </div>

      {/* Scoped Document Tabs */}
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

      {/* AADHAAR CARD COMBINED / MULTI-IMAGE UPLOAD ZONE */}
      {activeDocType === 'AADHAAR' && uploadStatus === 'idle' && (
        <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl p-5 sm:p-6 text-center bg-slate-50/70 hover:bg-indigo-50/30 transition-all cursor-pointer relative group">
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleGeneralFileUpload}
            aria-label="Upload Aadhaar Card (1 Combined Image or 2 Images)"
          />

          <div className="flex flex-col items-center justify-center gap-2.5 py-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
              <CreditCard className="w-6 h-6" />
            </div>

            <div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">
                {currentLang === 'hi'
                  ? 'आधार कार्ड की फ़ोटो चुनें'
                  : 'Upload Aadhaar Card (1 or 2 Photos)'}
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                {currentLang === 'hi'
                  ? 'एक संयुक्त फ़ोटो (आगे व पीछे दोनों) चुनें या दोनों फ़ोटो (आगे और पीछे) एक साथ चुनें'
                  : 'Upload 1 combined photo (both front & back on 1 page) OR select 2 photos (front and back sides)'}
              </p>
            </div>

            <span className="mt-1 h-8 px-4 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-semibold shadow-2xs flex items-center gap-2 pointer-events-none transition">
              <Upload className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {savedDocs['AADHAAR']
                  ? currentLang === 'hi'
                    ? 'फ़ोटो बदलकर अपलोड करें'
                    : 'Replace Aadhaar Photo(s)'
                  : currentLang === 'hi'
                  ? 'फ़ोटो चुनें (1 या 2 फ़ाइलें)'
                  : 'Choose Photo(s) (1 or 2 files)'}
              </span>
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Check className="w-3 h-3" />
                {currentLang === 'hi' ? 'नाम एवं जन्मतिथि' : 'Name & DOB'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Check className="w-3 h-3" />
                {currentLang === 'hi' ? 'पता एवं ज़िला' : 'Address & District'}
              </span>
              <span>•</span>
              <span className="text-slate-400">PNG, JPG, WEBP</span>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD UPLOAD ZONE FOR CASTE, INCOME, MARKSHEET */}
      {activeDocType !== 'AADHAAR' && uploadStatus === 'idle' && (
        <div className="border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 sm:p-5 text-center bg-slate-50/70 hover:bg-indigo-50/30 transition-all cursor-pointer relative group">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={handleGeneralFileUpload}
            aria-label="Upload document image"
          />

          <div className="flex flex-col items-center justify-center gap-2 py-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="font-bold text-slate-900 text-sm">
                {currentLang === 'hi'
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

      {/* Processing State */}
      {uploadStatus === 'processing' && (
        <div className="border border-indigo-200 rounded-xl p-4 text-center bg-indigo-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="font-bold text-sm text-indigo-950">
            {currentLang === 'hi'
              ? 'डेटा प्रोसेस हो रहा है...'
              : 'Processing extracted data...'}
          </p>
          <span className="text-xs text-slate-500">
            Organising fields from document
          </span>
        </div>
      )}

      {/* Cloud AI Consent State */}
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

      {/* Attach Error / Low Confidence State */}
      {uploadStatus === 'unverified' && (
        <div className="border border-rose-200 bg-rose-50/60 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-rose-950">
                {currentLang === 'hi' ? 'स्कैन नोटिस' : 'Scan Notice'}
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

      {/* Saved / Success State */}
      {uploadStatus === 'saved' && extractedData && (
        <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <div>
                <p className="font-bold text-sm text-emerald-950">
                  {extractedData.doc_type === 'AADHAAR'
                    ? aadhaarFrontUploaded && aadhaarBackUploaded
                      ? currentLang === 'hi'
                        ? 'आधार कार्ड (आगे और पीछे) स्कैन व सहेजा गया!'
                        : 'Aadhaar (Front & Back) Scanned & Saved!'
                      : extractedData.address
                      ? currentLang === 'hi'
                        ? 'आधार पीछे का भाग स्कैन हुआ (पता निकाला गया)!'
                        : 'Aadhaar Back Scanned (Address Extracted)!'
                      : currentLang === 'hi'
                      ? 'आधार आगे का भाग स्कैन हुआ (नाम एवं जन्म तिथि निकाली गई)!'
                      : 'Aadhaar Front Scanned (Name & DOB Extracted)!'
                    : currentLang === 'hi'
                    ? 'दस्तावेज़ स्कैन व सहेजा गया!'
                    : 'Document Scanned & Saved!'}
                </p>
                <p className="text-[11px] text-emerald-800">
                  {currentLang === 'hi'
                    ? 'निकाले गए विवरण नीचे फ़ॉर्म में भर दिए गए हैं।'
                    : 'Extracted fields populated in the citizen profile below.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetUpload}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition self-start sm:self-auto cursor-pointer"
            >
              {currentLang === 'hi' ? 'नया दस्तावेज़ / दूसरा भाग अपलोड करें' : 'Upload Another / Other Side'}
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
                Name: {extractedData.name}
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

            {extractedData.pincode && (
              <span className="font-mono font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                Pin: {extractedData.pincode}
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

            {extractedData.gender && (
              <span className="font-semibold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">
                {extractedData.gender}
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
