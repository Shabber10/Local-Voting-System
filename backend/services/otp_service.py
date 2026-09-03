import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import time
import math
import random
from config import Config

class OtpService:
    @staticmethod
    def generate_code() -> str:
        """Generate a random 4-digit numeric code."""
        return str(random.randint(1000, 9999))

    @staticmethod
    def rotate_passcode(room: dict) -> dict:
        """Rotate the passcode for a room and record timestamp."""
        previous_code = room.get("passcode")
        new_code = OtpService.generate_code()
        
        # Store previous code for brief grace margin
        room["previousPasscode"] = previous_code
        room["previousPasscodeExpiresAt"] = time.time() + Config.OTP_GRACE_MARGIN_SECONDS
        
        room["passcode"] = new_code
        room["passcodeExpiresAt"] = time.time() + Config.OTP_ROTATION_SECONDS
        
        return {
            "passcode": new_code,
            "expiresIn": Config.OTP_ROTATION_SECONDS
        }

    @staticmethod
    def validate_passcode(room: dict, candidate_passcode: str) -> bool:
        """Validate if the given passcode matches the current or grace-period passcode."""
        if not candidate_passcode:
            return False
        
        candidate = str(candidate_passcode).strip()
        now = time.time()
        
        # Exact current match
        if room.get("passcode") == candidate:
            return True
        
        # Grace match within grace window
        if (room.get("previousPasscode") == candidate and 
            now <= room.get("previousPasscodeExpiresAt", 0)):
            return True
            
        return False

    @staticmethod
    def get_remaining_seconds(room: dict) -> int:
        """Get remaining seconds for the active passcode."""
        expires_at = room.get("passcodeExpiresAt", 0)
        remaining = max(0, int(math.ceil(expires_at - time.time())))
        return remaining

otp_service = OtpService()
