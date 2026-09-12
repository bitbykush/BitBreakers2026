import io
import sys
from PIL import Image, ImageDraw
from app.services.targeted_extractors import TargetedDocumentExtractor
from app.services.ocr_engine import ScopedOCREngine
from app.services.gemini_fallback import GeminiFallbackOCR


def create_test_image(text_lines, width=800, height=500):
    """Generates an in-memory document image with given text lines."""
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    y = 40
    for line in text_lines:
        draw.text((40, y), line, fill=(0, 0, 0))
        y += 40

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_aadhaar_extractor():
    print("Testing Aadhaar Extractor with Positional Heuristics and Masking...")
    extractor = TargetedDocumentExtractor()

    sample_lines = [
        "GOVERNMENT OF INDIA",
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
        "Sunita Devi",
        "DOB: 15/08/1988",
        "Female",
        "4821 9823 4821",
        "226001",
    ]

    extracted = extractor.extract_aadhaar(sample_lines)
    assert extracted["masked_aadhaar"] == "XXXX-XXXX-4821", f"Expected masked aadhaar, got {extracted['masked_aadhaar']}"
    assert extracted["dob"] == "15/08/1988", f"Expected 15/08/1988, got {extracted['dob']}"
    assert extracted["name"] == "Sunita Devi", f"Expected Sunita Devi, got {extracted['name']}"
    assert extracted["gender"] == "Female", f"Expected Female, got {extracted['gender']}"
    assert extracted["pincode"] == "226001", f"Expected 226001, got {extracted['pincode']}"
    print("[PASS] Aadhaar Extractor passed: UIDAI Masked (XXXX-XXXX-4821), Name, DOB, Gender, Pincode all extracted accurately!")


def test_caste_extractor():
    print("Testing Caste Certificate Extractor...")
    extractor = TargetedDocumentExtractor()

    sample_lines = [
        "GOVERNMENT OF UTTAR PRADESH",
        "OFFICE OF THE TEHSILDAR",
        "CERTIFICATE NO: UP/OBC/2024/98214",
        "This is to certify that applicant belongs to Other Backward Class (Non Creamy Layer)",
    ]

    extracted = extractor.extract_caste(sample_lines)
    assert extracted["category"] == "OBC", f"Expected OBC, got {extracted['category']}"
    assert extracted["certificate_number"] == "UP/OBC/2024/98214", f"Expected cert number, got {extracted['certificate_number']}"
    print("[PASS] Caste Extractor passed: Category OBC and Certificate Number extracted accurately!")


def test_income_extractor():
    print("Testing Income Certificate Extractor...")
    extractor = TargetedDocumentExtractor()

    sample_lines = [
        "REVENUE DEPARTMENT",
        "INCOME CERTIFICATE",
        "NUMBER: INC/2024/5521",
        "Annual Income: ₹ 1,20,000",
        "For Financial Year: 2024-2025",
    ]

    extracted = extractor.extract_income(sample_lines)
    assert extracted["annual_income"] == 120000.0, f"Expected 120000, got {extracted['annual_income']}"
    assert extracted["financial_year"] == "2024-2025", f"Expected 2024-2025, got {extracted['financial_year']}"
    assert extracted["certificate_number"] == "INC/2024/5521", f"Expected cert number, got {extracted['certificate_number']}"
    print("[PASS] Income Extractor passed: Annual Income 120000.0 and FY 2024-2025 extracted accurately!")


def test_marksheet_extractor():
    print("Testing Marksheet Extractor...")
    extractor = TargetedDocumentExtractor()

    sample_lines = [
        "BOARD OF HIGH SCHOOL AND INTERMEDIATE EDUCATION",
        "SECONDARY SCHOOL EXAMINATION 10TH CLASS",
        "Percentage: 78.50%",
        "RESULT: PASSED",
    ]

    extracted = extractor.extract_marksheet(sample_lines)
    assert extracted["marks_percentage"] == 78.5, f"Expected 78.5, got {extracted['marks_percentage']}"
    assert extracted["highest_education"] == "10th", f"Expected 10th, got {extracted['highest_education']}"
    print("[PASS] Marksheet Extractor passed: 78.5% marks and 10th qualification extracted accurately!")


def test_cbse_tabular_marksheet_extractor():
    print("Testing CBSE Tabular Marksheet Extractor (Multi-Board Format Support)...")
    extractor = TargetedDocumentExtractor()

    sample_lines = [
        "CENTRAL BOARD OF SECONDARY EDUCATION",
        "SECONDARY SCHOOL EXAMINATION 2024",
        "This is to certify that",
        "KUSHAGRAKUMARSINGH",
        "Roll No. 23324939",
        "Mother's Name: RANJU SINGH",
        "Father's Name: DAYASHANKAR SINGH",
        "Date of Birth",
        "23-02-200823RDFEBRUARYTWOTHOUSANDEIGHT",
        "082 EIGHTYTWO",
        "088 EIGHTYEIGHT",
        "081 EIGHTY ONE",
        "095 NINETYFIVE",
        "083 EIGHTYTHREE",
        "097 NINETYSEVEN",
    ]

    extracted = extractor.extract_marksheet(sample_lines)
    assert extracted["highest_education"] == "10th", f"Expected 10th, got {extracted['highest_education']}"
    assert extracted["marks_percentage"] is None, f"Expected None (no artificial marks calculation), got {extracted['marks_percentage']}"
    assert extracted["name"] == "Kushagra Kumar Singh", f"Expected 'Kushagra Kumar Singh', got '{extracted['name']}'"
    assert extracted["dob"] == "23/02/2008", f"Expected '23/02/2008', got '{extracted['dob']}'"
    assert extracted["certificate_number"] == "23324939", f"Expected '23324939', got '{extracted['certificate_number']}'"
    print(f"[PASS] CBSE Tabular Marksheet passed: 10th Class, no marks calculation, '{extracted['name']}', DOB {extracted['dob']}, Roll No {extracted['certificate_number']}!")


def test_image_downscaling():
    print("Testing 512MB RAM Image Downscaling Guardrail...")
    engine = ScopedOCREngine()

    # Create large 2400x1800 raw photo
    large_bytes = create_test_image(["Large Photo Test"], width=2400, height=1800)
    downscaled = engine.downsample_image(large_bytes)
    w, h = downscaled.size
    assert max(w, h) <= 1280, f"Expected dimension <= 1280, got ({w}, {h})"
    print(f"[PASS] Downscaling verified: Large 2400x1800 image resized safely to ({w}, {h}) <= 1280px.")


def test_gemini_permission_gate():
    print("Testing Gemini Fallback Permission Gate (MANDATE: Only call Gemini if user grants permission)...")
    engine = ScopedOCREngine()

    # Create a blank / low-confidence image that will produce 0 text
    blank_image_bytes = create_test_image([], width=200, height=200)

    # Case A: allow_gemini_fallback = False (Default - No permission granted)
    result_no_permission = engine.process_targeted_document(
        image_bytes=blank_image_bytes,
        doc_type="AADHAAR",
        force_engine="AUTO",
        allow_gemini_fallback=False
    )

    assert result_no_permission["needs_permission"] is True, "Expected needs_permission=True when confidence < 65% and allow_gemini_fallback=False"
    assert result_no_permission["can_use_gemini"] is True, "Expected can_use_gemini=True to indicate fallback is ready"
    assert "prompt_message" in result_no_permission and result_no_permission["prompt_message"] is not None
    assert result_no_permission["engine"] == "RapidOCR_ONNX", f"Engine should remain local, got {result_no_permission['engine']}"
    print(f"[PASS] Case A Passed: When allow_gemini_fallback=False, Gemini was NOT called. User is prompted: '{result_no_permission['prompt_message'][:60]}...'")

    # Case B: allow_gemini_fallback = True (User said YES in prompt)
    result_with_permission = engine.process_targeted_document(
        image_bytes=blank_image_bytes,
        doc_type="AADHAAR",
        force_engine="AUTO",
        allow_gemini_fallback=True
    )

    assert result_with_permission["needs_permission"] is False, "Expected needs_permission=False when permission was granted"
    assert "Gemini" in result_with_permission["engine"], f"Expected Gemini engine when permission granted, got {result_with_permission['engine']}"
    print(f"[PASS] Case B Passed: When allow_gemini_fallback=True, Gemini AI was invoked with engine: {result_with_permission['engine']}!")


def test_spaced_name_and_back_aadhaar():
    print("Testing Spaced Name Normalization & Back of Aadhaar Address/State/District...")
    extractor = TargetedDocumentExtractor()

    # Case 1: Spaced characters in name
    spaced_front_lines = [
        "GOVERNMENT OF INDIA",
        "S u n i t a   D e v i",
        "DOB: 15/08/1988",
        "Female",
        "4821 9823 4821",
    ]
    extracted_front = extractor.extract_aadhaar(spaced_front_lines)
    assert extracted_front["name"] == "Sunita Devi", f"Expected 'Sunita Devi', got '{extracted_front['name']}'"
    assert extracted_front["masked_aadhaar"] == "XXXX-XXXX-4821"
    print(f"[PASS] Spaced name normalized: '{spaced_front_lines[1]}' -> '{extracted_front['name']}'")

    # Case 2: Back of Aadhaar with address, district, state, pincode
    back_lines = [
        "Unique Identification Authority of India",
        "Address: C/O Ramesh Kumar, Village Pipraich, Post Jungle Dhusan",
        "District: Gorakhpur, Uttar Pradesh",
        "273013",
    ]
    extracted_back = extractor.extract_aadhaar(back_lines)
    assert extracted_back["state"] == "Uttar Pradesh", f"Expected 'Uttar Pradesh', got '{extracted_back['state']}'"
    assert extracted_back["district"] == "Gorakhpur", f"Expected 'Gorakhpur', got '{extracted_back['district']}'"
    assert extracted_back["pincode"] == "273013", f"Expected '273013', got '{extracted_back['pincode']}'"
    assert extracted_back["address"] is not None and "Pipraich" in extracted_back["address"]
    # Ensure no false prefilling
    assert extracted_back.get("category") is None
    print(f"[PASS] Back of Aadhaar extracted: State='{extracted_back['state']}', District='{extracted_back['district']}', Pincode='{extracted_back['pincode']}'")

    # Case 3: Combined Front + Back (simulating multi-file upload lines aggregated together)
    combined_lines = spaced_front_lines + back_lines
    extracted_combined = extractor.extract_aadhaar(combined_lines)
    assert extracted_combined["name"] == "Sunita Devi"
    assert extracted_combined["masked_aadhaar"] == "XXXX-XXXX-4821"
    assert extracted_combined["dob"] == "15/08/1988"
    assert extracted_combined["gender"] == "Female"
    assert extracted_combined["state"] == "Uttar Pradesh"
    assert extracted_combined["district"] == "Gorakhpur"
    assert extracted_combined["pincode"] == "273013"
    print("[PASS] Combined Front + Back extracted all fields seamlessly together!")


def test_merged_name_decomposition():
    print("Testing Middle and Surname Decomposition (split_merged_names)...")
    from app.services.targeted_extractors import split_merged_names

    cases = [
        ("Sunita Kumarsingh", "Sunita Kumar Singh"),
        ("Ramesh KumarSingh", "Ramesh Kumar Singh"),
        ("Shanti Devikushwaha", "Shanti Devi Kushwaha"),
        ("Rohitsingh", "Rohit Singh"),
        ("SunitaKumarsingh", "Sunita Kumar Singh"),
        ("Ramesh Kumar", "Ramesh Kumar"),
        ("Suresh Sharma", "Suresh Sharma"),
    ]

    for raw, expected in cases:
        actual = split_merged_names(raw)
        assert actual == expected, f"Failed decomposing '{raw}': expected '{expected}', got '{actual}'"
        print(f"  [OK] '{raw}' -> '{actual}'")
    print("[PASS] Middle & Last Name Spacing verified flawlessly!")


def test_back_first_aadhaar_ordering():
    print("Testing Aadhaar Front vs Back Differentiation when Back is uploaded First...")
    extractor = TargetedDocumentExtractor()

    back_lines = [
        "Unique Identification Authority of India",
        "Address: C/O Mahendra Singh, Village Pipraich, Post Jungle Dhusan",
        "District: Gorakhpur, Uttar Pradesh",
        "273013",
    ]

    front_lines = [
        "GOVERNMENT OF INDIA",
        "Ramesh Kumarsingh",
        "DOB: 12/04/1990",
        "Male",
        "9823 1234 5678",
    ]

    # Test Case A: Back lines placed first before front lines in stream
    scrambled_lines = back_lines + front_lines
    extracted = extractor.extract_aadhaar(scrambled_lines)

    assert extracted["name"] == "Ramesh Kumar Singh", f"Expected 'Ramesh Kumar Singh', got '{extracted['name']}'"
    assert extracted["gender"] == "Male"
    assert extracted["dob"] == "12/04/1990"
    assert extracted["district"] == "Gorakhpur"
    assert extracted["state"] == "Uttar Pradesh"
    assert extracted["pincode"] == "273013"
    print(f"[PASS] Scrambled back-first stream correctly prioritized front for Name: '{extracted['name']}' (NOT address/guardian)!")

    # Test Case B: User uploads ONLY the Back side of Aadhaar
    extracted_only_back = extractor.extract_aadhaar(text_lines=back_lines, front_lines=[], back_lines=back_lines)
    assert extracted_only_back["name"] is None, f"Expected None for name when only back is uploaded, got '{extracted_only_back['name']}'"
    assert extracted_only_back["district"] == "Gorakhpur"
    assert extracted_only_back["state"] == "Uttar Pradesh"
    assert extracted_only_back["pincode"] == "273013"
    print("[PASS] Back-only Aadhaar upload kept name strictly None (no false prefilling) while extracting address fields!")


def test_multi_image_sequential_processing():
    print("Testing Multi-Image Sequential Processing in ScopedOCREngine...")
    engine = ScopedOCREngine()

    img1 = create_test_image(["Front Side Test"], width=600, height=300)
    img2 = create_test_image(["Back Side Test"], width=600, height=300)

    # Process list of 2 images
    res = engine.process_targeted_document(
        image_input=[img1, img2],
        doc_type="AADHAAR",
        force_engine="AUTO",
        allow_gemini_fallback=False
    )
    assert res["doc_type"] == "AADHAAR"
    assert res["engine"] == "RapidOCR_ONNX"
    print(f"[PASS] Multi-image input ([front, back]) processed with 512MB RAM guardrails: {res['engine']}")


if __name__ == "__main__":
    test_aadhaar_extractor()
    test_spaced_name_and_back_aadhaar()
    test_merged_name_decomposition()
    test_back_first_aadhaar_ordering()
    test_multi_image_sequential_processing()
    test_caste_extractor()
    test_income_extractor()
    test_marksheet_extractor()
    test_cbse_tabular_marksheet_extractor()
    test_image_downscaling()
    test_gemini_permission_gate()
    print("\n[SUCCESS] ALL OCR, MULTI-IMAGE, NAME SPACING & ORDERING TESTS PASSED 100%!")

