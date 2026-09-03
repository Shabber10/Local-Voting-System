import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")
    SECRET_KEY = os.getenv("SECRET_KEY", "votesphere-secret-key-2026")
    
    # OTP dynamic rotation configuration (20 seconds)
    OTP_ROTATION_SECONDS = int(os.getenv("OTP_ROTATION_SECONDS", 20))
    OTP_CODE_LENGTH = 4
    OTP_GRACE_MARGIN_SECONDS = 2
    
    # Proctoring / Anti-Cheat
    MAX_STRIKES = 3
    
    # Modes
    MODE_ASSEMBLY = "assembly"
    MODE_RATING = "rating"
    ASSEMBLY_OPTIONS = ["Yes", "No", "Maybe", "NOTA"]
    RATING_MIN = 1
    RATING_MAX = 10
    
    # Session lifespan (1 hour default)
    SESSION_DURATION_SECONDS = 3600
