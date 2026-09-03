import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import time
from config import Config

class ProctoringService:
    @staticmethod
    def record_strike(participant: dict, reason: str = "Tab/Window switch detected") -> dict:
        """Record a proctoring violation strike for a participant."""
        participant["strikes"] = participant.get("strikes", 0) + 1
        strike_count = participant["strikes"]
        
        event_record = {
            "strikeNumber": strike_count,
            "reason": reason,
            "timestamp": time.time()
        }
        
        if "strikeHistory" not in participant:
            participant["strikeHistory"] = []
        participant["strikeHistory"].append(event_record)
        
        is_disqualified = strike_count >= Config.MAX_STRIKES
        participant["disqualified"] = is_disqualified
        if is_disqualified:
            participant["status"] = "disqualified"
            participant["disqualifiedAt"] = time.time()
            
        return {
            "strikes": strike_count,
            "maxStrikes": Config.MAX_STRIKES,
            "isDisqualified": is_disqualified,
            "reason": reason,
            "participantId": participant.get("id"),
            "alias": participant.get("alias")
        }

    @staticmethod
    def is_disqualified(participant: dict) -> bool:
        """Check if participant has exceeded max strikes."""
        return participant.get("strikes", 0) >= Config.MAX_STRIKES or participant.get("disqualified", False)

proctoring_service = ProctoringService()
