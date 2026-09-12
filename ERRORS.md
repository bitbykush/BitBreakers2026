# ERRORS.md — Automatic Error Tracking & Learning Log

## [2026-09-11 23:33] - Invalid Lucide Icon Import in TargetedOcrUpload

- **Type**: Syntax / Integration
- **Severity**: Medium
- **File**: `frontend/src/components/ocr/TargetedOcrUpload.tsx:5`
- **Agent**: Mark42 / Antigravity Orchestrator
- **Root Cause**: `lucide-react` (v0.395) does not export `IdCard` under that specific name, causing an undefined component render error on Pathway 2.
- **Error Message**: 
  ```text
  Unhandled Runtime Error: Element type is invalid: expected a string or a class/function but got: undefined.
  Check the render method of TargetedOcrUpload.
  ```
- **Fix Applied**: Replaced `IdCard` with valid `CreditCard` icon component in `TargetedOcrUpload.tsx`. Verified clean re-compilation with HTTP 200.
- **Prevention**: Use verified Lucide icon exports when mapping government identity and document badges.
- **Status**: Fixed

---

## [2026-09-12 05:45] - Marksheet Tabular Arithmetic Failure Across Diverse State Boards

- **Type**: Logic / Domain
- **Severity**: High
- **File**: `backend/app/services/targeted_extractors.py:180`
- **Agent**: Mark42 / Antigravity Orchestrator
- **Root Cause**: Attempted tabular arithmetic calculation and percentage parsing from educational marksheets. Because India has 50+ diverse central and state examination boards (CBSE, CISCE, State SSC/HSC, NIOS) with wildly different layouts, credit systems, and tabular representations, regex marks summation consistently returned 0/0 or failed.
- **Error Message**:
  ```text
  ValueError / Inaccurate Extraction: marks_obtained: 0, max_marks: 0, percentage: 0.0%
  Failed to derive verified education qualification for scheme matching.
  ```
- **Fix Applied**: Completely removed marks calculation and replaced it with `classify_education_level` multi-tiered regex keyword hierarchy (`PostGraduate`, `Graduate`, `ITI`, `12th`, `10th`) and candidate name/DOB extraction. Scheme eligibility requires completed qualification level, not raw mark summation.
- **Prevention**: For multi-board educational documents, extract deterministic qualification level rather than fragile tabular grade math.
- **Status**: Fixed

---

## [2026-09-12 06:10] - Missing/Mismatched mockSchemes Identifier in CompareDrawer

- **Type**: Syntax / Integration
- **Severity**: Medium
- **File**: `frontend/src/components/compare/CompareDrawer.tsx:12`
- **Agent**: Mark42 / Antigravity Orchestrator
- **Root Cause**: Referenced undeclared identifier `MOCK_SCHEMES` instead of the canonical exported symbol `mockSchemes` from `@/lib/mockData.ts`.
- **Error Message**:
  ```text
  ReferenceError: MOCK_SCHEMES is not defined
  at CompareDrawer (frontend/src/components/compare/CompareDrawer.tsx:54:23)
  ```
- **Fix Applied**: Corrected the import to `import { mockSchemes } from '@/lib/mockData';` and updated all candidate list iterations and lookups to use `mockSchemes`.
- **Prevention**: Always verify exported symbols in `@/lib/mockData.ts` against component import statements.
- **Status**: Fixed

---
