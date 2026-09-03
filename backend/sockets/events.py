import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import time
import math
import threading
from flask import request
from flask_socketio import emit, join_room, leave_room
from services.room_service import room_service
from services.otp_service import otp_service
from config import Config

_bg_thread = None
_bg_thread_stop = threading.Event()

def start_otp_background_worker(socketio):
    """Background worker that continuously rotates passcodes for all active rooms."""
    global _bg_thread
    if _bg_thread is not None and _bg_thread.is_alive():
        return

    def worker():
        while not _bg_thread_stop.is_set():
            time.sleep(1)
            now = time.time()
            all_rooms = room_service.get_all_rooms()
            for room in all_rooms:
                if room.get("status") == "active":
                    # If room is locked, stop passcode rotation & ticks
                    if room.get("isLocked", False):
                        continue

                    expires_at = room.get("passcodeExpiresAt", 0)
                    remaining = max(0, int(math.ceil(expires_at - now)))
                    session_remaining = max(0, int(math.ceil(room.get("expiresAt", room.get("createdAt", now) + 3600) - now)))
                    
                    if session_remaining <= 0:
                        socketio.emit(
                            "session_expired",
                            {
                                "roomId": room["id"],
                                "message": "Session time has completed"
                            },
                            to=f"room_{room['id']}"
                        )

                    if remaining <= 0:
                        # Rotate passcode
                        rot = otp_service.rotate_passcode(room)
                        socketio.emit(
                            "otp_rotated",
                            {
                                "roomId": room["id"],
                                "passcode": rot["passcode"],
                                "expiresIn": rot["expiresIn"],
                                "sessionRemaining": session_remaining,
                                "serverTime": now
                            },
                            to=f"room_{room['id']}"
                        )
                    else:
                        # Periodically sync countdown & session clock
                        socketio.emit(
                            "otp_tick",
                            {
                                "roomId": room["id"],
                                "expiresIn": remaining,
                                "sessionRemaining": session_remaining,
                                "serverTime": now
                            },
                            to=f"room_{room['id']}"
                        )

    _bg_thread = threading.Thread(target=worker, daemon=True)
    _bg_thread.start()

def register_socket_events(socketio):
    start_otp_background_worker(socketio)

    @socketio.on("check_room")
    def handle_check_room(data):
        room_id = (data or {}).get("roomId")
        is_avail = room_service.is_room_available(room_id)
        room = room_service.get_room(room_id)
        result = {
            "roomId": room_id,
            "available": is_avail,
            "exists": room is not None
        }
        emit("room_checked", result)
        return result

    @socketio.on("create_room")
    def handle_create_room(data):
        try:
            options = data or {}
            host_socket_id = request.sid
            room, host_key = room_service.create_room(options, host_socket_id)
            
            room_channel = f"room_{room['id']}"
            join_room(room_channel)
            
            host_state = room_service.get_host_state(room["id"])
            emit("room_created", {
                "success": True,
                "room": host_state,
                "hostKey": host_key
            })
        except Exception as e:
            emit("room_created", {
                "success": False,
                "error": str(e),
                "roomId": options.get("customRoomId")
            })

    @socketio.on("host_leave_room")
    def handle_host_leave_room(data):
        room_id = (data or {}).get("roomId")
        if room_id:
            room_service.destroy_room(room_id)
            socketio.emit("room_closed", {"roomId": room_id}, to=f"room_{room_id}")

    @socketio.on("voter_leave_room")
    def handle_voter_leave_room(data):
        room_id = (data or {}).get("roomId")
        socket_id = request.sid
        if room_id:
            new_tally = room_service.remove_participant(room_id, socket_id)
            leave_room(f"room_{room_id}")
            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("roster_updated", {
                    "participants": host_state["participants"],
                    "participantCount": host_state["participantCount"]
                }, to=f"room_{room_id}")
                socketio.emit("tally_updated", {
                    "tally": new_tally,
                    "participants": host_state["participants"],
                    "isRevealed": host_state["isRevealed"]
                }, to=f"room_{room_id}")

    @socketio.on("host_auth")
    def handle_host_auth(data):
        room_id = (data or {}).get("roomId")
        host_key = (data or {}).get("hostKey")
        room = room_service.get_room(room_id)
        if not room:
            emit("host_auth_response", {"success": False, "error": "Room not found"})
            return
        if room["hostKey"] != host_key:
            emit("host_auth_response", {"success": False, "error": "Invalid host key"})
            return

        room_service.update_host_socket(room_id, host_key, request.sid)
        join_room(f"room_{room_id}")
        
        host_state = room_service.get_host_state(room_id)
        emit("host_auth_response", {"success": True, "room": host_state})

    @socketio.on("join_room")
    def handle_join_room(data):
        data = data or {}
        room_id = data.get("roomId")
        passcode = data.get("passcode")
        alias = data.get("alias")
        session_id = data.get("voterSessionId") or data.get("sessionId")
        socket_id = request.sid

        room = room_service.get_room(room_id)
        if not room:
            emit("room_joined", {"success": False, "error": "Room does not exist."})
            return

        if room["status"] == "ended":
            emit("room_joined", {"success": False, "error": "This voting session has ended."})
            return

        is_existing_voter = bool(session_id and (session_id in room.get("participants", {})))

        if room["isLocked"] and not is_existing_voter:
            emit("room_joined", {"success": False, "error": "This room is currently locked by the host."})
            return

        # Validate dynamic passcode for new joins or when passcode is provided
        if not is_existing_voter or passcode:
            if not otp_service.validate_passcode(room, passcode):
                emit("room_joined", {"success": False, "error": "Invalid or expired 4-digit Passcode. Please check the host screen."})
                return

        try:
            participant = room_service.add_participant(room_id, socket_id, alias, session_id=session_id)
            join_room(f"room_{room_id}")

            voter_state = room_service.get_voter_state(room_id, socket_id, session_id=session_id)
            emit("room_joined", {"success": True, "state": voter_state})

            # Broadcast participant roster & count update
            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("roster_updated", {
                    "participants": host_state["participants"],
                    "participantCount": host_state["participantCount"]
                }, to=f"room_{room_id}")

        except Exception as e:
            emit("room_joined", {"success": False, "error": str(e)})

    @socketio.on("rejoin_room")
    def handle_rejoin_room(data):
        data = data or {}
        room_id = data.get("roomId")
        session_id = data.get("voterSessionId") or data.get("sessionId")
        socket_id = request.sid

        room = room_service.get_room(room_id)
        if not room or room["status"] == "ended":
            emit("room_joined", {"success": False, "error": "Room is no longer active."})
            return

        if session_id and session_id in room.get("participants", {}):
            try:
                participant = room_service.add_participant(room_id, socket_id, session_id=session_id)
                join_room(f"room_{room_id}")
                voter_state = room_service.get_voter_state(room_id, socket_id, session_id=session_id)
                emit("room_joined", {"success": True, "state": voter_state})
            except Exception as e:
                emit("room_joined", {"success": False, "error": str(e)})
        else:
            emit("room_joined", {"success": False, "error": "Session not found or expired."})

    # Dynamic Question / Round Launching
    @socketio.on("host_launch_question")
    def handle_host_launch_question(data):
        data = data or {}
        room_id = str(data.get("roomId", "")).strip()
        try:
            host_state = room_service.launch_question(room_id, data)
            socketio.emit("question_launched", {
                "question": host_state.get("currentQuestion"),
                "mode": host_state.get("mode"),
                "hostState": host_state
            }, to=f"room_{room_id}")
        except Exception as e:
            print(f"[ERROR] host_launch_question failed for room {room_id}: {e}")
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_close_question")
    def handle_host_close_question(data):
        data = data or {}
        room_id = str(data.get("roomId", "")).strip()
        try:
            res = room_service.close_current_question(room_id)
            host_state = room_service.get_host_state(room_id)
            socketio.emit("question_closed", {
                "question": res["question"],
                "tally": res["tally"],
                "hostState": host_state
            }, to=f"room_{room_id}")
        except Exception as e:
            print(f"[ERROR] host_close_question failed for room {room_id}: {e}")
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_erase_session_data")
    def handle_host_erase_session_data(data):
        data = data or {}
        room_id = str(data.get("roomId", "")).strip()
        try:
            room_service.erase_session_data(room_id)
            host_state = room_service.get_host_state(room_id)
            socketio.emit("session_data_erased", {
                "hostState": host_state,
                "message": "Temporary session data erased."
            }, to=f"room_{room_id}")
        except Exception as e:
            print(f"[ERROR] host_erase_session_data failed for room {room_id}: {e}")
            emit("error_alert", {"message": str(e)})

    @socketio.on("submit_vote")
    def handle_submit_vote(data):
        data = data or {}
        room_id = data.get("roomId")
        vote_value = data.get("vote")
        session_id = data.get("voterSessionId") or data.get("sessionId")
        socket_id = request.sid

        try:
            result = room_service.submit_vote(room_id, socket_id, vote_value, session_id=session_id)
            
            # Confirm to voter across all connected sockets/tabs for this voter
            participant = result.get("participant", {})
            socket_ids = participant.get("socketIds") or {socket_id}
            for sid in socket_ids:
                socketio.emit("vote_confirmed", {
                    "success": True,
                    "vote": result["vote"],
                    "order": result.get("order"),
                    "questionId": result.get("questionId")
                }, to=sid)

            # Broadcast updated tally & participants to the entire room
            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("tally_updated", {
                    "tally": result["tally"],
                    "participants": host_state["participants"],
                    "isRevealed": host_state["isRevealed"],
                    "currentQuestion": host_state.get("currentQuestion")
                }, to=f"room_{room_id}")

        except Exception as e:
            emit("vote_confirmed", {
                "success": False,
                "error": str(e)
            })

    @socketio.on("host_lock_room")
    def handle_host_lock_room(data):
        data = data or {}
        room_id = data.get("roomId")
        is_locked = data.get("isLocked", False)
        
        try:
            locked = room_service.set_lock(room_id, is_locked)
            clean_id = str(room_id).strip()
            room = room_service.get_room(clean_id)
            if room:
                now = time.time()
                session_remaining = max(0, int(math.ceil(room.get("expiresAt", now + 3600) - now)))
                if not locked:
                    # Unlocked: immediately start a fresh passcode & 20s cycle
                    rot = otp_service.rotate_passcode(room)
                    socketio.emit(
                        "otp_rotated",
                        {
                            "roomId": room["id"],
                            "passcode": rot["passcode"],
                            "expiresIn": rot["expiresIn"],
                            "sessionRemaining": session_remaining,
                            "serverTime": now
                        },
                        to=f"room_{room['id']}"
                    )
            socketio.emit("room_lock_toggled", {"isLocked": locked}, to=f"room_{room_id}")
        except Exception as e:
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_reveal_results")
    def handle_host_reveal_results(data):
        data = data or {}
        room_id = data.get("roomId")
        is_revealed = data.get("isRevealed", True)
        
        try:
            revealed = room_service.set_reveal(room_id, is_revealed)
            tally = room_service.get_tally(room_id)
            socketio.emit("results_reveal_toggled", {
                "isRevealed": revealed,
                "tally": tally
            }, to=f"room_{room_id}")
        except Exception as e:
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_reset_votes")
    def handle_host_reset_votes(data):
        data = data or {}
        room_id = data.get("roomId")
        
        try:
            tally = room_service.reset_votes(room_id)
            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("votes_reset", {
                    "tally": tally,
                    "participants": host_state["participants"]
                }, to=f"room_{room_id}")
        except Exception as e:
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_update_title")
    def handle_host_update_title(data):
        data = data or {}
        room_id = data.get("roomId")
        question = data.get("title", "")
        
        try:
            new_title = room_service.update_question(room_id, question)
            socketio.emit("title_updated", {"title": new_title}, to=f"room_{room_id}")
        except Exception as e:
            emit("error_alert", {"message": str(e)})

    @socketio.on("host_end_poll")
    def handle_host_end_poll(data):
        data = data or {}
        room_id = data.get("roomId")
        
        try:
            final_tally = room_service.end_room(room_id)
            socketio.emit("poll_ended", {
                "finalTally": final_tally,
                "roomId": room_id
            }, to=f"room_{room_id}")
        except Exception as e:
            emit("error_alert", {"message": str(e)})

    @socketio.on("kick_participant")
    def handle_kick_participant(data):
        data = data or {}
        room_id = data.get("roomId")
        target_id = data.get("socketId")

        room = room_service.get_room(room_id)
        if not room:
            return

        participant = room_service.get_participant(room_id, target_id)
        if participant:
            socket_ids = list(participant.get("socketIds", [participant.get("socketId")]))
            new_tally = room_service.remove_participant(room_id, target_id, force=True)
            
            for sid in socket_ids:
                if sid:
                    socketio.emit("kicked", {"message": "You have been disqualified by the host."}, to=sid)

            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("roster_updated", {
                    "participants": host_state["participants"],
                    "participantCount": host_state["participantCount"]
                }, to=f"room_{room_id}")
                socketio.emit("tally_updated", {
                    "tally": new_tally,
                    "participants": host_state["participants"],
                    "isRevealed": host_state["isRevealed"]
                }, to=f"room_{room_id}")

    @socketio.on("voter_leave_room")
    def handle_voter_leave_room(data):
        data = data or {}
        room_id = data.get("roomId")
        socket_id = request.sid
        if room_id:
            new_tally = room_service.remove_participant(room_id, socket_id, force=True)
            host_state = room_service.get_host_state(room_id)
            if host_state:
                socketio.emit("roster_updated", {
                    "participants": host_state["participants"],
                    "participantCount": host_state["participantCount"]
                }, to=f"room_{room_id}")
                socketio.emit("tally_updated", {
                    "tally": new_tally,
                    "participants": host_state["participants"],
                    "isRevealed": host_state["isRevealed"]
                }, to=f"room_{room_id}")

    @socketio.on("disconnect")
    def handle_disconnect():
        socket_id = request.sid
        for room in room_service.get_all_rooms():
            room_id = room["id"]
            if room.get("hostSocketId") == socket_id:
                # Host temporarily disconnected (browser reload, page refresh, or network fluctuation).
                # DO NOT destroy the room immediately; allow host to reconnect via host_auth with hostKey.
                pass
            elif socket_id in room.get("participants", {}) or socket_id in room.get("socketToSession", {}):
                prev_count = len(room.get("participants", {}))
                new_tally = room_service.remove_participant(room_id, socket_id, force=False)
                new_count = len(room.get("participants", {}))
                # Only broadcast updates if the voter was completely disconnected (last tab closed)
                if prev_count != new_count:
                    host_state = room_service.get_host_state(room_id)
                    if host_state:
                        socketio.emit("roster_updated", {
                            "participants": host_state["participants"],
                            "participantCount": host_state["participantCount"]
                        }, to=f"room_{room_id}")
                        socketio.emit("tally_updated", {
                            "tally": new_tally,
                            "participants": host_state["participants"],
                            "isRevealed": host_state["isRevealed"]
                        }, to=f"room_{room_id}")
