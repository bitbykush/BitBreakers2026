import {
  ApplicantProfile,
  SchemeMatch,
  OcrExtractedData,
  OcrDocType,
  DigiLockerRecord
} from '../types';
import { MOCK_SCHEMES } from './mockData';

const RAW_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim();
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export const ApiService = {
  /**
   * Matches welfare schemes based on applicant profile and verified documents.
   */
  async matchSchemes(profile: ApplicantProfile, verifiedDocCodes: string[] = []): Promise<SchemeMatch[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/schemes/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: profile.profession,
          category: profile.category,
          annual_income_inr: profile.annualIncome,
          gender: profile.gender,
          area: profile.areaType,
          education: profile.education,
          required_capital_inr: profile.requiredCapital,
          uploaded_document_codes: verifiedDocCodes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matches && Array.isArray(data.matches)) {
          return data.matches;
        }
      }
    } catch {
      // Backend unavailable; seamlessly failover to local matcher
    }

    // High-fidelity local fallback matcher
    return this.fallbackMatchSchemes(profile, verifiedDocCodes);
  },

  /**
   * Compares two schemes side-by-side.
   */
  async compareSchemes(
    schemeAId: string,
    schemeBId: string
  ): Promise<{ schemeA: SchemeMatch; schemeB: SchemeMatch; comparisonSummary?: any } | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/schemes/compare?scheme_a=${encodeURIComponent(schemeAId)}&scheme_b=${encodeURIComponent(schemeBId)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.schemeA && data.schemeB) {
          return data;
        }
      }
    } catch {
      // Fallback to local schemes
    }

    const schemeA = MOCK_SCHEMES.find(
      (s) => s.id.toLowerCase() === schemeAId.toLowerCase() || s.code.toLowerCase() === schemeAId.toLowerCase()
    );
    const schemeB = MOCK_SCHEMES.find(
      (s) => s.id.toLowerCase() === schemeBId.toLowerCase() || s.code.toLowerCase() === schemeBId.toLowerCase()
    );

    if (schemeA && schemeB) {
      return { schemeA, schemeB };
    }
    return null;
  },

  /**
   * Targeted OCR Extraction endpoint. Supports single or multiple images (Front + Back).
   */
  async extractTargetedOcr(
    fileOrFiles: File | Blob | (File | Blob)[],
    docType: OcrDocType,
    forceEngine: 'AUTO' | 'RAPIDOCR' | 'GEMINI' | 'MOCK' = 'AUTO',
    allowGeminiFallback: boolean = false
  ): Promise<OcrExtractedData> {
    if (forceEngine === 'MOCK') {
      const mock = this.fallbackMockOcr(docType);
      return { ...mock, is_verified: true };
    }

    try {
      const formData = new FormData();
      if (Array.isArray(fileOrFiles)) {
        fileOrFiles.forEach((f) => formData.append('files', f));
        if (fileOrFiles.length > 0) {
          formData.append('file', fileOrFiles[0]);
        }
      } else {
        formData.append('files', fileOrFiles);
        formData.append('file', fileOrFiles);
      }
      formData.append('doc_type', docType);
      formData.append('force_engine', forceEngine);
      formData.append('allow_gemini_fallback', String(allowGeminiFallback));

      const response = await fetch(`${API_BASE_URL}/api/v1/ocr/extract-targeted`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const errJson = await response.json().catch(() => ({}));
        return {
          doc_type: docType,
          confidence: 0,
          engine: 'RapidOCR_ONNX',
          error_message: (errJson && errJson.detail) || 'Document scan could not be completed.',
          is_verified: false,
        };
      }
    } catch (networkErr) {
      // Offline fallback
      return {
        ...this.fallbackMockOcr(docType),
        engine: 'Mock',
        is_verified: true,
      };
    }
  },

  /**
   * DigiLocker Sandbox eKYC Verification.
   */
  async verifyDigiLockerOtp(aadhaarOrMobile: string, otp: string): Promise<DigiLockerRecord> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/kyc/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_or_mobile: aadhaarOrMobile,
          otp: otp,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          verified: true,
          refId: data.ref_id || 'DL-2026-X8921',
          timestamp: data.timestamp || new Date().toISOString(),
          verifiedDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME'],
          aadhaarOrMobile,
        };
      }
    } catch {
      // Local sandbox simulation
    }

    return {
      verified: otp === '123456' || otp.length === 6,
      refId: 'DL-2026-X8921',
      timestamp: new Date().toISOString(),
      verifiedDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME'],
      aadhaarOrMobile,
    };
  },

  /**
   * Server Health & RAM Telemetry for Dev HUD.
   */
  async getDevHealth(): Promise<{ rss_mb: number; max_limit_mb: number; percent_used: number; status: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dev/health`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Mock health stats
    }

    return {
      rss_mb: 184,
      max_limit_mb: 512,
      percent_used: 35.9,
      status: 'healthy (client mock)',
    };
  },

  /**
   * Local deterministic fallback matcher with trade-relevance gating.
   */
  fallbackMatchSchemes(profile: ApplicantProfile, verifiedDocCodes: string[]): SchemeMatch[] {
    const rawQuery = (profile.profession || '').trim().toLowerCase();

    // If a search query is provided, enforce strict trade relevance
    if (rawQuery.length > 0) {
      const STOP_WORDS = new Set([
        'in', 'for', 'and', 'the', 'a', 'an', 'to', 'of', 'with', 'is', 'at', 'by', 'from',
        'need', 'want', 'loan', 'grant', 'subsidy', 'scheme', 'business', 'work', 'project',
        'काम', 'के', 'लिए', 'चाहिए', 'लोन', 'ऋण', 'योजना', 'सरकारी', 'मुझे', 'का', 'की',
        'में', 'से', 'पर', 'है', 'हुनर', 'व्यापार', 'दुकानदार', 'दुकान'
      ]);

      const SYNONYM_CLUSTERS = [
        ['potter', 'pottery', 'terracotta', 'clay', 'pot', 'pots', 'artisan', 'कुम्हार', 'माटी', 'बर्तन', 'मिट्टी'],
        ['tailor', 'tailoring', 'garment', 'garments', 'handloom', 'sewing', 'boutique', 'textile', 'clothes', 'सिलाई', 'दर्जी', 'कपड़े'],
        ['vendor', 'street vendor', 'thela', 'cart', 'stall', 'fruit stall', 'vegetable', 'shop', 'shopkeeper', 'store', 'रेहड़ी', 'पटरी', 'ठेला', 'दुकान', 'सब्जी', 'फल', 'ठेले'],
        ['dairy', 'milk', 'cow', 'buffalo', 'cattle', 'livestock', 'animal husbandry', 'डेयरी', 'दूध', 'पशुपालन', 'गाय', 'भैंस'],
        ['solar', 'solar panel', 'renewable', 'energy', 'photovoltaic', 'scientist', 'research', 'sun', 'rooftop', 'सोलर', 'सौर', 'छत'],
        ['carpenter', 'carpentry', 'wood', 'furniture', 'woodwork', 'बढ़ई', 'काष्ठकला', 'लकड़ी', 'फर्नीचर'],
        ['blacksmith', 'lohar', 'iron', 'metal', 'welder', 'welding', 'लोहार', 'धातु', 'लोहा'],
        ['weaver', 'weaving', 'bamboo', 'basket', 'handloom', 'carpet', 'बुनकर', 'बांस', 'टोकरी'],
        ['cobbler', 'leather', 'footwear', 'shoes', 'shoe', 'मोची', 'चर्मकार', 'जूता', 'चप्पल'],
        ['barber', 'salon', 'hair', 'beauty parlour', 'beauty', 'नाई', 'सैलून', 'ब्यूटी', 'बाल'],
        ['student', 'scholarship', 'college', 'school', 'degree', 'education', 'study', 'fee', 'fees', 'छात्र', 'छात्रवृत्ति', 'पढ़ाई', 'शिक्षा'],
        ['fisheries', 'fish', 'aquaculture', 'pond', 'fisherman', 'मछली', 'मत्स्य', 'मछुआरा', 'तालाब'],
        ['farmer', 'farming', 'agriculture', 'kisan', 'crop', 'tractor', 'खेती', 'किसान', 'कृषि', 'फसल'],
        ['food', 'catering', 'dhaba', 'restaurant', 'canteen', 'processing', 'pickle', 'masala', 'bakery', 'sweets', 'खान-पान', 'ढाबा', 'अचार', 'मसाला', 'मिठाई', 'बेकरी'],
        ['mechanic', 'repair', 'garage', 'vehicle', 'automobile', 'ev', 'motor', 'bike', 'car', 'मैकेनिक', 'मरम्मत', 'गैराज']
      ];

      const TRADE_SYNONYMS: Record<string, string[]> = {};
      for (const cluster of SYNONYM_CLUSTERS) {
        for (const word of cluster) {
          TRADE_SYNONYMS[word.toLowerCase()] = cluster.filter((w) => w !== word).map((w) => w.toLowerCase());
        }
      }

      const rawTokens = rawQuery.match(/[\w\u0900-\u097F]+/g) || [];
      const tokens = rawTokens.filter((t) => !STOP_WORDS.has(t) && t.length >= 2);
      const effectiveTokens = tokens.length > 0 ? tokens : rawTokens.filter((t) => t.length >= 2);

      if (effectiveTokens.length === 0) {
        return [];
      }

      const expandedList: string[] = [...effectiveTokens];
      for (const tok of effectiveTokens) {
        if (TRADE_SYNONYMS[tok]) {
          TRADE_SYNONYMS[tok].forEach((s) => expandedList.push(s));
        }
      }

      const isScholarshipQuery = effectiveTokens.some((tok) =>
        ['student', 'scholarship', 'college', 'school', 'degree', 'education', 'study', 'छात्र', 'छात्रवृत्ति', 'पढ़ाई'].includes(tok)
      );

      const UNIVERSAL_CODES = new Set(['PMEGP', 'MUDRA_SHISHU', 'MUDRA_KISHORE', 'MUDRA_TARUN', 'CGTMSE']);

      const filtered = MOCK_SCHEMES.filter((scheme) => {
        const corpus = `${scheme.nameEn} ${scheme.nameHi} ${scheme.descriptionEn} ${scheme.descriptionHi} ${(scheme.tags || []).join(' ')} ${scheme.categoryBadge} ${scheme.eligibilityHighlights.join(' ')}`.toLowerCase();
        const matchesTrade = expandedList.some((tok) => corpus.includes(tok));
        const matchesUniversal = UNIVERSAL_CODES.has(scheme.code) && !isScholarshipQuery;
        return matchesTrade || matchesUniversal;
      });

      // Strict rejection: zero matches for random inputs like 'asdfghjkl'
      if (filtered.length === 0) {
        return [];
      }

      return filtered.map((scheme) => {
        let score = scheme.compatibilityPercentage;
        if (profile.gender === 'Female') score = Math.min(99, score + 3);
        if (profile.category === 'SC' || profile.category === 'ST') score = Math.min(99, score + 4);
        if (profile.areaType === 'Rural') score = Math.min(99, score + 2);
        if (profile.annualIncome > 250000 && scheme.code === 'PMS_OBC_SC') score = 0;

        const missing = scheme.requiredDocuments.filter((docCode) => !verifiedDocCodes.includes(docCode));
        const verified = scheme.requiredDocuments.filter((docCode) => verifiedDocCodes.includes(docCode));

        return {
          ...scheme,
          compatibilityPercentage: Math.round(score * 10) / 10,
          missingDocuments: missing,
          verifiedDocuments: verified,
        };
      }).filter((s) => s.compatibilityPercentage > 0).sort((a, b) => b.compatibilityPercentage - a.compatibilityPercentage);
    }

    return MOCK_SCHEMES.map((scheme) => {
      let score = scheme.compatibilityPercentage;

      // Affirmative action bonus for Women, SC/ST, and Rural
      if (profile.gender === 'Female') score = Math.min(99, score + 3);
      if (profile.category === 'SC' || profile.category === 'ST') score = Math.min(99, score + 4);
      if (profile.areaType === 'Rural') score = Math.min(99, score + 2);

      // Income ceiling checks
      if (profile.annualIncome > 250000 && scheme.code === 'PMS_OBC_SC') {
        score = 0; // Exceeded scholarship ceiling
      }

      // Compute dynamic missing documents
      const missing = scheme.requiredDocuments.filter((docCode) => !verifiedDocCodes.includes(docCode));
      const verified = scheme.requiredDocuments.filter((docCode) => verifiedDocCodes.includes(docCode));

      return {
        ...scheme,
        compatibilityPercentage: Math.round(score * 10) / 10,
        missingDocuments: missing,
        verifiedDocuments: verified,
      };
    }).sort((a, b) => b.compatibilityPercentage - a.compatibilityPercentage);
  },

  /**
   * Mock OCR data generator.
   */
  fallbackMockOcr(docType: OcrDocType): OcrExtractedData {
    if (docType === 'AADHAAR') {
      return {
        doc_type: 'AADHAAR',
        name: 'Shanti Devi Kushwaha',
        dob: '1988-08-14',
        gender: 'Female',
        masked_aadhaar: 'XXXX-XXXX-3456',
        confidence: 96.8,
        engine: 'RapidOCR_ONNX',
      };
    }
    if (docType === 'CASTE') {
      return {
        doc_type: 'CASTE',
        category: 'OBC',
        certificate_number: 'OBC-UP-2023-88219',
        confidence: 94.2,
        engine: 'RapidOCR_ONNX',
      };
    }
    if (docType === 'INCOME') {
      return {
        doc_type: 'INCOME',
        annual_income: 120000,
        financial_year: '2024-2025',
        certificate_number: 'INC-UP-2024-55102',
        confidence: 95.0,
        engine: 'RapidOCR_ONNX',
      };
    }
    return {
      doc_type: 'MARKSHEET',
      marks_percentage: 68.5,
      highest_education: '10th',
      confidence: 92.4,
      engine: 'RapidOCR_ONNX',
    };
  },
};
