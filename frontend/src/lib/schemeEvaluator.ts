import { ApplicantProfile, SchemeMatch } from '@/types';
import { calculateAge } from './dateUtils';

export interface ConditionEvaluationItem {
  id: string;
  labelEn: string;
  labelHi: string;
  status: 'MET' | 'FAILED' | 'WARNING';
  detailEn: string;
  detailHi: string;
  iconType: 'trade' | 'income' | 'category' | 'gender' | 'age' | 'area' | 'education' | 'capital' | 'collateral' | 'documents';
}

export interface SchemeEvaluationReport {
  schemeId: string;
  schemeCode: string;
  isEligible: boolean;
  compatibilityPercentage: number;
  primaryDisqualificationReasonEn?: string;
  primaryDisqualificationReasonHi?: string;
  primaryDisqualificationType?: 'trade' | 'income' | 'category' | 'gender' | 'education' | 'area' | 'capital' | 'age';
  conditionsMet: ConditionEvaluationItem[];
  conditionsFailed: ConditionEvaluationItem[];
  conditionsWarning: ConditionEvaluationItem[];
  totalConditionsCount: number;
}

// Educational hierarchy ranks
const EDUCATION_RANKS: Record<string, number> = {
  'literate': 0,
  'n/a': 0,
  'none': 0,
  '8th': 1,
  '10th': 2,
  '12th': 3,
  'diploma': 3,
  'iti': 3,
  'graduate': 4,
  'post graduate': 5,
  'postgraduate': 5,
  'phd': 6,
};

// Document display names
export const DOC_NAMES: Record<string, { en: string; hi: string }> = {
  DOC_AADHAAR: { en: 'Aadhaar Card', hi: 'आधार कार्ड' },
  DOC_CASTE: { en: 'Caste Certificate', hi: 'जाति प्रमाण पत्र' },
  DOC_INCOME: { en: 'Income Certificate', hi: 'आय प्रमाण पत्र' },
  DOC_MARKSHEET: { en: 'Educational Marksheet', hi: 'अंकतालिका / प्रमाण पत्र' },
  DOC_PROJECT_REPORT: { en: 'Detailed Project Report (DPR)', hi: 'विस्तृत परियोजना रिपोर्ट (DPR)' },
  DOC_RURAL: { en: 'Rural Residence Certificate', hi: 'ग्रामीण निवास प्रमाण पत्र' },
  DOC_UDYAM: { en: 'Udyam Registration', hi: 'उद्यम पंजीकरण' },
};

/**
 * Normalizes string for trade synonym and keyword matching
 */
function checkTradeMatch(trade: string, targetKeywords: string, schemeName: string, schemeDesc: string): { matches: boolean; matchedKeyword: string } {
  const normTrade = (trade || '').toLowerCase().trim();
  if (!normTrade) return { matches: true, matchedKeyword: 'General Enterprise' };

  const fullCorpus = `${targetKeywords || ''} ${schemeName || ''} ${schemeDesc || ''}`.toLowerCase();

  const synonymsMap: Record<string, string[]> = {
    'tailor': ['tailor', 'tailoring', 'garment', 'handloom', 'sewing', 'textile', 'दर्जी', 'सिलाई'],
    'tailoring': ['tailor', 'tailoring', 'garment', 'handloom', 'sewing', 'textile', 'दर्जी', 'सिलाई'],
    'handloom': ['tailor', 'tailoring', 'garment', 'handloom', 'sewing', 'textile', 'weaver', 'हथकरघा'],
    'potter': ['potter', 'pottery', 'terracotta', 'clay', 'artisan', 'कुम्हार', 'माटी'],
    'pottery': ['potter', 'pottery', 'terracotta', 'clay', 'artisan', 'कुम्हार', 'माटी'],
    'vendor': ['vendor', 'street vendor', 'thela', 'cart', 'stall', 'रेहड़ी', 'पटरी', 'ठेला'],
    'dairy': ['dairy', 'milk', 'cattle', 'livestock', 'cow', 'buffalo', 'डेयरी', 'दूध', 'पशुपालन'],
    'carpenter': ['carpenter', 'carpentry', 'wood', 'furniture', 'बढ़ई', 'काष्ठकला'],
    'blacksmith': ['blacksmith', 'iron', 'metal', 'lohar', 'लोहार', 'धातु'],
    'student': ['student', 'scholarship', 'college', 'degree', 'education', 'छात्र', 'छात्रवृत्ति'],
    'solar': ['solar', 'renewable', 'energy', 'photovoltaic', 'सौर', 'सोलर'],
    'fisheries': ['fisheries', 'fish', 'aquaculture', 'pond', 'मछली', 'मत्स्य'],
    'farmer': ['farmer', 'farming', 'agriculture', 'kisan', 'खेती', 'किसान'],
    'food': ['food', 'processing', 'catering', 'masala', 'pickle', 'खान-पान', 'ढाबा', 'मसाला'],
    'mechanic': ['mechanic', 'repair', 'garage', 'vehicle', 'automobile', 'मैकेनिक'],
    'weaver': ['weaver', 'weaving', 'bamboo', 'basket', 'handloom', 'बुनकर'],
    'beauty': ['beauty', 'parlour', 'salon', 'hair', 'सैलून', 'ब्यूटी'],
  };

  // Direct check
  if (fullCorpus.includes(normTrade)) {
    return { matches: true, matchedKeyword: normTrade };
  }

  // Synonym check
  for (const [key, aliases] of Object.entries(synonymsMap)) {
    if (normTrade.includes(key) || aliases.some((a) => normTrade.includes(a))) {
      for (const alias of aliases) {
        if (fullCorpus.includes(alias)) {
          return { matches: true, matchedKeyword: alias };
        }
      }
    }
  }

  // Check if scheme has broad or universal target
  if (
    fullCorpus.includes('micro') ||
    fullCorpus.includes('business') ||
    fullCorpus.includes('enterprise') ||
    fullCorpus.includes('entrepreneur') ||
    fullCorpus.includes('manufacturing') ||
    fullCorpus.includes('services')
  ) {
    return { matches: true, matchedKeyword: 'MSME Priority Sector' };
  }

  return { matches: false, matchedKeyword: '' };
}

/**
 * Evaluates an individual scheme against an applicant profile and verified documents.
 * Produces a full audit of conditions met, conditions failed, and warnings.
 */
export function evaluateSchemeEligibility(
  scheme: any,
  profile: ApplicantProfile,
  verifiedDocCodes: string[] = []
): SchemeEvaluationReport {
  const criteria = scheme.eligibilityCriteria || {};
  const financials = scheme.financials || {};
  const conditionsMet: ConditionEvaluationItem[] = [];
  const conditionsFailed: ConditionEvaluationItem[] = [];
  const conditionsWarning: ConditionEvaluationItem[] = [];

  let isEligible = true;
  let primaryDisqualificationReasonEn = '';
  let primaryDisqualificationReasonHi = '';
  let primaryDisqualificationType: SchemeEvaluationReport['primaryDisqualificationType'] = undefined;

  // -------------------------------------------------------------------------
  // 1. Trade & Profession Alignment
  // -------------------------------------------------------------------------
  const professionText = profile.profession || 'Self Employed';
  const tradeCheck = checkTradeMatch(
    professionText,
    criteria.targetKeywords || '',
    scheme.nameEn || '',
    scheme.descriptionEn || ''
  );

  if (tradeCheck.matches) {
    conditionsMet.push({
      id: 'trade_alignment',
      labelEn: 'Trade Alignment:',
      labelHi: 'व्यवसाय पात्रता (Occupation Match):',
      status: 'MET',
      detailEn: `Occupation "${professionText}" is approved under priority lending for ${scheme.categoryBadge || 'this sector'}.`,
      detailHi: `पेशा "${professionText}" इस योजना (${scheme.categoryBadge || 'प्राथमिकता क्षेत्र'}) के अंतर्गत स्वीकृत है।`,
      iconType: 'trade',
    });
  } else {
    isEligible = false;
    const reasonEn = `Trade Mismatch: Scheme is targeted for specific sectors (${criteria.targetKeywords ? criteria.targetKeywords.split(' ').slice(0, 5).join(', ') : scheme.categoryBadge}), not "${professionText}".`;
    const reasonHi = `व्यवसाय बेमेल: यह योजना "${professionText}" के बजाय विशिष्ट क्षेत्रों (${scheme.categoryBadge || 'अन्य'}) हेतु लक्षित है।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'trade';
    }
    conditionsFailed.push({
      id: 'trade_alignment',
      labelEn: 'Trade Alignment:',
      labelHi: 'व्यवसाय पात्रता (Occupation Mismatch):',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'trade',
    });
  }

  // -------------------------------------------------------------------------
  // 2. Annual Income Ceiling
  // -------------------------------------------------------------------------
  const maxIncome = criteria.maxIncome;
  const applicantIncome = Number(profile.annualIncome) || 0;

  if (maxIncome !== null && maxIncome !== undefined) {
    if (applicantIncome <= maxIncome) {
      conditionsMet.push({
        id: 'income_ceiling',
        labelEn: 'Income Ceiling Pass:',
        labelHi: 'वार्षिक आय सीमा (Income Ceiling):',
        status: 'MET',
        detailEn: `Annual income ₹${applicantIncome.toLocaleString('en-IN')} is within statutory scheme ceiling (≤ ₹${maxIncome.toLocaleString('en-IN')}/yr).`,
        detailHi: `प्रमाणित वार्षिक आय ₹${applicantIncome.toLocaleString('en-IN')} प्राथमिकता सीमा (अधिकतम ₹${maxIncome.toLocaleString('en-IN')}) के भीतर है।`,
        iconType: 'income',
      });
    } else {
      isEligible = false;
      const reasonEn = `Income Cap Exceeded: Annual income ₹${applicantIncome.toLocaleString('en-IN')} exceeds statutory ceiling of ₹${maxIncome.toLocaleString('en-IN')}.`;
      const reasonHi = `आय सीमा उल्लंघन: पारिवारिक आय ₹${applicantIncome.toLocaleString('en-IN')} निर्धारित सीमा ₹${maxIncome.toLocaleString('en-IN')} से अधिक है।`;
      if (!primaryDisqualificationReasonEn) {
        primaryDisqualificationReasonEn = reasonEn;
        primaryDisqualificationReasonHi = reasonHi;
        primaryDisqualificationType = 'income';
      }
      conditionsFailed.push({
        id: 'income_ceiling',
        labelEn: 'Income Ceiling Exceeded:',
        labelHi: 'वार्षिक आय सीमा उल्लंघन:',
        status: 'FAILED',
        detailEn: reasonEn,
        detailHi: reasonHi,
        iconType: 'income',
      });
    }
  } else {
    // Universal income ceiling - open to all
    conditionsMet.push({
      id: 'income_ceiling',
      labelEn: 'Income Ceiling Pass:',
      labelHi: 'वार्षिक आय सीमा (Universal Access):',
      status: 'MET',
      detailEn: `Universal access: No restrictive income ceiling cap (Open to all income brackets).`,
      detailHi: `सार्वभौमिक पात्रता: कोई आय सीमा प्रतिबंध नहीं (सभी आय वर्ग आवेदन हेतु पात्र)।`,
      iconType: 'income',
    });
  }

  // -------------------------------------------------------------------------
  // 3. Social Category & Affirmative Action Bonus
  // -------------------------------------------------------------------------
  const allowedCategories: string[] = criteria.allowedCategories || [];
  const userCat = (profile.category || 'General').toUpperCase().trim();

  let categoryPass = true;
  if (allowedCategories.length > 0) {
    const allowedNorm = allowedCategories.map((c) => c.toUpperCase());
    if (userCat === 'SCT') {
      categoryPass = allowedNorm.includes('SC') || allowedNorm.includes('ST') || allowedNorm.includes('SCT');
    } else if (userCat === 'OBC-NCL') {
      categoryPass = allowedNorm.includes('OBC') || allowedNorm.includes('OBC-NCL');
    } else {
      categoryPass = allowedNorm.includes(userCat);
    }
  }

  if (categoryPass) {
    const grantPct = financials.grantSubsidyPercentage || 0;
    conditionsMet.push({
      id: 'category_bonus',
      labelEn: 'Category & Affirmative Action:',
      labelHi: 'सामाजिक वर्ग व विशेष अनुदान:',
      status: 'MET',
      detailEn: `${profile.category || 'General'} (${profile.gender || 'Applicant'}) qualifies for ${grantPct > 0 ? `${grantPct}% direct government subsidy` : 'statutory nodal coverage'}.`,
      detailHi: `${profile.category || 'सामान्य'} वर्ग (${profile.gender === 'Female' ? 'महिला' : profile.gender}) हेतु ${grantPct > 0 ? `${grantPct}% सरकारी अनुदान` : 'प्राथमिकता आवंटन'} स्वीकृत।`,
      iconType: 'category',
    });
  } else {
    isEligible = false;
    const reasonEn = `Social Category Ineligible: Scheme is restricted to ${allowedCategories.join(', ')} (Applicant is ${profile.category || 'General'}).`;
    const reasonHi = `सामाजिक वर्ग अपात्र: यह योजना केवल ${allowedCategories.join(', ')} वर्ग के लिए है (आवेदक ${profile.category || 'सामान्य'} है)।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'category';
    }
    conditionsFailed.push({
      id: 'category_bonus',
      labelEn: 'Social Category Restriction:',
      labelHi: 'सामाजिक वर्ग पात्रता:',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'category',
    });
  }

  // -------------------------------------------------------------------------
  // 4. Gender Exclusivity Mandate
  // -------------------------------------------------------------------------
  const allowedGenders: string[] = criteria.allowedGenders || [];
  const userGender = (profile.gender || 'Male').toLowerCase();

  let genderPass = true;
  if (allowedGenders.length > 0) {
    const allowedGenNorm = allowedGenders.map((g) => g.toLowerCase());
    genderPass = allowedGenNorm.includes(userGender);
  }

  if (genderPass) {
    const isWomenScheme = allowedGenders.length === 1 && allowedGenders[0].toLowerCase() === 'female';
    conditionsMet.push({
      id: 'gender_qualification',
      labelEn: 'Gender Eligibility:',
      labelHi: 'लिंग पात्रता (Gender Mandate):',
      status: 'MET',
      detailEn: isWomenScheme
        ? `Dedicated Women Entrepreneurship initiative with concessional terms.`
        : `Applicant gender (${profile.gender || 'Approved'}) complies with statutory guidelines.`,
      detailHi: isWomenScheme
        ? `महिला उद्यमियों के लिए विशेष रियायती प्रावधान स्वीकृत।`
        : `आवेदक का लिंग (${profile.gender || 'स्वीकृत'}) पात्रता मानदंडों के अनुसार है।`,
      iconType: 'gender',
    });
  } else {
    isEligible = false;
    const reasonEn = `Gender Ineligible: Scheme is exclusively reserved for ${allowedGenders.join(', ')} applicants.`;
    const reasonHi = `लिंग अपात्रता: यह योजना विशेष रूप से केवल ${allowedGenders.join(', ')} आवेदकों हेतु आरक्षित है।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'gender';
    }
    conditionsFailed.push({
      id: 'gender_qualification',
      labelEn: 'Gender Exclusivity:',
      labelHi: 'लिंग पात्रता (Gender Restriction):',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'gender',
    });
  }

  // -------------------------------------------------------------------------
  // 5. Age Qualification (Accurate DOB calculation - avoids ~2005 yrs bug)
  // -------------------------------------------------------------------------
  const calculatedAge = calculateAge(profile.dob) ?? (profile.age || 35);
  const minAge = criteria.minAge || 18;
  const maxAge = criteria.maxAge || 65;

  if (calculatedAge >= minAge && calculatedAge <= maxAge) {
    conditionsMet.push({
      id: 'age_qualification',
      labelEn: 'Age Qualification:',
      labelHi: 'आयु योग्यता (Age Window):',
      status: 'MET',
      detailEn: `DOB ${profile.dob || 'Verified'} (Age ~${calculatedAge} yrs) complies with statutory ${minAge} to ${maxAge} years window.`,
      detailHi: `जन्मतिथि ${profile.dob || 'प्रमाणित'} (आयु ~${calculatedAge} वर्ष) ${minAge} से ${maxAge} वर्ष की अनिवार्य पात्रता को पूर्ण करती है।`,
      iconType: 'age',
    });
  } else {
    isEligible = false;
    const reasonEn = `Age Ineligible: Applicant age (${calculatedAge} yrs) is outside permissible ${minAge}-${maxAge} years window.`;
    const reasonHi = `आयु अपात्रता: आवेदक की आयु (${calculatedAge} वर्ष) निर्धारित ${minAge}-${maxAge} वर्ष की सीमा से बाहर है।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'age';
    }
    conditionsFailed.push({
      id: 'age_qualification',
      labelEn: 'Age Qualification:',
      labelHi: 'आयु सीमा अपात्रता:',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'age',
    });
  }

  // -------------------------------------------------------------------------
  // 6. Regional / Area Classification
  // -------------------------------------------------------------------------
  const allowedAreas: string[] = criteria.allowedAreas || [];
  const userArea = (profile.areaType || 'Rural').toLowerCase();

  let areaPass = true;
  if (allowedAreas.length > 0) {
    areaPass = allowedAreas.some((a) => a.toLowerCase() === userArea);
  }

  if (areaPass) {
    conditionsMet.push({
      id: 'regional_classification',
      labelEn: 'Regional Classification:',
      labelHi: 'क्षेत्रीय अधिमान्यता (Area Mandate):',
      status: 'MET',
      detailEn: `${profile.areaType || 'Rural'} classification (${profile.district || 'District'}, ${profile.state || 'State'}) approved for nodal allocation.`,
      detailHi: `${profile.areaType || 'ग्रामीण'} क्षेत्र (${profile.district || 'जिला'}, ${profile.state || 'राज्य'}) के तहत प्राथमिकता स्वीकृत।`,
      iconType: 'area',
    });
  } else {
    isEligible = false;
    const reasonEn = `Regional Restriction: Scheme is exclusively for ${allowedAreas.join(', ')} areas (Applicant is ${profile.areaType || 'Rural'}).`;
    const reasonHi = `क्षेत्रीय प्रतिबंध: यह योजना केवल ${allowedAreas.join(', ')} क्षेत्रों के लिए है (आवेदक ${profile.areaType || 'ग्रामीण'} है)।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'area';
    }
    conditionsFailed.push({
      id: 'regional_classification',
      labelEn: 'Regional Classification:',
      labelHi: 'क्षेत्रीय प्रतिबंध:',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'area',
    });
  }

  // -------------------------------------------------------------------------
  // 7. Educational Qualification
  // -------------------------------------------------------------------------
  const minEdu = criteria.minEducation || 'Literate';
  const userEdu = (profile.education || '10th').toLowerCase();
  const userEduRank = EDUCATION_RANKS[userEdu] ?? 1;
  const minEduRank = EDUCATION_RANKS[minEdu.toLowerCase()] ?? 0;

  if (userEduRank >= minEduRank || minEdu.toLowerCase() === 'literate') {
    conditionsMet.push({
      id: 'education_qualification',
      labelEn: 'Educational Qualification:',
      labelHi: 'शैक्षणिक योग्यता (Education Prerequisite):',
      status: 'MET',
      detailEn: `Applicant qualification "${profile.education || '10th'}" fulfills scheme requirement (Min: ${minEdu}).`,
      detailHi: `आवेदक की योग्यता "${profile.education || '10th'}" योजना की आवश्यकता (न्यूनतम: ${minEdu}) को पूर्ण करती है।`,
      iconType: 'education',
    });
  } else {
    isEligible = false;
    const reasonEn = `Education Requirement: Requires minimum ${minEdu} qualification (Applicant is ${profile.education || 'N/A'}).`;
    const reasonHi = `शैक्षणिक योग्यता अपात्र: न्यूनतम ${minEdu} आवश्यक है (आवेदक ${profile.education || 'अपूर्ण'} है)।`;
    if (!primaryDisqualificationReasonEn) {
      primaryDisqualificationReasonEn = reasonEn;
      primaryDisqualificationReasonHi = reasonHi;
      primaryDisqualificationType = 'education';
    }
    conditionsFailed.push({
      id: 'education_qualification',
      labelEn: 'Educational Requirement:',
      labelHi: 'शैक्षणिक योग्यता अपात्रता:',
      status: 'FAILED',
      detailEn: reasonEn,
      detailHi: reasonHi,
      iconType: 'education',
    });
  }

  // -------------------------------------------------------------------------
  // 8. Collateral-Free Credit Guarantee
  // -------------------------------------------------------------------------
  if (!financials.collateralRequired) {
    conditionsMet.push({
      id: 'collateral_free',
      labelEn: 'Collateral-Free Credit:',
      labelHi: 'संपार्श्विक-मुक्त गारंटी (Zero Collateral):',
      status: 'MET',
      detailEn: '100% sovereign credit guarantee under CGTMSE / nodal trust with zero third-party collateral.',
      detailHi: 'CGTMSE क्रेडिट गारंटी फंड ट्रस्ट के तहत 100% बिना किसी बंधक या जमानत के।',
      iconType: 'collateral',
    });
  } else {
    conditionsWarning.push({
      id: 'collateral_free',
      labelEn: 'Collateral Requirement:',
      labelHi: 'संपार्श्विक / सुरक्षा आवश्यकता:',
      status: 'WARNING',
      detailEn: 'Standard institutional bank collateral or asset hypothecation may be required.',
      detailHi: 'ऋणदाता बैंक द्वारा मानक परिसंपत्ति बंधक या संपार्श्विक की आवश्यकता हो सकती है।',
      iconType: 'collateral',
    });
  }

  // -------------------------------------------------------------------------
  // 9. Capital Range Fit
  // -------------------------------------------------------------------------
  const reqCap = Number(profile.requiredCapital) || 100000;
  const minCap = criteria.minCapital || 0;
  const maxCap = criteria.maxCapital || 10000000;

  if (reqCap >= minCap && reqCap <= maxCap) {
    conditionsMet.push({
      id: 'capital_fit',
      labelEn: 'Capital Requirement Fit:',
      labelHi: 'परियोजना पूंजी अनुकूलता:',
      status: 'MET',
      detailEn: `Project capital need ₹${reqCap.toLocaleString('en-IN')} fits scheme financing bracket (₹${minCap.toLocaleString('en-IN')} to ₹${maxCap.toLocaleString('en-IN')}).`,
      detailHi: `वांछित पूंजी ₹${reqCap.toLocaleString('en-IN')} योजना की वित्तपोषण सीमा (₹${minCap.toLocaleString('en-IN')} से ₹${maxCap.toLocaleString('en-IN')}) में आती है।`,
      iconType: 'capital',
    });
  } else if (reqCap > maxCap) {
    conditionsWarning.push({
      id: 'capital_fit',
      labelEn: 'Capital Ceiling Note:',
      labelHi: 'पूंजी सीमा परामर्श:',
      status: 'WARNING',
      detailEn: `Requested capital (₹${reqCap.toLocaleString('en-IN')}) exceeds max single unit limit of ₹${maxCap.toLocaleString('en-IN')}; will be capped at max limit.`,
      detailHi: `वांछित पूंजी (₹${reqCap.toLocaleString('en-IN')}) अधिकतम सीमा ₹${maxCap.toLocaleString('en-IN')} से अधिक है; अधिकतम सीमा तक ही वित्तपोषण मिलेगा।`,
      iconType: 'capital',
    });
  }

  // -------------------------------------------------------------------------
  // 10. Document Readiness (Checked vs verifiedDocCodes)
  // -------------------------------------------------------------------------
  const reqDocs: string[] = scheme.requiredDocuments || [];
  const missingDocs = reqDocs.filter((d) => !verifiedDocCodes.includes(d));

  if (missingDocs.length === 0) {
    conditionsMet.push({
      id: 'document_readiness',
      labelEn: 'Document Attachment:',
      labelHi: 'दस्तावेज संलग्न (Documents Attached):',
      status: 'MET',
      detailEn: 'All required scheme documents successfully uploaded and attached.',
      detailHi: 'सभी अनिवार्य योजना दस्तावेज सफलतापूर्वक अपलोड व संलग्न।',
      iconType: 'documents',
    });
  } else {
    const missingNames = missingDocs.map((d) => DOC_NAMES[d]?.en || d).join(', ');
    const missingNamesHi = missingDocs.map((d) => DOC_NAMES[d]?.hi || d).join(', ');
    conditionsWarning.push({
      id: 'document_readiness',
      labelEn: 'Pending Document Upload:',
      labelHi: 'लंबित दस्तावेज अपलोड:',
      status: 'WARNING',
      detailEn: `${missingDocs.length} document(s) pending upload: ${missingNames}. Click to attach below.`,
      detailHi: `${missingDocs.length} दस्तावेज अपलोड लंबित: ${missingNamesHi}। नीचे क्लिक करके फ़ाइल संलग्न करें।`,
      iconType: 'documents',
    });
  }

  const totalConditionsCount = conditionsMet.length + conditionsFailed.length + conditionsWarning.length;

  return {
    schemeId: scheme.id,
    schemeCode: scheme.code,
    isEligible,
    compatibilityPercentage: isEligible ? (scheme.compatibilityPercentage || 85) : 0,
    primaryDisqualificationReasonEn,
    primaryDisqualificationReasonHi,
    primaryDisqualificationType,
    conditionsMet,
    conditionsFailed,
    conditionsWarning,
    totalConditionsCount,
  };
}

/**
 * Complete database of 28+ government schemes with full criteria.
 * Used for instant evaluations and lazy loading in the unmatched schemes dropdown.
 */
export const ALL_SCHEMES_DATABASE = [
  {
    id: 'sfurti-cluster',
    code: 'SFURTI',
    nameEn: 'Scheme of Fund for Regeneration of Traditional Industries',
    nameHi: 'पारंपरिक उद्योगों के पुनरुद्धार हेतु निधि योजना (SFURTI)',
    ministryEn: 'Ministry of Micro, Small and Medium Enterprises',
    ministryHi: 'सूक्ष्म, लघु एवं मध्यम उद्यम मंत्रालय',
    descriptionEn: 'Financial assistance up to ₹5 Crore for setting up Common Facility Centres (CFCs), testing labs, and modern machinery for rural artisan clusters.',
    descriptionHi: 'शिल्पकार व कारीगर समूहों के लिए साझा सुविधा केंद्र व आधुनिक मशीनरी हेतु ₹5 करोड़ तक अनुदान।',
    categoryBadge: 'CLUSTER INFRASTRUCTURE',
    financials: {
      grantSubsidyPercentage: 90,
      maxGrantAmount: 50000000,
      loanPercentage: 0,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 8.0,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_RURAL'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural'],
      minEducation: 'Literate',
      minCapital: 500000,
      maxCapital: 50000000,
      targetKeywords: 'tailor tailoring handloom garment artisan cluster pottery bamboo terracotta coir honey khadi rural',
    },
  },
  {
    id: 'pm-egp',
    code: 'PMEGP',
    nameEn: "Prime Minister's Employment Generation Programme (PMEGP)",
    nameHi: 'प्रधानमंत्री रोजगार सृजन कार्यक्रम (PMEGP)',
    ministryEn: 'Ministry of MSME / KVIC',
    ministryHi: 'सूक्ष्म, लघु एवं मध्यम उद्यम मंत्रालय (KVIC)',
    descriptionEn: 'Credit-linked capital subsidy scheme for setting up new micro-enterprises in manufacturing (up to ₹50 Lakh) and service sectors (up to ₹20 Lakh).',
    descriptionHi: 'विनिर्माण एवं सेवा क्षेत्रों में नए सूक्ष्म उद्यम स्थापित करने हेतु 35% तक पूंजीगत अनुदान एवं बैंक ऋण।',
    categoryBadge: 'TOP SUBSIDY MATCH',
    financials: {
      grantSubsidyPercentage: 35,
      maxGrantAmount: 1750000,
      loanPercentage: 60,
      promoterMarginPercentage: 5,
      subsidizedInterestRate: 8.5,
      moratoriumPeriodMonths: 6,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_RURAL', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: '8th',
      minCapital: 100000,
      maxCapital: 5000000,
      targetKeywords: 'manufacturing services workshop enterprise pottery carpentry food processing tailoring weaving agro processing rural artisan',
    },
  },
  {
    id: 'pm-vishwakarma',
    code: 'PM_VISHWAKARMA',
    nameEn: 'PM Vishwakarma Kaushal Samman',
    nameHi: 'प्रधानमंत्री विश्वकर्मा कौशल सम्मान योजना',
    ministryEn: 'Ministry of Micro, Small and Medium Enterprises',
    ministryHi: 'सूक्ष्म, लघु और मध्यम उद्यम मंत्रालय',
    descriptionEn: 'End-to-end holistic support for traditional artisans and craftspeople covering 18 trades with toolkits and collateral-free concessional loans.',
    descriptionHi: '18 पारंपरिक व्यवसायों में लगे कारीगरों और शिल्पकारों के लिए टूलकिट और 5% रियायती ब्याज पर ऋण।',
    categoryBadge: 'ARTISAN DEDICATED',
    financials: {
      grantSubsidyPercentage: 15,
      maxGrantAmount: 15000,
      loanPercentage: 85,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 5.0,
      moratoriumPeriodMonths: 3,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 15000,
      maxCapital: 300000,
      targetKeywords: 'artisan potter terracotta carpenter blacksmith goldsmith cobbler tailor barber garland maker basket weaver boat builder armourer mason toy maker',
    },
  },
  {
    id: 'day-nrlm',
    code: 'DAY_NRLM',
    nameEn: 'Deendayal Antyodaya Yojana - NRLM (SHG Bank Linkage)',
    nameHi: 'दीनदयाल अंत्योदय योजना - राष्ट्रीय ग्रामीण आजीविका मिशन',
    ministryEn: 'Ministry of Rural Development',
    ministryHi: 'ग्रामीण विकास मंत्रालय',
    descriptionEn: 'Revolving fund, community investment support, and low-interest bank loans up to ₹10-20 Lakh for rural women Self-Help Groups (SHGs).',
    descriptionHi: 'ग्रामीण महिला स्वयं सहायता समूहों (SHG) के लिए ब्याज सहायता एवं ₹10-20 लाख तक का ऋण।',
    categoryBadge: 'WOMEN SHG LIVELIHOOD',
    financials: {
      grantSubsidyPercentage: 20,
      maxGrantAmount: 150000,
      loanPercentage: 80,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 7.0,
      moratoriumPeriodMonths: 6,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_RURAL'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Female'],
      allowedAreas: ['Rural'],
      minEducation: 'Literate',
      minCapital: 50000,
      maxCapital: 1500000,
      targetKeywords: 'shg women collective poultry dairy tailoring handicrafts agarbatti pickles soap livelihood',
    },
  },
  {
    id: 'stand-up-india',
    code: 'STAND_UP_INDIA',
    nameEn: 'Stand-Up India Scheme for Women & SC/ST',
    nameHi: 'स्टैंड-अप इंडिया योजना (महिला एवं अनुसूचित जाति/जनजाति)',
    ministryEn: 'Department of Financial Services, MoF',
    ministryHi: 'वित्तीय सेवाएं विभाग, वित्त मंत्रालय',
    descriptionEn: 'Bank loans between ₹10 Lakh and ₹1 Crore for establishing greenfield enterprises in manufacturing, services, trading, or agri-allied trade.',
    descriptionHi: 'विनिर्माण, सेवा या व्यापार में नए उद्यम लगाने के लिए ₹10 लाख से ₹1 करोड़ तक का बैंक ऋण।',
    categoryBadge: 'HIGH CAPITAL VENTURE',
    financials: {
      grantSubsidyPercentage: 15,
      maxGrantAmount: 1500000,
      loanPercentage: 75,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 8.75,
      moratoriumPeriodMonths: 18,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'General', 'OBC', 'EWS', 'Minority'],
      allowedGenders: ['Female', 'Male'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: '10th',
      minCapital: 1000000,
      maxCapital: 10000000,
      targetKeywords: 'greenfield enterprise manufacturing services trading women entrepreneur sc st venture',
    },
  },
  {
    id: 'mahila-samridhi',
    code: 'MAHILA_SAMRIDHI',
    nameEn: 'Mahila Samridhi Yojana (NBCFDC)',
    nameHi: 'महिला समृद्धि योजना (एनबीसीएफडीसी)',
    ministryEn: 'Ministry of Social Justice & Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Micro-finance credit up to ₹1,40,000 at a subsidized interest rate of 4% per annum for backward class women entrepreneurs.',
    descriptionHi: 'पिछड़े वर्ग की महिला उद्यमियों के लिए 4% रियायती ब्याज दर पर ₹1.40 लाख तक का सूक्ष्म ऋण।',
    categoryBadge: 'WOMEN MICRO CREDIT',
    financials: {
      grantSubsidyPercentage: 10,
      maxGrantAmount: 14000,
      loanPercentage: 90,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 4.0,
      moratoriumPeriodMonths: 3,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME'],
    eligibilityCriteria: {
      maxIncome: 300000,
      allowedCategories: ['OBC', 'EWS'],
      allowedGenders: ['Female'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 20000,
      maxCapital: 140000,
      targetKeywords: 'women micro enterprise tailoring beauty parlour grocery dairy handicrafts stall obc',
    },
  },
  {
    id: 'new-swarnima-obc',
    code: 'NEW_SWARNIMA',
    nameEn: 'New Swarnima Scheme for OBC Women',
    nameHi: 'नई स्वर्णिमा योजना (ओबीसी महिला)',
    ministryEn: 'National Backward Classes Finance & Development Corporation',
    ministryHi: 'राष्ट्रीय पिछड़ा वर्ग वित्त एवं विकास निगम',
    descriptionEn: 'Term loan up to ₹2,00,000 at 5% per annum for women belonging to backward classes to achieve financial self-reliance without dependency.',
    descriptionHi: 'ओबीसी महिलाओं के आर्थिक स्वावलंबन हेतु 5% वार्षिक ब्याज पर ₹2,00,000 तक का मियादी ऋण।',
    categoryBadge: 'WOMEN EMPOWERMENT',
    financials: {
      grantSubsidyPercentage: 10,
      maxGrantAmount: 20000,
      loanPercentage: 90,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 5.0,
      moratoriumPeriodMonths: 6,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME'],
    eligibilityCriteria: {
      maxIncome: 300000,
      allowedCategories: ['OBC'],
      allowedGenders: ['Female'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 50000,
      maxCapital: 200000,
      targetKeywords: 'obc women small enterprise cottage trade shop parlour boutique artisan self reliant',
    },
  },
  {
    id: 'nssfp',
    code: 'NSSFP',
    nameEn: 'National Solar Science Fellowship Programme',
    nameHi: 'राष्ट्रीय सौर विज्ञान फेलोशिप कार्यक्रम',
    ministryEn: 'Ministry of New and Renewable Energy',
    ministryHi: 'नवीन और नवीकरणीय ऊर्जा मंत्रालय',
    descriptionEn: 'Prestigious research fellowship for top scientists and engineers in solar energy with ₹1,00,000/month stipend and ₹5,00,000 annual contingency grant.',
    descriptionHi: 'सौर ऊर्जा क्षेत्र में उत्कृष्ट शोध हेतु वैज्ञानिकों के लिए ₹1,00,000 मासिक वजीफा एवं ₹5 लाख शोध अनुदान।',
    categoryBadge: 'FELLOWSHIP & RESEARCH',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 3600000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_MARKSHEET', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Graduate',
      minCapital: 0,
      maxCapital: 5000000,
      targetKeywords: 'solar energy scientist research fellowship phd engineer renewable energy green clean power generation',
    },
  },
  {
    id: 'post-matric-scholarship-sc',
    code: 'PMS_SC',
    nameEn: 'Post-Matric Scholarship for SC Students',
    nameHi: 'अनुसूचित जाति के छात्रों हेतु पोस्ट-मैट्रिक छात्रवृत्ति',
    ministryEn: 'Ministry of Social Justice and Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Centrally sponsored scheme providing full tuition fee reimbursement and academic allowances for SC students studying post-Class 10.',
    descriptionHi: 'कक्षा 10वीं के उपरांत अध्ययनरत अनुसूचित जाति के विद्यार्थियों के लिए पूर्ण शिक्षण शुल्क व मासिक भत्ता।',
    categoryBadge: 'SCHOLARSHIP & EDUCATION',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 75000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 250000,
      allowedCategories: ['SC'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: '10th',
      minCapital: 0,
      maxCapital: 100000,
      targetKeywords: 'student education scholarship college university degree diploma 11th 12th undergraduate postgraduate',
    },
  },
  {
    id: 'post-matric-scholarship-obc',
    code: 'PMS_OBC_SC',
    nameEn: 'Post-Matric Scholarship for OBC & EBC Students',
    nameHi: 'पोस्ट-मैट्रिक छात्रवृत्ति योजना (ओबीसी एवं ईबीसी)',
    ministryEn: 'Ministry of Social Justice and Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Complete tuition fee waiver and monthly maintenance allowance for OBC and EBC students pursuing higher secondary and degree education.',
    descriptionHi: 'उच्चतर माध्यमिक व स्नातक छात्रों के लिए पूर्ण शिक्षण शुल्क प्रतिपूर्ति एवं मासिक भत्ता।',
    categoryBadge: 'SCHOLARSHIP & EDUCATION',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 48000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 250000,
      allowedCategories: ['OBC', 'EWS'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: '10th',
      minCapital: 0,
      maxCapital: 80000,
      targetKeywords: 'obc ebc student education college diploma degree scholarship fees',
    },
  },
  {
    id: 'pre-matric-scholarship-sc-st',
    code: 'PRE_MATRIC_SC_ST',
    nameEn: 'Pre-Matric Scholarship for SC & ST Students (Class IX & X)',
    nameHi: 'कक्षा 9वीं एवं 10वीं के एससी/एसटी छात्रों हेतु प्री-मैट्रिक छात्रवृत्ति',
    ministryEn: 'Ministry of Social Justice & Empowerment / MoTA',
    ministryHi: 'सामाजिक न्याय एवं जनजातीय कार्य मंत्रालय',
    descriptionEn: 'Scholarship grant to support children of SC/ST families studying in classes 9 and 10 to minimize drop-out rates.',
    descriptionHi: 'अनुसूचित जाति एवं जनजाति के कक्षा 9 व 10 के विद्यार्थियों के लिए शैक्षणिक अनुदान।',
    categoryBadge: 'SCHOOL SCHOLARSHIP',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 12000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 250000,
      allowedCategories: ['SC', 'ST'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 0,
      maxCapital: 20000,
      targetKeywords: 'school 9th 10th matric student books school fees uniform stipend',
    },
  },
  {
    id: 'nmmss-scholarship',
    code: 'NMMSS',
    nameEn: 'National Means-cum-Merit Scholarship Scheme',
    nameHi: 'राष्ट्रीय साधन-सह-योग्यता छात्रवृत्ति योजना',
    ministryEn: 'Department of School Education and Literacy, MoE',
    ministryHi: 'स्कूल शिक्षा और साक्षरता विभाग, शिक्षा मंत्रालय',
    descriptionEn: 'Merit-based financial assistance of ₹12,000 per year for meritorious students of economically weaker sections from Class IX to XII.',
    descriptionHi: 'आर्थिक रूप से कमजोर मेधावी विद्यार्थियों हेतु कक्षा 9 से 12 तक ₹12,000 वार्षिक छात्रवृत्ति।',
    categoryBadge: 'MERIT SCHOLARSHIP',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 12000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 350000,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'General', 'Minority'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 0,
      maxCapital: 25000,
      targetKeywords: 'merit exam middle school class 8 9 10 11 12 study scholarship',
    },
  },
  {
    id: 'pm-fme',
    code: 'PMFME',
    nameEn: 'PM Formalisation of Micro food processing Enterprises Scheme',
    nameHi: 'पीएम सूक्ष्म खाद्य उद्योग उन्नयन योजना (PMFME)',
    ministryEn: 'Ministry of Food Processing Industries (MoFPI)',
    ministryHi: 'खाद्य प्रसंस्करण उद्योग मंत्रालय',
    descriptionEn: 'Credit-linked capital subsidy of 35% (up to ₹10 Lakh) for establishing or upgrading micro food processing units under One District One Product (ODOP).',
    descriptionHi: 'खाद्य प्रसंस्करण, मसाला, अचार, तेल मिल आदि के लिए 35% (अधिकतम ₹10 लाख) पूंजीगत सब्सिडी।',
    categoryBadge: 'AGRO-FOOD PROCESSING',
    financials: {
      grantSubsidyPercentage: 35,
      maxGrantAmount: 1000000,
      loanPercentage: 55,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 8.0,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 200000,
      maxCapital: 3000000,
      targetKeywords: 'food processing pickle flour mill oil expeller spices bakery dairy packaging juice chips',
    },
  },
  {
    id: 'pm-kisan',
    code: 'PM_KISAN',
    nameEn: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    nameHi: 'प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान)',
    ministryEn: 'Ministry of Agriculture and Farmers Welfare',
    ministryHi: 'कृषि एवं किसान कल्याण मंत्रालय',
    descriptionEn: 'Direct income support of ₹6,000 per year in three equal tranches for landholding farmer families across India.',
    descriptionHi: 'भूमिधारक कृषक परिवारों के लिए ₹6,000 प्रति वर्ष का प्रत्यक्ष आय समर्थन।',
    categoryBadge: 'DIRECT FARMER GRANT',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 6000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural'],
      minEducation: 'Literate',
      minCapital: 0,
      maxCapital: 10000,
      targetKeywords: 'farmer cultivation land crops seeds fertilizer agriculture kisan kheti',
    },
  },
  {
    id: 'pm-fby',
    code: 'PMFBY',
    nameEn: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    nameHi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    ministryEn: 'Ministry of Agriculture and Farmers Welfare',
    ministryHi: 'कृषि एवं किसान कल्याण मंत्रालय',
    descriptionEn: 'Comprehensive risk insurance covering crop losses from natural calamities, pests, and unseasonal rains at nominal premium (1.5% - 2%).',
    descriptionHi: 'प्राकृतिक आपदाओं और कीटों से फसल क्षति पर नाममात्र प्रीमियम में व्यापक सुरक्षा।',
    categoryBadge: 'CROP INSURANCE',
    financials: {
      grantSubsidyPercentage: 85,
      maxGrantAmount: 200000,
      loanPercentage: 0,
      promoterMarginPercentage: 2,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural'],
      minEducation: 'Literate',
      minCapital: 5000,
      maxCapital: 500000,
      targetKeywords: 'crop insurance paddy wheat cotton flood drought cyclone damage farmer',
    },
  },
  {
    id: 'agriculture-infra-fund',
    code: 'AIF',
    nameEn: 'Agriculture Infrastructure Fund (AIF)',
    nameHi: 'कृषि अवसंरचना कोष (AIF)',
    ministryEn: 'Ministry of Agriculture & Farmers Welfare',
    ministryHi: 'कृषि एवं किसान कल्याण मंत्रालय',
    descriptionEn: 'Medium to long-term debt financing for post-harvest management infrastructure such as cold storage, warehouses, silos, and sorting units.',
    descriptionHi: 'कोल्ड स्टोरेज, गोदाम, छंटाई व ग्रेडिंग इकाइयों की स्थापना हेतु 3% ब्याज छूट के साथ दीर्घकालिक ऋण।',
    categoryBadge: 'AGRI INFRASTRUCTURE',
    financials: {
      grantSubsidyPercentage: 20,
      maxGrantAmount: 2000000,
      loanPercentage: 80,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 6.0,
      moratoriumPeriodMonths: 24,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural'],
      minEducation: '10th',
      minCapital: 1000000,
      maxCapital: 20000000,
      targetKeywords: 'cold storage warehouse silo sorting packaging agri tech farmer producer FPO logistics',
    },
  },
  {
    id: 'vcf-sc',
    code: 'VCF_SC',
    nameEn: 'Venture Capital Fund for Scheduled Castes (VCF-SC)',
    nameHi: 'अनुसूचित जातियों के लिए वेंचर कैपिटल फंड (VCF-SC)',
    ministryEn: 'Ministry of Social Justice and Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Concessional equity and debt venture financing (₹20 Lakh to ₹15 Crore) to SC entrepreneurs building innovative, tech-enabled, or scalable enterprises.',
    descriptionHi: 'अनुसूचित जाति के उद्यमियों के अभिनव व उच्च विकास वाले उद्यमों हेतु रियायती वेंचर पूंजी।',
    categoryBadge: 'VENTURE CAPITAL',
    financials: {
      grantSubsidyPercentage: 25,
      maxGrantAmount: 5000000,
      loanPercentage: 75,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 4.0,
      moratoriumPeriodMonths: 24,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Graduate',
      minCapital: 2000000,
      maxCapital: 50000000,
      targetKeywords: 'startup technology innovation high tech manufacturing scalable sc founder venture',
    },
  },
  {
    id: 'asiim-sc',
    code: 'ASIIM',
    nameEn: 'Ambedkar Social Innovation and Incubation Mission (ASIIM)',
    nameHi: 'अम्बेडकर सोशल इनोवेशन एंड इनक्यूबेशन मिशन',
    ministryEn: 'Ministry of Social Justice and Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Equity funding up to ₹30 Lakh over 3 years to SC youth and technology-oriented student entrepreneurs incubated in recognized TBIs.',
    descriptionHi: 'उच्च शिक्षण संस्थानों के इनक्यूबेटर में पंजीकृत अनुसूचित जाति के छात्र उद्यमियों हेतु ₹30 लाख इक्विटी।',
    categoryBadge: 'STUDENT STARTUP',
    financials: {
      grantSubsidyPercentage: 50,
      maxGrantAmount: 3000000,
      loanPercentage: 50,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 3.75,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_MARKSHEET', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Urban', 'Rural'],
      minEducation: 'Graduate',
      minCapital: 500000,
      maxCapital: 5000000,
      targetKeywords: 'student startup incubator tech innovation patent software biotechnology engineering',
    },
  },
  {
    id: 'nssh-hub',
    code: 'NSSH',
    nameEn: 'National SC-ST Hub (NSSH)',
    nameHi: 'राष्ट्रीय अनुसूचित जाति-जनजाति हब (NSSH)',
    ministryEn: 'Ministry of Micro, Small and Medium Enterprises',
    ministryHi: 'सूक्ष्म, लघु एवं मध्यम उद्यम मंत्रालय',
    descriptionEn: 'Provides 80% subsidy for purchase of testing equipment, plant machinery, ISO certification, and participation in international trade exhibitions.',
    descriptionHi: 'परीक्षण उपकरण, मशीनरी, प्रमाणन और अंतर्राष्ट्रीय व्यापार मेलों हेतु 80% तक अनुदान सहायता।',
    categoryBadge: 'MSME CAPACITY BUILDING',
    financials: {
      grantSubsidyPercentage: 80,
      maxGrantAmount: 2500000,
      loanPercentage: 0,
      promoterMarginPercentage: 20,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_UDYAM'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 200000,
      maxCapital: 10000000,
      targetKeywords: 'msme equipment iso testing procurement tender government tender sc st enterprise',
    },
  },
  {
    id: 'pmmsy-fisheries',
    code: 'PMMSY',
    nameEn: 'Pradhan Mantri Matsya Sampada Yojana (Fisheries)',
    nameHi: 'प्रधानमंत्री मत्स्य संपदा योजना (मत्स्य पालन)',
    ministryEn: 'Department of Fisheries, Ministry of Animal Husbandry',
    ministryHi: 'मत्स्य पालन विभाग, पशुपालन एवं डेयरी मंत्रालय',
    descriptionEn: 'Direct capital grant of 40% (General) to 60% (SC/ST/Women) for fish farming ponds, biofloc, recirculatory aquaculture systems (RAS), and cold chains.',
    descriptionHi: 'मछली पालन, बायोफ्लॉक, हैचरी और शीत गृह हेतु महिलाओं व एससी/एसटी को 60% तक प्रत्यक्ष अनुदान।',
    categoryBadge: 'AQUACULTURE & FISHERIES',
    financials: {
      grantSubsidyPercentage: 60,
      maxGrantAmount: 3000000,
      loanPercentage: 35,
      promoterMarginPercentage: 5,
      subsidizedInterestRate: 7.5,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 100000,
      maxCapital: 5000000,
      targetKeywords: 'fish farming aquaculture pond biofloc shrimp fishery boats feed mill',
    },
  },
  {
    id: 'nlm-livestock',
    code: 'NLM',
    nameEn: 'National Livestock Mission (NLM)',
    nameHi: 'राष्ट्रीय पशुधन मिशन (NLM)',
    ministryEn: 'Ministry of Fisheries, Animal Husbandry & Dairying',
    ministryHi: 'मत्स्य पालन, पशुपालन एवं डेयरी मंत्रालय',
    descriptionEn: '50% capital subsidy (up to ₹25 Lakh to ₹50 Lakh) for establishing commercial poultry, goat, sheep, and piggery breeding farms.',
    descriptionHi: 'वाणिज्यिक पोल्ट्री, बकरी, भेड़ और सूअर प्रजनन फार्म स्थापित करने के लिए 50% प्रत्यक्ष पूंजीगत सब्सिडी।',
    categoryBadge: 'LIVESTOCK & DAIRY',
    financials: {
      grantSubsidyPercentage: 50,
      maxGrantAmount: 5000000,
      loanPercentage: 40,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 8.0,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural'],
      minEducation: 'Literate',
      minCapital: 500000,
      maxCapital: 10000000,
      targetKeywords: 'poultry broiler goat farming sheep piggery animal husbandry meat feed dairy',
    },
  },
  {
    id: 'pm-svanidhi',
    code: 'PM_SVANIDHI',
    nameEn: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
    nameHi: 'पीएम स्ट्रीट वेंडर्स आत्मनिर्भर निधि (पीएम स्वनिधि)',
    ministryEn: 'Ministry of Housing and Urban Affairs (MoHUA)',
    ministryHi: 'आवासन और शहरी कार्य मंत्रालय',
    descriptionEn: 'Affordable collateral-free working capital loan facility to street vendors, thela operators, and small urban stalls with 7% interest subsidy.',
    descriptionHi: 'रेहड़ी-पटरी वालों और ठेले वालों के लिए किफायती कार्यशील पूंजी ऋण एवं 7% ब्याज सब्सिडी।',
    categoryBadge: 'MICRO WORKING CAPITAL',
    financials: {
      grantSubsidyPercentage: 7,
      maxGrantAmount: 3500,
      loanPercentage: 100,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 7.0,
      moratoriumPeriodMonths: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Urban', 'Rural'],
      minEducation: 'Literate',
      minCapital: 10000,
      maxCapital: 80000,
      targetKeywords: 'street vendor thela fruit vegetable seller tea stall food cart cobbler pan shop flower vendor hawker',
    },
  },
  {
    id: 'pm-mudra-shishu',
    code: 'MUDRA_SHISHU',
    nameEn: 'Pradhan Mantri Mudra Yojana (Shishu Window)',
    nameHi: 'प्रधानमंत्री मुद्रा योजना (शिशु श्रेणी)',
    ministryEn: 'Department of Financial Services, MoF',
    ministryHi: 'वित्तीय सेवाएं विभाग, वित्त मंत्रालय',
    descriptionEn: 'Collateral-free micro working capital loans up to ₹50,000 for starting tiny business ventures, shops, and cottage production.',
    descriptionHi: 'छोटे व्यवसायों और दुकानों की शुरुआत हेतु ₹50,000 तक का संपार्श्विक-मुक्त ऋण।',
    categoryBadge: 'MICRO STARTER LOAN',
    financials: {
      grantSubsidyPercentage: 0,
      maxGrantAmount: 0,
      loanPercentage: 100,
      promoterMarginPercentage: 0,
      subsidizedInterestRate: 9.0,
      moratoriumPeriodMonths: 3,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 10000,
      maxCapital: 50000,
      targetKeywords: 'micro shop grocery dairy tailoring vendor tea stall repair petty business cottage',
    },
  },
  {
    id: 'pm-mudra-kishore',
    code: 'MUDRA_KISHORE',
    nameEn: 'Pradhan Mantri Mudra Yojana (Kishore Window)',
    nameHi: 'प्रधानमंत्री मुद्रा योजना (किशोर श्रेणी)',
    ministryEn: 'Department of Financial Services, MoF',
    ministryHi: 'वित्तीय सेवाएं विभाग, वित्त मंत्रालय',
    descriptionEn: 'Term loan and working capital credit from ₹50,000 to ₹5,00,000 for expanding existing small businesses and workshops.',
    descriptionHi: 'मौजूदा व्यवसायों और कार्यशालाओं के विस्तार हेतु ₹50,000 से ₹5,00,000 तक का रियायती ऋण।',
    categoryBadge: 'BUSINESS EXPANSION',
    financials: {
      grantSubsidyPercentage: 0,
      maxGrantAmount: 0,
      loanPercentage: 90,
      promoterMarginPercentage: 10,
      subsidizedInterestRate: 9.25,
      moratoriumPeriodMonths: 6,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 50001,
      maxCapital: 500000,
      targetKeywords: 'shop expansion workshop small manufacturing service salon auto repair garments',
    },
  },
  {
    id: 'cgtmse-guarantee',
    code: 'CGTMSE',
    nameEn: 'Credit Guarantee Scheme for Micro & Small Enterprises',
    nameHi: 'सूक्ष्म एवं लघु उद्यम क्रेडिट गारंटी योजना (CGTMSE)',
    ministryEn: 'Ministry of MSME & SIDBI',
    ministryHi: 'सूक्ष्म, लघु एवं मध्यम उद्यम मंत्रालय एवं सिडबी',
    descriptionEn: 'Credit guarantee cover up to ₹5 Crore for collateral-free business loans extended by banks to new and existing micro and small enterprises.',
    descriptionHi: 'उद्यमियों को बिना किसी गारंटी/संपार्श्विक के ₹5 करोड़ तक बैंक ऋण हेतु सरकारी गारंटी कवर।',
    categoryBadge: 'CREDIT GUARANTEE',
    financials: {
      grantSubsidyPercentage: 0,
      maxGrantAmount: 0,
      loanPercentage: 100,
      promoterMarginPercentage: 15,
      subsidizedInterestRate: 8.5,
      moratoriumPeriodMonths: 12,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_INCOME', 'DOC_UDYAM', 'DOC_PROJECT_REPORT'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 1000000,
      maxCapital: 50000000,
      targetKeywords: 'collateral free loan guarantee bank credit msme manufacturing trading engineering service',
    },
  },
  {
    id: 'pm-kvy',
    code: 'PMKVY',
    nameEn: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
    nameHi: 'प्रधानमंत्री कौशल विकास योजना 4.0',
    ministryEn: 'Ministry of Skill Development and Entrepreneurship (MSDE)',
    ministryHi: 'कौशल विकास और उद्यमिता मंत्रालय',
    descriptionEn: 'Free short-term industry certification, toolkit assistance, and ₹8,000 stipend in Industry 4.0, drone, AI, and traditional craft trades.',
    descriptionHi: 'उद्योग 4.0, ड्रोन, रोबोटिक्स और पारंपरिक ट्रेडों में निःशुल्क कौशल प्रशिक्षण व वजीफा।',
    categoryBadge: 'SKILL & PLACEMENT',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 25000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: null,
      allowedCategories: ['SC', 'ST', 'OBC', 'EWS', 'Minority', 'General'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Literate',
      minCapital: 0,
      maxCapital: 50000,
      targetKeywords: 'skill training certificate drone electrician mechanic solar welding computing apprentice',
    },
  },
  {
    id: 'top-class-sc',
    code: 'TOP_CLASS_SC',
    nameEn: 'Top Class Education Scheme for SC Students',
    nameHi: 'अनुसूचित जाति के छात्रों हेतु शीर्ष श्रेणी शिक्षा योजना',
    ministryEn: 'Ministry of Social Justice and Empowerment',
    ministryHi: 'सामाजिक न्याय और अधिकारिता मंत्रालय',
    descriptionEn: 'Full financial support covering entire non-refundable tuition fees, living expenses, books, and laptop for SC students admitted to IITs, IIMs, AIIMS, and NLUs.',
    descriptionHi: 'आईआईटी, आईआईएम, एम्स और एनएलयू में प्रवेशित एससी छात्रों हेतु पूर्ण शिक्षण शुल्क, लैपटॉप व जीवन व्यय अनुदान।',
    categoryBadge: 'PREMIER EDUCATION',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 350000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 800000,
      allowedCategories: ['SC'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: '12th',
      minCapital: 0,
      maxCapital: 500000,
      targetKeywords: 'iit iim aiims nlu engineering medicine law management premier university degree scholar',
    },
  },
  {
    id: 'national-overseas-scholarship',
    code: 'NOS_SC_ST',
    nameEn: 'National Overseas Scholarship for SC and ST Candidates',
    nameHi: 'अनुसूचित जाति/जनजाति हेतु राष्ट्रीय विदेशी छात्रवृत्ति',
    ministryEn: 'Ministry of Social Justice and Empowerment & MoTA',
    ministryHi: 'सामाजिक न्याय एवं जनजातीय कार्य मंत्रालय',
    descriptionEn: 'Full financial support covering entire international tuition, airfare, and annual living stipend (US$15,400) for Masters and PhD studies abroad.',
    descriptionHi: 'विदेश में स्नातकोत्तर एवं पीएचडी अध्ययन हेतु पूर्ण शिक्षण शुल्क, विमान किराया व जीवन-यापन भत्ता।',
    categoryBadge: 'OVERSEAS EDUCATION',
    financials: {
      grantSubsidyPercentage: 100,
      maxGrantAmount: 4500000,
      loanPercentage: 0,
      promoterMarginPercentage: 0,
      collateralRequired: false,
    },
    requiredDocuments: ['DOC_AADHAAR', 'DOC_CASTE', 'DOC_INCOME', 'DOC_MARKSHEET'],
    eligibilityCriteria: {
      maxIncome: 800000,
      allowedCategories: ['SC', 'ST'],
      allowedGenders: ['Male', 'Female', 'Other'],
      allowedAreas: ['Rural', 'Urban'],
      minEducation: 'Graduate',
      minCapital: 0,
      maxCapital: 5000000,
      targetKeywords: 'foreign study masters phd abroad university international tuition visa scholarship',
    },
  },
];
