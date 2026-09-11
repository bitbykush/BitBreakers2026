# 36-Hour Hackathon Execution Roadmap (2 Developers)
## Project: UdyamSetu AI (SIH-26092)

---

## 1. Squad Responsibilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                        2-DEVELOPER SPRINT ALLOCATION                   │
├───────────────────────────────────┬────────────────────────────────────┤
│ DEV 1: Frontend & UX Specialist   │ DEV 2: Backend, AI & Infra Lead    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Next.js 14 mobile shell (360px) │ • Single-worker FastAPI container  │
│ • Pathway 1 -> Pathway 2 upgrade  │ • FastEmbed ONNX embedding service │
│   seamless state carryover        │ • RapidOCR + Image Downsampler     │
│ • Web Speech STT hook (Hindi/EN)  │ • Targeted Extractors (4 docs)     │
│ • Document-specific upload tabs   │ • Hybrid Regex + Positional Heurist│
│ • Dynamic Scheme Cards (0-100%)   │ • Gemini 1.5 Flash fallback router │
│ • Printable Common App Format(CAF)│ • Dynamic Missing Document Engine  │
│ • Hidden Dev Panel Drawer HUD     │ • Mock DigiLocker eKYC API         │
│ • Vercel Edge Deployment          │ • Render 512MB Dockerfile deploy   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Chronological Sprint Schedule

```
  HOURS 00:00 - 06:00 | SPRINT BLOCK 1: FAST RUNTIMES & SCAFFOLDING
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Initialize Next.js 14 App Router, Tailwind, mobile viewport (360px).
         Setup client `localStorage` zero-login state manager.
  DEV 2: Build Dockerfile with `fastembed` & `rapidocr-onnxruntime`.
         Verify baseline idle RAM < 90MB on Python 3.11 slim.
  MILESTONE 1: Both dev servers active; backend memory verified at ~85MB.

  HOURS 06:00 - 12:00 | SPRINT BLOCK 2: DUAL PATHWAYS & HYBRID MATCHER
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Build Pathway 1 (1-Tap Profession Grid + Voice Mic).
         Implement Upgrade button that pushes into Pathway 2 with pre-filled state.
  DEV 2: Ingest 25+ real schemes into `schemes.json` with eligibility bounds.
         Precompute FastEmbed vectors; implement hybrid SQL filter + cosine matcher.
  MILESTONE 2: `/api/v1/schemes/match` returns ranked schemes in < 150ms.

  HOURS 12:00 - 18:00 | SPRINT BLOCK 3: TARGETED OCR, HYBRID REGEX & HEURISTICS
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Build Targeted Document Upload tabs (Aadhaar, Caste, Income, Marks)
         with instant field previews. Add Web Speech STT hook.
  DEV 2: Build `/api/v1/ocr/extract-targeted`:
         1. PIL image downscaling to max 1280px.
         2. RapidOCR ONNX extraction + `gc.collect()`.
         3. Targeted extractors: Aadhaar (positional Name heuristic),
            Caste (FastEmbed boilerplate match), Income (regex), Marksheets.
         4. Aadhaar masking regex (`XXXX-XXXX-1234`).
         5. Gemini 1.5 Flash Vision fallback router.
  MILESTONE 3: Uploading an unlabelled Aadhaar card populates Name and masked ID;
               memory peak stays < 280MB.

  HOURS 18:00 - 24:00 | SPRINT BLOCK 4: DOCUMENT MEMORY & DEV PANEL HUD
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Build Scheme Cards with Compatibility Gauge (0-100%) and Grant visualizer.
         Build Hidden Dev HUD (`Ctrl + Shift + D` / triple tap logo).
  DEV 2: Build Dynamic Document Resolver: checks `uploaded_document_codes` and
         omits them from the scheme checklist. Build `/api/v1/dev/health`.
  MILESTONE 4: Dev HUD allows toggling RapidOCR vs Gemini vs Mock mode live.

  HOURS 24:00 - 30:00 | SPRINT BLOCK 5: COMMON APP FORMAT & DIGILOCKER E-KYC
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Build Printable Common Application Format (CAF) with `@media print` A4.
         Build DigiLocker OTP modal with green verification stamp.
  DEV 2: Build mock eKYC verification endpoint `POST /api/v1/kyc/verify-otp`.
         Embed DigiLocker certificate reference numbers into the CAF payload.
  MILESTONE 5: User can preview and print an A4 CAF dossier with eKYC stamps.

  HOURS 30:00 - 36:00 | SPRINT BLOCK 6: DEPLOYMENT, TESTING & JURY DRILLS
  ════════════════════════════════════════════════════════════════════════════
  DEV 1: Deploy frontend to Vercel. Test on actual mobile smartphone.
  DEV 2: Deploy backend to Render free tier (`--workers 1`). Monitor RAM telemetry.
  BOTH:  Test offline fallback mode (`NEXT_PUBLIC_MOCK_MODE=true`).
         Conduct 3-minute jury pitch rehearsals with Sunita Devi persona.
  MILESTONE 6: Winning, production-ready SIH demo ready for final evaluation.
```

---

## 3. Go / No-Go Decision Gates
- **Hour 06:00**: Memory check $\rightarrow$ Backend idle RSS $< 95$MB. (If failing, prune imports).
- **Hour 14:00**: OCR throughput check $\rightarrow$ RapidOCR processes downscaled image in $< 1.8$s with RAM peak $< 290$MB.
- **Hour 22:00**: Pathway transition check $\rightarrow$ Upgrading from Pathway 1 seamlessly loads Pathway 2 with zero lost inputs.
- **Hour 32:00**: Offline fail-safe check $\rightarrow$ Disconnect laptop from Wi-Fi; verify full demo completes using cached mock state.
