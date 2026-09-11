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
