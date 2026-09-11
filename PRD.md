# Product Requirements Document (PRD)
## Project Name: UdyamSetu AI (उद्यम सेतु)
### Subtitle: Zero-Login, AI-Driven Welfare & Scholarship Matcher with Common Application Dossier
### Problem Statement ID: SIH-26092 | Target Track: Smart Welfare & Inclusive Governance

---

## 1. Vision & Core Philosophy
UdyamSetu AI bridges the gap between 63 million marginalized entrepreneurs (SC, ST, OBC, EWS, Minorities, Women) and students seeking government welfare/credit-linked subsidies and scholarships. 

### Hard Operational Constraints
1. **Zero-Login Architecture**: No passwords, phone numbers, or OTP registration barriers. Session state is managed via client-side `localStorage` with an ephemeral UUID to guarantee zero user drop-off.
2. **512MB RAM Server Ceiling**: The entire backend must run stably on Render's 512MB RAM free-tier without triggering OOM SIGKILL crashes.
3. **Aadhaar Privacy Compliance**: Strict adherence to UIDAI regulations—all 12-digit Aadhaar numbers are immediately redacted to `XXXX-XXXX-1234`.
4. **Pathway Convergence**: Upgrading from Pathway 1 (1-tap profession/voice) transitions directly into Pathway 2 (Full Assisted Form) with the profession pre-filled. From that point on, both pathways are identical.

---

## 2. The Two User Pathways & Convergence Logic

```
   ┌────────────────────────────────────────────────────────┐
   │                  User Lands on Platform                │
   │               (Zero-Login, Mobile-First PWA)           │
   └───────────┬────────────────────────────────┬───────────┘
               │                                │
               ▼                                ▼
   ┌───────────────────────┐        ┌───────────────────────┐
   │ PATHWAY 1 (No-Tech)   │        │ PATHWAY 2 (Assisted)  │
   │ • 1-Tap Profession    │        │ • Multi-Step Form     │
   │ • Voice Speech Input  │        │ • Personal, Caste,    │
   │ • Fast 300ms Preview  │        │   Income, Education   │
   └───────────┬───────────┘        │ • Targeted OCR Upload │
               │                    └───────────┬───────────┘
               │ [UPGRADE CLICKED]              │
               │ (Carries Selected Field)       │
               └────────────────►───────────────┘
                                │
                                ▼
   ┌────────────────────────────────────────────────────────┐
   │       PATHWAY 2 CONTINUATION (Unified Flow)            │
   │ • All fields editable + Targeted Document Extraction   │
   │ • Scheme Compatibility Score (0 - 100%)                │
   │ • Scheme-Specific Document Missing List                │
   │ • DigiLocker Sandbox eKYC Authentication               │
   │ • Common Application Format (CAF) A4 Print Dossier     │
   └────────────────────────────────────────────────────────┘
```

### Pathway 1: Ultra-Simple (Zero Technical Knowledge)
- **Target Audience:** Illiterate artisans, rural potters, street vendors, small farmers.
- **Interface:** Large visual icon cards (Farming/Dairy, Pottery/Artisan, Street Vendor, Tailoring, Food Stall, Carpentry, Teaching/Coaching, EV Repair).
- **Voice Input:** High-visibility microphone button using the browser Web Speech API in Hindi (`hi-IN`) and English (`en-IN`).
- **Immediate Outcome:** Instant preliminary preview of baseline schemes (e.g., PM-SVANidhi, PM Mudra Shishu).
- **The Upgrade Anchor:** A persistent banner:
  > 💡 *“Want exact subsidy grant amounts and an official bank-ready dossier? Click to add your details or snap an Aadhaar photo.”*
- **Convergence Rule:** Clicking this immediately routes the user into **Pathway 2**, automatically setting the `profession` field. From this point forward, the user is in Pathway 2; there is zero divergence.

### Pathway 2: Full Assisted Details (Comprehensive Profiling)
- **Target Audience:** Semi-literate micro-entrepreneurs, youth seeking venture capital, students applying for post-matric/merit scholarships.
- **Data Captured:**
  - Full Name, Date of Birth / Age, Gender.
  - Social Category (`SC`, `ST`, `OBC`, `EWS`, `General`, `Minority`), Annual Household Income (₹).
  - State, District, Area Type (`Rural` / `Urban`).
  - Education Level, Current Course, Previous Exam Percentage (for scholarships).
  - Business/Project Sector, Required Capital (₹).

---

## 3. Targeted Document-Specific OCR Extraction Matrix

To maximize accuracy, eliminate false positives, and protect CPU/RAM budgets, document extraction is strictly scoped by document type:

| Document Type | Extracted Fields (Targeted Only) | Ignored Fields (Do Not Extract) | Extraction Method |
| :--- | :--- | :--- | :--- |
| **Aadhaar Card (Front/Back)** | `name`, `dob`, `gender`, `masked_aadhaar`, `state`, `district`, `pincode` | Income, Caste, Education, Marks | Regex for Aadhaar/DOB/Gender; **Positional Heuristic** for Name (line preceding DOB) |
| **Caste Certificate** | `category` (`SC`, `ST`, `OBC`, `EWS`), `certificate_number`, `issuing_authority` | Name, Income, DOB, Marks | **FastEmbed ONNX** semantic match over legal boilerplate clauses |
| **Income Certificate** | `annual_income` (₹), `financial_year`, `issuing_authority` (Tehsildar/SDO) | Caste, Education, Marks | Regex currency parser bounded near income keywords |
| **Marksheet / Degree** | `marks_percentage`, `highest_education`, `board_or_university`, `passing_year` | Caste, Income, Aadhaar | Regex percentage parser + FastEmbed education tier match |

### "Don't Ask Twice" Document Memory
Any document parsed or uploaded is cached in the session document registry. When schemes display their eligibility checklist, previously uploaded documents are automatically flagged as `VERIFIED & ATTACHED`.

---

## 4. Dynamic Scheme Compatibility & Document Requirements
- **Percentage Compatibility Score (0 - 100%):**
  - Hard Boolean Filter: Disqualifies applicant if income exceeds ceiling or category is excluded (Score = 0%).
  - FastEmbed Cosine Similarity: Evaluates applicant business narrative against scheme objectives (35% weight).
  - Affirmative Action Bonus: Extra weight for women entrepreneurs, SC/ST, and rural aspirational districts (15% weight).
- **Scheme-Specific Document Requirements:** Each scheme requests only its mandatory documents (e.g., PMEGP requests Rural Certificate; Scholarships request Marksheets and Fee Receipts). Missing documents are dynamically computed against the session cache.

---

## 5. Common Application Format (CAF) & DigiLocker eKYC Sandbox
- **Official Common Application Format (CAF):** A standardized, single-page printable government application format (`@media print` CSS layout). Contains applicant particulars, masked Aadhaar, target scheme subsidy breakdown (Grant % vs Loan % vs Margin %), and document verification status.
- **DigiLocker Sandbox:** Interactive modal that simulates OTP eKYC verification (`123456`), branding the CAF with a verified badge: `✓ DigiLocker eKYC Authenticated (Ref: DL-2026-X8921)`.

---

## 6. Hidden Developer Debug HUD
- Accessible via `Ctrl + Shift + D` or triple-tapping the header logo.
- Controls:
  - Toggle OCR Engine: `[RapidOCR ONNX (Local)]` | `[Gemini 1.5 Flash (Cloud Fallback)]` | `[Mock Data]`.
  - Toggle Embedding Engine: `[FastEmbed ONNX (Local)]` | `[Mock Vectors]`.
  - Toggle DigiLocker Mode: `[Interactive Sandbox OTP]` | `[Auto-Bypass]`.
  - Real-time Server Telemetry: Polling `/api/v1/dev/health` to display live server RSS memory (e.g. `230MB / 512MB`).
