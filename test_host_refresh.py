import socketio
import time
import sys

BASE_URL = "http://localhost:5000"

def test_host_refresh_flow():
    print("=" * 70)
    print("[TEST] HOST REFRESH & SESSION PERSISTENCE")
    print("=" * 70)

    # 1. Connect host
    host_sio = socketio.Client()
    created_res = {}
    auth_res = {}

    @host_sio.on("room_created")
    def on_created(data):
        created_res.update(data)

    @host_sio.on("host_auth_response")
    def on_auth(data):
        auth_res.update(data)

    host_sio.connect(BASE_URL)
    host_sio.emit("create_room", {"customRoomId": "8800", "mode": "assembly"})
    time.sleep(1)

    assert created_res.get("success"), f"Failed to create room: {created_res}"
    room_id = str(created_res["room"]["id"])
    host_key = created_res["hostKey"]
    print(f"1. Host created Room #{room_id} with HostKey: {host_key}")

    # 2. Host refreshes page -> socket disconnects!
    print("2. Host refreshes browser tab (disconnecting socket)...")
    host_sio.disconnect()
    time.sleep(1)

    # 3. Host reconnects in new tab / refreshed tab
    print("3. Browser reloads, opens new socket connection...")
    host_refreshed_sio = socketio.Client()

    @host_refreshed_sio.on("host_auth_response")
    def on_reauth(data):
        auth_res.update(data)

    host_refreshed_sio.connect(BASE_URL)
    
    # 4. Host emits host_auth with saved credentials
    print("4. Emitting 'host_auth' with saved hostKey from storage/cookies...")
    host_refreshed_sio.emit("host_auth", {"roomId": room_id, "hostKey": host_key})
    time.sleep(1)

    assert auth_res.get("success"), f"Host authentication failed on reload: {auth_res}"
    print(f"5. [SUCCESS] Host successfully re-authenticated on reload!")
    print(f"   Room ID: #{auth_res['room']['id']}")
    print(f"   Room Status: {auth_res['room']['status']}")
    print(f"   Room Passcode: {auth_res['room']['passcode']}")

    host_refreshed_sio.disconnect()
    print("=" * 70)
    print("ALL HOST REFRESH & PERSISTENCE TESTS PASSED (100%)!")
    print("=" * 70)

if __name__ == "__main__":
    test_host_refresh_flow()
