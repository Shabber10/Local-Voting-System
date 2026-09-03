import time
import socketio

BASE_URL = "http://localhost:5000"

def test_multi_tab_session():
    print("=" * 70)
    print("[TEST SUITE] MULTI-TAB VOTER SESSION MANAGEMENT & DEDUPLICATION")
    print("=" * 70)

    # 1. Setup Host
    host_sio = socketio.Client()
    host_state = {}

    @host_sio.on("room_created")
    def on_room_created(data):
        host_state["room"] = data["room"]

    @host_sio.on("roster_updated")
    def on_roster(data):
        host_state["participants"] = data["participants"]
        host_state["participantCount"] = data["participantCount"]

    @host_sio.on("tally_updated")
    def on_tally(data):
        host_state["tally"] = data["tally"]

    host_sio.connect(BASE_URL)
    host_sio.emit("create_room", {"customRoomId": "9100", "passcode": "1234"})
    time.sleep(0.5)

    room_id = "9100"
    passcode = "1234"
    shared_voter_session_id = "voter_mobile_browser_device_999"

    print("\n[1] Creating Room #9100...")
    assert "room" in host_state, "Host room failed to create"
    print("    [PASSED] Room #9100 created successfully.")

    # 2. Voter Tab 1 joins
    tab1_sio = socketio.Client()
    tab1_state = {}

    @tab1_sio.on("room_joined")
    def on_tab1_joined(data):
        tab1_state["joined"] = data

    @tab1_sio.on("vote_confirmed")
    def on_tab1_vote(data):
        tab1_state["vote_confirmed"] = data

    tab1_sio.connect(BASE_URL)
    tab1_sio.emit("join_room", {
        "roomId": room_id,
        "passcode": passcode,
        "voterSessionId": shared_voter_session_id
    })
    time.sleep(0.5)

    print("\n[2] Voter opens Tab 1 and enters room...")
    assert tab1_state.get("joined", {}).get("success"), "Tab 1 failed to join"
    alias_tab1 = tab1_state["joined"]["state"]["alias"]
    print(f"    [PASSED] Tab 1 registered as '{alias_tab1}'.")
    assert host_state.get("participantCount") == 1, f"Expected 1 participant, got {host_state.get('participantCount')}"
    print("    [PASSED] Host roster shows exactly 1 participant.")

    # 3. Voter opens Tab 2 in the SAME browser (same voterSessionId)
    tab2_sio = socketio.Client()
    tab2_state = {}

    @tab2_sio.on("room_joined")
    def on_tab2_joined(data):
        tab2_state["joined"] = data

    @tab2_sio.on("vote_confirmed")
    def on_tab2_vote(data):
        tab2_state["vote_confirmed"] = data

    tab2_sio.connect(BASE_URL)
    tab2_sio.emit("join_room", {
        "roomId": room_id,
        "passcode": passcode,
        "voterSessionId": shared_voter_session_id
    })
    time.sleep(0.5)

    print("\n[3] Voter opens Tab 2 in the SAME browser...")
    assert tab2_state.get("joined", {}).get("success"), "Tab 2 failed to join"
    alias_tab2 = tab2_state["joined"]["state"]["alias"]
    print(f"    [PASSED] Tab 2 recognized as the SAME voter: '{alias_tab2}'.")
    assert alias_tab1 == alias_tab2, f"Expected identical aliases, got {alias_tab1} vs {alias_tab2}"
    assert host_state.get("participantCount") == 1, f"Host roster duplicated voters! Count is {host_state.get('participantCount')}"
    print("    [PASSED] Host roster still shows exactly 1 participant (no duplicate created)!")

    # 4. Host launches question
    print("\n[4] Host launches Question #1...")
    host_sio.emit("host_launch_question", {
        "roomId": room_id,
        "text": "Do you agree with the session policy?",
        "mode": "assembly",
        "type": "poll"
    })
    time.sleep(0.5)

    # 5. Tab 1 votes "Yes"
    print("\n[5] Tab 1 submits vote 'Yes'...")
    tab1_sio.emit("submit_vote", {
        "roomId": room_id,
        "vote": "Yes",
        "voterSessionId": shared_voter_session_id
    })
    time.sleep(0.5)

    assert tab1_state.get("vote_confirmed", {}).get("success"), "Tab 1 vote not confirmed"
    print("    [PASSED] Tab 1 received vote confirmation.")
    assert tab2_state.get("vote_confirmed", {}).get("success"), "Tab 2 did not receive synchronized vote confirmation"
    print("    [PASSED] Tab 2 received synchronized vote confirmation across browser tabs!")

    assert host_state.get("tally", {}).get("counts", {}).get("Yes") == 1, "Expected exactly 1 vote in tally"
    assert host_state.get("tally", {}).get("totalVotes") == 1, "Total votes should be 1"
    print("    [PASSED] Host tally recorded exactly 1 vote (no duplicate votes)!")

    # 6. Tab 1 closes (disconnects) while Tab 2 remains open
    print("\n[6] Tab 1 closes (disconnects)...")
    tab1_sio.disconnect()
    time.sleep(0.5)

    assert host_state.get("participantCount") == 1, "Voter was prematurely removed while Tab 2 was still open"
    print("    [PASSED] Voter remains active on Host roster because Tab 2 is still open.")

    # 7. Tab 2 closes (last tab disconnects)
    print("\n[7] Tab 2 closes (last tab disconnects)...")
    tab2_sio.disconnect()
    time.sleep(0.5)

    assert host_state.get("participantCount") == 0, "Voter was not removed after all tabs closed"
    print("    [PASSED] Voter cleanly removed after all tabs closed.")

    host_sio.disconnect()
    print("\n" + "=" * 70)
    print("[SUCCESS] ALL MULTI-TAB SESSION DEDUPLICATION TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    test_multi_tab_session()
