# AGENTS.md - Scheme Seva Kendra (योजना सेवा केंद्र) Rules & Architecture Mandates
## Project: Scheme Seva Kendra | SIH Problem Statement 26092
## Target Environment: Render Free Tier (512MB RAM / 1 vCPU) + Vercel Edge Frontend
## Engineering Squad: 2 Developers (36-Hour Hackathon)

---

## 1. 512MB RAM Hard Memory Ceiling & Guardrails

> [!CAUTION]
> Any memory consumption above 450MB on Render triggers an immediate SIGKILL (OOM crash). The entire backend stack must operate strictly under a ~330MB peak budget.

### Memory Budget Breakdown
| Component | Technology Choice | RAM Allocation |
| :--- | :--- | :--- |
| **API Server** | FastAPI + Uvicorn (`--workers 1`) | ~40 MB – 50 MB |
| **Embedding Engine** | `fastembed` (`all-MiniLM-L6-v2` INT8 ONNX) | ~60 MB |
| **Primary Local OCR** | `rapidocr-onnxruntime` | ~90 MB – 120 MB |
| **Image Buffer / Preprocessing** | PIL (downscaled to $\le 1280\text{px}$) | ~50 MB |
| **Total Memory Profile** | **Clean ONNX Execution** | **~240 MB – 280 MB** (Safe) |

### Strict Implementation Mandates
1. **NO PyTorch or PaddlePaddle Imports**:
   - `import torch` and `import paddle` are STRICTLY FORBIDDEN.
   - Use `from fastembed import TextEmbedding` and `from rapidocr_onnxruntime import RapidOCR`. Both run on lightweight `onnxruntime` with C++ tokenizers.
2. **Image Downsampling Guardrail**:
   - Every uploaded image must be downscaled to a maximum dimension of 1280px using PIL before passing to RapidOCR. Processing raw 4K smartphone photos causes 200MB memory spikes that kill the container.
3. **Aggressive Garbage Collection**:
   - Explicitly call `del raw_bytes`, `del img`, followed by `import gc; gc.collect()` immediately after OCR text extraction is complete.
4. **Single-Worker Execution**:
   - Uvicorn start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1`. Multiple workers duplicate memory and will cause an OOM crash.
5. **Fallback Routing**:
   - If local RapidOCR confidence < 65% or processing times out (> 3000ms), route the request automatically to **Google Gemini 1.5 Flash Vision** (0MB server RAM).

---

## 2. Directory Layout (Monorepo)

```text
scheme-seva-kendra/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entry & CORS
│   │   ├── config.py                   # Pydantic Settings
│   │   ├── models/                     # SQLite / Pydantic models
│   │   ├── services/
│   │   │   ├── embedding_service.py    # FastEmbed ONNX singleton
│   │   │   ├── ocr_engine.py           # RapidOCR + Image Resizer + gc.collect()
│   │   │   ├── targeted_extractors.py  # Aadhaar, Caste, Income & Marksheet parsers
│   │   │   ├── gemini_fallback.py      # Gemini 1.5 Flash Vision client
│   │   │   └── matcher.py              # Hybrid SQL filter + FastEmbed cosine
│   │   ├── api/v1/
│   │   │   ├── routes_schemes.py       # Scheme query, match & comparative analytics endpoints
│   │   │   ├── routes_ocr.py           # Targeted document extraction endpoint
│   │   │   ├── routes_kyc.py           # DigiLocker mock eKYC endpoint
│   │   │   └── routes_dev.py           # Hidden Dev HUD health & toggle API
│   │   └── data/
│   │       ├── schemes.json            # 25+ real Indian welfare schemes
│   │       └── caste_benchmarks.json   # FastEmbed boilerplate category anchors
│   ├── Dockerfile                      # Debian-slim with libgomp1
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx              # Root shell, AccessibilityShell & Dev HUD trigger
    │   │   ├── page.tsx                # Pathway 1: 1-Tap Profession & Voice Discovery
    │   │   ├── globals.css             # Tailwind CSS, High Contrast & Print styles
    │   │   ├── apply/
    │   │   │   └── page.tsx            # Pathway 2: Full Assisted Wizard
    │   │   ├── dashboard/
    │   │   │   └── page.tsx            # Ranked Schemes & Compatibility %
    │   │   ├── schemes/
    │   │   │   └── [id]/
    │   │   │       └── page.tsx        # Official myScheme Details Portal (8 Tabs, ScrollSpy, 10 FAQs)
    │   │   └── caf/
    │   │       └── page.tsx            # Printable Common Application Format
    │   ├── components/
    │   │   ├── accessibility/
    │   │   │   ├── AccessibilityMenuModal.tsx # Android Quick Settings Accessibility Drawer
    │   │   │   ├── TalkBackSpeechBar.tsx      # Floating speech audio playback controller
    │   │   │   ├── MagnifierLens.tsx          # Interactive 2x cursor spotlight & Reading Guide
    │   │   │   └── AccessibilityShell.tsx     # Global accessibility wrapper shell
    │   │   ├── common/
    │   │   │   ├── Header.tsx          # Gov branding, unified ♿ Accessibility button & badges
    │   │   │   └── Footer.tsx          # National portal footer & helpline
    │   │   ├── compare/
    │   │   │   ├── CompareDrawer.tsx   # Side-by-side scheme comparison drawer
    │   │   │   └── FinancialAnalysisDrawer.tsx # Deep subsidy & promoter margin breakdown
    │   │   ├── dev/
    │   │   │   └── DevDebugDrawer.tsx  # Hidden Developer Panel HUD
    │   │   ├── kyc/
    │   │   │   └── DigiLockerModal.tsx # Sandbox OTP eKYC verification
    │   │   ├── ocr/
    │   │   │   └── TargetedOcrUpload.tsx # Scoped document dropzone & auto-fill
    │   │   ├── pathway1/
    │   │   │   ├── BaselineMatchPreview.tsx # Instant matching schemes card list with direct scheme details link
    │   │   │   ├── TradeSearchAndPills.tsx  # Interactive trade pills & instant search
    │   │   │   └── UpgradeBanner.tsx        # Pathway 2 contextual upgrade prompt
    │   │   └── caf/
    │   │       └── CommonAppFormat.tsx # Official printable A4 dossier
    │   ├── context/
    │   │   └── AccessibilityContext.tsx # TalkBack Web Speech Synthesis & Contrast state
    │   ├── hooks/
    │   │   ├── useSpeechRecognition.ts # Web Speech API (Hindi/English)
    │   │   └── useDevHUD.ts            # Ctrl+Shift+D keyboard trigger & multi-tap
    │   ├── lib/
    │   │   ├── api.ts                  # Backend API client with offline mock fallback
    │   │   ├── mockData.ts             # Offline mock database (NSSFP, PMEGP, PM-SVANidhi, etc.)
    │   │   └── storage.ts              # LocalStorage zero-login state manager
    │   └── types/
    │       └── index.ts                # TypeScript types (SchemeMatch, SchemeFAQ, CitizenProfile)
    └── package.json
```

---

## 3. Minimal `requirements.txt` (Under 60MB Installation)

```text
fastapi==0.111.0
uvicorn==0.30.1
pydantic==2.7.4
pydantic-settings==2.3.4
fastembed==0.3.1
rapidocr-onnxruntime==1.3.24
pillow==10.3.0
google-genai==0.1.1
numpy==1.26.4
python-multipart==0.0.9
httpx==0.27.0
psutil==5.9.8
```

---

## 4. Production Dockerfile for Render Free Tier

```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install minimal C++ runtime libraries for ONNX and PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the FastEmbed ONNX model during build so runtime does not hang
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/all-MiniLM-L6-v2')"

COPY . .

# Explicit single worker to avoid 512MB RAM overflow
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```
