import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Navbar from '../components/Navbar';

export default function VoterView({
  voterState,
  onSubmitVote,
  onLeave
}) {
  const [ratingScore, setRatingScore] = useState(5);
  const [receiptHash, setReceiptHash] = useState('');

  // Reset or regenerate unique receipt hash upon voting each question
  useEffect(() => {
    if (voterState.hasVoted && !receiptHash) {
      const hash = 'VS-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setReceiptHash(hash);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else if (!voterState.hasVoted) {
      setReceiptHash('');
    }
  }, [voterState.hasVoted, voterState.currentQuestion?.id]);

  const handleAssemblyVote = (choice) => {
    if (voterState.currentQuestion?.status === 'closed') return;
    if (navigator.vibrate) navigator.vibrate(50);
    onSubmitVote(choice);
  };

  const handleRatingSubmit = (e) => {
    e.preventDefault();
    if (voterState.currentQuestion?.status === 'closed') return;
    if (navigator.vibrate) navigator.vibrate(50);
    onSubmitVote(ratingScore);
  };

  const getRatingTag = (val) => {
    if (val <= 2) return 'Poor / Unsatisfactory';
    if (val <= 4) return 'Below Average';
    if (val <= 6) return 'Average / Neutral';
    if (val <= 8) return 'Good / Above Average';
    return 'Masterpiece / Exceptional';
  };

  const formatTimer = (totalSec) => {
    const validSec = Math.max(0, Number(totalSec) || 0);
    const mins = Math.floor(validSec / 60);
    const secs = validSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = voterState.currentQuestion;
  const isIdle = !currentQ || currentQ.status === 'idle';
  const isMessage = currentQ && currentQ.type === 'message';
  const isClosed = currentQ && currentQ.status === 'closed';
  const activeMode = currentQ?.mode || voterState.mode || 'assembly';
  const isAssembly = activeMode === 'assembly';

  return (
    <>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <Navbar 
        currentView="voter" 
        onExitRoom={onLeave} 
        sessionTimeRemaining={voterState.sessionRemainingSeconds} 
      />

      <main className="main-content">
        {/* Voter Status Header */}
        <div className="glass-card voter-header-card">
          <div className="voter-meta">
            <div className="room-pill">
              <span className="dot-online"></span>
              <span>Room <strong id="voterRoomCodeDisplay">#{voterState.roomId}</strong></span>
            </div>

            <div className="user-pill">
              <span id="voterNameDisplay">{voterState.alias || 'Voter #1'}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CASE 1: IDLE STANDBY BOOTH (No question presented yet) */}
        {/* ------------------------------------------------------------- */}
        {isIdle ? (
          <div className="glass-card voter-waiting-card" style={{
            textAlign: 'center',
            padding: '48px 24px',
            margin: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px'
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.05) 70%)',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.4rem',
              animation: 'pulseGlow 2.5s infinite ease-in-out'
            }}>
              📡
            </div>

            <div style={{ maxWidth: 440 }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}>
                Booth Connected & Standby
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>
                Waiting for the Host
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                You are securely connected to Room <strong>#{voterState.roomId}</strong>. The host will launch the next question or announcement shortly.
              </p>
            </div>

            <div style={{
              marginTop: '10px',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              🛡️ <strong>Anti-Cheat Active:</strong> Please keep this window open and focused.
            </div>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* CASE 2: ACTIVE QUESTION / ANNOUNCEMENT PRESENTED */}
            {/* ------------------------------------------------------------- */}
            <div className="glass-card poll-question-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: isMessage ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: isMessage ? '#fde047' : '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {isMessage ? `📢 Announcement #${currentQ.id}` : `🗳️ Question #${currentQ.id} (${activeMode.toUpperCase()})`}
                </span>
                {isClosed && (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    🔒 Closed
                  </span>
                )}
              </div>

              <h2 id="voterQuestionTitle" className="voter-question-text" style={{ margin: '6px 0 10px 0' }}>
                {currentQ.text || 'Active Prompt'}
              </h2>
              <p className="voter-subtext" id="voterModeSubtitle">
                {isMessage 
                  ? 'Broadcast message from host.' 
                  : 'Cast your choice below. Your submission is 100% encrypted & anonymous.'}
              </p>
            </div>

            {/* Closed Question Alert */}
            {isClosed && !voterState.hasVoted && (
              <div className="glass-card" style={{
                padding: '14px 20px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                textAlign: 'center',
                marginBottom: '20px',
                fontWeight: 700
              }}>
                ⛔ Voting for Question #{currentQ.id} has ended. Awaiting next question.
              </div>
            )}

            {/* Plain Announcement Message State */}
            {isMessage ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📢</div>
                <h3 style={{ marginBottom: '8px' }}>Announcement Received</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Please follow the host screen instructions.
                </p>
              </div>
            ) : voterState.hasVoted ? (
              /* Voted Success State Card */
              <div id="votedSuccessState" className="glass-card voted-confirmation-card">
                <div className="voted-icon-check">✓</div>
                <h3>Your Vote Has Been Recorded!</h3>
                <p className="voted-sub">Your ballot was securely submitted to Question #{currentQ.id}.</p>

                <div className="vote-receipt-box">
                  <div className="receipt-row">
                    <span>Selection:</span>
                    <strong id="receiptVoteValue" style={{ color: 'var(--accent-emerald)' }}>
                      {voterState.myVote}
                    </strong>
                  </div>
                  {voterState.myOrder && (
                    <div className="receipt-row">
                      <span>Vote Order:</span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>
                        #{voterState.myOrder}
                      </strong>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span>Receipt Hash:</span>
                    <code id="receiptCode">{receiptHash || 'VS-CONFIRMED'}</code>
                  </div>
                </div>

                <div className="voted-waiting-indicator" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Awaiting next question or host broadcast...</span>
                </div>

                {/* Change vote option if question is still active */}
                {!isClosed && (
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '16px' }}
                    onClick={() => onSubmitVote(null)}
                  >
                    Change My Vote
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Option A: Assembly Mode Voting Grid */}
                {isAssembly && !isClosed && (
                  <div id="assemblyOptionsContainer" className="assembly-grid">
                    <button 
                      type="button"
                      className="vote-card card-yes" 
                      onClick={() => handleAssemblyVote('Yes')}
                    >
                      <span className="vote-card-icon">👍</span>
                      <span className="vote-card-label">YES</span>
                      <span className="vote-card-desc">Support / In Favor</span>
                    </button>

                    <button 
                      type="button"
                      className="vote-card card-no" 
                      onClick={() => handleAssemblyVote('No')}
                    >
                      <span className="vote-card-icon">👎</span>
                      <span className="vote-card-label">NO</span>
                      <span className="vote-card-desc">Against / Oppose</span>
                    </button>

                    <button 
                      type="button"
                      className="vote-card card-maybe" 
                      onClick={() => handleAssemblyVote('Maybe')}
                    >
                      <span className="vote-card-icon">🤔</span>
                      <span className="vote-card-label">MAYBE</span>
                      <span className="vote-card-desc">Neutral / Undecided</span>
                    </button>

                    <button 
                      type="button"
                      className="vote-card card-nota" 
                      onClick={() => handleAssemblyVote('NOTA')}
                    >
                      <span className="vote-card-icon">🚫</span>
                      <span className="vote-card-label">NOTA</span>
                      <span className="vote-card-desc">None of the Above</span>
                    </button>
                  </div>
                )}

                {/* Option B: Rating Mode 1-10 Scale */}
                {!isAssembly && !isClosed && (
                  <div id="ratingScaleContainer" className="rating-container glass-card">
                    <div className="rating-score-display">
                      <span className="rating-number-huge" id="ratingScoreNumber">{ratingScore}</span>
                      <span className="rating-max-label">/ 10</span>
                    </div>

                    <div className="rating-tag" id="ratingTagLabel">{getRatingTag(ratingScore)}</div>

                    {/* Quick Select 1-10 Buttons */}
                    <div className="rating-buttons-grid" id="ratingButtonsGrid">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={`rating-tile ${ratingScore === val ? 'active-tile' : ''}`}
                          onClick={() => setRatingScore(val)}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {/* Range Slider */}
                    <input
                      type="range"
                      className="custom-range-slider"
                      id="ratingSlider"
                      min="1"
                      max="10"
                      value={ratingScore}
                      onChange={(e) => setRatingScore(parseInt(e.target.value))}
                    />
                    <div className="slider-marks">
                      <span>1 (Poor)</span>
                      <span>5 (Average)</span>
                      <span>10 (Masterpiece)</span>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-emerald btn-block" 
                      id="submitRatingBtn"
                      onClick={handleRatingSubmit}
                    >
                      <span>Submit Rating Score</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
