'use client';

import React from 'react';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

interface FooterProps {
  currentLang: 'en' | 'hi';
}

export const Footer: React.FC<FooterProps> = ({ currentLang }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-6 px-4 no-print mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <p className="font-bold text-slate-800">
            {currentLang === 'hi'
              ? 'Scheme Seva Kendra — योजना सेवा केंद्र कल्याणकारी मंच'
              : 'Scheme Seva Kendra — National Welfare & Subsidy Platform'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {currentLang === 'hi'
              ? 'कारीगरों, स्ट्रीट वेंडरों व वंचित उद्यमियों के लिए 100% निशुल्क सरकारी सब्सिडी मंच।'
              : 'Empowering marginalized Indian entrepreneurs under PM Vishwakarma, PMEGP, PM SVANidhi, and Mudra.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {currentLang === 'hi' ? '100% गोपनीयता सुरक्षित' : '100% Privacy Preserving'}
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            UIDAI & MoMSME Compliant
          </span>
        </div>
      </div>
    </footer>
  );
};
