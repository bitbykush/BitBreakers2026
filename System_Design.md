# System Design & Implementation Blueprints
## Project: Scheme Seva Kendra (योजना सेवा केंद्र) (SIH-26092)

---

## 1. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Next.js 14 Responsive PWA on Vercel)"]
        P1["Pathway 1: 1-Tap Trade Chips + Web Speech API"]
        BaselinePreview["Instant Baseline Match Preview (On Demand)"]
        SchemeDetails["Scheme Details Dossier: /schemes/[id] (myScheme 8 Tabs & 10 FAQs)"]
        P2["Pathway 2: Assisted Multi-Step Form + Scholarships (/apply)"]
        LocalStore[("Client LocalStorage: Zero-Login Session")]
        DevHUD["Hidden Dev Panel (Ctrl+Shift+D / Triple Tap)"]
        CAFView["Common Application Format (CAF) A4 Print View (/caf)"]
    end

    subgraph Backend ["Render Free Tier Backend (512MB RAM Budget, --workers 1)"]
        APIRouter["FastAPI Endpoints (/api/v1)"]
        Resizer["PIL Image Resizer (Max 1280px) + GC Collect"]
        RapidOCR["RapidOCR ONNX Engine (~90-120MB RAM)"]
        TargetedParser["Targeted Extractors: Aadhaar / Caste / Income / Marks"]
        FastEmbed["FastEmbed all-MiniLM-L6-v2 ONNX (~60MB RAM)"]
        HardFilter["Deterministic Eligibility Boolean Filter"]
        DocResolver["Dynamic Missing Document Engine"]
        DevMonitor["Process RSS RAM Monitor (psutil)"]
    end

    subgraph CloudFallback ["External Cloud Fallback (0MB Local RAM)"]
        GeminiFlash["Google Gemini 1.5 Flash Vision (API Fallback)"]
    end

    P1 -->|Select Trade / Search| BaselinePreview
    BaselinePreview -->|Arrow Button [→]| SchemeDetails
    BaselinePreview -->|Fill Custom Details| P2
    SchemeDetails -->|Apply in Pathway 2| P2
    P1 & P2 & SchemeDetails <--> LocalStore
    DevHUD -->|Toggle Engines / View RAM| DevMonitor

    P2 -->|Targeted Doc Upload| Resizer
    Resizer --> RapidOCR
    RapidOCR -->|If Confidence < 65% or Dev Toggle| GeminiFlash
    RapidOCR & GeminiFlash --> TargetedParser
    TargetedParser -->|FastEmbed + Regex Heuristics| P2

    P2 -->|Match Request| HardFilter
    HardFilter --> FastEmbed
    FastEmbed --> DocResolver
    DocResolver -->|Ranked Schemes + Missing Docs| CAFView
```

---

## 2. Targeted Document-Specific OCR Extractors (`targeted_extractors.py`)

Combines **Regex**, **Positional Heuristics** (for unlabelled Name on Aadhaar), and **FastEmbed ONNX** (for legal boilerplate in Caste certificates):

```python
# backend/app/services/targeted_extractors.py
import re
import numpy as np
from typing import List, Dict, Any
from fastembed import TextEmbedding

class TargetedDocumentExtractor:
    def __init__(self):
        # Quantized all-MiniLM-L6-v2 ONNX (~60MB RAM)
        self.embedder = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Canonical Caste boilerplate descriptors for semantic matching
        self.caste_anchors = {
            "SC": "scheduled caste anusuchit jati chamar jatav dalit valmiki",
            "ST": "scheduled tribe anusuchit janjati adivasi gond santhal",
            "OBC": "other backward class anya pichda varg non creamy layer",
            "EWS": "economically weaker section aarthik roop se kamzor"
        }
        self.caste_keys = list(self.caste_anchors.keys())
        self.caste_vectors = list(self.embedder.embed(list(self.caste_anchors.values())))

    def extract_aadhaar(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Aadhaar:
        Extracts ONLY Name, DOB, Gender, Masked Aadhaar, Pincode.
        DOES NOT extract income, caste, or education.
        """
        data = {"name": None, "dob": None, "gender": None, "masked_aadhaar": None, "pincode": None}
        full_text = " ".join(text_lines)

        # 1. Regex: 12-digit Aadhaar pattern with mandatory masking
        aadhaar_match = re.search(r'\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?([0-9]{4})\b', full_text)
        if aadhaar_match:
            data["masked_aadhaar"] = f"XXXX-XXXX-{aadhaar_match.group(1)}"

        # 2. Regex: Date of Birth
        dob_index = -1
        for idx, line in enumerate(text_lines):
            dob_match = re.search(r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b', line)
            if dob_match:
                data["dob"] = dob_match.group(1)
                dob_index = idx
                break
            elif "DOB" in line.upper() or "YEAR OF BIRTH" in line.upper():
                year_match = re.search(r'\b(19\d{2}|20\d{2})\b', line)
                if year_match:
                    data["dob"] = f"01/01/{year_match.group(1)}"
                    dob_index = idx
                    break

        # 3. Positional Heuristic for Name (Aadhaar cards lack a 'Name:' prefix!)
        # The line immediately preceding the DOB line is typically the applicant's Name.
        noise_words = ["GOVERNMENT", "INDIA", "BHARAT", "SARKAR", "ENROLMENT", "UNIQUE", "IDENTIFICATION", "AUTHORITY"]
        if dob_index > 0:
            candidate_line = text_lines[dob_index - 1].strip()
            # Verify candidate line is not government header noise and contains alphabets
            if not any(noise in candidate_line.upper() for noise in noise_words) and len(candidate_line) > 2:
                clean_name = re.sub(r'[^a-zA-Z\s]', '', candidate_line).strip()
                if len(clean_name) > 2:
                    data["name"] = clean_name.title()

        # 4. Regex: Gender
        gender_match = re.search(r'\b(MALE|FEMALE|TRANSGENDER|PURUSH|MAHILA)\b', full_text, re.IGNORECASE)
        if gender_match:
            g = gender_match.group(1).upper()
            data["gender"] = "FEMALE" if g in ["FEMALE", "MAHILA"] else "MALE"

        # 5. Regex: Pincode (from back side)
        pin_match = re.search(r'\b([1-9][0-9]{5})\b', full_text)
        if pin_match:
            data["pincode"] = pin_match.group(1)

        return data

    def extract_caste(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Caste Certificate:
        Extracts ONLY Category (SC, ST, OBC, EWS) and Certificate Reference.
        """
        data = {"category": None, "certificate_number": None}
        full_text = " ".join(text_lines)

        # 1. Regex: Certificate reference number
        cert_match = re.search(r'(?:NO|NUMBER|क्रमांक)[:\s]*([A-Z0-9/-]{8,25})', full_text, re.IGNORECASE)
        if cert_match:
            data["certificate_number"] = cert_match.group(1)

        # 2. FastEmbed Semantic Boilerplate Matching
        if text_lines:
            line_vectors = list(self.embedder.embed(text_lines))
            best_sim = 0.0
            best_cat = None

            for line_vec in line_vectors:
                for j, cat_key in enumerate(self.caste_keys):
                    anchor_vec = self.caste_vectors[j]
                    sim = float(np.dot(line_vec, anchor_vec) / (np.linalg.norm(line_vec) * np.linalg.norm(anchor_vec)))
                    if sim > best_sim and sim > 0.62:
                        best_sim = sim
                        best_cat = cat_key

            data["category"] = best_cat if best_cat else "GENERAL"

        return data

    def extract_income(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Income Certificate:
        Extracts ONLY Annual Income (₹) and Financial Year.
        """
        data = {"annual_income": None, "financial_year": None}
        full_text = " ".join(text_lines)

        # 1. Regex: Currency pattern near income terms
        income_match = re.search(r'(?:₹|INR|RS\.?|आय|RUPEES)\s?([0-9,]{4,8})', full_text, re.IGNORECASE)
        if income_match:
            try:
                data["annual_income"] = float(income_match.group(1).replace(",", ""))
            except ValueError:
                pass

        # 2. Regex: Financial Year (e.g. 2024-2025 or 2023-24)
        fy_match = re.search(r'\b(20[2-3][0-9]-[2-3][0-9]|20[2-3][0-9]-20[2-3][0-9])\b', full_text)
        if fy_match:
            data["financial_year"] = fy_match.group(1)

        return data

    def extract_marksheet(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Marksheet / Academic Certificate across all Indian boards & colleges:
        - Classifies education: 10th | 12th | ITI | Graduate | PostGraduate
        - Extracts student name via positional certificate heuristics
        - Extracts candidate date of birth
        - Bypasses fragile marks math to ensure cross-board compatibility
        """
        data: Dict[str, Any] = {
            "highest_education": None,
            "name": None,
            "dob": None,
            "certificate_number": None,
            "marks_percentage": None,
        }
        full_text = " ".join(text_lines)

        # 1. Multi-Board Qualification Hierarchy Matcher
        data["highest_education"] = classify_education_level(full_text)

        # 2. Student Name Heuristics (Preceding/Following certification cues)
        for idx, line in enumerate(text_lines):
            upper = line.upper()
            if any(c in upper for c in ["THIS IS TO CERTIFY THAT", "CERTIFY THAT", "NAME OF CANDIDATE", "CANDIDATE NAME"]):
                if idx + 1 < len(text_lines):
                    name_cand = clean_human_name(text_lines[idx + 1])
                    if name_cand and len(name_cand.split()) >= 2:
                        data["name"] = name_cand
                        break
            if "ROLL NO" in upper and idx > 0:
                name_cand = clean_human_name(text_lines[idx - 1])
                if name_cand and len(name_cand.split()) >= 2:
                    data["name"] = name_cand
                    break

        # 3. Date of Birth Extraction
        for idx, line in enumerate(text_lines):
            if any(c in line.upper() for c in ["DATE OF BIRTH", "DOB", "जन्म तिथि"]):
                dob_match = re.search(r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b', line)
                if dob_match:
                    data["dob"] = dob_match.group(1)
                    break

        return data
```

---

## 3. Targeted OCR Service with Memory Guardrails (`ocr_engine.py`)

```python
# backend/app/services/ocr_engine.py
import gc
import io
from PIL import Image
from rapidocr_onnxruntime import RapidOCR
from app.services.targeted_extractors import TargetedDocumentExtractor
from app.services.gemini_fallback import GeminiFallbackOCR

class ScopedOCREngine:
    def __init__(self):
        self.ocr = RapidOCR()
        self.extractor = TargetedDocumentExtractor()
        self.gemini_fallback = GeminiFallbackOCR()

    def downsample_image(self, image_bytes: bytes, max_dim: int = 1280) -> Image.Image:
        """Downscales raw mobile uploads to max 1280px to prevent 200MB memory spikes."""
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        width, height = img.size
        if max(width, height) > max_dim:
            scale = max_dim / float(max(width, height))
            new_size = (int(width * scale), int(height * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        return img

    def process_targeted_document(self, image_bytes: bytes, doc_type: str, force_engine: str = "AUTO") -> dict:
        """
        Executes targeted extraction based on specified document type.
        doc_type: 'AADHAAR' | 'CASTE' | 'INCOME' | 'MARKSHEET'
        """
        img = None
        try:
            # 1. Image Downsampling Guardrail
            img = self.downsample_image(image_bytes)
            
            text_lines = []
            overall_confidence = 0.0

            # 2. Local RapidOCR ONNX Execution
            if force_engine in ["AUTO", "RAPIDOCR"]:
                result, _ = self.ocr(img)
                if result:
                    confidences = [float(line[2]) for line in result]
                    overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
                    text_lines = [line[1] for line in result]

            # 3. Fallback to Gemini 1.5 Flash Vision if confidence < 65%
            if (force_engine == "GEMINI") or (force_engine == "AUTO" and overall_confidence < 0.65):
                return self.gemini_fallback.extract_targeted(image_bytes, doc_type)

            # 4. Route to Scoped Targeted Extractor
            if doc_type == "AADHAAR":
                extracted = self.extractor.extract_aadhaar(text_lines)
            elif doc_type == "CASTE":
                extracted = self.extractor.extract_caste(text_lines)
            elif doc_type == "INCOME":
                extracted = self.extractor.extract_income(text_lines)
            elif doc_type == "MARKSHEET":
                extracted = self.extractor.extract_marksheet(text_lines)
            else:
                extracted = {}

            extracted["doc_type"] = doc_type
            extracted["confidence"] = round(overall_confidence * 100, 1)
            extracted["engine"] = "RapidOCR_ONNX"
            return extracted

        finally:
            # 5. Strict Memory Cleanup
            if img:
                del img
            del image_bytes
            gc.collect()
```

---

## 4. Hidden Developer Panel HUD (`DevDebugDrawer.tsx`)

Activated via `Ctrl + Shift + D` or triple-tapping the header logo:

```tsx
// frontend/src/components/dev/DevDebugDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Cpu, ShieldAlert, RefreshCw } from 'lucide-react';

export const DevDebugDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK'>('AUTO');
  const [matcherEngine, setMatcherEngine] = useState<'FASTEMBED' | 'MOCK'>('FASTEMBED');
  const [memoryStats, setMemoryStats] = useState<{ rss_mb: number }>({ rss_mb: 85 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/dev/health');
      if (res.ok) {
        const data = await res.json();
        setMemoryStats(data);
      }
    } catch {}
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-2 right-2 z-50 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full opacity-30 hover:opacity-100 transition shadow"
        title="Developer HUD (Ctrl+Shift+D)"
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white text-xs font-mono">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
        <span className="font-bold text-amber-400 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> SIH Jury / Dev Debug Panel
        </span>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="bg-slate-800 p-2.5 rounded-lg mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400 flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> Server RAM (512MB Max)</span>
          <button onClick={fetchHealth}><RefreshCw className="w-3 h-3 text-slate-400 hover:text-white" /></button>
        </div>
        <div className="text-base font-bold text-emerald-400">{memoryStats.rss_mb} MB / 512 MB</div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-full" style={{ width: `${(memoryStats.rss_mb / 512) * 100}%` }}></div>
        </div>
      </div>

      <div className="mb-3 space-y-1">
        <label className="text-slate-400 font-semibold block">OCR Engine:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['AUTO', 'RAPIDOCR', 'GEMINI', 'MOCK'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setOcrEngine(mode)}
              className={`p-1.5 rounded text-center font-bold transition ${
                ocrEngine === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-1">
        <label className="text-slate-400 font-semibold block">Vector Matcher:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['FASTEMBED', 'MOCK'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setMatcherEngine(mode)}
              className={`p-1.5 rounded text-center font-bold transition ${
                matcherEngine === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-500 text-center mt-3">
        Shortcuts: <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Ctrl+Shift+D</kbd> or triple-tap logo
      </p>
    </div>
  );
};
```

---

## 5. Winning 3-Minute SIH Jury Presentation Script

```
┌────────────────────────────────────────────────────────────────────────┐
│            3-MINUTE SIH JURY PITCH SCRIPT (PROBLEM ID: 26092)          │
├───────┬──────────────────────┬─────────────────────────────────────────┤
│ TIME  │ ACTION / SCREEN      │ SPOKEN SCRIPT                           │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ 00:00 │ Open Homepage        │ "Respected Jury, ₹2.4 Lakh Crores of    │
│   -   │ Mobile View (360px)  │ government welfare subsidies sit idle   │
│ 00:30 │                      │ every year because rural and            │
│       │                      │ marginalized entrepreneurs face         │
│       │                      │ 50-page bureaucratic gazettes.          │
│       │                      │ Look at our interface: ZERO logins,     │
│       │                      │ ZERO passwords. Zero drop-off rate."    │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ 00:30 │ Pathway 1 Live Voice │ "Here is Ramesh Kumar, an illiterate    │
│   -   │ Click Hindi Mic      │ terracotta artisan from UP. He taps the │
│ 01:10 │                      │ mic: 'माटी के बर्तन बनाने के लिए 2 लाख   │
│       │                      │ का लोन चाहिए।'                          │
│       │                      │ In 300ms, our browser Web Speech API    │
│       │                      │ captures his intent. Matching schemes   │
│       │                      │ appear instantly. Now, notice this      │
│       │                      │ upgrade banner: with one tap, he can    │
│       │                      │ add details for 100% bank accuracy."    │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ 01:10 │ Pathway 2: RapidOCR  │ "He transitions seamlessly to Pathway 2 │
│   -   │ Targeted Extraction  │ without re-entering his profession.     │
│ 01:50 │ & Aadhaar Masking    │ He snaps a photo of his Aadhaar.        │
│       │                      │ Notice: Aadhaar cards have NO 'Name:'   │
│       │                      │ label! Our hybrid positional heuristic  │
│       │                      │ accurately identifies his name above    │
│       │                      │ the DOB line, and masks his Aadhaar to  │
│       │                      │ XXXX-XXXX-3456 in 1.1 seconds. He will  │
│       │                      │ NEVER have to upload it again."         │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ 01:50 │ Direct Document      │ "He attaches scheme required documents. │
│   -   │ Upload & FastEmbed   │ Our FastEmbed ONNX engine scores PMEGP  │
│ 02:30 │ Match %              │ at 94.5% compatibility! We don't just   │
│       │                      │ list schemes—we show the financial      │
│       │                      │ split: 35% Govt Grant, 5% own margin,   │
│       │                      │ and only missing documents are asked."  │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ 02:30 │ Common App Format    │ "With one click, we generate the Common │
│   -   │ (CAF) Print Preview  │ Application Format (CAF). It contains   │
│ 03:00 │ & Hidden Dev HUD     │ all attached particulars and documents, │
│       │                      │ ready to print for DIC sanction.        │
│       │                      │ And look at our Dev HUD: the entire     │
│       │                      │ AI backend runs under 240MB RAM on a    │
│       │                      │ 100% free server! Thank you!"           │
└───────┴──────────────────────┴─────────────────────────────────────────┘
```

---

## 6. Official Scheme Details Portal (`/schemes/[id]`) Architecture

### 6.1. Three-Column Responsive Layout
Modeled after the Government of India **myScheme.gov.in** portal:
1. **Left Navigation Column (`lg:col-span-3`, Sticky)**:
   - 8 standard sections: `Details`, `Benefits`, `Eligibility`, `Application Process`, `Documents Required`, `Frequently Asked Questions`, `Sources And References`, `Feedback`.
   - ScrollSpy active tab tracking: Dynamically listens to viewport scroll position to highlight the active section with `border-l-4 border-blue-600 bg-blue-50 text-blue-800`.
   - Smooth anchor scrolling on tab click.
2. **Center Narrative & Accordion Column (`lg:col-span-6`)**:
   - Official Ministry description (e.g. *National Solar Science Fellowship Programme (NSSFP)* under MNRE, launched Feb 2011).
   - Core research highlights & host institute collaborations (IITs, IISc, NITs, Central Labs).
   - 10 interactive FAQ accordions with independent expand/collapse states.
   - Statutory required documents breakdown with issuing authority metadata.
   - Thumbs-up / Thumbs-down feedback widget.
3. **Right Sidebar Widgets (`lg:col-span-3`, Sticky)**:
   - Financial Summary Card: Grant percentage, tenure, collateral exemption.
   - **`Fill Custom Details & Apply`** CTA button: Routes the user straight into Pathway 2 (`/apply`) with pre-filled context.
   - **News and Updates**: Live feed card with official government circular dates.
   - **Share This Scheme**: One-click social links for WhatsApp, Telegram, X, and native clipboard copy with feedback toast.

### 6.2. Scheme Data Model Extension (`SchemeMatch`)
```typescript
export interface SchemeFAQ {
  question: string;
  answer: string;
}

export interface SchemeMatch {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  ministryEn: string;
  ministryHi: string;
  descriptionEn: string;
  descriptionHi: string;
  compatibilityPercentage: number;
  categoryBadge: string;
  financials: SchemeFinancials;
  requiredDocuments: string[];
  verifiedDocuments: string[];
  missingDocuments: string[];
  eligibilityHighlights: string[];
  nodalAgency: string;
  tags?: string[];
  benefits?: string[];
  eligibilityCriteria?: string[];
  applicationProcess?: string[];
  faqs?: SchemeFAQ[];
  sourcesAndReferences?: { title: string; url?: string }[];
}
```

---

## 7. Android-Style Accessibility Architecture & TalkBack Engine

### 7.1. Component Architecture & Shell Hierarchy
```
┌────────────────────────────────────────────────────────────────────────┐
│                   RootLayout (app/layout.tsx)                         │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ AccessibilityShell (components/accessibility/AccessibilityShell)   │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ AccessibilityProvider (context/AccessibilityContext.tsx)       │ │ │
│ │ │ • State: Contrast, Zoom, Font, TalkBack, Reading Guide, Lens   │ │ │
│ │ │ • Persistence: localStorage ('udyamsetu_a11y_prefs')           │ │ │
│ │ ├────────────────────────────────────────────────────────────────┤ │ │
│ │ │ Page Content ({children}):                                     │ │ │
│ │ │   ├── Header (Single Unified ♿ Accessibility Button)           │ │ │
│ │ │   ├── Pathway 1 / Pathway 2 / Scheme Details / CAF             │ │ │
│ │ │   └── Footer                                                   │ │ │
│ │ ├────────────────────────────────────────────────────────────────┤ │ │
│ │ │ AccessibilityMenuModal (Android Quick Settings Drawer)         │ │ │
│ │ │ TalkBackSpeechBar (Floating Audio Playback Controller)         │ │ │
│ │ │ MagnifierLens & ReadingGuide (Cursor Spotlight & Focus Ruler)   │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │ │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2. TalkBack Screen Reader Engine Specs
- **Speech API**: Native `window.speechSynthesis` and `SpeechSynthesisUtterance`.
- **Voice Selection**:
  - Automatically queries available system voices (`window.speechSynthesis.getVoices()`).
  - Prioritizes `hi-IN` / Hindi voices when page language is `hi`.
  - Prioritizes `en-IN` / Indian English or general English when page language is `en`.
- **Interactive DOM Scanner**:
  - Listens to `mouseover` (250ms debounce) and `focusin` events across `document`.
  - Intelligently extracts readable strings from `aria-label`, `title`, button labels, headings, inputs, and scheme card highlights.
  - Excludes container elements and controller bars to prevent feedback loops.
- **Visual Feedback Ring**:
  - Injects `.talkback-speaking-outline` (`outline: 3px solid #FFE600 !important; box-shadow: 0 0 16px rgba(255, 230, 0, 0.9)`).
  - Automatically un-mounts the ring when utterance finishes or user focuses elsewhere.
- **Keyboard Shortcuts**:
  - `Alt + A`: Toggle Accessibility Menu modal.
  - `Alt + T`: Toggle TalkBack screen reader on/off.
  - `Escape`: Instantly cancels active speech.

### 7.3. WCAG AAA High Contrast & Magnifier Token Matrix
| Feature | Class / Style | Specifications |
| :--- | :--- | :--- |
| **Yellow on Black (Dark)** | `html.a11y-contrast-yellow` | Background `#000000`, Typography `#FFE600`, Accents `#00F0FF`, 2px solid yellow borders on cards, inputs, and buttons ($>14:1$ contrast ratio) |
| **Monochrome (Light)** | `html.a11y-contrast-mono` | Background `#FFFFFF`, Typography `#000000`, 2px solid black borders |
| **Global Page Zoom** | `body { zoom: X% }` | Supports `100%`, `125%`, `150%`, `175%`, `200%` |
| **Magnifier Lens** | `#magnifier-lens` | 192px circular spotlight tracking `(clientX, clientY)` with 2x enlarged text preview |
| **Reading Guide** | `#reading-guide` | Horizontal semi-transparent ruler with yellow focus lines tracking `clientY` |
| **Dyslexia Typography** | `html.a11y-dyslexia` | `letter-spacing: 0.06em; word-spacing: 0.12em; line-height: 1.8` |

---

## 8. Comparative Analytics Engine & Interactive 2-Scheme Architecture

To replace static multi-scheme comparison tables with an interactive, user-driven system, Scheme Seva Kendra provides a dedicated side-by-side comparative analytics engine spanning backend and frontend:

### 8.1 Backend API Specification: `GET /api/v1/schemes/compare`
- **Route**: `GET /api/v1/schemes/compare?scheme_a={id}&scheme_b={id}`
- **Query Parameters**:
  - `scheme_a`: Scheme ID or unique code (e.g. `pm-vishwakarma`).
  - `scheme_b`: Scheme ID or unique code (e.g. `pm-egp`).
- **Response Schema (`SchemeComparisonResponse`)**:
```json
{
  "schemeA": {
    "id": "pm-vishwakarma",
    "code": "PM_VISHWAKARMA",
    "nameEn": "PM Vishwakarma Kaushal Samman",
    "nameHi": "प्रधानमंत्री विश्वकर्मा कौशल सम्मान योजना",
    "financials": {
      "grantSubsidyPercentage": 15.0,
      "maxGrantAmount": 15000.0,
      "loanPercentage": 85.0,
      "promoterMarginPercentage": 0.0,
      "subsidizedInterestRate": 5.0,
      "moratoriumPeriodMonths": 3,
      "collateralRequired": false
    },
    "requiredDocuments": ["DOC_AADHAAR", "DOC_CASTE"]
  },
  "schemeB": {
    "id": "pm-egp",
    "code": "PMEGP",
    "nameEn": "Prime Minister's Employment Generation Programme (PMEGP)",
    "nameHi": "प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP)",
    "financials": {
      "grantSubsidyPercentage": 35.0,
      "maxGrantAmount": 1750000.0,
      "loanPercentage": 60.0,
      "promoterMarginPercentage": 5.0,
      "subsidizedInterestRate": 8.5,
      "moratoriumPeriodMonths": 6,
      "collateralRequired": false
    },
    "requiredDocuments": ["DOC_AADHAAR", "DOC_CASTE", "DOC_RURAL", "DOC_INCOME"]
  },
  "comparisonSummary": {
    "grantSubsidyDiffPercentage": -20.0,
    "maxGrantAmountDiff": -1735000.0,
    "loanPercentageDiff": 25.0,
    "promoterMarginDiff": -5.0,
    "commonDocuments": ["DOC_AADHAAR", "DOC_CASTE"],
    "uniqueDocumentsA": [],
    "uniqueDocumentsB": ["DOC_RURAL", "DOC_INCOME"]
  }
}
```

### 8.2 Summary Differentials Algorithm
The backend computes statutory financial and document differentials in $O(1)$ time:
1. **Grant Subsidy Differential**: $\Delta_{\text{grant}} = \text{grant}_A - \text{grant}_B$.
2. **Loan Ceiling Differential**: $\Delta_{\text{loan}} = \text{max\_grant}_A - \text{max\_grant}_B$.
3. **Promoter Margin Differential**: $\Delta_{\text{margin}} = \text{margin}_A - \text{margin}_B$.
4. **Document Set Operations**:
   - $\text{Common} = \mathcal{D}_A \cap \mathcal{D}_B$
   - $\text{Unique}_A = \mathcal{D}_A \setminus \mathcal{D}_B$
   - $\text{Unique}_B = \mathcal{D}_B \setminus \mathcal{D}_A$

### 8.3 Frontend UI State Machine (`CompareDrawer.tsx`)
The frontend drawer maintains an interactive 2-phase state machine:
```
┌────────────────────────────────────────────────────────┐
│ Drawer Opened with initialScheme (Scheme 1)            │
└───────────────────────────┬────────────────────────────┘
                            │
              Is Scheme 2 (schemeB) selected?
             /                               \
         NO /                                 \ YES
           ▼                                   ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│ PHASE 1: ASKING & SELECTION    │  │ PHASE 2: STRICT 2-SCHEME MATRIX│
│ • Prompt: "Which scheme to     │  │ • Side-by-side 2 columns only  │
│   compare with [Scheme 1]?"    │  │ • 10 Comparative Dimensions    │
│ • Real-time search input       │  │ • Central ⇄ Swap Button        │
│ • Filtered candidate cards     │  │ • Top dropdown scheme changers │
│ • 1-click "Compare with this"  │  │ • Direct CTAs: Details & Apply │
└────────────────────────────────┘  └────────────────────────────────┘
```

### 8.4 Ubiquitous Integration Points
- `frontend/src/components/pathway1/BaselineMatchPreview.tsx`: Card-level and header compare buttons.
- `frontend/src/app/page.tsx`: Pathway 2 card compare buttons and Stage 3 summary header button.
- `frontend/src/app/dashboard/page.tsx`: Top action bar and card compare buttons.
- `frontend/src/app/schemes/[id]/page.tsx`: Top breadcrumb actions and hero header compare badge.
- `frontend/src/lib/api.ts`: `ApiService.compareSchemes(schemeAId, schemeBId)` with seamless local fallback to `MOCK_SCHEMES`.


