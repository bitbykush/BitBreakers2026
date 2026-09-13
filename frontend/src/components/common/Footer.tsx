'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

interface FooterProps {
  currentLang: 'en' | 'hi';
}

export const Footer: React.FC<FooterProps> = ({ currentLang }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-6 px-4 no-print mt-auto">
      <div className="max-w-7xl mx-auto mb-5 pb-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
            {currentLang === 'hi' ? '🏛️ आधिकारिक सरकारी पोर्टल' : '🏛️ Official Government Portals'}
          </span>
          <span className="text-[11px] text-slate-400">
            {currentLang === 'hi' ? 'पोर्टल पर जाकर आवेदन करें — सुगम सेवा सहायक स्वतः विवरण भरेगा' : 'Visit official portal to apply — Sugam Seva Co-Pilot will assist autofill'}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <a
            href="https://www.jansamarth.in/home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 text-slate-800 text-xs font-bold transition shadow-2xs group cursor-pointer active:scale-98"
          >
            <span className="text-base">🏛️</span>
            <div className="text-left">
              <span className="block text-[11px] font-extrabold text-indigo-950 group-hover:text-indigo-600">
                {currentLang === 'hi' ? 'जन समर्थ पोर्टल' : 'Jan Samarth Portal'}
              </span>
              <span className="block text-[9px] text-slate-400 font-medium">jansamarth.in</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-emblem.png"
            alt="Scheme Seva Kendra"
            width={36}
            height={36}
            className="w-9 h-9 object-contain flex-shrink-0"
          />
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
