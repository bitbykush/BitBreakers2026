# COLLABORATIONS.md — Multi-Agent & 2-Developer Git Collaboration Protocol
## Project: Scheme Seva Kendra (योजना सेवा केंद्र) | Target Repository: `BitBreakers2026` | Hackathon: SIH Problem Statement 26092

---

> [!IMPORTANT]
> **Mandatory Rule for All AI Coding Agents & Human Developers**:
> Both Developer 1's AI agent and Developer 2's AI agent MUST strictly read and follow this protocol before creating branches, editing files, or committing code. This prevents branch collisions, context divergence, and fatal merge conflicts during our 36-hour sprint.

---

## 1. Squad Allocation & Strict File Ownership

To ensure zero merge conflicts during parallel coding, file ownership is strictly isolated between the two roles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN BOUNDARIES                               │
├───────────────────────────────────┬────────────────────────────────────┤
│ DEV 1 / AGENT 1 (Frontend & UX)   │ DEV 2 / AGENT 2 (Backend & AI)     │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Owns: `frontend/`               │ • Owns: `backend/`                 │
│ • UI components, styles, hooks    │ • FastAPI routes, models, schemas  │
│ • Web Speech API, LocalStorage    │ • FastEmbed, RapidOCR, Gemini API  │
│ • Android Accessibility Suite:    │ • Targeted Extractors (Aadhaar,    │
│   TalkBack, High Contrast AAA,    │   Caste, Income, Marksheet)        │
│   Magnifier, Single Header Btn    │ • Dynamic Document Engine, Docker  │
│ • Official myScheme Details       │ • DigiLocker mock eKYC endpoint    │
│   Portal (/schemes/[id]) with     │                                    │
│   8 tabs, ScrollSpy, 10 FAQs      │                                    │
│ • Baseline Matches & Trade Pills  │                                    │
│ • Side-by-Side Compare Drawer     │                                    │
│ • Financial Breakdown Drawer      │                                    │
│ • CAF Print View, Dev HUD Drawer  │                                    │
│ ❌ NEVER modifies `backend/` files │ ❌ NEVER modifies `frontend/` files │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Shared Source of Truth (Root Files)
- `PRD.md` — Feature scope, user journeys, and acceptance criteria.
- `AGENTS.md` — System rules, 512MB RAM budget, and naming conventions.
- `Phases.md` — 36-hour milestone schedule and task checklist.
- `System_Design.md` — API schemas, JSON data models, and OCR logic.
- `collaborations.md` — This file.

*Rule: Root `.md` files may only be modified after agreement by both teammates.*

---

## 2. Git Branching Strategy

```text
main (Production: Vercel & Render Live Deployments)
  ▲
  │ (Stable merge after smoke test)
  │
dev (Integration Branch)
  ▲
  ├── feat/dev1-dual-pathways
  ├── feat/dev1-web-speech-stt
  ├── feat/dev1-caf-print-view
  ├── feat/dev1-dev-hud-drawer
  │
  ├── feat/dev2-fastembed-setup
  ├── feat/dev2-targeted-ocr
  ├── feat/dev2-scheme-matcher
  └── feat/dev2-digilocker-ekyc
```

### Branch Naming Rules
1. **Frontend Branches**: `feat/dev1-<feature-slug>` or `fix/dev1-<bug-slug>`.
2. **Backend Branches**: `feat/dev2-<feature-slug>` or `fix/dev2-<bug-slug>`.
3. **Emergency Fixes**: `hotfix/<slug>`.

---

## 3. Step-by-Step Safe Workflow (Feature Cycle)

Every agent and developer must execute this exact loop for each assigned task:

### Step A: Pull Latest Changes Before Coding
```bash
git checkout dev
git pull origin dev
```

### Step B: Create a Scoped Feature Branch
```bash
# For Dev 1 (Frontend)
git checkout -b feat/dev1-pathway-upgrade

# For Dev 2 (Backend)
git checkout -b feat/dev2-targeted-ocr
```

### Step C: Commit with Conventional Format
Keep commits atomic and descriptive:
- `feat(ui): add 1-tap profession grid and upgrade banner`
- `feat(ocr): add targeted aadhaar extractor with positional name heuristic`
- `fix(backend): enforce image downscaling to 1280px to prevent OOM`
- `docs(specs): sync API response schema for missing documents`

### Step D: Rebase onto `dev` Before Merging
```bash
# Ensure local dev is fresh
git fetch origin
git rebase origin/dev

# Push feature branch
git push -u origin feat/dev1-pathway-upgrade
```

### Step E: Merge into `dev` via Pull Request (or Fast-Forward)
Run the verification check before merging:
1. Frontend passes `npm run build` without TypeScript errors.
2. Backend passes memory check (`psutil` RSS $< 120$MB idle).
3. Merge PR into `dev`.

### Step F: Deploying to `main`
`main` is synced with `dev` at major milestone gates (Hour 12, Hour 24, Hour 32) to trigger automatic deployments on Vercel and Render.

---

## 4. API Contract & Shared Interface Rule

Neither Dev 1 nor Dev 2 may alter the API request or response signatures without updating `System_Design.md` first.

### The Canonical API Contract:
1. **`POST /api/v1/schemes/match`**:
   - Accepts: `{ profession, category, annual_income_inr, gender, area, uploaded_document_codes: [] }`
   - Returns: `{ status, count, matches: [{ id, code, name_en, name_hi, compatibility_percentage, grant_subsidy_percentage, loan_percentage, promoter_margin_percentage, document_readiness: { verified_documents, missing_documents } }] }`
2. **`POST /api/v1/ocr/extract-targeted`**:
   - Accepts: `multipart/form-data` with `file: UploadFile` and `doc_type: 'AADHAAR' | 'CASTE' | 'INCOME' | 'MARKSHEET'`
   - Returns: `{ doc_type, masked_aadhaar, name, dob, gender, category, annual_income, marks_percentage, highest_education, confidence, engine }`
3. **`POST /api/v1/kyc/verify-otp`**:
   - Accepts: `{ aadhaar_or_mobile: string, otp: "123456" }`
   - Returns: `{ verified: true, ref_id: "DL-2026-X8921", timestamp: ISOString }`
4. **`GET /api/v1/dev/health`**:
   - Returns: `{ status: "healthy", process_rss_mb: number, max_limit_mb: 512, percent_used: number }`
5. **`GET /api/v1/schemes/{id}` / Extended Model**:
   - Supports the official myScheme.gov.in details dossier (`/schemes/[id]`).
   - Returns: Comprehensive metadata with `benefits: string[]`, `eligibility_criteria: string[]`, `application_process: string[]`, `faqs: [{ question, answer }]`, `sources_and_references: [{ title, url }]`, and `tags: string[]`.
6. **`GET /api/v1/schemes/compare`**:
   - Accepts: `scheme_a={id_or_code}&scheme_b={id_or_code}`
   - Returns: `{ schemeA: SchemeMatch, schemeB: SchemeMatch, comparisonSummary: { grantSubsidyDiffPercentage, maxGrantAmountDiff, loanPercentageDiff, promoterMarginDiff, commonDocuments: [], uniqueDocumentsA: [], uniqueDocumentsB: [] } }`

---

## 5. Agent Context Synchronization Protocol

When a teammate's AI agent boots up in a new chat session:
1. **Read Core Context**: The agent MUST load:
   - `PRD.md` (What we are building)
   - `AGENTS.md` (Hardware memory limits & ONNX rules)
   - `Phases.md` (Current milestone progress)
   - `collaborations.md` (This file)
2. **Check Current Branch & Status**: Run `git status` and `git branch` before making any edits.
3. **Never Overwrite Peer Work**: If an agent encounters changes in the other domain (`frontend` vs `backend`), it must stop and alert the human developer.

---

## 6. Offline / Hackathon Venue Incident Protocol

In case of internet failure at the hackathon venue:
1. **Do not force-push**: Keep commits local (`git commit`).
2. **Use P2P Local Sync**:
   - Create a git bundle: `git bundle create updates.bundle dev`
   - Transfer via USB drive to teammate's machine.
   - Pull from bundle: `git pull updates.bundle dev`.
3. **Activate Demo Mode**: Set `NEXT_PUBLIC_MOCK_MODE=true` in frontend to demonstrate the complete workflow offline.
