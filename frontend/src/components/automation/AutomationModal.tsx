'use client';

import React, { useState } from 'react';
import { X, Sparkles, ExternalLink, Download, Bookmark, Play, ShieldAlert, CheckCircle2, Volume2, Cpu, Globe } from 'lucide-react';
import { ApplicantProfile, SchemeMatch } from '@/types';
import { JanSamarthSimulatorModal } from './JanSamarthSimulatorModal';
import { generateBookmarkletCode } from '@/lib/bookmarklet';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ApplicantProfile;
  selectedScheme?: SchemeMatch | null;
  currentLang?: 'en' | 'hi';
}

export const AutomationModal: React.FC<AutomationModalProps> = ({
  isOpen,
  onClose,
  profile,
  selectedScheme,
  currentLang = 'hi',
}) => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  if (!isOpen) return null;

  const bookmarkletHref = generateBookmarkletCode('http://localhost:8000');

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletHref);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex justify-center items-center animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative">
          {/* Header */}
          <div className="bg-[#0b1a30] text-white p-5 border-b-4 border-amber-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Portal Auto-Fill Assistant (e-RPA)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                    FastEmbed all-MiniLM-L6-v2
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Automate 85%+ of repetitive fields on Jan Samarth, PMEGP, & PM-SVANidhi.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Value Proposition Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="text-blue-700 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>512MB RAM Guard</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Runs client-side in your browser. 0MB extra server RAM consumed.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="text-amber-800 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Human-in-the-Loop</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Pauses automatically for Captcha, OTPs, and Bank consent.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="text-emerald-800 font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Multi-Channel Alert</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Audio chimes, Hindi/English voice synthesis, and visual spotlights.
                </p>
              </div>
            </div>

            {/* Launch Options */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Choose Deployment Pathway
              </h4>

              {/* Pathway 1: Interactive Jan Samarth Simulator */}
              <div className="p-4 rounded-2xl border-2 border-indigo-600/30 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 hover:border-indigo-600 transition flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                      Pathway 1: Interactive Jan Samarth Simulator
                    </span>
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">
                      Recommended for Evaluation
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Test the complete AI form-filling, FastEmbed semantic matching, and Captcha/OTP human handovers directly in the web app without needing external government credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-amber-400 font-bold text-xs shadow-md transition flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Launch Simulator</span>
                </button>
              </div>

              {/* Pathway 2: Live Government Portal Integration */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pathway 2: Live Government Portal Integration</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Works on any open tab in Chrome, Edge, or Brave without needing a bookmarks bar.
                    </p>
                  </div>
                  <a
                    href="https://www.jansamarth.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <span>Jan Samarth Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Method A: 1-Click Console Snippet (No Bookmarks Bar Needed!) */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>💻 Method A: 1-Line Console Runner</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Fastest & No Bar Needed</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = "fetch('http://localhost:8000/api/v1/automation/script').then(r=>r.text()).then(eval);";
                        navigator.clipboard.writeText(snippet);
                        setCopiedBookmarklet(true);
                        setTimeout(() => setCopiedBookmarklet(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>{copiedBookmarklet ? '✓ Snippet Copied!' : '📋 Copy 1-Line Runner'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>How to use on any site:</strong> Open the scheme portal (e.g. <span className="font-mono text-blue-700">jansamarth.in</span>) → Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">F12</kbd> (Console tab) → Paste & press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Enter</kbd>. The assistant dock appears instantly!
                  </div>
                </div>

                {/* Method B: Chrome Extension (Permanent Toolbar Icon) */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>🧩 Method B: Official Chrome Extension</span>
                    <span className="text-[10px] text-slate-500 font-mono">(chrome://extensions)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    1. Open <span className="font-mono text-blue-700">chrome://extensions</span> in your Chrome address bar.<br />
                    2. Enable <strong>"Developer mode"</strong> (toggle switch in the top-right corner).<br />
                    3. Click <strong>"Load unpacked"</strong> and select folder: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono select-all">d:\CodingFlux2026\frontend\public\extension</code>.
                  </div>
                </div>

                {/* Method C: Show Bookmarks Bar Tip */}
                <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex items-center gap-2">
                  <span className="text-amber-700 font-bold">💡 Tip for Bookmarks Bar:</span>
                  <span>If your Bookmarks Bar is hidden, press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] font-bold">Ctrl + Shift + B</kbd> in Chrome to show it permanently.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>SIH PS 26092 • Smart India Hackathon</span>
            <span>FastEmbed ONNX & RapidOCR Guarded</span>
          </div>
        </div>
      </div>

      {/* Simulator Modal */}
      <JanSamarthSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        profile={profile}
        schemeCode={selectedScheme?.code || 'PMEGP'}
        currentLang={currentLang}
      />
    </>
  );
};
