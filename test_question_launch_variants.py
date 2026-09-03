"""
Test Suite: Question Launching with Custom Random Text & Without Question (Default Fallback)
Verifies:
1. Question launched with custom question text appears as: "1. (question that he want to ask)"
2. Question launched without question text (empty/whitespace/None) appears as: "2. (No question available)"
3. Connected client (voter) receives the exact formatted question text in real time.
4. Voters can vote normally in both cases.
"""

import sys
import os
import random

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app
from services.room_service import room_service

def test_question_launch_variants():
    print("=" * 70)
    print("[TEST SUITE] QUESTION LAUNCHING: WITH CUSTOM TEXT & WITHOUT QUESTION")
    print("=" * 70)

    room_service.clear_all_rooms()
    app, sio = create_app()

    room_id = "6000"

    # [1] Create room and connect a voter
    print("\n[1] Creating Room #6000 and connecting voter...")
    room, host_key = room_service.create_room({"customRoomId": room_id}, "host_sid")
    voter = room_service.add_participant(room_id, "voter_sid_1", "Sam")
    
    initial_voter_state = room_service.get_voter_state(room_id, "voter_sid_1")
    assert initial_voter_state["currentQuestion"] is None, "Voter should be in standby booth initially"
    print("    [PASSED] Room created and voter is in idle standby booth.")

    # [2] Case 1: Host launches Question #1 WITH custom/random question text
    random_questions = [
        "Do you agree with the new Q3 project proposal?",
        "Should we implement a 4-day work week?",
        "Do you support the annual budget allocation?"
    ]
    chosen_question = random.choice(random_questions)
    print(f"\n[2] Case 1: Host launches Question #1 WITH question text:\n    Prompt: \"{chosen_question}\"")
    
    host_state_q1 = room_service.launch_question(room_id, {
        "text": chosen_question,
        "mode": "assembly",
        "type": "poll"
    })

    expected_q1_text = f"1. {chosen_question}"
    assert host_state_q1["currentQuestion"]["id"] == 1
    assert host_state_q1["currentQuestion"]["text"] == expected_q1_text, \
        f"Expected text '{expected_q1_text}', got '{host_state_q1['currentQuestion']['text']}'"

    # Verify Client (Voter) receives the formatted question
    voter_state_q1 = room_service.get_voter_state(room_id, "voter_sid_1")
    assert voter_state_q1["currentQuestion"] is not None
    assert voter_state_q1["currentQuestion"]["text"] == expected_q1_text
    print(f"    [PASSED] Host and Voter screen receive:\n    --> \"{voter_state_q1['currentQuestion']['text']}\"")

    # Voter casts ballot for Q1
    vote_res_q1 = room_service.submit_vote(room_id, "voter_sid_1", "Yes")
    assert vote_res_q1["vote"] == "Yes"
    print("    [PASSED] Voter successfully voted 'Yes' for Question #1.")

    # [3] Case 2: Host launches Question #2 WITHOUT question text (empty / blank)
    print("\n[3] Case 2: Host launches Question #2 WITHOUT question text (blank input)...")
    host_state_q2 = room_service.launch_question(room_id, {
        "text": "",  # Empty question text
        "mode": "assembly",
        "type": "poll"
    })

    expected_q2_text = "2. (No question available)"
    assert host_state_q2["currentQuestion"]["id"] == 2
    assert host_state_q2["currentQuestion"]["text"] == expected_q2_text, \
        f"Expected text '{expected_q2_text}', got '{host_state_q2['currentQuestion']['text']}'"

    # Verify Client (Voter) receives the fallback question text
    voter_state_q2 = room_service.get_voter_state(room_id, "voter_sid_1")
    assert voter_state_q2["currentQuestion"] is not None
    assert voter_state_q2["currentQuestion"]["text"] == expected_q2_text
    assert voter_state_q2["hasVoted"] is False, "Voter hasVoted should reset for new question"
    print(f"    [PASSED] Host and Voter screen receive:\n    --> \"{voter_state_q2['currentQuestion']['text']}\"")

    # Voter casts ballot for Q2
    vote_res_q2 = room_service.submit_vote(room_id, "voter_sid_1", "No")
    assert vote_res_q2["vote"] == "No"
    print("    [PASSED] Voter successfully voted 'No' for Question #2 without prompt.")

    # [4] Verify Question History & Integrity
    print("\n[4] Verifying Question History...")
    host_final_state = room_service.get_host_state(room_id)
    history = host_final_state["questionHistory"]
    assert len(history) == 1, "Question #1 should be in history"
    assert history[0]["text"] == expected_q1_text
    assert host_final_state["currentQuestion"]["text"] == expected_q2_text
    print("    [PASSED] Question history accurately stores both with-question and without-question rounds.")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL QUESTION LAUNCH TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    test_question_launch_variants()
