import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { socket } from './services/socket';
import { 
  getVoterSessionId, 
  setActiveVoterRoom, 
  getActiveVoterRoom,
  saveVoterState,
  getCachedVoterState,
  clearVoterSession,
  saveHostSession,
  getHostSessionKey,
  getCachedHostRoom,
  clearHostSession
} from './services/session';
import LandingView from './views/LandingView';
import HostView from './views/HostView';
import VoterView from './views/VoterView';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isConnecting, setIsConnecting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [joinError, setJoinError] = useState(null);

  // In-app alert / notice modal state (replaces browser native alert/confirm)
  const [popupModal, setPopupModal] = useState(null);

  // Host state
  const [hostRoom, setHostRoom] = useState(null);
  const [hostKey, setHostKey] = useState(null);

  // Voter state
  const [voterState, setVoterState] = useState({
    roomId: null,
    title: '',
    mode: 'assembly',
    isLocked: false,
    isRevealed: true,
    status: 'active',
    hasVoted: false,
    myVote: null,
    alias: '',
    tally: null
  });

  // URL query params
  const [urlParams, setUrlParams] = useState({ room: '', pin: '' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomParam = params.get('room') || '';
    const pinParam = params.get('pin') || '';
    if (roomParam || pinParam) {
      setUrlParams({ room: roomParam, pin: pinParam });
    }
  }, [location.search]);


  // Sync voterState updates to cached localStorage
  useEffect(() => {
    if (voterState && voterState.roomId) {
      saveVoterState(voterState.roomId, voterState);
    }
  }, [voterState]);

  // Socket event listeners
  useEffect(() => {
    function onConnect() {
      setCreateError(null);
      setJoinError(null);
    }

    function onRoomCreated(res) {
      setIsConnecting(false);
      if (res.success) {
        setHostRoom({
          ...res.room,
          id: String(res.room.id),
          sessionRemainingSeconds: res.room.sessionRemainingSeconds
        });
        setHostKey(res.hostKey);
        setCreateError(null);
        setJoinError(null);
        saveHostSession(res.room.id, res.hostKey, res.room);
        navigate(`/host/${res.room.id}`);
      } else {
        setCreateError(res.error || 'Failed to create room');
      }
    }

    function onRoomJoined(res) {
      setIsConnecting(false);
      if (res.success) {
        setActiveVoterRoom(res.state.roomId);
        saveVoterState(res.state.roomId, res.state);
        setVoterState({
          ...res.state,
          roomId: String(res.state.roomId),
          sessionRemainingSeconds: res.state.sessionRemainingSeconds
        });
        setCreateError(null);
        setJoinError(null);
        navigate(`/vote/${res.state.roomId}`);
      } else {
        setJoinError(res.error || 'Failed to join room');
        if (window.location.pathname.startsWith('/vote')) {
          const pathRoomId = window.location.pathname.split('/').pop();
          clearVoterSession(pathRoomId);
          navigate('/');
        }
      }
    }

    function onHostAuthResponse(res) {
      if (res.success) {
        setHostRoom({
          ...res.room,
          id: String(res.room.id),
          sessionRemainingSeconds: res.room.sessionRemainingSeconds
        });
        saveHostSession(res.room.id, getHostSessionKey(res.room.id), res.room);
      } else {
        clearHostSession(res.roomId || window.location.pathname.split('/').pop());
        navigate('/');
      }
    }

    function onOtpRotated(data) {
      if (!data) return;
      if (data.sessionRemaining !== undefined && data.sessionRemaining <= 0) {
        if (window.location.pathname.startsWith('/host')) {
          handleHostExit();
        } else if (window.location.pathname.startsWith('/vote')) {
          handleVoterExit();
        }
        return;
      }

      setHostRoom((prev) => {
        if (!prev) return prev;
        if (prev.id && String(prev.id) !== String(data.roomId)) return prev;
        return {
          ...prev,
          passcode: data.passcode,
          expiresIn: data.expiresIn,
          sessionRemainingSeconds: data.sessionRemaining
        };
      });

      setVoterState((prev) => {
        if (!prev) return prev;
        if (prev.roomId && String(prev.roomId) !== String(data.roomId)) return prev;
        return {
          ...prev,
          expiresIn: data.expiresIn,
          sessionRemainingSeconds: data.sessionRemaining
        };
      });
    }

    function onOtpTick(data) {
      if (!data) return;
      if (data.sessionRemaining !== undefined && data.sessionRemaining <= 0) {
        if (window.location.pathname.startsWith('/host')) {
          handleHostExit();
        } else if (window.location.pathname.startsWith('/vote')) {
          handleVoterExit();
        }
        return;
      }

      setHostRoom((prev) => {
        if (!prev) return prev;
        if (prev.id && String(prev.id) !== String(data.roomId)) return prev;
        return {
          ...prev,
          expiresIn: data.expiresIn,
          sessionRemainingSeconds: data.sessionRemaining
        };
      });

      setVoterState((prev) => {
        if (!prev) return prev;
        if (prev.roomId && String(prev.roomId) !== String(data.roomId)) return prev;
        return {
          ...prev,
          expiresIn: data.expiresIn,
          sessionRemainingSeconds: data.sessionRemaining
        };
      });
    }

    function onTallyUpdated(data) {
      setHostRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tally: data.tally,
          participants: data.participants || prev.participants
        };
      });

      setVoterState((prev) => ({
        ...prev,
        tally: data.isRevealed ? data.tally : null
      }));
    }

    function onRosterUpdated(data) {
      setHostRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: data.participants,
          participantCount: data.participantCount
        };
      });
    }

    function onVoteConfirmed(data) {
      if (data.success) {
        setVoterState((prev) => ({
          ...prev,
          hasVoted: true,
          myVote: data.vote,
          myReason: data.reason || null
        }));
      }
    }

    function onRoomLockToggled(data) {
      setHostRoom((prev) => (prev ? { ...prev, isLocked: data.isLocked } : prev));
      setVoterState((prev) => ({ ...prev, isLocked: data.isLocked }));
    }

    function onResultsRevealToggled(data) {
      setHostRoom((prev) => (prev ? { ...prev, isRevealed: data.isRevealed } : prev));
      setVoterState((prev) => ({
        ...prev,
        isRevealed: data.isRevealed,
        tally: data.isRevealed ? data.tally : null
      }));
    }

    function onTitleUpdated(data) {
      setHostRoom((prev) => (prev ? { ...prev, title: data.title } : prev));
      setVoterState((prev) => ({ ...prev, title: data.title }));
    }

    function onVotesReset(data) {
      setHostRoom((prev) => (prev ? { ...prev, tally: data.tally, participants: data.participants } : prev));
      setVoterState((prev) => ({
        ...prev,
        hasVoted: false,
        myVote: null,
        tally: prev.isRevealed ? data.tally : null
      }));
    }

    function onPollEnded(data) {
      setHostRoom((prev) => (prev ? { ...prev, status: 'ended', tally: data.finalTally } : prev));
      setVoterState((prev) => ({ ...prev, status: 'ended', tally: data.finalTally }));
    }

    function onRoomClosed(data) {
      // ONLY notify voters who were actively in this room
      if (voterState.roomId === data.roomId) {
        setPopupModal({
          title: 'Room Closed',
          message: `Room #${data.roomId} has been closed by the host.`,
          icon: '🔒',
          confirmLabel: 'OK',
          confirmType: 'primary',
          onConfirm: () => {
            handleVoterExit();
          }
        });
      }
    }

    function onQuestionLaunched(data) {
      if (data.hostState) {
        setHostRoom(data.hostState);
      }
      setVoterState((prev) => ({
        ...prev,
        currentQuestion: data.question,
        mode: data.mode || (data.question ? data.question.mode : prev.mode),
        title: data.question ? data.question.text : prev.title,
        hasVoted: false,
        myVote: null,
        myOrder: null,
        tally: null
      }));
    }

    function onQuestionClosed(data) {
      if (data.hostState) {
        setHostRoom(data.hostState);
      }
      setVoterState((prev) => ({
        ...prev,
        currentQuestion: data.question || (prev.currentQuestion ? { ...prev.currentQuestion, status: 'closed' } : null),
        tally: data.tally || prev.tally
      }));
    }

    function onSessionDataErased(data) {
      if (data.hostState) {
        setHostRoom(data.hostState);
      }
      setVoterState((prev) => ({
        ...prev,
        currentQuestion: null,
        hasVoted: false,
        myVote: null,
        myOrder: null,
        tally: null
      }));
    }

    function onSessionExpired(data) {
      if (window.location.pathname.startsWith('/host')) {
        handleHostExit();
      } else if (window.location.pathname.startsWith('/vote')) {
        handleVoterExit();
      }
    }

    function onKicked(data) {
      setPopupModal({
        title: 'Session Disqualification',
        message: data?.message || 'You have been disqualified by the host.',
        icon: '⛔',
        confirmLabel: 'OK',
        confirmType: 'danger',
        onConfirm: () => {
          handleVoterExit();
        }
      });
    }

    socket.on('connect', onConnect);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('host_auth_response', onHostAuthResponse);
    socket.on('otp_rotated', onOtpRotated);
    socket.on('otp_tick', onOtpTick);
    socket.on('session_expired', onSessionExpired);
    socket.on('kicked', onKicked);
    socket.on('tally_updated', onTallyUpdated);
    socket.on('roster_updated', onRosterUpdated);
    socket.on('vote_confirmed', onVoteConfirmed);
    socket.on('room_lock_toggled', onRoomLockToggled);
    socket.on('results_reveal_toggled', onResultsRevealToggled);
    socket.on('title_updated', onTitleUpdated);
    socket.on('votes_reset', onVotesReset);
    socket.on('poll_ended', onPollEnded);
    socket.on('room_closed', onRoomClosed);
    socket.on('question_launched', onQuestionLaunched);
    socket.on('question_closed', onQuestionClosed);
    socket.on('session_data_erased', onSessionDataErased);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('host_auth_response', onHostAuthResponse);
      socket.off('otp_rotated', onOtpRotated);
      socket.off('otp_tick', onOtpTick);
      socket.off('session_expired', onSessionExpired);
      socket.off('kicked', onKicked);
      socket.off('tally_updated', onTallyUpdated);
      socket.off('roster_updated', onRosterUpdated);
      socket.off('vote_confirmed', onVoteConfirmed);
      socket.off('room_lock_toggled', onRoomLockToggled);
      socket.off('results_reveal_toggled', onResultsRevealToggled);
      socket.off('title_updated', onTitleUpdated);
      socket.off('votes_reset', onVotesReset);
      socket.off('poll_ended', onPollEnded);
      socket.off('room_closed', onRoomClosed);
      socket.off('question_launched', onQuestionLaunched);
      socket.off('question_closed', onQuestionClosed);
      socket.off('session_data_erased', onSessionDataErased);
    };
  }, [voterState.roomId, navigate]);

  const handleCreateRoom = (options) => {
    setIsConnecting(true);
    setCreateError(null);
    setJoinError(null);
    socket.emit('create_room', options);
  };

  const handleJoinRoom = ({ roomId, passcode }) => {
    setIsConnecting(true);
    setCreateError(null);
    setJoinError(null);
    const voterSessionId = getVoterSessionId();
    socket.emit('join_room', { roomId, passcode, voterSessionId });
  };

  const handleClearErrors = () => {
    setCreateError(null);
    setJoinError(null);
  };

  const handleLaunchQuestion = (questionData) => {
    if (!hostRoom) return;
    socket.emit('host_launch_question', {
      roomId: hostRoom.id,
      ...questionData
    });
  };

  const handleCloseQuestion = () => {
    if (!hostRoom) return;
    socket.emit('host_close_question', {
      roomId: hostRoom.id
    });
  };

  const handleEraseSessionData = () => {
    if (!hostRoom) return;
    socket.emit('host_erase_session_data', {
      roomId: hostRoom.id
    });
  };

  const handleSubmitVote = (voteVal, reason = '') => {
    if (!voterState.roomId) return;
    const voterSessionId = getVoterSessionId();
    socket.emit('submit_vote', {
      roomId: voterState.roomId,
      vote: voteVal,
      reason: (reason || '').trim(),
      voterSessionId
    });
  };

  const handleToggleLock = (isLocked) => {
    if (!hostRoom) return;
    socket.emit('host_lock_room', { roomId: hostRoom.id, isLocked });
  };

  const handleToggleReveal = (isRevealed) => {
    if (!hostRoom) return;
    socket.emit('host_reveal_results', { roomId: hostRoom.id, isRevealed });
  };

  const handleResetVotes = () => {
    if (!hostRoom) return;
    socket.emit('host_reset_votes', { roomId: hostRoom.id });
  };

  const handleUpdateTitle = (title) => {
    if (!hostRoom) return;
    socket.emit('host_update_title', { roomId: hostRoom.id, title });
  };

  const handleEndPoll = () => {
    if (!hostRoom) return;
    setPopupModal({
      title: 'End Session?',
      message: 'Are you sure you want to conclude this live voting session?',
      icon: '🏁',
      confirmLabel: 'Conclude Session',
      cancelLabel: 'Cancel',
      confirmType: 'danger',
      onConfirm: () => {
        socket.emit('host_end_poll', { roomId: hostRoom.id });
      }
    });
  };

  const handleKickParticipant = (socketId) => {
    if (!hostRoom) return;
    socket.emit('kick_participant', { roomId: hostRoom.id, socketId });
  };

  const handleHostExit = (targetRoomId = null) => {
    const pathRoom = window.location.pathname.startsWith('/host/')
      ? window.location.pathname.split('/host/')[1]?.split('/')[0]?.split('?')[0]
      : null;
    const rId = targetRoomId || (hostRoom ? hostRoom.id : null) || pathRoom;
    if (rId) {
      socket.emit('host_leave_room', { roomId: rId });
      clearHostSession(rId);
    }
    setHostRoom(null);
    navigate('/', { replace: true });
  };

  const handleVoterExit = (targetRoomId = null) => {
    const pathRoom = window.location.pathname.startsWith('/vote/') 
      ? window.location.pathname.split('/vote/')[1]?.split('/')[0]?.split('?')[0] 
      : null;
    const rId = targetRoomId || (voterState ? voterState.roomId : null) || pathRoom || getActiveVoterRoom();
    const voterSessionId = getVoterSessionId();

    if (rId) {
      socket.emit('voter_leave_room', { roomId: rId, voterSessionId });
      clearVoterSession(rId);
    } else {
      clearVoterSession(null);
    }

    setActiveVoterRoom(null);

    setVoterState({
      roomId: null,
      title: '',
      mode: 'assembly',
      isLocked: false,
      isRevealed: true,
      status: 'active',
      currentQuestion: null,
      hasVoted: false,
      myVote: null,
      myOrder: null,
      alias: '',
      tally: null
    });

    navigate('/', { replace: true });
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <LandingView
              onJoinRoom={handleJoinRoom}
              onCreateRoom={handleCreateRoom}
              initialRoom={urlParams.room}
              initialPin={urlParams.pin}
              isConnecting={isConnecting}
              createError={createError}
              joinError={joinError}
              onClearErrors={handleClearErrors}
            />
          }
        />

        <Route
          path="/host/:roomId"
          element={
            <HostRouteWrapper
              hostRoom={hostRoom}
              onLaunchQuestion={handleLaunchQuestion}
              onCloseQuestion={handleCloseQuestion}
              onEraseSessionData={handleEraseSessionData}
              onToggleLock={handleToggleLock}
              onToggleReveal={handleToggleReveal}
              onResetVotes={handleResetVotes}
              onUpdateTitle={handleUpdateTitle}
              onEndPoll={handleEndPoll}
              onKickParticipant={handleKickParticipant}
              onLeave={handleHostExit}
            />
          }
        />

        <Route
          path="/vote/:roomId"
          element={
            <VoterRouteWrapper
              voterState={voterState}
              onSubmitVote={handleSubmitVote}
              onLeave={handleVoterExit}
            />
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <LandingView
              onJoinRoom={handleJoinRoom}
              onCreateRoom={handleCreateRoom}
              isConnecting={isConnecting}
              createError={createError}
              joinError={joinError}
              onClearErrors={handleClearErrors}
            />
          }
        />
      </Routes>

      {/* Universal In-App Alert / Confirmation Modal (replaces browser native dialogs) */}
      <div 
        className={`modal-backdrop ${popupModal ? 'open' : ''}`}
        id="appPopupModalBackdrop"
        style={{ zIndex: 99999 }}
      >
        <div 
          className="modal-dialog glass-card"
          style={{ 
            maxWidth: 420, 
            textAlign: 'center', 
            padding: '28px 24px'
          }}
        >
          <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>
            {popupModal?.icon || '⚠️'}
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: '0 0 8px 0' }}>
            {popupModal?.title || 'Notice'}
          </h3>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 22px 0' }}>
            {popupModal?.message}
          </p>

          <div style={{ display: popupModal?.cancelLabel ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {popupModal?.cancelLabel && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (popupModal?.onCancel) popupModal.onCancel();
                  setPopupModal(null);
                }}
                style={{ height: '44px', fontSize: '0.9rem', fontWeight: 800 }}
              >
                {popupModal.cancelLabel}
              </button>
            )}
            <button
              type="button"
              className={`btn ${popupModal?.confirmType === 'danger' ? 'btn-danger' : 'btn-primary'} ${!popupModal?.cancelLabel ? 'btn-block' : ''}`}
              onClick={() => {
                const cb = popupModal?.onConfirm;
                setPopupModal(null);
                if (cb) cb();
              }}
              style={{ height: '44px', fontSize: '0.92rem', fontWeight: 800 }}
            >
              {popupModal?.confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Host route protection & auth recovery
function HostRouteWrapper({
  hostRoom,
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
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hostRoom) {
      const savedKey = getHostSessionKey(roomId);
      if (!savedKey) {
        navigate('/');
        return;
      }

      const attemptAuth = () => {
        socket.emit('host_auth', { roomId, hostKey: savedKey });
      };

      if (socket.connected) {
        attemptAuth();
      } else {
        socket.once('connect', attemptAuth);
        const timer = setTimeout(attemptAuth, 250);
        return () => {
          socket.off('connect', attemptAuth);
          clearTimeout(timer);
        };
      }
    }
  }, [hostRoom, roomId, navigate]);

  const effectiveRoom = hostRoom || getCachedHostRoom(roomId);

  if (!effectiveRoom) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
        <h2>Authenticating Host Session...</h2>
      </div>
    );
  }

  return (
    <HostView
      room={effectiveRoom}
      onLaunchQuestion={onLaunchQuestion}
      onCloseQuestion={onCloseQuestion}
      onEraseSessionData={onEraseSessionData}
      onToggleLock={onToggleLock}
      onToggleReveal={onToggleReveal}
      onResetVotes={onResetVotes}
      onUpdateTitle={onUpdateTitle}
      onEndPoll={onEndPoll}
      onKickParticipant={onKickParticipant}
      onLeave={() => onLeave(roomId)}
    />
  );
}

// Voter route wrapper
function VoterRouteWrapper({
  voterState,
  onSubmitVote,
  onLeave
}) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Only attempt to rejoin if a session for this room actually exists in storage
    const cachedState = getCachedVoterState(roomId);
    const activeRoom = getActiveVoterRoom();

    if (!cachedState && String(activeRoom) !== String(roomId)) {
      // Session has been cleared/exited; do not rejoin, navigate home
      navigate('/', { replace: true });
      return;
    }

    if (!voterState.roomId || String(voterState.roomId) !== String(roomId)) {
      const voterSessionId = getVoterSessionId();
      setActiveVoterRoom(roomId);
      const attemptRejoin = () => {
        socket.emit('rejoin_room', { roomId, voterSessionId });
      };
      if (socket.connected) {
        attemptRejoin();
      } else {
        socket.once('connect', attemptRejoin);
        const timer = setTimeout(attemptRejoin, 250);
        return () => {
          socket.off('connect', attemptRejoin);
          clearTimeout(timer);
        };
      }
    }
  }, [voterState.roomId, roomId, navigate]);

  const effectiveVoterState = (voterState && voterState.roomId) ? voterState : getCachedVoterState(roomId);

  if (!effectiveVoterState || !effectiveVoterState.roomId) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
        <h2>Connecting to voting booth...</h2>
      </div>
    );
  }

  return (
    <VoterView
      voterState={effectiveVoterState}
      onSubmitVote={onSubmitVote}
      onLeave={() => onLeave(roomId)}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
