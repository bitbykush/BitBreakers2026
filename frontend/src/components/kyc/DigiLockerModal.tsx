'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { ApiService } from '@/lib/api';
import { StorageService } from '@/lib/storage';
import { DigiLockerRecord } from '@/types';

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (record: DigiLockerRecord) => void;
  currentLang: 'en' | 'hi';
}

export const DigiLockerModal: React.FC<DigiLockerModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  currentLang,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [aadhaarInput, setAadhaarInput] = useState('9876 5432 3456');
  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<DigiLockerRecord | null>(null);

  if (!isOpen) return null;

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleSendOtp = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 400);
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    const otpCode = otp.join('');
    const result = await ApiService.verifyDigiLockerOtp(aadhaarInput, otpCode);

    setTimeout(() => {
      setIsLoading(false);
      setVerificationResult(result);
      StorageService.saveDigiLockerState(result);
      StorageService.verifyDocument('DOC_CASTE', 'DIGILOCKER', result.refId);
      StorageService.verifyDocument('DOC_AADHAAR', 'DIGILOCKER', result.refId);
      StorageService.verifyDocument('DOC_RURAL', 'DIGILOCKER', result.refId);
      onVerified(result);
      setStep(3);
    }, 600);
  };

  const handleResetAndClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* DigiLocker Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-700 font-black flex items-center justify-center text-sm shadow-md">
              DL
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-base leading-none">DigiLocker</h4>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">eKYC Sandbox</span>
              </div>
              <p className="text-[11px] text-blue-100 mt-0.5">National Digital Locker System • MeitY</p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-blue-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Aadhaar/Mobile Input */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
              <span className="font-bold">Sandbox Demo Mode</span>
              <span className="bg-blue-200 text-blue-950 font-mono px-2 py-0.5 rounded text-[10px]">
                Auto-fills test data
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {currentLang === 'hi' ? 'आधार अथवा मोबाइल नंबर' : 'Aadhaar / Mobile Number'}
              </label>
              <input
                type="text"
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Consent collected under Information Technology (Preservation of Information by Intermediaries Providing
                Digital Locker Facilities) Rules, 2016.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{currentLang === 'hi' ? 'ओटीपी (OTP) भेजें' : 'Send OTP to Linked Mobile'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: 6-Digit OTP */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">
                {currentLang === 'hi' ? '6-अंकों का ओटीपी दर्ज करें' : 'Enter 6-Digit OTP'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Sent to mobile ending in •••••• 3456</p>
              <span className="inline-block mt-1.5 text-[11px] bg-amber-100 text-amber-900 font-mono px-2.5 py-0.5 rounded-full font-bold">
                Demo OTP: 123456
              </span>
            </div>

            <div className="flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-11 h-12 text-center text-lg font-bold border border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {currentLang === 'hi' ? 'सत्यापित करें एवं रिकॉर्ड प्राप्त करें' : 'Authenticate & Retrieve Records'}
              </span>
            </button>
          </div>
        )}

        {/* STEP 3: Authenticated Confirmation */}
        {step === 3 && (
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h4 className="font-extrabold text-slate-900 text-lg">
              {currentLang === 'hi' ? 'सफलतापूर्वक सत्यापित!' : 'Authenticated & Verified!'}
            </h4>
            <p className="text-xs text-slate-600">
              {currentLang === 'hi'
                ? 'राज्य राजस्व पोर्टल से जाति, निवास एवं पहचान प्रमाण पत्र डिजिटल रूप से सत्यापित किए गए।'
                : 'Retrieved verified digital caste, residence and identity records directly from State Revenue Vault.'}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs font-mono space-y-1">
              <p>
                <span className="text-slate-400">Ref ID:</span>{' '}
                <span className="font-bold text-emerald-800">{verificationResult?.refId || 'DL-2026-X8921'}</span>
              </p>
              <p>
                <span className="text-slate-400">Certificate:</span> OBC-UP-2023-88219
              </p>
              <p>
                <span className="text-slate-400">Status:</span> 100% Cryptographically Signed
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full h-10 px-4 rounded-xl bg-indigo-950 text-white font-bold text-xs shadow-xs hover:bg-indigo-900 transition"
            >
              {currentLang === 'hi' ? 'पूर्ण एवं योजनाओं पर वापस जाएं' : 'Done & Return to Schemes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
