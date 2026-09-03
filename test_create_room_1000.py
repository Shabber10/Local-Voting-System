"""
Test Suite: Create Room #1000 Availability & Duplicate Prevention Verification
Run via: python test_create_room_1000.py
"""

import sys
import os

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from services.room_service import room_service
from services.otp_service import otp_service

def run_tests():
    print("=" * 60)
    print("[TEST SUITE] ROOM #1000 CREATION & AVAILABILITY VERIFICATION")
    print("=" * 60)

    app, sio = create_app()
    client = app.test_client()

    target_room_id = "1000"

    # Step 1: Check availability BEFORE creation
    print(f"\n[1] Checking availability of Room #{target_room_id} BEFORE creation...")
    res_before = client.get(f"/api/room-check/{target_room_id}")
    data_before = res_before.get_json()
    print(f"    API Response: {data_before}")
    assert data_before["available"] is True, f"Expected Room #{target_room_id} to be available before creation"
    print("    [PASSED] Room #1000 is initially available.")

    # Step 2: Create Room #1000
    print(f"\n[2] Creating Room #{target_room_id} with Host Key...")
    room, host_key = room_service.create_room({"customRoomId": target_room_id, "mode": "assembly"}, "host_socket_session_1")
    print(f"    Room Created: ID={room['id']}, Mode={room['mode']}, Passcode={room['passcode']}, HostKey={host_key}")
    assert room["id"] == target_room_id, f"Expected Room ID to be {target_room_id}"
    print("    [PASSED] Room #1000 created successfully.")

    # Step 3: Check availability AFTER creation
    print(f"\n[3] Checking availability of Room #{target_room_id} AFTER creation...")
    res_after = client.get(f"/api/room-check/{target_room_id}")
    data_after = res_after.get_json()
    print(f"    API Response: {data_after}")
    assert data_after["available"] is False, f"Expected Room #{target_room_id} to be TAKEN (available: False)"
    print("    [PASSED] API correctly reports Room #1000 as TAKEN (available: False).")

    # Step 4: Attempt duplicate creation of Room #1000
    print(f"\n[4] Attempting DUPLICATE creation of Room #{target_room_id}...")
    try:
        room_service.create_room({"customRoomId": target_room_id}, "host_socket_session_2")
        print("    [FAILED] Duplicate creation was unexpectedly allowed!")
        assert False
    except ValueError as e:
        print(f"    Expected Error Caught: {e}")
        assert "already in use" in str(e).lower()
        print("    [PASSED] Duplicate creation blocked with clear error.")

    # Step 5: Test voter join & vote submission in Room #1000
    print(f"\n[5] Testing voter join & vote submission in Room #{target_room_id}...")
    voter = room_service.add_participant(target_room_id, "voter_socket_001", "Voter One")
    print(f"    Participant joined: {voter['alias']}")
    
    # Host launches question #1
    room_service.launch_question(target_room_id, {"text": "Assembly Vote", "mode": "assembly"})
    
    vote_result = room_service.submit_vote(target_room_id, "voter_socket_001", "Yes")
    print(f"    Vote submitted: {vote_result['vote']}")
    tally = room_service.get_tally(target_room_id)
    print(f"    Live Tally: {tally['counts']}")
    assert tally["counts"]["Yes"] == 1
    print("    [PASSED] Voter successfully cast vote in Room #1000.")

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL ROOM #1000 TESTS PASSED (5/5)!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
