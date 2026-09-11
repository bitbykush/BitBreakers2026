import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import DigiLockerVerifyRequest, DigiLockerVerifyResponse

logger = logging.getLogger("udyamsetu.routes.kyc")

router = APIRouter(prefix="/kyc", tags=["DigiLocker Mock eKYC Sandbox"])


@router.post(
    "/verify-otp",
    response_model=DigiLockerVerifyResponse,
    summary="DigiLocker Sandbox eKYC OTP Verification",
    description=(
        "Simulates DigiLocker instant eKYC verification for Indian citizens. "
        "Accepts 6-digit OTP (sandbox demo OTP: '123456'). "
        "Returns verified UIDAI status and linked certificate reference numbers."
    ),
)
async def verify_digilocker_otp(request: DigiLockerVerifyRequest):
    otp = request.otp.strip()

    # Sandbox accepts '123456' or any 6-digit number
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP format. Please enter a valid 6-digit OTP.",
        )

    # In sandbox demo mode, 123456 or 6 digits succeeds
    logger.info(f"DigiLocker OTP verified successfully for identifier: {request.aadhaar_or_mobile[-4:] if len(request.aadhaar_or_mobile) >= 4 else '****'}")

    return DigiLockerVerifyResponse(
        verified=True,
        ref_id="DL-2026-X8921",
        verified_documents=["DOC_AADHAAR", "DOC_CASTE", "DOC_INCOME"],
        aadhaar_or_mobile=request.aadhaar_or_mobile,
    )
