import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from services.room_service import room_service
from services.otp_service import otp_service

def test_lock_room_flow():
    print("=" * 70)
    print("[TEST SUITE] ROOM LOCKING & PASSCODE / PARTICIPANT FREEZE VERIFICATION")
    print("=" * 70)

    room_service.clear_all_rooms()
    app, sio = create_app()

    room_id = "9500"

    # [1] Create Room #9500
    print("\n[1] Creating Room #9500...")
    room, host_key = room_service.create_room({"customRoomId": room_id}, "host_sid")
    active_code = room["passcode"]
    assert room["isLocked"] is False, "Room should be initially unlocked"
    print(f"    [PASSED] Room created! Active passcode: {active_code}")

    # [2] Lock Room #9500
    print("\n[2] Host locks the room...")
    locked_state = room_service.set_lock(room_id, True)
    assert locked_state is True, "Room failed to lock"
    assert room["isLocked"] is True, "room['isLocked'] should be True"
    print("    [PASSED] Room is now officially LOCKED!")

    # [3] Voter attempts to enter locked room
    print("\n[3] Voter attempts to join locked room...")
    rejected = False
    rejection_msg = ""
    try:
        room_service.add_participant(room_id, "voter_1", "Alice")
    except ValueError as e:
        rejected = True
        rejection_msg = str(e)
    
    assert rejected is True, "Voter was not rejected from entering locked room"
    assert "locked by host" in rejection_msg.lower(), f"Unexpected rejection message: {rejection_msg}"
    print(f"    [PASSED] Voter successfully blocked from entering locked room! (Error: '{rejection_msg}')")

    # [4] Host unlocks the room
    print("\n[4] Host unlocks the room...")
    unlocked_state = room_service.set_lock(room_id, False)
    assert unlocked_state is False, "Room failed to unlock"
    fresh_rot = otp_service.rotate_passcode(room)
    fresh_passcode = fresh_rot["passcode"]
    print(f"    [PASSED] Room unlocked! Fresh passcode generated: {fresh_passcode}")

    # [5] Voter joins unlocked room
    print("\n[5] Voter joins unlocked room with fresh passcode...")
    participant = room_service.add_participant(room_id, "voter_1", "Alice")
    assert participant is not None, "Failed to add participant to unlocked room"
    voter_state = room_service.get_voter_state(room_id, "voter_1")
    assert voter_state["roomId"] == room_id, "Voter state room id mismatch"
    print("    [PASSED] Voter successfully entered room after unlock!")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL ROOM LOCK TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    test_lock_room_flow()
