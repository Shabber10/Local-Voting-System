"""
Test Suite: Multi-Question Dynamic Rounds, Sequential Order Logging, and CSV Exporter Verification
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from services.room_service import room_service

def run_tests():
    print("=" * 65)
    print("[TEST SUITE] DYNAMIC MULTI-QUESTION & SEQUENTIAL LOGGING TEST")
    print("=" * 65)

    room_service.clear_all_rooms()
    app, sio = create_app()
    client = app.test_client()

    room_id = "5000"

    # 1. Create Room (Starts in Idle state)
    print("\n[1] Creating Room #5000...")
    room, host_key = room_service.create_room({"customRoomId": room_id}, "host_sid_1")
    host_state = room_service.get_host_state(room_id)
    assert host_state["currentQuestion"] is None, "Expected room to start with currentQuestion=None (Idle)"
    assert host_state["questionCounter"] == 0
    print("    [PASSED] Room created in idle standby state (0 questions).")

    # 2. Add Voters
    print("\n[2] Connecting 2 Voters to Room #5000...")
    voter1 = room_service.add_participant(room_id, "voter_sid_1", "Alice")
    voter2 = room_service.add_participant(room_id, "voter_sid_2", "Bob")
    
    v1_state = room_service.get_voter_state(room_id, "voter_sid_1")
    assert v1_state["currentQuestion"] is None, "Expected voter to see currentQuestion=None initially"
    assert v1_state["hasVoted"] is False
    print("    [PASSED] Voters are in standby booth, waiting for host question.")

    # 3. Host Launches Question #1 (Assembly)
    print("\n[3] Host launches Question #1 (Assembly: Yes/No/Maybe/NOTA)...")
    host_state = room_service.launch_question(room_id, {
        "text": "Should we approve the new budget plan?",
        "mode": "assembly",
        "type": "poll"
    })
    assert host_state["currentQuestion"]["id"] == 1
    assert host_state["currentQuestion"]["text"] == "1. Should we approve the new budget plan?"
    assert host_state["currentQuestion"]["status"] == "active"
    print("    [PASSED] Question #1 launched actively.")

    # 4. Voters submit votes for Question #1 in order
    print("\n[4] Voters submit votes for Question #1...")
    res1 = room_service.submit_vote(room_id, "voter_sid_1", "Yes")
    assert res1["order"] == 1
    assert res1["vote"] == "Yes"

    res2 = room_service.submit_vote(room_id, "voter_sid_2", "No")
    assert res2["order"] == 2
    assert res2["vote"] == "No"
    print("    [PASSED] Votes submitted and logged in sequential order (Order 1, Order 2).")

    # Verify Tally Q1
    q1_tally = room_service.get_tally(room_id)
    assert q1_tally["counts"]["Yes"] == 1
    assert q1_tally["counts"]["No"] == 1
    assert q1_tally["totalVotes"] == 2
    print("    [PASSED] Question #1 tally is accurate (Yes=1, No=1, Total=2).")

    # 5. Host closes Q1 and Launches Question #2 (Rating)
    print("\n[5] Host launches Question #2 (Rating Scale 1-10)...")
    host_state = room_service.launch_question(room_id, {
        "text": "Rate your satisfaction with the meeting (1-10)",
        "mode": "rating",
        "type": "poll"
    })
    assert host_state["questionCounter"] == 2
    assert host_state["currentQuestion"]["id"] == 2
    assert len(host_state["questionHistory"]) == 1
    assert host_state["questionHistory"][0]["id"] == 1
    print("    [PASSED] Question #1 archived into history and Question #2 active.")

    # Check that voters' hasVoted is reset for Question #2
    v1_state = room_service.get_voter_state(room_id, "voter_sid_1")
    assert v1_state["hasVoted"] is False
    assert v1_state["currentQuestion"]["id"] == 2
    print("    [PASSED] Voter state reset for Question #2.")

    # 6. Voters submit ratings for Question #2
    print("\n[6] Voters submit ratings for Question #2...")
    res1_q2 = room_service.submit_vote(room_id, "voter_sid_1", 8)
    assert res1_q2["order"] == 1
    res2_q2 = room_service.submit_vote(room_id, "voter_sid_2", 10)
    assert res2_q2["order"] == 2

    q2_tally = room_service.get_tally(room_id)
    assert q2_tally["average"] == 9.0
    assert q2_tally["totalVotes"] == 2
    print("    [PASSED] Ratings submitted and average computed (9.0/10).")

    # 7. Generate Full CSV Report
    print("\n[7] Generating Comprehensive CSV Report...")
    csv_report = room_service.generate_csv_report(room_id)
    print("-" * 50)
    print(csv_report[:500] + "\n...")
    print("-" * 50)
    assert "SECTION 1: QUESTION-BY-QUESTION SUMMARY & TALLIES" in csv_report
    assert "SECTION 2: SEQUENTIAL VOTING RESPONSES LOG" in csv_report
    assert "SECTION 3: VOTER PARTICIPATION MATRIX" in csv_report
    assert "Should we approve the new budget plan?" in csv_report
    assert "Rate your satisfaction with the meeting" in csv_report
    print("    [PASSED] Multi-question CSV report generated with all 3 sections.")

    # 8. Erase Temporary Session Data
    print("\n[8] Erasing Temporary Session Data...")
    room_service.erase_session_data(room_id)
    cleared_host = room_service.get_host_state(room_id)
    assert cleared_host["currentQuestion"] is None
    assert len(cleared_host["questionHistory"]) == 0
    assert cleared_host["questionCounter"] == 0
    assert cleared_host["participantCount"] == 2
    print("    [PASSED] Temporary data wiped cleanly; room and voters remain connected.")

    print("\n" + "=" * 65)
    print("[SUCCESS] ALL MULTI-QUESTION & SESSION TESTS PASSED (8/8)!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
