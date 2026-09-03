import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import PinInput from '../components/PinInput';

export default function LandingView({
  onJoinRoom,
  onCreateRoom,
  initialRoom = '',
  initialPin = '',
  isConnecting,
  createError = null,
  joinError = null,
  onClearErrors
}) {
  // Modal state: null | 'join' | 'create'
  const [activeModal, setActiveModal] = useState(null);

  // Join form state
  const [joinRoomId, setJoinRoomId] = useState(initialRoom);
  const [joinPasscode, setJoinPasscode] = useState(initialPin);

  // Create form state
  const [createRoomId, setCreateRoomId] = useState('');
  const [localJoinError, setLocalJoinError] = useState(null);
  const [localCreateError, setLocalCreateError] = useState(null);

  // PIN Input Refs for programmatically focusing & dismissing keypad
  const roomPinRef = useRef(null);
  const passcodePinRef = useRef(null);
  const createPinRef = useRef(null);

  useEffect(() => {
    if (initialRoom || initialPin) {
      setJoinRoomId(initialRoom || '');
      setJoinPasscode(initialPin || '');
      setActiveModal('join');
      clearAllErrors();
    }
  }, [initialRoom, initialPin]);

  useEffect(() => {
    if (joinError) {
      setLocalJoinError(joinError);
    }
  }, [joinError]);

  useEffect(() => {
    if (createError) {
      setLocalCreateError(createError);
    }
  }, [createError]);

  const clearAllErrors = () => {
    setLocalJoinError(null);
    setLocalCreateError(null);
    if (onClearErrors) onClearErrors();
  };

  const handleOpenModal = (modalType) => {
    clearAllErrors();
    setActiveModal(modalType);
  };

  const handleCloseModal = () => {
    clearAllErrors();
    setActiveModal(null);
  };

  const handleRandomize = () => {
    clearAllErrors();
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setCreateRoomId(randomCode);
    createPinRef.current?.blurAll();
  };

  const handleJoinSubmit = (e) => {
    if (e) e.preventDefault();
    if (joinRoomId.length !== 4 || joinPasscode.length !== 4) return;
    clearAllErrors();
    roomPinRef.current?.blurAll();
    passcodePinRef.current?.blurAll();
    onJoinRoom({
      roomId: joinRoomId,
      passcode: joinPasscode
    });
  };

  const handleRoomCodeComplete = (roomVal) => {
    if (joinPasscode.length === 4) {
      // Both 4 digits filled: dismiss keyboard & auto-submit!
      roomPinRef.current?.blurAll();
      passcodePinRef.current?.blurAll();
      clearAllErrors();
      onJoinRoom({
        roomId: roomVal,
        passcode: joinPasscode
      });
    } else {
      // Auto-advance to passcode
      setTimeout(() => {
        passcodePinRef.current?.focusFirst();
      }, 50);
    }
  };

  const handlePasscodeComplete = (passVal) => {
    if (joinRoomId.length === 4) {
      // Both 4 digits filled: dismiss keyboard & auto-submit!
      roomPinRef.current?.blurAll();
      passcodePinRef.current?.blurAll();
      clearAllErrors();
      onJoinRoom({
        roomId: joinRoomId,
        passcode: passVal
      });
    } else {
      // Room code still needs to be filled: focus room code
      setTimeout(() => {
        roomPinRef.current?.focusFirst();
      }, 50);
    }
  };

  const handleCreateSubmit = (e) => {
    if (e) e.preventDefault();
    if (!createRoomId || createRoomId.trim().length !== 4) {
      setLocalCreateError('Please enter a 4-digit Room Number or click Random.');
      return;
    }
    clearAllErrors();
    createPinRef.current?.blurAll();
    onCreateRoom({
      customRoomId: createRoomId.trim(),
      mode: 'assembly'
    });
  };

  const displayedJoinError = localJoinError || joinError;
  const displayedCreateError = localCreateError || createError;

  return (
    <>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      {/* Top Navbar */}
      <Navbar
        currentView="landing"
        landingTab={activeModal}
        onTabChange={(tab) => {
          handleOpenModal(tab);
        }}
      />

      <main className="main-content" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(80vh - 80px)',
        textAlign: 'center',
        padding: '2rem 1rem'
      }}>
        {/* Main Text Header */}
        <div style={{ maxWidth: 680, marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #ffffff 40%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Real-Time Voting & Ratings
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 540,
            margin: '0 auto'
          }}>
            Instant local classroom polling, assembly voting, and rating sessions with 20-second dynamic TOTP passcodes.
          </p>
        </div>

        {/* ONLY TWO MAIN BUTTONS: CREATE & JOIN */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 500
        }}>
          <button
            type="button"
            className="btn btn-secondary btn-glow"
            style={{
              flex: '1 1 220px',
              padding: '16px 28px',
              fontSize: '1.1rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onClick={() => handleOpenModal('create')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Create Room</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-glow"
            style={{
              flex: '1 1 220px',
              padding: '16px 28px',
              fontSize: '1.1rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onClick={() => handleOpenModal('join')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Join Room</span>
          </button>
        </div>
      </main>

      {/* JOIN ROOM MODAL */}
      <div className={`modal-backdrop ${activeModal === 'join' ? 'open' : ''}`}>
        <div className="modal-dialog glass-card" style={{ maxWidth: 480, textAlign: 'left', position: 'relative' }}>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={handleCloseModal}
          >
            ✕
          </button>

          <div className="card-header" style={{ marginBottom: '18px', paddingBottom: '14px' }}>
            <div className="card-icon-badge icon-join">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <div>
              <h3>Enter Voting Booth</h3>
              <p>Join an active local room to cast your vote</p>
            </div>
          </div>

          {displayedJoinError && activeModal === 'join' && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {displayedJoinError}
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="auth-form">
            {/* 4-Digit Room Code */}
            <div className="form-group">
              <label>4-Digit Room Code</label>
              <PinInput
                ref={roomPinRef}
                value={joinRoomId}
                onChange={(val) => {
                  setJoinRoomId(val);
                  clearAllErrors();
                }}
                onComplete={handleRoomCodeComplete}
                onEnter={handleJoinSubmit}
                autoFocus={true}
                disabled={isConnecting}
              />
            </div>

            {/* 4-Digit Passcode */}
            <div className="form-group">
              <div className="label-with-hint">
                <label>20-Second Passcode (PIN)</label>
                <span className="live-hint">⏱️ Live on Host Screen</span>
              </div>
              <PinInput
                ref={passcodePinRef}
                value={joinPasscode}
                onChange={(val) => {
                  setJoinPasscode(val);
                  clearAllErrors();
                }}
                onComplete={handlePasscodeComplete}
                onEnter={handleJoinSubmit}
                isGold={true}
                disabled={isConnecting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block btn-glow" 
              disabled={isConnecting || joinRoomId.length !== 4 || joinPasscode.length !== 4}
            >
              <span>{isConnecting ? 'Verifying Credentials...' : 'Enter Voting Booth'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      <div className={`modal-backdrop ${activeModal === 'create' ? 'open' : ''}`}>
        <div className="modal-dialog glass-card" style={{ maxWidth: 480, textAlign: 'left', position: 'relative' }}>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={handleCloseModal}
          >
            ✕
          </button>

          <div className="card-header" style={{ marginBottom: '18px', paddingBottom: '14px' }}>
            <div className="card-icon-badge icon-create">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div>
              <h3>Host a Room</h3>
              <p>Configure credentials and launch live dashboard</p>
            </div>
          </div>

          {displayedCreateError && activeModal === 'create' && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {displayedCreateError}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="auth-form">
            {/* Room Code with 4 Boxes & Random Button */}
            <div className="form-group">
              <label>Set 4-Digit Room Code</label>
              <div className="pin-input-action-row">
                <PinInput
                  ref={createPinRef}
                  value={createRoomId}
                  onChange={(val) => {
                    setCreateRoomId(val);
                    clearAllErrors();
                  }}
                  onComplete={() => {
                    createPinRef.current?.blurAll();
                  }}
                  onEnter={handleCreateSubmit}
                  disabled={isConnecting}
                />
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline pin-action-btn" 
                  onClick={handleRandomize}
                  title="Generate Random Room Number"
                >
                  <span>Random</span>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-secondary btn-block btn-glow"
              disabled={isConnecting || createRoomId.length !== 4}
              style={{ marginTop: '8px' }}
            >
              <span>{isConnecting ? 'Creating Room...' : 'Create Room'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
