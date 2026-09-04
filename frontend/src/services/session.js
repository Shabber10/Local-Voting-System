/**
 * Persistent Voter & Host Session Management
 * Maintains unique, stable session identifiers and authentication tokens
 * across page refreshes, browser restarts, and multiple tabs using
 * both LocalStorage and Cookie storage.
 */

export function setCookie(name, value, days = 7) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

export function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + encodeURIComponent(name) + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  } catch (e) {
    return null;
  }
}

export function removeCookie(name) {
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch (e) {}
}

/* ==================== Host Session Management ==================== */

export function saveHostSession(roomId, hostKey, hostRoomData = null) {
  try {
    localStorage.setItem(`hostKey_${roomId}`, hostKey);
    setCookie(`votesphere_hostKey_${roomId}`, hostKey, 1);
    if (hostRoomData) {
      localStorage.setItem(`hostRoom_${roomId}`, JSON.stringify(hostRoomData));
    }
  } catch (e) {}
}

export function getHostSessionKey(roomId) {
  try {
    return localStorage.getItem(`hostKey_${roomId}`) || getCookie(`votesphere_hostKey_${roomId}`);
  } catch (e) {
    return getCookie(`votesphere_hostKey_${roomId}`);
  }
}

export function getCachedHostRoom(roomId) {
  try {
    const data = localStorage.getItem(`hostRoom_${roomId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearHostSession(roomId) {
  try {
    localStorage.removeItem(`hostKey_${roomId}`);
    localStorage.removeItem(`hostRoom_${roomId}`);
    removeCookie(`votesphere_hostKey_${roomId}`);
  } catch (e) {}
}

/* ==================== Voter Session Management ==================== */

export function getVoterSessionId() {
  try {
    let id = localStorage.getItem('votesphere_voter_session_id') || getCookie('votesphere_voter_session_id');
    if (!id) {
      id = 'voter_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('votesphere_voter_session_id', id);
      setCookie('votesphere_voter_session_id', id, 7);
    }
    return id;
  } catch (e) {
    return 'voter_fallback_' + Math.random().toString(36).substring(2, 10);
  }
}

export function setActiveVoterRoom(roomId) {
  try {
    if (roomId) {
      localStorage.setItem('votesphere_active_voter_room', String(roomId));
      setCookie('votesphere_active_voter_room', String(roomId), 1);
    } else {
      localStorage.removeItem('votesphere_active_voter_room');
      removeCookie('votesphere_active_voter_room');
    }
  } catch (e) {}
}

export function getActiveVoterRoom() {
  try {
    return localStorage.getItem('votesphere_active_voter_room') || getCookie('votesphere_active_voter_room');
  } catch (e) {
    return getCookie('votesphere_active_voter_room');
  }
}

export function saveVoterState(roomId, voterStateData) {
  try {
    if (roomId && voterStateData) {
      localStorage.setItem(`voterState_${roomId}`, JSON.stringify(voterStateData));
      setActiveVoterRoom(roomId);
    }
  } catch (e) {}
}

export function getCachedVoterState(roomId) {
  try {
    const data = localStorage.getItem(`voterState_${roomId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearVoterSession(roomId) {
  try {
    if (roomId) {
      localStorage.removeItem(`voterState_${roomId}`);
    }
    setActiveVoterRoom(null);
  } catch (e) {}
}
