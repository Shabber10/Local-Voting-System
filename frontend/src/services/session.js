/**
 * Persistent Voter Session Management
 * Maintains a unique, stable voter session identifier across multiple tabs
 * within the same browser and device.
 */

export function getVoterSessionId() {
  try {
    let id = localStorage.getItem('votesphere_voter_session_id');
    if (!id) {
      id = 'voter_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('votesphere_voter_session_id', id);
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
    } else {
      localStorage.removeItem('votesphere_active_voter_room');
    }
  } catch (e) {
    // Ignore storage errors in private browsing
  }
}

export function getActiveVoterRoom() {
  try {
    return localStorage.getItem('votesphere_active_voter_room');
  } catch (e) {
    return null;
  }
}
