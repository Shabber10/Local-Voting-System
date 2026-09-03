import os
import sys

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app
from config import Config

app, socketio = create_app()

if __name__ == "__main__":
    port = Config.PORT
    print("=" * 60)
    print(" VoteSphere Python Flask Backend Server Starting...")
    print(f" Web & API Server URL: http://localhost:{port}")
    print("=" * 60)
    socketio.run(app, host="0.0.0.0", port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
