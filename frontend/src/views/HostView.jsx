import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';

export default function HostView({
  room,
  onLaunchQuestion,
  onCloseQuestion,
  onEraseSessionData,
  onToggleLock,
  onToggleReveal,
  onResetVotes,
  onUpdateTitle,
  onEndPoll,
  onKickParticipant,
  onLeave
}) {
  const [activeMode, setActiveMode] = useState(room.mode || 'assembly');
  const [questionType, setQuestionType] = useState('poll'); // 'poll' | 'message'
  const [questionInput, setQuestionInput] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isVoterModalOpen, setIsVoterModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'

  useEffect(() => {
    if (room.currentQuestion?.mode) {
      setActiveMode(room.currentQuestion.mode);
    } else if (room.mode) {
      setActiveMode(room.mode);
    }
  }, [room.currentQuestion?.mode, room.mode]);

  // Confetti on poll conclusion
  useEffect(() => {
    if (room.status === 'ended') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [room.status]);

  const handleLaunch = (e) => {
    e.preventDefault();
    const promptText = questionInput.trim();
    onLaunchQuestion({
      text: promptText,
      mode: activeMode,
      type: questionType
    });
    setQuestionInput('');
  };

  const handleExportCsv = () => {
    window.open(`/api/room/${room.id}/export`, '_blank');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${room.id}&pin=${room.passcode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentQ = room.currentQuestion;
  const tally = room.tally || {};
  const participants = room.participants || [];
  const totalParticipants = participants.length;
  const votedCount = participants.filter((p) => p.hasVoted).length;
  const nextQuestionNumber = (room.questionCounter || 0) + 1;
  const questionHistory = room.questionHistory || [];

  // TOTP Progress Ring calculation
  const maxDuration = 20;
  const isRoomLocked = Boolean(room.isLocked);
  const expiresIn = isRoomLocked
    ? 0
    : (typeof room.expiresIn === 'number' ? Math.max(0, room.expiresIn) : 20);
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = isRoomLocked
    ? circumference
    : circumference - (expiresIn / maxDuration) * circumference;

  return (
    <>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <Navbar
        currentView="host"
        onExitRoom={onLeave}
        sessionTimeRemaining={room.sessionRemainingSeconds}
      />

      <main className="main-content">
        <div className="host-desktop-layout">
          {/* Left Column: Dynamic Question Composer & Live Results */}
          <div className="host-left-col">

            {/* 1. DYNAMIC QUESTION LAUNCHER CARD */}
            <div className="glass-card poll-control-card" style={{ marginBottom: '20px' }}>
              <div className="card-header launcher-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 900 }}>
                      {currentQ ? `⚡ Current Question #${currentQ.id}` : `🚀 Launch Question #${nextQuestionNumber}`}
                    </h3>
                    {currentQ && (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: currentQ.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: currentQ.status === 'active' ? '1.5px solid rgba(34, 197, 94, 0.5)' : '1.5px solid rgba(239, 68, 68, 0.5)',
                        color: currentQ.status === 'active' ? '#4ade80' : '#f87171',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap'
                      }}>
                        {currentQ.status === 'active' ? '🟢 LIVE' : '🔒 CLOSED'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    {currentQ
                      ? 'Voters are currently viewing this prompt on their devices'
                      : 'Compose and broadcast question to all voters'}
                  </p>
                </div>

                {/* Segmented Mode Selector Tabs right beside title */}
                <div className="host-mode-toggle-bar" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`host-mode-toggle-btn mode-vote ${activeMode === 'assembly' ? 'active' : ''}`}
                    onClick={() => { setQuestionType('poll'); setActiveMode('assembly'); }}
                  >
                    <span className="mode-btn-icon">🗳️</span>
                    <span className="mode-btn-text">Voting</span>
                  </button>
                  <button
                    type="button"
                    className={`host-mode-toggle-btn mode-rating ${activeMode === 'rating' ? 'active' : ''}`}
                    onClick={() => { setQuestionType('poll'); setActiveMode('rating'); }}
                  >
                    <span className="mode-btn-icon">⭐</span>
                    <span className="mode-btn-text">Rating (1-10)</span>
                  </button>
                </div>
              </div>


              {/* Question Launcher Form */}
              <form onSubmit={handleLaunch}>
                <div className="host-question-input-row" style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    rows={2}
                    className="host-question-input-field host-question-textarea"
                    placeholder={`Enter Question #${currentQ ? nextQuestionNumber : 1} prompt (e.g. Do you agree with the budget?)...`}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleLaunch(e);
                      }
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-glow" style={{ whiteSpace: 'nowrap' }}>
                    <span>
                      {currentQ
                        ? `🚀 Launch Q#${nextQuestionNumber}`
                        : '🚀 Launch Question #1'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Turnout Pill */}
              <div className="tally-status-row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="voted-ratio-pill">
                  <span className="pulse-dot"></span>
                  <span>Turnout for Current Question: <strong id="votedCountDisplay">{votedCount}</strong> / <span id="totalParticipantsDisplay">{totalParticipants}</span></span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Questions Asked: <strong>{room.questionCounter || 0}</strong>
                </div>
              </div>
            </div>

            {/* 2. LIVE RESULTS & TALLIES */}
            {currentQ?.type === 'message' ? (
              <div className="glass-card tally-card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📢</div>
                <h3>Active Announcement Broadcast</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  "{currentQ.text}" is currently displayed on all connected voter screens.
                </p>
              </div>
            ) : !currentQ ? (
              <div className="glass-card tally-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⏸️</div>
                <h3 style={{ color: '#fff' }}>No Active Question Open</h3>
                <p style={{ maxWidth: 380, margin: '8px auto 0 auto', fontSize: '0.9rem' }}>
                  Connected voters are waiting in the standby booth. Type a question above and click <strong>Launch</strong> to begin.
                </p>
              </div>
            ) : (
              <>
                {/* Combined Active Question Header & Live Distribution in a Single Card */}
                <div id="hostLiveResultsCard" className="glass-card tally-card">
                  <div className="active-q-header" style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(45, 212, 191, 0.2)' }}>
                    <div className="active-q-info">
                      <span className="active-q-tag">
                        {`🗳️ Question #${currentQ.id} (${currentQ.mode === 'assembly' ? 'VOTE' : currentQ.mode === 'rating' ? 'RATING (1-10)' : currentQ.mode.toUpperCase()})`}
                      </span>
                      <h2 className="active-q-title">
                        {currentQ.text}
                      </h2>
                    </div>

                    <div className="active-q-actions">
                      {currentQ.status === 'active' && (
                        <button
                          type="button"
                          className="btn-round-action btn-close-round"
                          onClick={onCloseQuestion}
                          title="Close Voting for this question"
                        >
                          <span>🔒 Close Round</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-round-action btn-reset-round"
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Reset Question Votes?',
                            message: `Are you sure you want to reset all participant votes to zero for Question #${currentQ.id}?`,
                            icon: '🔄',
                            confirmLabel: 'OK, Reset',
                            confirmType: 'primary',
                            onConfirm: () => {
                              onResetVotes();
                              setConfirmDialog(null);
                            }
                          });
                        }}
                        title="Reset votes for this question"
                      >
                        <span>🔄 Reset Votes</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Assembly Tally or Rating Tally Content */}
                  {activeMode === 'assembly' ? (
                    <div id="hostAssemblyTally" className="tally-section">
                      <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0' }}>Live Vote Distribution</h3>

                      <div className="tally-bars-list" style={{ marginTop: '10px' }}>
                        {/* Yes Bar */}
                        <div className="tally-row">
                          <div className="tally-info">
                            <span className="tally-label label-yes">👍 YES</span>
                            <span className="tally-count" id="countYes">
                              {tally.counts?.Yes || 0} votes ({tally.percentages?.Yes || 0}%)
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill fill-yes"
                              style={{ width: `${tally.percentages?.Yes || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* No Bar */}
                        <div className="tally-row">
                          <div className="tally-info">
                            <span className="tally-label label-no">👎 NO</span>
                            <span className="tally-count" id="countNo">
                              {tally.counts?.No || 0} votes ({tally.percentages?.No || 0}%)
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill fill-no"
                              style={{ width: `${tally.percentages?.No || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Maybe Bar */}
                        <div className="tally-row">
                          <div className="tally-info">
                            <span className="tally-label label-maybe">🤔 MAYBE</span>
                            <span className="tally-count" id="countMaybe">
                              {tally.counts?.Maybe || 0} votes ({tally.percentages?.Maybe || 0}%)
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill fill-maybe"
                              style={{ width: `${tally.percentages?.Maybe || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* NOTA Bar */}
                        <div className="tally-row">
                          <div className="tally-info">
                            <span className="tally-label label-nota">🚫 NOTA</span>
                            <span className="tally-count" id="countNota">
                              {tally.counts?.NOTA || 0} votes ({tally.percentages?.NOTA || 0}%)
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill fill-nota"
                              style={{ width: `${tally.percentages?.NOTA || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Live Rating Scale Tally Content */
                    <div id="hostRatingTally" className="tally-section">
                      <div className="tally-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Live 1–10 Rating Distribution</h3>
                        <div className="rating-avg-card" style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Score: </span>
                          <strong className="avg-score-huge" id="hostRatingAvgDisplay">{tally.average || '0.0'}</strong>
                          <small style={{ color: 'var(--text-muted)' }}> / 10</small>
                        </div>
                      </div>

                      <div className="rating-histogram-grid" id="ratingHistogramGrid" style={{ marginTop: '12px' }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                          const count = tally.distribution ? (tally.distribution[String(score)] || 0) : 0;
                          const maxVal = Math.max(1, ...Object.values(tally.distribution || {}));
                          const heightPct = (count / maxVal) * 100;

                          return (
                            <div key={score} className="histogram-col">
                              <span className="hist-count">{count}</span>
                              <div className="hist-bar-track">
                                <div
                                  className="hist-bar-fill"
                                  style={{ height: `${heightPct}%`, minHeight: count > 0 ? 4 : 0 }}
                                />
                              </div>
                              <span className="hist-label">{score}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Host Control & Credentials Panel */}
          <div className="host-topbar glass-card">
            <div className="room-credentials-panel">
              {/* 4-Digit Room Code */}
              <div className="credential-box">
                <span className="cred-label">ROOM CODE</span>
                <div className="cred-value" id="hostRoomCodeDisplay">#{room.id}</div>
              </div>

              {/* Dynamic Rotating Passcode */}
              <div className={`credential-box totp-box ${isRoomLocked ? 'totp-box-locked' : ''}`}>
                <span className="cred-label">{isRoomLocked ? 'ROOM LOCKED' : '20s PASSCODE'}</span>
                <div className="totp-body">
                  <div
                    className={`cred-value pin-highlight ${isRoomLocked ? 'pin-highlight-locked' : ''}`}
                    id="hostPasscodeDisplay"
                    style={{
                      whiteSpace: 'nowrap',
                      letterSpacing: isRoomLocked ? '3px' : '2px',
                      opacity: isRoomLocked ? 0.85 : 1
                    }}
                  >
                    {isRoomLocked ? '----' : (room.passcode || '----')}
                  </div>
                  {/* Circular Countdown Timer */}
                  <div className="timer-ring-container">
                    <svg className="timer-svg" width="42" height="42" viewBox="0 0 42 42">
                      <circle
                        className="timer-circle-bg"
                        cx="21"
                        cy="21"
                        r="17"
                        style={isRoomLocked ? { stroke: 'rgba(255, 255, 255, 0.08)' } : {}}
                      />
                      <circle
                        className="timer-circle-progress"
                        id="timerProgressCircle"
                        cx="21"
                        cy="21"
                        r="17"
                        style={{
                          strokeDasharray: `${circumference} ${circumference}`,
                          strokeDashoffset: progressOffset,
                          transition: isRoomLocked ? 'none' : 'stroke-dashoffset 0.9s linear',
                          stroke: isRoomLocked ? 'rgba(239, 68, 68, 0.4)' : undefined,
                          opacity: isRoomLocked ? 0.25 : 1
                        }}
                      />
                    </svg>
                    <span
                      className="timer-seconds"
                      id="totpRemainingSec"
                      style={isRoomLocked ? { color: '#f87171', fontSize: '1.2rem', fontWeight: 900 } : {}}
                    >
                      {isRoomLocked ? '-' : `${expiresIn}s`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Actions */}
            <div className="host-actions-grid">
              {/* Row 2: lock room | Show QR | Voters (count) */}
              <button
                type="button"
                className={`btn btn-sm host-action-btn ${room.isLocked ? 'btn-host-locked' : 'btn-host-lock'}`}
                onClick={() => onToggleLock(!room.isLocked)}
                title="Lock or Unlock Room"
              >
                <span className="host-btn-icon">{room.isLocked ? '🔒' : '🔓'}</span>
                <span>{room.isLocked ? 'Room Locked' : 'Lock Room'}</span>
              </button>

              <button
                type="button"
                className="btn btn-sm host-action-btn btn-host-qr"
                onClick={() => setIsQrModalOpen(true)}
                title="Show QR Code and Direct Join Link"
              >
                <span className="host-btn-icon">📱</span>
                <span>Show QR Code</span>
              </button>

              <button
                type="button"
                className="btn btn-sm host-action-btn btn-host-voters btn-voters-action"
                onClick={() => setIsVoterModalOpen(true)}
                title="View Connected Voters Roster"
              >
                <span className="host-btn-icon host-voters-icon">👥</span>
                <span>Voters</span>
                <span className="btn-badge-counter">{totalParticipants}</span>
              </button>

              {/* Row 3: Export CSV | History (count) | Erase Data */}
              <button
                type="button"
                className="btn btn-sm host-action-btn btn-host-export"
                onClick={handleExportCsv}
                title="Export complete session history to CSV"
              >
                <span className="host-btn-icon">📥</span>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                className="btn btn-sm host-action-btn btn-host-history"
                onClick={() => setIsHistoryModalOpen(true)}
                title="View Completed Rounds History"
              >
                <span className="host-btn-icon">📜</span>
                <span>History ({questionHistory.length})</span>
              </button>

              <button
                type="button"
                className="btn btn-sm host-action-btn btn-host-erase"
                onClick={() => {
                  setConfirmDialog({
                    title: 'Erase Session Data?',
                    message: 'Are you sure you want to erase all temporary session data and question history? This action cannot be undone.',
                    icon: '🗑️',
                    confirmLabel: 'OK, Erase',
                    confirmType: 'danger',
                    onConfirm: () => {
                      onEraseSessionData();
                      setConfirmDialog(null);
                    }
                  });
                }}
                title="Erase all temporary session data"
              >
                <span className="host-btn-icon">🗑️</span>
                <span>Erase Data</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      <div className={`modal-backdrop ${isQrModalOpen ? 'open' : ''}`} id="qrModalBackdrop">
        <div className="modal-dialog glass-card">
          <button type="button" className="modal-close-btn" onClick={() => setIsQrModalOpen(false)}>
            ✕
          </button>
          <h3>Scan to Join Room</h3>
          <p className="modal-sub" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Fast join with live credentials
          </p>

          <div className="qr-box-wrapper">
            <QRCodeSVG
              value={`${window.location.origin}/?room=${room.id}&pin=${room.passcode}`}
              size={200}
              level="H"
            />
          </div>

          <div className="qr-details-box">
            <div className="qr-detail-row">
              <span>Room Code:</span>
              <strong className="text-glow-cyan">#{room.id}</strong>
            </div>
            <div className="qr-detail-row">
              <span>Current Passcode:</span>
              <strong className="text-glow-yellow">{room.passcode}</strong>
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-block" onClick={handleCopyLink}>
            <span>{copiedLink ? '✓ Link Copied!' : '🔗 Copy Direct Join Link'}</span>
          </button>
        </div>
      </div>

      {/* Voter Roster Modal Popup */}
      <div className={`modal-backdrop ${isVoterModalOpen ? 'open' : ''}`} id="voterRosterModalBackdrop">
        <div className="modal-dialog glass-card" style={{ maxWidth: 520, textAlign: 'left' }}>
          <button type="button" className="modal-close-btn" onClick={() => setIsVoterModalOpen(false)}>
            ✕
          </button>

          <div className="popup-modal-header">
            <div className="popup-header-icon-box">
              <span>👥</span>
            </div>
            <div className="popup-header-info">
              <div className="popup-header-title-row">
                <h3>Connected Voters</h3>
                <span className="popup-badge-pill">{totalParticipants} Active</span>
              </div>
              <p className="popup-header-desc">
                Live participant roster for Room #{room.id}
              </p>
            </div>
          </div>

          <div className="roster-list-container" style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {participants.length === 0 ? (
              <div className="empty-roster-msg" style={{ textAlign: 'center', padding: '36px 10px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>⏳</div>
                <p>Waiting for voters to enter Room <strong style={{ color: 'var(--accent-cyan)' }}>#{room.id}</strong>...</p>
              </div>
            ) : (
              participants.map((p) => (
                <div key={p.id} className="popup-voter-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="popup-voter-avatar">
                      <span>👤</span>
                    </div>
                    <div>
                      <div className="popup-voter-name">{p.alias || 'Voter'}</div>
                      <div className="popup-voter-id">ID: {p.id.slice(0, 10)}...</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`roster-status-badge ${p.hasVoted ? 'status-voted' : 'status-waiting'}`}>
                      {p.hasVoted ? '✓ Voted' : '⏳ Waiting'}
                    </span>
                    {onKickParticipant && (
                      <button
                        type="button"
                        className="popup-btn-kick"
                        onClick={() => onKickParticipant(p.id)}
                        title="Remove voter from session"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completed Rounds History Modal Popup */}
      <div className={`modal-backdrop ${isHistoryModalOpen ? 'open' : ''}`} id="historyModalBackdrop">
        <div className="modal-dialog glass-card" style={{ maxWidth: 560, textAlign: 'left' }}>
          <button type="button" className="modal-close-btn" onClick={() => setIsHistoryModalOpen(false)}>
            ✕
          </button>

          <div className="popup-modal-header">
            <div className="popup-header-icon-box history-icon-box">
              <span>📜</span>
            </div>
            <div className="popup-header-info">
              <div className="popup-header-title-row">
                <h3>Rounds History</h3>
                <span className="popup-badge-pill history-badge-pill">{questionHistory.length} Rounds</span>
              </div>
              <p className="popup-header-desc">
                Concluded questions and poll results for this session
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 400, overflowY: 'auto' }}>
            {questionHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 10px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>📜</div>
                <p>No completed rounds yet. Conclude a question to review results here.</p>
              </div>
            ) : (
              questionHistory.map((hq) => (
                <div key={hq.id} className="popup-history-card">
                  <div className="popup-history-top">
                    <div className="popup-history-round-tag">
                      <strong>Round #{hq.id}</strong>
                      <span className="popup-history-mode-pill">{hq.mode}</span>
                    </div>
                    <div className="popup-history-votes-pill">
                      {hq.totalVotes} votes
                    </div>
                  </div>
                  <div className="popup-history-text">
                    {hq.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal Dialog (Replaces native browser prompt) */}
      <div className={`modal-backdrop ${confirmDialog ? 'open' : ''}`} id="confirmModalBackdrop">
        <div className="modal-dialog glass-card" style={{ maxWidth: 420, textAlign: 'center', padding: '28px 24px' }}>
          <button type="button" className="modal-close-btn" onClick={() => setConfirmDialog(null)}>
            ✕
          </button>

          <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>
            {confirmDialog?.icon || '⚠️'}
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' }}>
            {confirmDialog?.title}
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 22px 0' }}>
            {confirmDialog?.message}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setConfirmDialog(null)}
              style={{ height: '42px', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${confirmDialog?.confirmType === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => {
                if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
              }}
              style={{ height: '42px', fontSize: '0.88rem' }}
            >
              {confirmDialog?.confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
