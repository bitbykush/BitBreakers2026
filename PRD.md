# Product Requirements Document (PRD)
## Project Name: Scheme Seva Kendra (योजना सेवा केंद्र)
### Subtitle: Zero-Login, AI-Driven Welfare & Scholarship Matcher with Common Application Dossier
### Problem Statement ID: SIH-26092 | Target Track: Smart Welfare & Inclusive Governance

---

## 1. Vision & Core Philosophy
Scheme Seva Kendra (योजना सेवा केंद्र) bridges the gap between 63 million marginalized entrepreneurs (SC, ST, OBC, EWS, Minorities, Women) and students seeking government welfare/credit-linked subsidies and scholarships. 

### Hard Operational Constraints
1. **Zero-Login Architecture**: No passwords, phone numbers, or OTP registration barriers. Session state is managed via client-side `localStorage` with an ephemeral UUID to guarantee zero user drop-off.
2. **512MB RAM Server Ceiling**: The entire backend must run stably on Render's 512MB RAM free-tier without triggering OOM SIGKILL crashes.
3. **Aadhaar Privacy Compliance**: Strict adherence to UIDAI regulations—all 12-digit Aadhaar numbers are immediately redacted to `XXXX-XXXX-1234`.
4. **Contextual Pathway 2 Access**: Pathway 2 (Full Assisted Form) is entered deliberately via the scheme card's "Fill Custom Details" option or dedicated route (`/apply`), avoiding premature clutter on the discovery landing page.

---

## 2. The User Flow & Convergence Architecture

```
   ┌────────────────────────────────────────────────────────┐
   │                  User Lands on Platform                │
   │           Scheme Seva Kendra (Zero-Login PWA)          │
   └───────────────────────────┬────────────────────────────T
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ PATHWAY 1: 1-Tap Discovery & Trade Search              │
   │ • Visual Trade Bubbles (Potter, Tailor, Solar, Dairy)  │
   │ • Dual-Language Voice Search (Web Speech API)          │
   │ • Instant Baseline Matches (Appears on Search/Select)  │
   └───────────┬────────────────────────────────┬───────────┘
               │                                │
               ▼                                ▼
   ┌───────────────────────┐        ┌───────────────────────┐
   │ [→] SCHEME DETAILS    │        │ [FILL CUSTOM DETAILS] │
   │ • Official myScheme   │        │ • Routes to Pathway 2 │
   │   Gov Portal Layout   │        │ • Carries selected    │
   │ • 8 Navigation Tabs   │        │   trade & scheme      │
   │ • 10 Interactive FAQs │        └───────────┬───────────┘
   │ • Share & Updates     │                    │
   └───────────┬───────────┘                    │
               │ [Apply CTA]                    │
               └────────────────►───────────────┘
                                 │
                                 ▼
   ┌────────────────────────────────────────────────────────┐
   │       PATHWAY 2 CONTINUATION (Unified Assisted Form)   │
   │ • All fields editable + Targeted Document Extraction   │
   │ • Scheme Compatibility Score (0 - 100%)                │
   │ • Scheme-Specific Document Missing List                │
   │ • DigiLocker Sandbox eKYC Authentication               │
   │ • Common Application Format (CAF) A4 Print Dossier     │
   └────────────────────────────────────────────────────────┘
```

### Pathway 1: Ultra-Simple (Zero Technical Knowledge)
- **Target Audience:** Artisans, rural potters, street vendors, small farmers, research scholars.
- **Interface:** Large visual icon cards (Farming/Dairy, Pottery, Street Vendor, Tailoring, Food Stall, Carpentry, Student/Scholar, Solar & Renewable Energy).
- **Voice Input:** High-visibility microphone button using the browser Web Speech API in Hindi (`hi-IN`) and English (`en-IN`).
- **Immediate Outcome:** Instant preliminary preview of baseline schemes (e.g., NSSFP, PMEGP, PM-Vishwakarma, PM-SVANidhi).
- **Streamlined Discovery:** Redundant generic "Switch to Pathway 2" buttons were removed from the discovery view. Each scheme card features:
  - **`Fill Custom Details` (`कस्टम विवरण भरें`)**: Contextually launches Pathway 2 pre-selecting the chosen scheme.
  - **`→` Arrow Button**: Navigates to the official **myScheme.gov.in** scheme details dossier (`/schemes/[id]`).

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

---

## 7. Official Scheme Details Portal (`/schemes/[id]`) — myScheme.gov.in Standard
Replicates the official National Government Portal layout (`myScheme.gov.in`) across a 3-column architecture:
- **Left Navigation Tabs (Sticky)**:
  - 8 standard sections: `Details`, `Benefits`, `Eligibility`, `Application Process`, `Documents Required`, `Frequently Asked Questions`, `Sources And References`, `Feedback`.
  - Active tab highlighting (`border-l-4 border-blue-600 bg-blue-50 text-blue-800`), with ScrollSpy synchronizing the active tab as the user scrolls.
- **Center Narrative & FAQ Accordions**:
  - Official ministry narrative (e.g. *National Solar Science Fellowship Programme (NSSFP)* under Ministry of New & Renewable Energy).
  - 10 interactive FAQ accordions addressing aim, department, launch date, eligibility, general category inclusion, qualifications, M.Tech./M.S. eligibility, R&D criteria, age limits, and grant benefits.
  - Documents required breakdown with issuing authorities and statutory reasons.
  - Sources & references hyperlinks to central ministry portals.
  - Helpful feedback thumbs-up / thumbs-down polling widget.
- **Right Action & Updates Sidebar**:
  - Grant & subsidy breakdown card (e.g. 100% Direct Grant, ₹1,00,000/month stipend, 100% collateral-free).
  - Direct application button routing into Pathway 2 (`/apply`).
  - *News and Updates* live notifications module.
  - *Share* scheme buttons: WhatsApp, Telegram, X (Twitter), and Copy Link with clipboard toast confirmation.

