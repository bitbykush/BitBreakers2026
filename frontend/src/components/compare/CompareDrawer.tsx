'use client';

import React from 'react';
import { X, SlidersHorizontal, Info, Check } from 'lucide-react';

interface CompareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedPathway2?: () => void;
  currentLang: 'en' | 'hi';
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  isOpen,
  onClose,
  onProceedPathway2,
  currentLang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex no-print animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative ml-auto h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold">
                  {currentLang === 'hi' ? 'राष्ट्रीय योजनाओं की तुलना' : 'Compare National Schemes'}
                </h3>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/40 font-semibold">
                  योजनाओं की तुलना
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentLang === 'hi'
                  ? 'सरकारी सब्सिडी, ब्याज दर एवं ऋण सीमाओं का आमने-सामने तुलनात्मक विवरण'
                  : 'Side-by-side comparative matrix across central welfare credit & grant windows'}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-indigo-50/50 border border-orange-200 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-100 px-2.5 py-0.5 rounded-full">
                National Scheme Matrix (राष्ट्रीय योजना तुलना मैट्रिक्स)
              </span>
              <span className="text-xs font-extrabold text-orange-700">Compare 4 Core Windows</span>
            </div>
            <p className="text-xs text-slate-600">
              Evaluate loan ceilings, subsidy grants, collateral waivers, and effective interest rates to select the
              best route for your trade.
            </p>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Scheme Name</th>
                  <th className="p-3.5 whitespace-nowrap">Grant / Subsidy</th>
                  <th className="p-3.5 whitespace-nowrap">Loan Ceiling</th>
                  <th className="p-3.5 whitespace-nowrap">Effective Rate</th>
                  <th className="p-3.5 whitespace-nowrap">Collateral</th>
                  <th className="p-3.5 whitespace-nowrap">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* PM Vishwakarma */}
                <tr className="hover:bg-emerald-50/40 bg-emerald-50/20">
                  <td className="p-3.5 font-bold text-indigo-950">
                    <div className="font-bold text-sm">PM Vishwakarma</div>
                    <span className="text-[10px] text-emerald-700 font-medium">Toolkit + Credit (18 Trades)</span>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-700">
                    <div className="font-bold">₹15,000 Free Grant</div>
                    <span className="text-[10px] text-slate-500 font-normal">e-RUPI Digital Voucher</span>
                  </td>
                  <td className="p-3.5 font-mono font-semibold">
                    ₹3,00,000
                    <br />
                    <span className="text-[10px] text-slate-500 font-sans">(₹1L + ₹2L tranches)</span>
                  </td>
                  <td className="p-3.5 font-bold text-indigo-900">
                    5.0% flat
                    <br />
                    <span className="text-[10px] text-emerald-700 font-normal">8% MoMSME paid</span>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">
                      0% (None)
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      94.5%
                    </span>
                  </td>
                </tr>

                {/* PMEGP */}
                <tr className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-indigo-950">
                    <div className="font-bold text-sm">PMEGP (KVIC)</div>
                    <span className="text-[10px] text-slate-500 font-medium">Rural & Urban Micro Units</span>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-700">
                    <div className="font-bold">Up to 35% Subsidy</div>
                    <span className="text-[10px] text-slate-500 font-normal">Max ₹17.5 Lakh grant</span>
                  </td>
                  <td className="p-3.5 font-mono font-semibold">
                    ₹50,00,000
                    <br />
                    <span className="text-[10px] text-slate-500 font-sans">(Manufacturing cap)</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-700">
                    Bank MCLR
                    <br />
                    <span className="text-[10px] text-slate-500 font-normal">Normal bank rates</span>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">
                      0% (None)
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      92.0%
                    </span>
                  </td>
                </tr>

                {/* PM SVANidhi */}
                <tr className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-indigo-950">
                    <div className="font-bold text-sm">PM SVANidhi</div>
                    <span className="text-[10px] text-slate-500 font-medium">Street Vendors & Thela</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-700">
                    <div className="font-bold">7% Interest Subsidy</div>
                    <span className="text-[10px] text-slate-500 font-normal">+ ₹1,200/yr cashback</span>
                  </td>
                  <td className="p-3.5 font-mono font-semibold">
                    ₹50,000
                    <br />
                    <span className="text-[10px] text-slate-500 font-sans">(₹10k, ₹20k, ₹50k)</span>
                  </td>
                  <td className="p-3.5 font-bold text-indigo-900">
                    Subsidized
                    <br />
                    <span className="text-[10px] text-slate-500 font-normal">Quarterly credit</span>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">
                      0% (None)
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      88.0%
                    </span>
                  </td>
                </tr>

                {/* Mudra */}
                <tr className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-indigo-950">
                    <div className="font-bold text-sm">Mudra Kishore</div>
                    <span className="text-[10px] text-slate-500 font-medium">Micro Business & Trade</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-500">
                    <div className="font-bold">No Direct Grant</div>
                    <span className="text-[10px] text-slate-400 font-normal">Working capital</span>
                  </td>
                  <td className="p-3.5 font-mono font-semibold">
                    ₹5,00,000
                    <br />
                    <span className="text-[10px] text-slate-500 font-sans">(Kishore window)</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-700">
                    8.5% - 10.5%
                    <br />
                    <span className="text-[10px] text-slate-500 font-normal">Bank standard</span>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 font-bold">
                      0% (None)
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      85.5%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Recommendation Guide */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" /> Recommendation Guide for Applicants:
            </h5>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-800">Choose PM Vishwakarma:</strong> If you practice traditional trades
                (Potter, Carpenter, Tailor, Blacksmith) and need a free toolkit grant + lowest subsidized 5% rate.
              </li>
              <li>
                <strong className="text-slate-800">Choose PMEGP:</strong> If you are setting up a micro manufacturing
                workshop or processing unit needing high capital (up to ₹50L) with up to 35% non-refundable grant.
              </li>
              <li>
                <strong className="text-slate-800">Choose PM SVANidhi:</strong> If you are an urban/semi-urban street
                vendor, food cart, or thela operator needing quick working capital.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-9 px-5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            {currentLang === 'hi' ? 'बंद करें (Close)' : 'Close (बंद करें)'}
          </button>
        </div>
      </div>
    </div>
  );
};
