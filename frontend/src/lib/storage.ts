import { ApplicantProfile, DocumentRecord, DigiLockerRecord, Gender, SocialCategory, AreaType } from '../types';
import { calculateAge } from './dateUtils';

const STORAGE_KEYS = {
  SESSION_ID: 'udyamsetu_session_id',
  PROFILE: 'udyamsetu_applicant_profile',
  DOCUMENTS: 'udyamsetu_verified_documents',
  DIGILOCKER: 'udyamsetu_digilocker_state',
  LANGUAGE: 'udyamsetu_lang',
  FONT_SIZE: 'udyamsetu_font_size',
};

// Default empty profile (User mandate: do not prefill data unless extracted from OCR or entered by user)
export const DEFAULT_PROFILE: ApplicantProfile = {
  name: '',
  dob: '',
  age: undefined,
  gender: '' as Gender,
  category: '' as SocialCategory,
  annualIncome: 0,
  state: '',
  district: '',
  areaType: '' as AreaType,
  education: 'N/A',
  profession: '',
  professionHi: '',
  requiredCapital: 0,
  address: '',
  pincode: '',
  maskedAadhaar: '',
  casteCertificateNo: '',
  incomeCertificateNo: '',
  marksPercentage: 0,
  mobileNumber: '',
  email: '',
};

export const DEFAULT_DOCUMENTS: DocumentRecord[] = [
  {
    code: 'DOC_AADHAAR',
    name: 'Aadhaar Card',
    nameHi: 'आधार कार्ड',
    isVerified: false,
  },
  {
    code: 'DOC_CASTE',
    name: 'Caste Certificate',
    nameHi: 'जाति प्रमाण पत्र',
    isVerified: false,
  },
  {
    code: 'DOC_INCOME',
    name: 'Income Certificate',
    nameHi: 'आय प्रमाण पत्र',
    isVerified: false,
  },
  {
    code: 'DOC_RURAL',
    name: 'Rural Area Certificate',
    nameHi: 'ग्रामीण क्षेत्र प्रमाण पत्र',
    isVerified: false,
  },
  {
    code: 'DOC_MARKSHEET',
    name: 'Class 10th Marksheet',
    nameHi: '10वीं अंकतालिका',
    isVerified: false,
  },
];

export const StorageService = {
  getSessionId(): string {
    if (typeof window === 'undefined') return 'ephemeral-session';
    let sid = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sid) {
      sid = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sid);
    }
    return sid;
  },

  getProfile(): ApplicantProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: Partial<ApplicantProfile>): ApplicantProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    const current = this.getProfile();
    const updated = { ...current, ...profile };

    // Automatically calculate and update age whenever dob is present
    if (updated.dob && updated.dob.trim().length > 0) {
      const calculated = calculateAge(updated.dob);
      if (calculated !== null) {
        updated.age = calculated;
      }
    } else {
      updated.age = undefined;
    }

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    return updated;
  },

  getDocuments(): DocumentRecord[] {
    if (typeof window === 'undefined') return DEFAULT_DOCUMENTS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return data ? JSON.parse(data) : DEFAULT_DOCUMENTS;
    } catch {
      return DEFAULT_DOCUMENTS;
    }
  },

  saveDocuments(docs: DocumentRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  },

  verifyDocument(code: string, source: DocumentRecord['verificationSource'], refId: string): DocumentRecord[] {
    const docs = this.getDocuments();
    const norm = (c: string) => c.replace(/^DOC_/, '').toUpperCase();
    const targetNorm = norm(code);
    const updated = docs.map((doc) => {
      if (norm(doc.code) === targetNorm || doc.code === code) {
        return {
          ...doc,
          isVerified: true,
          verificationSource: source,
          referenceId: refId,
          verifiedAt: new Date().toISOString(),
        };
      }
      return doc;
    });
    this.saveDocuments(updated);
    return updated;
  },

  saveUploadedDocument(
    code: string,
    fileDataUrl: string,
    fileName: string,
    fileSize: string,
    refId?: string,
    source: DocumentRecord['verificationSource'] = 'RAPIDOCR'
  ): DocumentRecord[] {
    const docs = this.getDocuments();
    const norm = (c: string) => c.replace(/^DOC_/, '').toUpperCase();
    const targetNorm = norm(code);
    let found = false;
    const updated = docs.map((doc) => {
      if (norm(doc.code) === targetNorm || doc.code === code) {
        found = true;
        return {
          ...doc,
          isVerified: true,
          verificationSource: source,
          referenceId: refId || doc.referenceId || `VER-${Date.now().toString().slice(-6)}`,
          verifiedAt: new Date().toISOString(),
          fileDataUrl,
          fileName,
          fileSize,
        };
      }
      return doc;
    });

    if (!found) {
      updated.push({
        code: code.startsWith('DOC_') ? code : `DOC_${code}`,
        name: fileName,
        nameHi: fileName,
        isVerified: true,
        verificationSource: source,
        referenceId: refId || `VER-${Date.now().toString().slice(-6)}`,
        verifiedAt: new Date().toISOString(),
        fileDataUrl,
        fileName,
        fileSize,
      });
    }

    this.saveDocuments(updated);
    return updated;
  },

  getDigiLockerState(): DigiLockerRecord | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DIGILOCKER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveDigiLockerState(record: DigiLockerRecord): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DIGILOCKER, JSON.stringify(record));
  },

  getLanguage(): 'en' | 'hi' {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as 'en' | 'hi') || 'en';
  },

  setLanguage(lang: 'en' | 'hi'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.DIGILOCKER);
  },
};
