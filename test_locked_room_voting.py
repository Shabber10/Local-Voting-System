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

def test_locked_room_voting():
    print("=" * 70)
    print("[TEST SUITE] VOTING INSIDE LOCKED ROOM & ENTRY BLOCK VERIFICATION")
    print("=" * 70)

    room_service.clear_all_rooms()
    app, sio = create_app()

    room_id = "8200"

    # 1. Create Room #8200
    print("\n[1] Creating Room #8200 and adding Voter 1...")
    room, host_key = room_service.create_room({"customRoomId": room_id}, "host_sid")
    voter1 = room_service.add_participant(room_id, "voter_1", "Alice")
    print("    [PASSED] Room created and Voter 1 entered the room.")

    # 2. Host launches Question 1
    print("\n[2] Host launches Question 1...")
    host_state = room_service.launch_question(room_id, {
        "text": "Should we approve the new strategy?",
        "mode": "assembly",
        "type": "poll"
    })
    assert host_state["currentQuestion"]["id"] == 1
    print("    [PASSED] Question 1 launched successfully.")

    # 3. Host locks the room
    print("\n[3] Host locks the room (blocking new entry)...")
    room_service.set_lock(room_id, True)
    assert room["isLocked"] is True
    print("    [PASSED] Room is now locked.")

    # 4. Voter 1 votes while room is locked
    print("\n[4] Voter 1 submits vote 'Yes' while room is locked...")
    vote_result = room_service.submit_vote(room_id, "voter_1", "Yes")
    assert vote_result["vote"] == "Yes"
    assert vote_result["hasVoted"] is True
    assert vote_result["tally"]["counts"]["Yes"] == 1
    assert vote_result["tally"]["totalVotes"] == 1
    print("    [PASSED] Vote successfully accepted and recorded while room is locked!")

    # 5. New voter attempts to enter locked room
    print("\n[5] New Voter 2 attempts to enter locked room...")
    rejected = False
    try:
        room_service.add_participant(room_id, "voter_2", "Bob")
    except ValueError as e:
        rejected = True
        print(f"    [PASSED] New Voter 2 blocked with message: '{e}'")
    assert rejected is True, "New voter was not blocked from entering locked room"

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL LOCKED ROOM VOTING TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    test_locked_room_voting()
