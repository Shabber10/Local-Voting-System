import os
import sys

# Ensure backend root and libs directory are on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

libs_dir = os.path.join(backend_dir, "libs")
if os.path.isdir(libs_dir) and libs_dir not in sys.path:
    sys.path.insert(0, libs_dir)

# Ensure user site-packages are on sys.path (Render installs pip to ~/.local)
import site
user_site = site.getusersitepackages() if hasattr(site, 'getusersitepackages') else None
for p in [
    user_site,
    "/opt/render/.local/lib/python3.11/site-packages",
    "/root/.local/lib/python3.11/site-packages",
    os.path.expanduser("~/.local/lib/python3.11/site-packages"),
    os.path.expanduser("~/.local/lib/python3.10/site-packages"),
    os.path.expanduser("~/.local/lib/python3.12/site-packages")
]:
    if p and os.path.isdir(p) and p not in sys.path:
        sys.path.insert(0, p)

import datetime
from flask import Flask, jsonify, Response, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO

from config import Config
from services.room_service import room_service
from sockets.events import register_socket_events

# Alias backend.services to services for single module instance
if "services.room_service" in sys.modules and "backend.services.room_service" not in sys.modules:
    sys.modules["backend.services.room_service"] = sys.modules["services.room_service"]
elif "backend.services.room_service" in sys.modules and "services.room_service" not in sys.modules:
    sys.modules["services.room_service"] = sys.modules["backend.services.room_service"]

def create_app():
    frontend_dist_dir = os.path.abspath(os.path.join(backend_dir, "..", "frontend", "dist"))
    
    app = Flask(__name__, static_folder=frontend_dist_dir, static_url_path="")
    app.config["SECRET_KEY"] = Config.SECRET_KEY

    # Setup CORS
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Setup SocketIO
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        ping_timeout=20,
        ping_interval=10
    )

    # Register modular socket events
    register_socket_events(socketio)

    # REST Endpoints
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "ok",
            "service": "VoteSphere Backend (Flask)",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    @app.route("/api/rooms/reset", methods=["POST", "GET"])
    def reset_all_rooms():
        room_service.clear_all_rooms()
        return jsonify({
            "success": True,
            "message": "All rooms have been cleared and refreshed."
        })

    @app.route("/api/room-check/<room_id>", methods=["GET"])
    def check_room_avail(room_id):
        is_avail = room_service.is_room_available(room_id)
        return jsonify({
            "roomId": room_id,
            "available": is_avail
        })

    @app.route("/api/room/<room_id>", methods=["GET"])
    def get_room_info(room_id):
        room = room_service.get_room(room_id)
        if not room:
            return jsonify({"error": "Room not found"}), 404
        return jsonify({
            "id": room["id"],
            "title": room["title"],
            "mode": room["mode"],
            "isLocked": room["isLocked"],
            "status": room["status"]
        })

    @app.route("/api/room/<room_id>/export", methods=["GET"])
    def export_csv(room_id):
        try:
            csv_content = room_service.generate_csv_report(room_id)
            return Response(
                csv_content,
                mimetype="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f"attachment; filename=votesphere_room_{room_id}_report.csv"
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # Serve React Frontend in production
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path != "" and os.path.exists(os.path.join(frontend_dist_dir, path)):
            return send_from_directory(frontend_dist_dir, path)
        elif os.path.exists(os.path.join(frontend_dist_dir, "index.html")):
            return send_from_directory(frontend_dist_dir, "index.html")
        else:
            return jsonify({
                "message": "VoteSphere Flask API running. Start frontend with npm run dev inside frontend/"
            })

    return app, socketio
