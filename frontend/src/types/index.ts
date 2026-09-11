export type SocialCategory = 'SC' | 'ST' | 'OBC' | 'EWS' | 'Minority' | 'General';
export type Gender = 'Male' | 'Female' | 'Other';
export type AreaType = 'Rural' | 'Urban';
export type EducationLevel = 'Literate' | '10th' | '12th' | 'ITI' | 'Graduate' | 'PostGraduate';
export type OcrDocType = 'AADHAAR' | 'CASTE' | 'INCOME' | 'MARKSHEET';

export interface ApplicantProfile {
  name: string;
  dob: string;
  gender: Gender;
  category: SocialCategory;
  annualIncome: number;
  state: string;
  district: string;
  areaType: AreaType;
  education: EducationLevel;
  profession: string;
  professionHi?: string;
  requiredCapital: number;
  maskedAadhaar?: string;
  casteCertificateNo?: string;
  incomeCertificateNo?: string;
  marksPercentage?: number;
}

export interface DocumentRecord {
  code: string;
  name: string;
  nameHi: string;
  isVerified: boolean;
  verificationSource?: 'RAPIDOCR' | 'GEMINI' | 'DIGILOCKER' | 'MANUAL';
  referenceId?: string;
  verifiedAt?: string;
}

export interface SchemeFinancials {
  grantSubsidyPercentage: number;
  maxGrantAmount: number;
  loanPercentage: number;
  promoterMarginPercentage: number;
  subsidizedInterestRate?: number;
  moratoriumPeriodMonths?: number;
  collateralRequired: boolean;
}

export interface SchemeMatch {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  ministryEn: string;
  ministryHi: string;
  descriptionEn: string;
  descriptionHi: string;
  compatibilityPercentage: number;
  categoryBadge: string;
  financials: SchemeFinancials;
  requiredDocuments: string[]; // Document codes
  verifiedDocuments: string[];
  missingDocuments: string[];
  eligibilityHighlights: string[];
  nodalAgency: string;
}

export interface OcrExtractedData {
  doc_type: OcrDocType;
  name?: string;
  dob?: string;
  gender?: Gender;
  masked_aadhaar?: string;
  category?: SocialCategory;
  annual_income?: number;
  financial_year?: string;
  certificate_number?: string;
  marks_percentage?: number;
  highest_education?: EducationLevel;
  confidence: number;
  engine: 'RapidOCR_ONNX' | 'Gemini_1.5_Flash' | 'Mock';
}

export interface DigiLockerRecord {
  verified: boolean;
  refId: string;
  timestamp: string;
  verifiedDocuments: string[];
  aadhaarOrMobile: string;
}

export interface DevHudState {
  isOpen: boolean;
  ocrEngine: 'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK';
  matcherEngine: 'FASTEMBED' | 'MOCK';
  digiLockerMode: 'INTERACTIVE' | 'AUTO_BYPASS';
  serverMemoryRssMb: number;
  maxLimitMb: number;
}
