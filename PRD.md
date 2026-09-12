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
| **Marksheet / Educational Certificate** | `highest_education` (`10th`, `12th`, `ITI`, `Graduate`, `PostGraduate`), `name`, `dob`, `certificate_number` | Caste, Income, Aadhaar, fragile marks math | Regex qualification boundary parser supporting diverse CBSE, ICSE, UP, Bihar & State Boards; marks calculation removed to prevent format variance blockers |

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

---

## 8. Android-Style Accessibility Suite (TalkBack, High Contrast & Magnifier)

To empower visually impaired, elderly, and rural neo-literate citizens, Scheme Seva Kendra includes an Android OS-grade accessibility suite operating with zero server overhead:

### 8.1 Single Unified Navigation Trigger
- **Header Button**: Exactly one unified button in the main header (`♿ Accessibility | सुगमता`), replacing legacy isolated font toggles and preventing screen clutter.
- **Keyboard Shortcut**: `Alt + A` opens the Accessibility Menu instantly; `Alt + T` toggles TalkBack; `Esc` stops speech playback.

### 8.2 Android Quick Settings Accessibility Menu
- **Card-Based Drawer**: Modeled after Android's Accessibility Quick Settings tile:
  - **TalkBack Screen Reader**: Built-in speech synthesis with speed selector (0.75x, 1.0x, 1.25x, 1.5x) and a "Test Voice" preview.
  - **High Contrast Colors**: Standard, Yellow-on-Black (WCAG AAA Dark Contrast), and Stark Monochrome Black-on-White.
  - **Magnification & Zoom**: Global viewport scaling (100%, 125%, 150%, 175%, 200%) and interactive 2x Magnifier Lens toggle.
  - **Text Size & Dyslexia**: Font tiers (Normal, Large A+, Extra Large A++) and dyslexia-friendly typography.
  - **Reading Guide**: Cursor-following horizontal focus ruler for line-by-line reading.
  - **Reset Defaults**: Single click resets all accessibility preferences.

### 8.3 TalkBack Built-in Screen Reader Engine
- **Web Speech Synthesis**: Uses browser-native `window.speechSynthesis` (0MB backend memory).
- **Intelligent Dual-Language Detection**: Prioritizes `hi-IN` Hindi voices when the portal is in Hindi, and `en-IN` / Indian English voices in English.
- **Interactive Focus & Hover Listener**: Moving the cursor or tabbing through the page automatically reads aloud headings, buttons, form inputs, scheme cards, and eligibility highlights.
- **Visual Focus Ring**: Highlights speaking elements with a high-visibility glowing yellow ring (`.talkback-speaking-outline`).
- **Floating Audio Controller Bar**: Bottom controller displaying the live spoken sentence with Pause, Resume, Stop (`Esc`), Speed multiplier, and Turn Off controls.

### 8.4 Screen Magnifier & Reading Guide
- **Magnifier Lens**: Interactive 2x circular spotlight following the cursor/touch to inspect fine print, statutory conditions, and financial subsidy splits.
- **Reading Guide**: Horizontal highlight ruler bar following vertical cursor movements to prevent skipping lines.

---

## 9. Interactive Two-Scheme Comparative Analysis Matrix

Citizens and small business applicants evaluating government welfare windows must frequently weigh trade-offs between capital grants, bank loan limits, promoter margins, and collateral requirements. Scheme Seva Kendra replaces legacy static tables with an **interactive, user-driven 2-scheme comparator**:

### 9.1 Interactive Selection & Asking Workflow
- **Pre-Selected Base Scheme (Scheme 1)**:
  - When the user launches Compare from any scheme card, that scheme is automatically locked as **Scheme 1**.
- **Contextual Selection Prompt (Scheme 2)**:
  - If Scheme 2 is not yet selected, the drawer prominently asks:
    - *English*: `"Which scheme would you like to compare with [Scheme 1 Name]?"`
    - *Hindi*: `"[Scheme 1 Name] की तुलना आप किस योजना से करना चाहते हैं?"`
  - Candidate schemes are presented in a responsive card grid with real-time keyword search, highlighting grant %, loan ceiling, collateral waiver, and compatibility score.
  - Clicking `"Compare with this Scheme"` immediately activates the side-by-side comparison.

### 9.2 Strict Two-Scheme Comparative Dimensions
When both schemes are selected, the drawer presents **strictly and only those two schemes** in an in-depth 2-column evaluation:
1. **Ministry & Nodal Agency**: Identifying central ministry and ground-level implementing bodies.
2. **Compatibility Match Score**: Citizen profile compatibility rating (0 - 100%).
3. **Capital Subsidy / Grant**: Non-refundable grant % and rupee ceiling (e.g. ₹15,000 tool voucher vs 35% / ₹17.5L PMEGP grant).
4. **Credit & Bank Loan Share**: Loan financing percentage and maximum project borrowing cap.
5. **Beneficiary Promoter Margin**: Required own contribution (e.g. 0% for Vishwakarma, 5% for special categories under PMEGP).
6. **Subsidized Interest Rate & Moratorium**: Concessional flat rates (e.g. 5.0% flat) vs Bank MCLR, plus repayment holiday months.
7. **Collateral & Credit Guarantee**: 100% collateral-free waiver under CGTMSE or sovereign backing.
8. **Mandatory Documents Checklist**: Side-by-side list of required documents with visual checkmarks and bilingual labels.
9. **Target Trades & Beneficiaries**: Direct qualification highlights.
10. **Direct Action CTAs**: Instant link to `"View 8 Tabs Details"` (`/schemes/[id]`) and `"Apply Now / Fill CAF"`.

### 9.3 Quick Swap & Switch Controls
- **`⇄ Swap`**: Inverts Scheme 1 and Scheme 2 positions instantly.
- **Dropdown Selectors**: Allows selecting any alternative scheme on the fly without closing the drawer.
- **`Change Scheme 2`**: Re-enters the candidate picker view.

### 9.4 Ubiquitous Compare Entry Points
- **Pathway 1 Instant Preview**: `"Compare (तुलना)"` button on each baseline match card + `"Compare Schemes"` in section header.
- **Pathway 2 Verified Results**: `"Compare Scheme"` button on each ranked card + `"Compare Schemes"` in Stage 3 header.
- **Application Dashboard**: Header action bar button + card-level compare buttons.
- **Official Scheme Details Portal (`/schemes/[id]`)**: Top breadcrumb action bar button + hero card compare badge.


