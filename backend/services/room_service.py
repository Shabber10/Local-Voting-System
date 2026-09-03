import time
import uuid
import threading
from config import Config
from services.otp_service import otp_service
from services.proctoring_service import proctoring_service

class RoomService:
    def __init__(self):
        self._rooms = {}
        self._lock = threading.Lock()

    def generate_unique_room_id(self) -> str:
        """Generate unique 4-digit Room ID."""
        for _ in range(100):
            code = otp_service.generate_code()
            if code not in self._rooms:
                return code
        return str(uuid.uuid4().int)[:4]

    def clear_all_rooms(self):
        """Clear all active rooms in memory."""
        with self._lock:
            self._rooms.clear()

    def is_room_available(self, room_id: str) -> bool:
        if not room_id:
            return False
        clean_id = str(room_id).strip()
        if len(clean_id) < 3 or len(clean_id) > 6:
            return False
        with self._lock:
            existing = self._rooms.get(clean_id)
            if not existing:
                return True
            if existing.get("status") != "active":
                del self._rooms[clean_id]
                return True
            return False

    def create_room(self, options: dict, host_socket_id: str) -> tuple[dict, str]:
        with self._lock:
            custom_id = options.get("customRoomId")
            if custom_id and str(custom_id).strip():
                room_id = str(custom_id).strip()
                existing = self._rooms.get(room_id)
                if existing:
                    if existing.get("status") != "active":
                        del self._rooms[room_id]
                    elif existing.get("hostSocketId") != host_socket_id:
                        raise ValueError(f"Room #{room_id} is already in use. Please pick another number.")
            else:
                room_id = self.generate_unique_room_id()

            host_key = f"host_{uuid.uuid4().hex[:8]}"
            mode = options.get("mode", Config.MODE_ASSEMBLY)
            
            title = (options.get("question") or "").strip() or "VoteSphere Live Session"
            custom_passcode = (options.get("passcode") or "").strip()
            initial_passcode = custom_passcode if custom_passcode else otp_service.generate_code()
            is_locked = bool(options.get("isLocked", False))
            
            now = time.time()
            room = {
                "id": room_id,
                "title": title,
                "mode": mode,
                "passcode": initial_passcode,
                "previousPasscode": None,
                "previousPasscodeExpiresAt": 0,
                "passcodeExpiresAt": now + Config.OTP_ROTATION_SECONDS,
                "expiresAt": now + Config.SESSION_DURATION_SECONDS,
                "isLocked": is_locked,
                "isRevealed": True,
                "status": "active",
                "anonymous": True,
                "hostSocketId": host_socket_id,
                "hostKey": host_key,
                "voterCounter": 0,
                "participants": {},  # socket_id -> participant dict
                "votes": {},         # fallback / current votes
                "questionCounter": 0,
                "currentQuestion": None,  # Idle by default until host launches a question
                "questionHistory": [],    # List of archived questions with responses
                "createdAt": now
            }
            self._rooms[room_id] = room
            return room, host_key

    def get_room(self, room_id: str) -> dict | None:
        with self._lock:
            return self._rooms.get(str(room_id).strip())

    def get_all_rooms(self) -> list[dict]:
        with self._lock:
            return list(self._rooms.values())

    def destroy_room(self, room_id: str) -> bool:
        """Immediately removes room from memory so the code is free for reuse."""
        with self._lock:
            clean_id = str(room_id).strip()
            if clean_id in self._rooms:
                del self._rooms[clean_id]
                return True
            return False

    def update_host_socket(self, room_id: str, host_key: str, new_socket_id: str) -> bool:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                return False
            if room["hostKey"] == host_key:
                room["hostSocketId"] = new_socket_id
                return True
            return False

    def add_participant(self, room_id: str, socket_id: str, alias: str = None, session_id: str = None) -> dict:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            if room["status"] != "active":
                raise ValueError("Session is no longer active")

            # Fallback session_id to socket_id if not provided
            voter_key = str(session_id).strip() if session_id and str(session_id).strip() else socket_id

            if "socketToSession" not in room:
                room["socketToSession"] = {}

            # Re-attach if participant already joined from this browser session
            if voter_key in room["participants"]:
                participant = room["participants"][voter_key]
                if "socketIds" not in participant or not isinstance(participant["socketIds"], set):
                    participant["socketIds"] = {participant.get("socketId", socket_id)}
                participant["socketIds"].add(socket_id)
                participant["socketId"] = socket_id
                participant["status"] = "active"
                room["socketToSession"][socket_id] = voter_key
                
                # Check current question vote state
                if room.get("currentQuestion"):
                    participant["hasVoted"] = voter_key in room["currentQuestion"].get("votes", {})
                return participant

            # New participant joining: check locked state
            if room["isLocked"]:
                raise ValueError("Room is locked by host")

            # Assign alias if not provided
            if not alias or not alias.strip():
                room["voterCounter"] += 1
                alias = f"Voter #{room['voterCounter']}"
            else:
                alias = alias.strip()

            has_voted_active = False
            if room["currentQuestion"] and voter_key in room["currentQuestion"].get("votes", {}):
                has_voted_active = True

            participant = {
                "id": voter_key,
                "socketId": socket_id,
                "socketIds": {socket_id},
                "alias": alias,
                "joinedAt": time.time(),
                "strikes": 0,
                "disqualified": False,
                "hasVoted": has_voted_active,
                "status": "active"
            }
            room["participants"][voter_key] = participant
            room["socketToSession"][socket_id] = voter_key
            return participant

    def remove_participant(self, room_id: str, socket_id: str, force: bool = False) -> dict | None:
        """Removes a participant when their last socket disconnects or when explicitly kicked."""
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                return None

            if "socketToSession" not in room:
                room["socketToSession"] = {}

            voter_key = room["socketToSession"].pop(socket_id, socket_id)
            participant = room["participants"].get(voter_key)

            if participant:
                socket_ids = participant.get("socketIds", set())
                if socket_id in socket_ids:
                    socket_ids.remove(socket_id)

                if force or not socket_ids:
                    room["participants"].pop(voter_key, None)
                    if room.get("currentQuestion"):
                        room["currentQuestion"].get("votes", {}).pop(voter_key, None)
                    room["votes"].pop(voter_key, None)
                    
                    # Clean up any leftover sockets mapped to this voter
                    keys_to_del = [sid for sid, vk in room["socketToSession"].items() if vk == voter_key]
                    for sid in keys_to_del:
                        room["socketToSession"].pop(sid, None)

            return self._calculate_tally_unlocked(room)

    def get_participant(self, room_id: str, identifier: str) -> dict | None:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                return None
            if identifier in room["participants"]:
                return room["participants"][identifier]
            voter_key = room.get("socketToSession", {}).get(identifier)
            if voter_key and voter_key in room["participants"]:
                return room["participants"][voter_key]
            return None

    # -------------------------------------------------------------
    # Multi-Question / Dynamic Round Management
    # -------------------------------------------------------------
    def launch_question(self, room_id: str, question_data: dict) -> dict:
        """Host launches a new question or announcement to all voters in the room."""
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            if room["status"] != "active":
                raise ValueError("Voting session is ended")

            # If there is already an active question, archive it
            if room["currentQuestion"]:
                prev_q = room["currentQuestion"]
                prev_q["status"] = "closed"
                prev_q["closedAt"] = time.time()
                prev_q["finalTally"] = self._calculate_question_tally_unlocked(room, prev_q)
                room["questionHistory"].append(prev_q)

            room["questionCounter"] += 1
            mode = question_data.get("mode", Config.MODE_ASSEMBLY)
            q_type = question_data.get("type", "poll")  # "poll" or "message"
            raw_text = (question_data.get("text") or "").strip()
            
            if not raw_text:
                text = f"{room['questionCounter']}. (No question available)" if q_type == "poll" else f"Announcement #{room['questionCounter']}"
            else:
                # If custom text provided, prefix with question number for clean standard format
                if q_type == "poll" and not raw_text.startswith(f"{room['questionCounter']}."):
                    text = f"{room['questionCounter']}. {raw_text}"
                else:
                    text = raw_text

            new_question = {
                "id": room["questionCounter"],
                "text": text,
                "mode": mode,
                "type": q_type,
                "status": "active",
                "createdAt": time.time(),
                "closedAt": None,
                "votes": {},  # socket_id -> { alias, vote, order, timestamp }
                "voteOrder": 0
            }

            room["currentQuestion"] = new_question
            room["mode"] = mode
            room["title"] = text
            room["votes"] = {}

            # Reset voter voted state for the new round
            for p in room["participants"].values():
                p["hasVoted"] = False

            return self.get_host_state_unlocked(room)

    def close_current_question(self, room_id: str) -> dict:
        """Host manually closes/locks voting on the active question."""
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            if not room["currentQuestion"]:
                raise ValueError("No active question to close")

            room["currentQuestion"]["status"] = "closed"
            room["currentQuestion"]["closedAt"] = time.time()
            final_tally = self._calculate_question_tally_unlocked(room, room["currentQuestion"])
            room["currentQuestion"]["finalTally"] = final_tally

            return {
                "question": room["currentQuestion"],
                "tally": final_tally
            }

    def erase_session_data(self, room_id: str) -> bool:
        """Erase all questions, votes, and history stored temporarily for this room."""
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            
            room["questionCounter"] = 0
            room["currentQuestion"] = None
            room["questionHistory"] = []
            room["votes"] = {}
            for p in room["participants"].values():
                p["hasVoted"] = False
            return True

    def submit_vote(self, room_id: str, socket_id: str, vote_value, session_id: str = None) -> dict:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            if room["status"] != "active":
                raise ValueError("Poll has concluded")

            curr_q = room.get("currentQuestion")
            if not curr_q or curr_q.get("status") != "active":
                raise ValueError("No active question currently open for voting. Please wait for host.")

            if curr_q.get("type") == "message":
                raise ValueError("This is an announcement message, not an active poll.")

            # Resolve participant by session_id or socket_id
            voter_key = str(session_id).strip() if session_id and str(session_id).strip() else room.get("socketToSession", {}).get(socket_id, socket_id)
            participant = room["participants"].get(voter_key)
            if not participant:
                raise ValueError("Participant is not registered in this room")
            if participant.get("disqualified"):
                raise ValueError("Disqualified participants cannot vote")

            mode = curr_q.get("mode", Config.MODE_ASSEMBLY)

            # Validate vote based on mode
            if mode == Config.MODE_ASSEMBLY:
                if vote_value not in Config.ASSEMBLY_OPTIONS and vote_value is not None:
                    raise ValueError(f"Invalid vote option. Choose from: {Config.ASSEMBLY_OPTIONS}")
            elif mode == Config.MODE_RATING:
                if vote_value is not None:
                    try:
                        int_val = int(vote_value)
                        if int_val < Config.RATING_MIN or int_val > Config.RATING_MAX:
                            raise ValueError()
                        vote_value = int_val
                    except:
                        raise ValueError(f"Rating must be an integer between {Config.RATING_MIN} and {Config.RATING_MAX}")

            if vote_value is None:
                # Retract vote
                curr_q["votes"].pop(voter_key, None)
                room["votes"].pop(voter_key, None)
                participant["hasVoted"] = False
                order_num = None
            else:
                existing_vote = curr_q["votes"].get(voter_key)
                if existing_vote:
                    order_num = existing_vote.get("order", curr_q.get("voteOrder", 1))
                else:
                    curr_q["voteOrder"] += 1
                    order_num = curr_q["voteOrder"]

                curr_q["votes"][voter_key] = {
                    "alias": participant["alias"],
                    "vote": vote_value,
                    "order": order_num,
                    "timestamp": time.time()
                }
                room["votes"][voter_key] = vote_value
                participant["hasVoted"] = True

            tally = self._calculate_question_tally_unlocked(room, curr_q)
            return {
                "vote": vote_value,
                "order": order_num,
                "tally": tally,
                "hasVoted": participant["hasVoted"],
                "questionId": curr_q["id"],
                "participant": participant
            }

    def reset_votes(self, room_id: str) -> dict:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            
            if room["currentQuestion"]:
                room["currentQuestion"]["votes"] = {}
                room["currentQuestion"]["voteOrder"] = 0
            room["votes"] = {}
            for p in room["participants"].values():
                p["hasVoted"] = False

            return self._calculate_tally_unlocked(room)

    def set_lock(self, room_id: str, is_locked: bool) -> bool:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            room["isLocked"] = bool(is_locked)
            return room["isLocked"]

    def set_reveal(self, room_id: str, is_revealed: bool) -> bool:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            room["isRevealed"] = bool(is_revealed)
            return room["isRevealed"]

    def update_question(self, room_id: str, question: str) -> str:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            room["title"] = question.strip() if question else "VoteSphere Live Session"
            if room["currentQuestion"]:
                room["currentQuestion"]["text"] = room["title"]
            return room["title"]

    def end_room(self, room_id: str) -> dict:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                raise ValueError("Room not found")
            room["status"] = "ended"
            tally = self._calculate_tally_unlocked(room)
            # Free room ID immediately
            if clean_id in self._rooms:
                del self._rooms[clean_id]
            return tally

    def get_tally(self, room_id: str) -> dict:
        with self._lock:
            clean_id = str(room_id).strip()
            room = self._rooms.get(clean_id)
            if not room:
                return {}
            return self._calculate_tally_unlocked(room)

    def _calculate_question_tally_unlocked(self, room: dict, question: dict) -> dict:
        if not question:
            return {}
        mode = question.get("mode", Config.MODE_ASSEMBLY)
        raw_votes = question.get("votes", {})
        total_participants = len(room["participants"])
        total_votes = len(raw_votes)
        turnout_percentage = round((total_votes / total_participants * 100), 1) if total_participants > 0 else 0

        # Extract values
        vote_values = [v_info["vote"] if isinstance(v_info, dict) else v_info for v_info in raw_votes.values()]

        if mode == Config.MODE_ASSEMBLY:
            counts = {opt: 0 for opt in Config.ASSEMBLY_OPTIONS}
            for v in vote_values:
                if v in counts:
                    counts[v] += 1
            
            percentages = {}
            for opt, cnt in counts.items():
                percentages[opt] = round((cnt / total_votes * 100), 1) if total_votes > 0 else 0

            return {
                "questionId": question.get("id"),
                "questionText": question.get("text"),
                "mode": mode,
                "type": question.get("type", "poll"),
                "counts": counts,
                "percentages": percentages,
                "totalVotes": total_votes,
                "totalParticipants": total_participants,
                "turnout": turnout_percentage,
                "options": Config.ASSEMBLY_OPTIONS
            }

        elif mode == Config.MODE_RATING:
            distribution = {str(i): 0 for i in range(Config.RATING_MIN, Config.RATING_MAX + 1)}
            ratings_list = []
            for v in vote_values:
                key = str(v)
                if key in distribution:
                    distribution[key] += 1
                    try:
                        ratings_list.append(int(v))
                    except:
                        pass

            avg_rating = round(sum(ratings_list) / len(ratings_list), 2) if ratings_list else 0.0
            
            return {
                "questionId": question.get("id"),
                "questionText": question.get("text"),
                "mode": mode,
                "type": question.get("type", "poll"),
                "distribution": distribution,
                "average": avg_rating,
                "totalVotes": total_votes,
                "totalParticipants": total_participants,
                "turnout": turnout_percentage,
                "min": min(ratings_list) if ratings_list else 0,
                "max": max(ratings_list) if ratings_list else 0
            }

        return {
            "questionId": question.get("id"),
            "questionText": question.get("text"),
            "mode": mode,
            "type": question.get("type", "message"),
            "totalVotes": 0,
            "totalParticipants": total_participants
        }

    def _calculate_tally_unlocked(self, room: dict) -> dict:
        if room.get("currentQuestion"):
            return self._calculate_question_tally_unlocked(room, room["currentQuestion"])
        
        # Idle / fallback
        return {
            "mode": room.get("mode", Config.MODE_ASSEMBLY),
            "status": "idle",
            "totalVotes": 0,
            "totalParticipants": len(room.get("participants", {}))
        }

    def get_host_state_unlocked(self, room: dict) -> dict:
        tally = self._calculate_tally_unlocked(room)
        participants_list = [
            {
                "id": p["id"],
                "alias": p["alias"],
                "hasVoted": p["hasVoted"],
                "strikes": p.get("strikes", 0),
                "disqualified": p.get("disqualified", False),
                "status": p.get("status", "active")
            }
            for p in room["participants"].values()
        ]

        curr_q = None
        if room.get("currentQuestion"):
            q = room["currentQuestion"]
            curr_q = {
                "id": q["id"],
                "text": q["text"],
                "mode": q["mode"],
                "type": q.get("type", "poll"),
                "status": q["status"],
                "createdAt": q["createdAt"],
                "totalVotes": len(q.get("votes", {}))
            }

        # Question history summary
        history_summary = []
        for hq in room.get("questionHistory", []):
            history_summary.append({
                "id": hq["id"],
                "text": hq["text"],
                "mode": hq["mode"],
                "type": hq.get("type", "poll"),
                "status": hq["status"],
                "totalVotes": len(hq.get("votes", {})),
                "tally": hq.get("finalTally") or self._calculate_question_tally_unlocked(room, hq)
            })

        now = time.time()
        expires_at = room.get("expiresAt", room["createdAt"] + Config.SESSION_DURATION_SECONDS)
        session_remaining = max(0, int(expires_at - now))

        return {
            "id": room["id"],
            "title": room["title"],
            "mode": room["mode"],
            "passcode": room["passcode"],
            "expiresIn": otp_service.get_remaining_seconds(room),
            "isLocked": room["isLocked"],
            "isRevealed": room["isRevealed"],
            "status": room["status"],
            "anonymous": room["anonymous"],
            "currentQuestion": curr_q,
            "questionCounter": room.get("questionCounter", 0),
            "questionHistory": history_summary,
            "tally": tally,
            "participants": participants_list,
            "participantCount": len(participants_list),
            "createdAt": room["createdAt"],
            "expiresAt": expires_at,
            "sessionDuration": Config.SESSION_DURATION_SECONDS,
            "sessionRemainingSeconds": session_remaining,
            "otpDuration": Config.OTP_ROTATION_SECONDS
        }

    def get_host_state(self, room_id: str) -> dict | None:
        with self._lock:
            room = self._rooms.get(str(room_id).strip())
            if not room:
                return None
            return self.get_host_state_unlocked(room)

    def get_voter_state(self, room_id: str, socket_id: str, session_id: str = None) -> dict | None:
        with self._lock:
            room = self._rooms.get(str(room_id).strip())
            if not room:
                return None
            voter_key = str(session_id).strip() if session_id and str(session_id).strip() else room.get("socketToSession", {}).get(socket_id, socket_id)
            participant = room["participants"].get(voter_key)
            
            curr_q = room.get("currentQuestion")
            user_vote = None
            has_voted = False

            if curr_q:
                vote_info = curr_q.get("votes", {}).get(voter_key)
                if vote_info:
                    user_vote = vote_info["vote"] if isinstance(vote_info, dict) else vote_info
                    has_voted = True

            curr_q_data = None
            if curr_q:
                curr_q_data = {
                    "id": curr_q["id"],
                    "text": curr_q["text"],
                    "mode": curr_q["mode"],
                    "type": curr_q.get("type", "poll"),
                    "status": curr_q["status"],
                    "createdAt": curr_q["createdAt"]
                }

            tally = self._calculate_tally_unlocked(room) if room["isRevealed"] else None
            now = time.time()
            expires_at = room.get("expiresAt", room["createdAt"] + Config.SESSION_DURATION_SECONDS)
            session_remaining = max(0, int(expires_at - now))
            
            return {
                "roomId": room["id"],
                "title": room["title"],
                "mode": curr_q["mode"] if curr_q else room["mode"],
                "isLocked": room["isLocked"],
                "isRevealed": room["isRevealed"],
                "status": room["status"],
                "currentQuestion": curr_q_data,
                "hasVoted": has_voted,
                "myVote": user_vote,
                "strikes": participant.get("strikes", 0) if participant else 0,
                "disqualified": participant.get("disqualified", False) if participant else False,
                "alias": participant.get("alias") if participant else None,
                "tally": tally,
                "createdAt": room["createdAt"],
                "expiresAt": expires_at,
                "sessionDuration": Config.SESSION_DURATION_SECONDS,
                "sessionRemainingSeconds": session_remaining,
                "otpDuration": Config.OTP_ROTATION_SECONDS
            }

    def generate_csv_report(self, room_id: str) -> str:
        """Comprehensive CSV report including all questions, sequential voter orders, and matrix view."""
        with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                raise ValueError("Room not found")

            # Collect all questions (archived + current active if any)
            all_questions = list(room.get("questionHistory", []))
            if room.get("currentQuestion"):
                all_questions.append(room["currentQuestion"])

            now_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            created_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(room['createdAt']))

            lines = [
                "================================================================================",
                "VOTESPHERE COMPREHENSIVE SESSION REPORT",
                "================================================================================",
                f"Room ID,{room['id']}",
                f"Session Title,\"{room['title']}\"",
                f"Generated At,{now_str}",
                f"Created At,{created_str}",
                f"Total Registered Voters,{len(room['participants'])}",
                f"Total Questions/Rounds Asked,{len(all_questions)}",
                ""
            ]

            # ---------------------------------------------------------
            # SECTION 1: Question-by-Question Summary Breakdown
            # ---------------------------------------------------------
            lines.append("--------------------------------------------------------------------------------")
            lines.append("SECTION 1: QUESTION-BY-QUESTION SUMMARY & TALLIES")
            lines.append("--------------------------------------------------------------------------------")
            lines.append("Round #,Type,Mode,Question Prompt / Message,Total Votes,Result Summary")

            for q in all_questions:
                q_id = q.get("id")
                q_type = q.get("type", "poll")
                q_mode = q.get("mode", "assembly")
                q_text = q.get("text", "").replace('"', '""')
                votes_map = q.get("votes", {})
                t_votes = len(votes_map)

                if q_type == "message":
                    summary = "Announcement Broadcast"
                elif q_mode == Config.MODE_ASSEMBLY:
                    tally = self._calculate_question_tally_unlocked(room, q)
                    counts = tally.get("counts", {})
                    summary = f"Yes: {counts.get('Yes', 0)} | No: {counts.get('No', 0)} | Maybe: {counts.get('Maybe', 0)} | NOTA: {counts.get('NOTA', 0)}"
                elif q_mode == Config.MODE_RATING:
                    tally = self._calculate_question_tally_unlocked(room, q)
                    summary = f"Average: {tally.get('average', 0)}/10 (Range: {tally.get('min', 0)}-{tally.get('max', 0)})"
                else:
                    summary = "N/A"

                lines.append(f"Q#{q_id},{q_type},{q_mode},\"{q_text}\",{t_votes},\"{summary}\"")

            lines.append("")

            # ---------------------------------------------------------
            # SECTION 2: Chronological / Sequential Votes Log
            # ---------------------------------------------------------
            lines.append("--------------------------------------------------------------------------------")
            lines.append("SECTION 2: SEQUENTIAL VOTING RESPONSES LOG (ORDER-WISE)")
            lines.append("--------------------------------------------------------------------------------")
            lines.append("Round #,Vote Order #,Voter Alias,Response / Rating,Timestamp")

            has_any_votes = False
            for q in all_questions:
                q_id = q.get("id")
                votes_list = []
                for s_id, v_info in q.get("votes", {}).items():
                    if isinstance(v_info, dict):
                        votes_list.append(v_info)
                    else:
                        alias = room["participants"].get(s_id, {}).get("alias", f"Voter ({s_id[:4]})")
                        votes_list.append({"alias": alias, "vote": v_info, "order": 1, "timestamp": q.get("createdAt", time.time())})

                # Sort by order of vote submission
                votes_list.sort(key=lambda x: x.get("order", 0))

                for item in votes_list:
                    has_any_votes = True
                    t_str = time.strftime('%H:%M:%S', time.localtime(item.get("timestamp", time.time())))
                    lines.append(f"Q#{q_id},{item.get('order', '-')},{item.get('alias', 'Unknown')},{item.get('vote', '')},{t_str}")

            if not has_any_votes:
                lines.append("No votes recorded yet.")

            lines.append("")

            # ---------------------------------------------------------
            # SECTION 3: Voter Summary Matrix (Voter x Question)
            # ---------------------------------------------------------
            lines.append("--------------------------------------------------------------------------------")
            lines.append("SECTION 3: VOTER PARTICIPATION MATRIX")
            lines.append("--------------------------------------------------------------------------------")

            q_headers = [f"Q#{q.get('id')} ({q.get('text', '')[:20]})" for q in all_questions]
            matrix_header = ["Voter Alias", "Status", "Strikes"] + q_headers
            lines.append(",".join(f"\"{h}\"" for h in matrix_header))

            for p in room["participants"].values():
                s_id = p["id"]
                p_alias = p["alias"]
                p_status = "Disqualified" if p.get("disqualified") else "Active"
                p_strikes = p.get("strikes", 0)

                row = [p_alias, p_status, str(p_strikes)]
                for q in all_questions:
                    v_info = q.get("votes", {}).get(s_id)
                    if v_info is not None:
                        val = v_info["vote"] if isinstance(v_info, dict) else v_info
                        row.append(str(val))
                    else:
                        row.append("Did not vote")
                lines.append(",".join(f"\"{col}\"" for col in row))

            return "\n".join(lines)

room_service = RoomService()
