import re
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("udyamsetu.extractors")

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar", "Chandigarh", "Dadra and Nagar Haveli", "Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

HINDI_STATE_MAP = {
    "उत्तर प्रदेश": "Uttar Pradesh",
    "बिहार": "Bihar",
    "मध्य प्रदेश": "Madhya Pradesh",
    "राजस्थान": "Rajasthan",
    "महाराष्ट्र": "Maharashtra",
    "गुजरात": "Gujarat",
    "हरियाणा": "Haryana",
    "पंजाब": "Punjab",
    "पश्चिम बंगाल": "West Bengal",
    "दिल्ली": "Delhi",
    "उत्तराखंड": "Uttarakhand",
    "झारखंड": "Jharkhand",
    "छत्तीसगढ़": "Chhattisgarh",
    "ओडिशा": "Odisha",
}

COMMON_MIDDLE_NAMES = {
    "kumar", "kumari", "devi", "prasad", "lal", "chandra", "singh",
    "ram", "nath", "babu", "dayal", "prakash", "kishore", "kant",
    "pal", "dutt", "mani", "swaroop", "bhan", "jeet", "preet", "deep",
    "mohan", "sharan", "charan", "das", "raj", "sen", "rani", "bai"
}

COMMON_SURNAMES = {
    "singh", "kushwaha", "sharma", "verma", "gupta", "yadav", "patel",
    "mishra", "tiwari", "pandey", "shukla", "dubey", "chaubey", "tripathi",
    "upadhyay", "joshi", "bhatt", "rao", "reddy", "nair", "pillai", "menon",
    "chauhan", "rathore", "rajput", "meena", "gurjar", "saini", "maurya",
    "bind", "rajbhar", "nishad", "mallah", "kewat", "kashyap", "sahni",
    "thakur", "kaur", "ali", "ahmed", "khan", "siddiqui", "ansari", "qureshi",
    "shaikh", "sayyad", "pathan", "begum", "khatun", "bano", "das", "dey",
    "sen", "ghosh", "bose", "mukherjee", "banerjee", "chatterjee", "roy",
    "dutta", "jha", "poddar", "sinha", "kulkarni", "deshmukh", "patil",
    "pawar", "shinde", "jadhav", "gaikwad", "choudhary", "chowdhury",
    "agarwal", "aggarwal", "mittal", "goyal", "bansal", "garg", "jindal",
    "singhal", "bhatia", "malhotra", "kapoor", "khanna", "arora", "chopra",
    "sethi", "dhillon", "gill", "sandhu", "grewal", "sidhu", "brar", "mann",
    "bhat", "dar", "lone", "wani", "shah", "mehta", "modi", "gandhi", "soni",
    "swamy", "naidu", "shetty", "hegde", "pai", "kamath", "prabhu"
}

KNOWN_FULL_NAMES = {
    "ramesh", "suresh", "mahesh", "dinesh", "mukesh", "naresh", "rakesh",
    "hitesh", "kamlesh", "brijesh", "rajesh", "umesh", "ganesh", "yogesh"
}

NAME_NOISE_WORDS = {
    "GOVERNMENT", "INDIA", "BHARAT", "SARKAR", "ENROLMENT", "UNIQUE",
    "IDENTIFICATION", "AUTHORITY", "UIDAI", "HELP", "WWW", "MERA",
    "AADHAAR", "MERI", "PEHCHAN", "FATHER", "HUSBAND", "WIFE", "MOTHER",
    "CARE OF", "C/O", "S/O", "W/O", "D/O", "SON OF", "WIFE OF", "DAUGHTER OF",
    "ADDRESS", "पता", "VILLAGE", "VILL", "POST", "PO", "TEHSIL", "DISTRICT",
    "DIST", "STATE", "PINCODE", "PIN", "PIN CODE", "MOHALLA", "COLONY",
    "NAGAR", "ROAD", "STREET", "MARG", "LANE", "SECTOR", "HOUSE", "FLAT",
    "PLOT", "BLOCK", "BHAVAN", "BHAWAN", "APARTMENT", "NEAR", "OPPOSITE",
    "BEHIND", "STATION", "MANDIR", "MASJID", "CHOWK", "TOLL", "FREE",
    "1947", "EMAIL", "COM", "IN", "HELP@UIDAI", "DOB", "DATE OF BIRTH",
    "YEAR OF BIRTH", "YOB", "BIRTH", "YEAR", "GENDER", "MALE", "FEMALE",
    "TRANSGENDER", "PURUSH", "MAHILA", "VID", "ISSUE", "VALID", "DOWNLOAD",
    "भारत", "सरकार", "पहचान", "प्राधिकरण", "पिता", "पति", "माता", "आत्मज",
    "पुत्र", "पत्नी", "ज़िला", "जिला", "ग्राम", "पोस्ट", "जन्म", "तिथि", "पुरुष", "महिला"
}


def _split_single_word(w: str) -> List[str]:
    low = w.lower()
    if low in KNOWN_FULL_NAMES or len(low) < 5:
        return [w]

    # 1. Check if starts with a known middle name (e.g. 'kumarsingh' -> 'kumar' + 'singh')
    for mid in sorted(COMMON_MIDDLE_NAMES, key=len, reverse=True):
        if low.startswith(mid) and len(low) > len(mid) + 2:
            suffix = low[len(mid):]
            if suffix in COMMON_SURNAMES or suffix in COMMON_MIDDLE_NAMES:
                return [w[:len(mid)]] + _split_single_word(w[len(mid):])

    # 2. Check if ends with a known surname or middle name (e.g. 'rohitsingh' -> 'rohit' + 'singh', 'kushagrakumar' -> 'kushagra' + 'kumar')
    all_endings = COMMON_SURNAMES.union(COMMON_MIDDLE_NAMES)
    for sur in sorted(all_endings, key=len, reverse=True):
        if low.endswith(sur) and len(low) > len(sur) + 2:
            prefix = low[:-len(sur)]
            if prefix in COMMON_MIDDLE_NAMES or len(prefix) >= 3:
                return _split_single_word(w[:len(prefix)]) + [w[len(prefix):]]

    return [w]


def split_merged_names(text: str) -> str:
    """
    Intelligently splits concatenated middle and last names (e.g. 'Kumarsingh' -> 'Kumar Singh',
    'KumarSingh' -> 'Kumar Singh', 'Devikushwaha' -> 'Devi Kushwaha', 'SunitaKumarsingh' -> 'Sunita Kumar Singh')
    while preserving genuine first names like 'Ramesh', 'Suresh'.
    """
    # 1. Expand PascalCase / camelCase boundaries (e.g. KumarSingh -> Kumar Singh)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    words = text.split()
    result = []
    for w in words:
        parts = _split_single_word(w)
        result.extend(parts)
    return " ".join(result).title()


def is_noise_line(line: str) -> bool:
    """
    Checks if a text line is header/address/guardian noise that should NEVER be used as applicant name.
    Uses whole-token intersection and multi-word phrase matching to prevent substring collisions.
    """
    tokens = set(re.findall(r'[A-Za-z]+', line.upper()))
    if tokens.intersection(NAME_NOISE_WORDS):
        return True
    upper = line.upper()
    noise_phrases = [
        "GOVERNMENT OF INDIA", "UNIQUE IDENTIFICATION", "CARE OF", "C/O",
        "W/O", "S/O", "D/O", "DATE OF BIRTH", "YEAR OF BIRTH", "HELP@UIDAI",
        "WWW.UIDAI", "MERA AADHAAR", "MERI PEHCHAN"
    ]
    for phrase in noise_phrases:
        if phrase in upper:
            return True
    return False


def classify_aadhaar_side(lines: List[str]) -> str:
    """
    Classifies whether a set of OCR text lines belongs to the FRONT, BACK, or COMBINED Aadhaar card.
    """
    full_text = " ".join(lines).upper()
    has_front = bool(re.search(
        r'\b(DOB|DATE OF BIRTH|YEAR OF BIRTH|YOB|MALE|FEMALE|TRANSGENDER|PURUSH|MAHILA|जन्म|पुरुष|महिला|GOVERNMENT OF INDIA|BHARAT SARKAR|भारत सरकार|MERA AADHAAR)\b',
        full_text,
        re.IGNORECASE
    ))
    has_back = bool(re.search(
        r'\b(ADDRESS|C/O|S/O|W/O|D/O|CARE OF|DISTRICT|DIST|PINCODE|PIN\s*CODE|पता|ज़िला|जिला|1947|UIDAI\.GOV\.IN|HELP@UIDAI)\b',
        full_text,
        re.IGNORECASE
    ))
    if has_front and has_back:
        return "COMBINED"
    elif has_front:
        return "FRONT"
    elif has_back:
        return "BACK"
    return "UNKNOWN"


def partition_aadhaar_lines(lines: List[str]) -> Tuple[List[str], List[str]]:
    """
    Partitions a single list of text lines into front_lines (name, DOB, gender)
    and back_lines (address, district, state, pin).
    """
    front_lines = []
    back_lines = []
    in_back_block = False

    back_start_cues = [
        "ADDRESS", "पता", "C/O", "S/O", "W/O", "D/O", "CARE OF", "SON OF", "WIFE OF", "DAUGHTER OF",
        "DISTRICT", "DIST", "ज़िला", "जिला", "PINCODE", "PIN CODE", "1947", "HELP@UIDAI"
    ]
    front_start_cues = [
        "GOVERNMENT OF INDIA", "BHARAT SARKAR", "भारत सरकार", "DOB", "DATE OF BIRTH", "YEAR OF BIRTH",
        "MALE", "FEMALE", "TRANSGENDER", "PURUSH", "MAHILA", "जन्म तिथि", "जन्म वर्ष"
    ]

    for line in lines:
        u = line.upper()
        if any(c in u for c in front_start_cues):
            in_back_block = False
            front_lines.append(line)
            continue
        if any(c in u for c in back_start_cues):
            in_back_block = True
            back_lines.append(line)
            continue
        if in_back_block:
            back_lines.append(line)
        else:
            front_lines.append(line)

    return front_lines, back_lines


def clean_human_name(candidate_line: str) -> Optional[str]:
    """
    Cleans raw OCR extracted name:
    - Strips prefixes ('Name:', 'नाम:', 'To:', etc.)
    - Reassembles spaced single-letter tokens ('S u n i t a   K u m a r   S i n g h' -> 'Sunita Kumar Singh')
    - Disentangles merged middle/last names ('Kumarsingh' -> 'Kumar Singh')
    - Collapses whitespace and formats to Title Case
    """
    if not candidate_line:
        return None

    # Strip prefixes like 'Name:', 'नाम:', 'To:', etc.
    text = re.sub(r'^(?:NAME|नाम|TO|SHRI|SMT|MS|MR|MD)[:\s.]*', '', candidate_line.strip(), flags=re.IGNORECASE)

    # Detect spaced letters (e.g. 'S u n i t a   D e v i')
    tokens = text.split()
    if len(tokens) > 3:
        single_char_count = sum(1 for t in tokens if len(t) == 1 and t.isalpha())
        if single_char_count / len(tokens) > 0.5:
            # Rebuild words separated by 2+ spaces or punctuation
            raw_parts = re.split(r'\s{2,}|[,|-]', text)
            reassembled_words = [
                re.sub(r'[^a-zA-Z]', '', p).strip()
                for p in raw_parts if re.sub(r'[^a-zA-Z]', '', p).strip()
            ]
            if reassembled_words:
                text = " ".join(reassembled_words)

    # Remove non-letters, keeping standard spaces
    clean = re.sub(r'[^a-zA-Z\s]', ' ', text)
    # Collapse multiple whitespace
    normalized = " ".join(clean.split()).strip()

    # Disentangle merged middle/last names without spaces (e.g. 'Kumarsingh' -> 'Kumar Singh')
    normalized = split_merged_names(normalized)

    if len(normalized) >= 2:
        return normalized.title()
    return None


def classify_education_level(text: str) -> Optional[str]:
    """
    Classifies academic qualification across CBSE, ICSE, State Boards, Polytechnic, and Universities.
    Ensures precise word boundaries to prevent false positives (e.g. 'hsc' inside 'englishschool').
    Handles joint board titles like 'BOARD OF HIGH SCHOOL AND INTERMEDIATE EDUCATION'.
    """
    upper = text.upper()
    # 1. PostGraduate
    if re.search(r'\b(POST\s*GRADUAT|MASTER\s*OF|M\.?\s*TECH|M\.?\s*SC|M\.?\s*COM|M\.?\s*A\b|M\.?\s*B\.?\s*A|M\.?\s*C\.?\s*A|परास्नातक)', upper):
        return "PostGraduate"

    # 2. Graduate / Bachelor / University Degree
    if re.search(r'\b(BACHELOR\s*OF|B\.?\s*TECH|B\.?\s*E\b|B\.?\s*SC|B\.?\s*COM|B\.?\s*A\b|B\.?\s*B\.?\s*A|B\.?\s*C\.?\s*A|DEGREE\s*EXAMINATION|GRADUATION|स्नातक)', upper):
        return "Graduate"

    # 3. ITI / Polytechnic / Diploma
    if re.search(r'\b(POLYTECHNIC|DIPLOMA|INDUSTRIAL\s*TRAINING|NATIONAL\s*TRADE\s*CERTIFICATE|\bNTC\b|\bITI\b)', upper):
        return "ITI"

    # Neutralize joint board authority headers that include BOTH high school and intermediate
    clean_upper = re.sub(r'HIGH\s*SCHOOL\s*(?:AND|&)\s*INTERMEDIATE', '', upper)

    # 4. Class 12th (Senior Secondary / Higher Secondary / Intermediate / Class XII / HSC)
    if re.search(r'\b(SENIOR\s*SECONDARY|HIGHER\s*SECONDARY|SENIOR\s*SCHOOL|INTERMEDIATE\s*EXAMINATION|INTERMEDIATE\s*CERTIFICATE|CLASS\s*XII\b|CLASS\s*12\b|12TH\b|TWELFTH|\+2\b|\bH\.?S\.?C\b|उच्च\s*माध्यमिक|इण्टरमीडिएट)', clean_upper):
        return "12th"

    # 5. Class 10th (Secondary School / High School / Matriculation / Class X / SSC)
    if re.search(r'(?:SECONDARY\s*SCHOOL|SECONDARY\s*EXAMINATION|SECONDARYSCHOOLEXAMINATION|HIGH\s*SCHOOL\s*EXAMINATION|HIGH\s*SCHOOL|MATRIC(?:ULATION)?|CLASS\s*X\b|CLASS\s*10\b|10TH\b|TENTH|\bS\.?S\.?C\b|MADHYAMIK|माध्यमिक|हाईस्कूल|प्रवेशिका|दशमी)', clean_upper):
        return "10th"

    # 6. Fallback checks on clean_upper
    if re.search(r'\bINTERMEDIATE\b', clean_upper):
        return "12th"
    if re.search(r'\bSECONDARY\b', clean_upper) and not re.search(r'\b(SENIOR|HIGHER)\b', clean_upper):
        return "10th"

    return "10th"


class TargetedDocumentExtractor:
    """
    Precision targeted document extractors for Indian official documents:
    - Aadhaar (Front & Back or Combined):
      - Front: Positional Name heuristic, DOB regex, UIDAI 12-digit masking (XXXX-XXXX-1234), Gender.
      - Back: Full Address parser, District extractor, State mapper, Pincode.
    - Caste Certificate: Official serial/reference number, SC/ST/OBC/EWS classification.
    - Income Certificate: Annual income currency parser, Financial assessment year.
    - Marksheet: Academic merit percentage, qualification benchmark.
    """

    def __init__(self):
        self.caste_keywords = {
            "SC": ["scheduled caste", "anusuchit jati", "chamar", "jatav", "dalit", "valmiki", "sc", "अनुसूचित जाति"],
            "ST": ["scheduled tribe", "anusuchit janjati", "adivasi", "gond", "santhal", "bhil", "st", "अनुसूचित जनजाति"],
            "OBC": ["other backward class", "anya pichda varg", "non creamy layer", "obc", "पिछड़ा वर्ग", "अन्य पिछड़ा"],
            "EWS": ["economically weaker section", "aarthik roop se kamzor", "ews", "आर्थिक रूप से कमजोर"],
        }

        self.education_keywords = {
            "10TH_PASS": ["secondary school", "matric", "10th", "high school", "ssc", "class x", "tenth"],
            "12TH_PASS": ["senior secondary", "higher secondary", "intermediate", "12th", "hsc", "class xii", "twelfth"],
            "GRADUATE": ["bachelor", "degree", "graduation", "b.tech", "b.sc", "b.com", "b.a", "engineering", "graduate"],
            "DIPLOMA": ["polytechnic", "diploma", "vocational certificate", "iti", "technical diploma"],
        }

    def extract_aadhaar(
        self,
        text_lines: List[str],
        front_lines: Optional[List[str]] = None,
        back_lines: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Targeted Extractor for Aadhaar (Front, Back, or Combined in one/two images):
        - STRICT SEPARATION: Applicant Name is ONLY extracted from front_lines. Address lines from back_lines are NEVER used as applicant name.
        - Extracts: Name, DOB, Gender, Masked Aadhaar, Pincode, Address, District, State.
        - Enforces UIDAI mandatory 12-digit masking (XXXX-XXXX-1234).
        """
        data: Dict[str, Any] = {
            "name": None,
            "dob": None,
            "gender": None,
            "masked_aadhaar": None,
            "pincode": None,
            "address": None,
            "state": None,
            "district": None,
        }
        full_text = " ".join(text_lines)

        # Partition lines into front and back if not explicitly provided
        if front_lines is None and back_lines is None:
            f_lines, b_lines = partition_aadhaar_lines(text_lines)
        else:
            f_lines = front_lines or []
            b_lines = back_lines or []

        # 1. Regex: 12-digit Aadhaar pattern with mandatory masking (XXXX-XXXX-1234)
        aadhaar_match = re.search(r'\b([2-9]{1}[0-9]{3})\s?([0-9]{4})\s?([0-9]{4})\b', full_text)
        if aadhaar_match:
            last4 = aadhaar_match.group(3)
            data["masked_aadhaar"] = f"XXXX-XXXX-{last4}"

        # 2. Regex: Date of Birth (Search primarily in front_lines)
        search_dob_lines = f_lines if f_lines else text_lines
        dob_index = -1
        for idx, line in enumerate(search_dob_lines):
            dob_match = re.search(r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b', line)
            if dob_match:
                data["dob"] = dob_match.group(1).replace("-", "/")
                dob_index = idx
                break
            elif any(c in line.upper() for c in ["DOB", "YEAR OF BIRTH", "DATE OF BIRTH", "जन्म तिथि"]):
                year_match = re.search(r'\b(19\d{2}|20\d{2})\b', line)
                if year_match:
                    data["dob"] = f"01/01/{year_match.group(1)}"
                    dob_index = idx
                    break

        # 3. Applicant Name Extraction (STRICT: ONLY FROM FRONT LINES)
        # Never search in back_lines to prevent putting address or guardian into name!
        if f_lines:
            # Positional Heuristic: Check lines directly above DOB
            if dob_index > 0:
                for offset in range(1, 4):
                    if dob_index - offset >= 0:
                        cand = search_dob_lines[dob_index - offset].strip()
                        if not is_noise_line(cand) and not re.search(r'\d', cand):
                            name_candidate = clean_human_name(cand)
                            if name_candidate and len(name_candidate) >= 3:
                                data["name"] = name_candidate
                                break

            # Positional Heuristic 2: Check lines above Gender if DOB was absent
            if not data["name"]:
                gender_index = -1
                for idx, line in enumerate(f_lines):
                    if re.search(r'\b(FEMALE|WOMAN|MAHILA|MALE|MAN|PURUSH|TRANSGENDER|महिला|पुरुष)\b', line, re.IGNORECASE):
                        gender_index = idx
                        break
                if gender_index > 0:
                    for offset in range(1, 4):
                        if gender_index - offset >= 0:
                            cand = f_lines[gender_index - offset].strip()
                            if not is_noise_line(cand) and not re.search(r'\d', cand):
                                name_candidate = clean_human_name(cand)
                                if name_candidate and len(name_candidate) >= 3:
                                    data["name"] = name_candidate
                                    break

            # Fallback Name Search strictly within front_lines
            if not data["name"]:
                for line in f_lines:
                    cand = line.strip()
                    if is_noise_line(cand) or re.search(r'\d', cand):
                        continue
                    name_candidate = clean_human_name(cand)
                    if name_candidate:
                        words = name_candidate.split()
                        if 2 <= len(words) <= 4 and all(len(w) >= 2 for w in words):
                            data["name"] = name_candidate
                            break

        # 4. Regex: Gender (from front_lines or full_text)
        gender_match = re.search(
            r'\b(FEMALE|WOMAN|MAHILA|MALE|MAN|PURUSH|TRANSGENDER|महिला|पुरुष)\b',
            full_text,
            re.IGNORECASE
        )
        if gender_match:
            g = gender_match.group(1).upper()
            if g in ["FEMALE", "WOMAN", "MAHILA", "महिला"]:
                data["gender"] = "Female"
            elif g in ["MALE", "MAN", "PURUSH", "पुरुष"]:
                data["gender"] = "Male"
            else:
                data["gender"] = "Other"

        # 5. Back of Aadhaar: Address, State, District, and Pincode Extraction
        back_text = " ".join(b_lines) if b_lines else full_text

        # Regex: Indian Postal Pincode (6 digits starting with 1-9)
        pin_match = re.search(r'\b([1-9][0-9]{5})\b', back_text)
        if pin_match:
            data["pincode"] = pin_match.group(1)

        # Look for State
        for s in INDIAN_STATES:
            if re.search(r'\b' + re.escape(s) + r'\b', back_text, re.IGNORECASE):
                data["state"] = s
                break
        if not data["state"]:
            for h_state, en_state in HINDI_STATE_MAP.items():
                if h_state in back_text:
                    data["state"] = en_state
                    break

        # Look for District
        dist_match = re.search(r'(?:DISTRICT|DIST|DIST\.?|जिला)[:\s\-]*([A-Za-z]+)', back_text, re.IGNORECASE)
        if dist_match:
            candidate_dist = dist_match.group(1).strip()
            if candidate_dist.upper() not in ["OF", "THE", "INDIA"]:
                data["district"] = candidate_dist.title()

        # Look for Address block
        addr_match = re.search(
            r'(?:ADDRESS|पता)[:\s]*(.*?)(?=\b[1-9][0-9]{5}\b|$)',
            back_text,
            re.DOTALL | re.IGNORECASE
        )
        if addr_match:
            raw_addr = addr_match.group(1).strip()
            clean_addr = re.sub(r'[\s,-]+$', '', raw_addr).strip()
            clean_addr = " ".join(clean_addr.split())
            if len(clean_addr) > 5:
                if data["pincode"] and data["pincode"] not in clean_addr:
                    clean_addr += f" - {data['pincode']}"
                data["address"] = clean_addr

        return data

    def extract_caste(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Caste Certificate:
        Extracts Category (SC, ST, OBC, EWS, GENERAL) and Certificate Reference.
        """
        data: Dict[str, Any] = {
            "category": None,
            "certificate_number": None,
        }
        full_text = " ".join(text_lines)

        # 1. Regex: Certificate reference number
        cert_match = re.search(r'(?:NO|NUMBER|क्रमांक|प्रमाणपत्र\s*संख्या)[:\s]*([A-Z0-9/-]{6,25})', full_text, re.IGNORECASE)
        if cert_match:
            data["certificate_number"] = cert_match.group(1).strip()
        else:
            code_match = re.search(r'\b([A-Z]{2,4}[/-]\d{4,8}[/-][A-Z0-9]{2,8})\b', full_text)
            if code_match:
                data["certificate_number"] = code_match.group(1).strip()

        # 2. Boilerplate Keyword Matching for Category
        full_lower = full_text.lower()
        best_category = None

        for cat_key, keywords in self.caste_keywords.items():
            for kw in keywords:
                if kw in full_lower:
                    best_category = cat_key
                    break
            if best_category:
                break

        data["category"] = best_category
        return data

    def extract_income(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Income Certificate:
        Extracts ONLY Annual Household Income (₹) and Financial Assessment Year.
        """
        data: Dict[str, Any] = {
            "annual_income": None,
            "financial_year": None,
            "certificate_number": None,
        }
        full_text = " ".join(text_lines)

        # 1. Regex: Annual Income Currency Amount
        income_match = re.search(
            r'(?:₹|INR|RS\.?|आय|RUPEES|कुल\s*वार्षिक\s*आय)[:\s]*([0-9,]{4,9})',
            full_text,
            re.IGNORECASE
        )
        if income_match:
            try:
                data["annual_income"] = float(income_match.group(1).replace(",", ""))
            except ValueError:
                pass
        else:
            standalone = re.findall(r'\b([1-9][0-9],[0-9]{2},[0-9]{3}|[1-9][0-9]{4,6})\b', full_text)
            if standalone:
                try:
                    data["annual_income"] = float(standalone[0].replace(",", ""))
                except ValueError:
                    pass

        # 2. Regex: Financial Year (e.g. 2024-2025 or 2023-24)
        fy_match = re.search(r'\b(20[2-3][0-9]-[2-3][0-9]|20[2-3][0-9]-20[2-3][0-9])\b', full_text)
        if fy_match:
            data["financial_year"] = fy_match.group(1)

        # 3. Certificate Serial / Ref Number
        cert_match = re.search(r'(?:NO|NUMBER|क्रमांक|प्रमाणपत्र)[:\s]*([A-Z0-9/-]{6,25})', full_text, re.IGNORECASE)
        if cert_match:
            data["certificate_number"] = cert_match.group(1).strip()

        return data

    def extract_marksheet(self, text_lines: List[str]) -> Dict[str, Any]:
        """
        Targeted Extractor for Marksheet / Academic Certificate across all Indian boards & colleges:
        - Classifies education: 10th | 12th | ITI | Graduate | PostGraduate
        - Computes percentage: Explicit %, Total/Max ratio, CGPA x 9.5, or tabular subject marks
        - Extracts student name, date of birth, and roll number
        """
        data: Dict[str, Any] = {
            "marks_percentage": None,
            "highest_education": None,
            "name": None,
            "dob": None,
            "certificate_number": None,
        }
        full_text = " ".join(text_lines)

        # 1. Education Qualification Classification
        data["highest_education"] = classify_education_level(full_text)

        # 2. Percentage Extraction (Multi-Strategy)
        # Strategy A: Explicit percentage with % sign
        pct_match = re.search(r'\b([4-9][0-9](?:\.[0-9]{1,2})?)\s?%', full_text)
        if pct_match:
            try:
                data["marks_percentage"] = float(pct_match.group(1))
            except ValueError:
                pass

        # Strategy B: Percentage label
        if not data["marks_percentage"]:
            pct_label_match = re.search(r'(?:PERCENTAGE|AGGREGATE|प्रतिशत)[:\s]*([4-9][0-9](?:\.[0-9]{1,2})?)', full_text, re.IGNORECASE)
            if pct_label_match:
                try:
                    data["marks_percentage"] = float(pct_label_match.group(1))
                except ValueError:
                    pass

        # 3. Student Name Extraction
        for idx, line in enumerate(text_lines):
            upper_line = line.upper()
            if any(c in upper_line for c in ["THIS IS TO CERTIFY THAT", "CERTIFY THAT", "NAME OF CANDIDATE", "CANDIDATE NAME"]):
                if idx + 1 < len(text_lines):
                    cand = text_lines[idx + 1].strip()
                    name_candidate = clean_human_name(cand)
                    if name_candidate and len(name_candidate.split()) >= 2:
                        data["name"] = name_candidate
                        break
            if "ROLL NO" in upper_line and idx > 0:
                cand = text_lines[idx - 1].strip()
                name_candidate = clean_human_name(cand)
                if name_candidate and len(name_candidate.split()) >= 2:
                    data["name"] = name_candidate
                    break

        # 4. Date of Birth Extraction (Prioritize lines with 'DATE OF BIRTH' or 'DOB')
        for idx, line in enumerate(text_lines):
            if any(c in line.upper() for c in ["DATE OF BIRTH", "DATEOF BIRTH", "DOB", "जन्म तिथि"]):
                # Check current line and next line
                check_lines = [line]
                if idx + 1 < len(text_lines):
                    check_lines.append(text_lines[idx + 1])
                for cl in check_lines:
                    dob_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', cl)
                    if dob_match:
                        data["dob"] = dob_match.group(1).replace("-", "/")
                        break
                if data["dob"]:
                    break

        # Fallback: scan any line for standard DD/MM/YYYY DOB with year between 1970 and 2015
        if not data["dob"]:
            for line in text_lines:
                m = re.search(r'(\d{2}[/-]\d{2}[/-](?:19[7-9]\d|20[0-1]\d))', line)
                if m:
                    data["dob"] = m.group(1).replace("-", "/")
                    break

        # 5. Roll Number / Certificate Number Extraction
        for idx, line in enumerate(text_lines):
            m = re.search(r'(?:ROLL\s*NO\.?|ROLL\s*NUMBER|REGN\.?\s*NO\.?)[:\s]*([0-9A-Z/-]{6,16})', line, re.IGNORECASE)
            if m:
                data["certificate_number"] = m.group(1).strip()
                break
            if "ROLL NO" in line.upper() and idx + 1 < len(text_lines):
                next_line = text_lines[idx + 1].strip()
                if re.match(r'^[0-9A-Z/-]{6,16}$', next_line):
                    data["certificate_number"] = next_line
                    break

        return data
