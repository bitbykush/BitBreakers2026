/**
 * Date and Age Utility Functions
 * Supports standard formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 */

/**
 * Calculates age in full years from a Date of Birth string.
 * Returns null if the DOB string is empty, invalid, or produces an unreasonable age.
 */
export function calculateAge(dob: string | undefined | null): number | null {
  if (!dob || typeof dob !== 'string') return null;
  const trimmed = dob.trim();
  if (!trimmed) return null;

  let birthDate: Date | null = null;

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/).map(Number);
    birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
  }
  // Format 2: DD/MM/YYYY or DD-MM-YYYY
  else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/).map(Number);
    birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // Fallback: Date.parse
  else {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 && age <= 125 ? age : null;
}

/**
 * Normalizes any DOB string to YYYY-MM-DD format suitable for HTML5 <input type="date">.
 * Returns an empty string if the date is invalid or empty.
 */
export function formatDobForInput(dob: string | undefined | null): string {
  if (!dob || typeof dob !== 'string') return '';
  const trimmed = dob.trim();
  if (!trimmed) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY/MM/DD or YYYY-M-D
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/).map((p) => p.padStart(2, '0'));
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/).map((p) => p.padStart(2, '0'));
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}
