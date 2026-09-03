# VoteSphere 🗳️⚡
### Secure Local Real-Time Voting & Rating Platform (React + Python Flask)

A modern, high-performance, real-time voting and rating web platform built for local classrooms, assemblies, and team sessions with **React (Vite)** on the frontend and **Python Flask + Flask-SocketIO** on the backend.

---

## 🏗️ Project Architecture & Directory Structure

```
Local Voting System/
├── backend/                         # 🐍 Python Flask Backend
│   ├── services/
│   │   ├── otp_service.py          # 15s rotating dynamic passcode (TOTP) engine
│   │   ├── proctoring_service.py   # 3-Strike tab anti-cheat guard & penalty evaluator
│   │   └── room_service.py         # Thread-safe in-memory room store, tally math & CSV exporter
│   ├── sockets/
│   │   └── events.py               # Real-time WebSocket event orchestration & background ticker
│   ├── config.py                   # Central environment configuration & constants
│   ├── app.py                      # Flask factory with REST API & SPA static hosting
│   ├── run.py                      # Entry point for backend server (Port 5000)
│   └── requirements.txt            # Python dependencies (Flask, Flask-SocketIO, etc.)
│
├── frontend/                        # ⚛️ React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Top navigation & real-time connection status
│   │   │   ├── OtpBadge.jsx        # Animated 15s rotating passcode countdown ring
│   │   │   ├── QrModal.jsx         # Big-screen high-res QR Code modal
│   │   │   ├── StrikeModal.jsx     # Anti-cheat warning modal with haptic vibration
│   │   │   ├── AssemblyVoteCards.jsx # Glowing tactile cards (Yes/No/Maybe/NOTA)
│   │   │   ├── RatingVoteScale.jsx # 1-to-10 interactive rating spectrum & buttons
│   │   │   ├── ResultsView.jsx     # Live animated bar charts & average score metrics
│   │   │   ├── HostControls.jsx    # Session management toolbar
│   │   │   └── VoterRoster.jsx     # Real-time participant list with strike indicators
│   │   ├── views/
│   │   │   ├── LandingView.jsx     # Instant room creation & quick join PIN-pad
│   │   │   ├── HostView.jsx        # Big-screen projector-optimized command center
│   │   │   └── VoterView.jsx       # Mobile-first voter interface with anti-cheat listeners
│   │   ├── services/
│   │   │   └── socket.js           # Socket.IO client instance
│   │   ├── App.jsx                 # Master view orchestrator & socket state manager
│   │   ├── main.jsx                # React root mount
│   │   └── index.css               # Glassmorphic dark design system
│   ├── package.json
│   └── vite.config.js
│
├── package.json                    # Root workspace scripts
└── README.md                       # Documentation & setup guide
```

---

## 🌟 Key Features

1. **4-Digit Instant Room Code**:
   - Zero registration. Instant 1-click room creation.

2. **15-Second Dynamic Rotating Passcode (Google Authenticator TOTP Style)**:
   - Host screen displays an active **4-digit Passcode (PIN)** that automatically rotates every **15 seconds** with an animated countdown ring.
   - Prevents code leaks or sharing outside the room.

3. **Anti-Cheat & Proctoring Guard (3-Strikes Rule with Haptic Vibration)**:
   - Real-time tab-switching and window-blur detection (`visibilitychange`, `blur`).
   - Leaving the voting tab triggers an urgent **haptic vibration warning** on the voter's device with a strike counter.
   - Reaching **3 strikes** results in immediate disqualification.

4. **Dual Modes**:
   - 🗳️ **Voting (Assembly)**: 4 tactile glowing cards: **YES**, **NO**, **MAYBE**, **NOTA**.
   - ⭐ **Rating Scale**: 1 to 10 glowing interactive spectrum with live average calculations.

5. **Big-Screen & Projector Ready Host Dashboard**:
   - Real-time animated tally percentage bars.
   - Instant QR Code modal for mobile camera scanning.
   - Anonymous voter roster (`Voter #1`, `Voter #2`, ...) with strike tracking.
   - Confetti victory burst on poll conclusion.
   - One-click CSV report export.

---

## 🚀 How to Run Locally

### 1. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Start the Application

#### Option A: Run Full Stack via Flask (Serves Built React App)
```bash
npm run build:frontend
python backend/run.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

#### Option B: Run in Hot-Reload Development Mode
In Terminal 1 (Backend):
```bash
python backend/run.py
```
In Terminal 2 (Frontend with Vite Hot Reload):
```bash
npm run dev:frontend
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Connect from Mobile Devices (Same Wi-Fi)
Open `http://<YOUR_LOCAL_IP>:5000` (or `:5173`) on any smartphone or tablet connected to your local network.
