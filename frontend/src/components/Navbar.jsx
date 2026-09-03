import React, { useState, useEffect } from 'react';

export default function Navbar({
  currentView = 'landing', // 'landing' | 'host' | 'voter'
  landingTab = 'join',     // 'join' | 'create'
  onTabChange,
  onExitRoom,
  sessionTimeRemaining = null,
  sessionDurationSec = 3600
}) {
  const [localFallbackSeconds, setLocalFallbackSeconds] = useState(sessionDurationSec);

  // Fallback timer only if server time is not available
  useEffect(() => {
    if (currentView === 'landing' || sessionTimeRemaining !== null) return;

    const timer = setInterval(() => {
      setLocalFallbackSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentView, sessionTimeRemaining]);

  const activeSeconds = sessionTimeRemaining !== null && typeof sessionTimeRemaining === 'number'
    ? sessionTimeRemaining
    : localFallbackSeconds;

  // Auto-redirect to home (/) when session time is completed
  useEffect(() => {
    if (currentView === 'landing') return;
    if (activeSeconds !== null && activeSeconds <= 0) {
      if (onExitRoom) {
        onExitRoom();
      }
    }
  }, [activeSeconds, currentView, onExitRoom]);

  // 0% - 70% elapsed: Green | 71% - 90% elapsed: Yellow | Last 10% (91%-100%): Red
  const elapsedRatio = sessionDurationSec > 0 
    ? Math.max(0, Math.min(1, (sessionDurationSec - activeSeconds) / sessionDurationSec))
    : 0;
  const elapsedPct = elapsedRatio * 100;

  let timerStageClass = 'timer-stage-green';
  if (elapsedPct > 90) {
    timerStageClass = 'timer-stage-red';
  } else if (elapsedPct > 70) {
    timerStageClass = 'timer-stage-yellow';
  }

  const formatTimer = (totalSec) => {
    const validSec = Math.max(0, Number(totalSec) || 0);
    const mins = Math.floor(validSec / 60);
    const secs = validSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Left: Logo with icon */}
        <div 
          className="logo-container" 
          onClick={currentView !== 'landing' ? onExitRoom : undefined} 
          title="VoteSphere Home"
          style={{ cursor: 'pointer' }}
        >
          <div className="logo-icon-wrap">
            <svg className="logo-svg" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="url(#logo-grad)" strokeWidth="2.5" />
              <path d="M10 16.5L14 20.5L22 11.5" stroke="url(#logo-grad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-grad" x1="2" y1="2" x2="30" y2="30">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="logo-text">
            <h1>VoteSphere</h1>
            <span className="tagline">Ultra-Secure Real-Time Platform</span>
          </div>
        </div>

        {/* Right: Navbar action buttons (Create Room & Join Room on Landing) */}
        {currentView === 'landing' ? (
          <nav className="navbar-tabs" id="landingNavbarTabs">
            <button 
              type="button" 
              className={`nav-tab-btn ${landingTab === 'create' ? 'active' : ''}`}
              onClick={() => onTabChange && onTabChange('create')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span className="tab-label-full">Create Room</span>
              <span className="tab-label-short">Create</span>
            </button>

            <button 
              type="button" 
              className={`nav-tab-btn ${landingTab === 'join' ? 'active' : ''}`}
              onClick={() => onTabChange && onTabChange('join')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className="tab-label-full">Join Room</span>
              <span className="tab-label-short">Join</span>
            </button>
          </nav>
        ) : (
          <div className="nav-session-actions">
            <div className={`nav-session-timer-pill ${timerStageClass}`} title="Session Countdown Timer">
              <span>⏱️</span>
              <span>{formatTimer(activeSeconds)}</span>
            </div>
            <button type="button" className="nav-exit-btn" onClick={onExitRoom}>
              <span>🚪 Exit Room</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
