import React from 'react';
import { Users, UserCheck, ShieldAlert, UserX, AlertCircle } from 'lucide-react';

export default function VoterRoster({ participants = [], onKickParticipant }) {
  const totalCount = participants.length;
  const votedCount = participants.filter((p) => p.hasVoted).length;
  const strikeCount = participants.filter((p) => p.strikes > 0).length;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="var(--primary-light)" />
          <h4 style={{ fontSize: '1.1rem' }}>Voter Roster</h4>
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-main)' }}>
            {totalCount}
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#10b981', fontWeight: 700 }}>{votedCount}</span> voted
        </div>
      </div>

      {/* Roster List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        overflowY: 'auto',
        maxHeight: '380px',
        paddingRight: '0.35rem'
      }}>
        {participants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            No voters connected yet. Share the Room code or QR code to begin.
          </div>
        ) : (
          participants.map((p) => {
            const isDisqualified = p.disqualified || p.status === 'disqualified';
            const isOffline = p.status === 'offline';

            return (
              <div 
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isDisqualified 
                    ? 'rgba(244, 63, 94, 0.1)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isDisqualified ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* User Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: p.hasVoted 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : isDisqualified 
                      ? 'rgba(244, 63, 94, 0.2)' 
                      : 'rgba(255, 255, 255, 0.08)',
                    color: p.hasVoted 
                      ? '#10b981' 
                      : isDisqualified 
                      ? '#f43f5e' 
                      : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {p.hasVoted ? <UserCheck size={16} /> : isDisqualified ? <UserX size={16} /> : <Users size={16} />}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isDisqualified ? '#fda4af' : '#ffffff' }}>
                      {p.alias || 'Anonymous Voter'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isOffline ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                      {isDisqualified ? 'Disqualified' : isOffline ? 'Offline' : p.hasVoted ? 'Vote Submitted' : 'Waiting for vote...'}
                    </div>
                  </div>
                </div>

                {/* Badges & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {p.strikes > 0 && (
                    <span 
                      className="badge badge-strike" 
                      title={`${p.strikes} anti-cheat strikes recorded`}
                    >
                      <ShieldAlert size={12} />
                      <span>{p.strikes} Strike{p.strikes > 1 ? 's' : ''}</span>
                    </span>
                  )}

                  {onKickParticipant && !isDisqualified && (
                    <button
                      onClick={() => onKickParticipant(p.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}
                      title="Disqualify Voter"
                    >
                      Kick
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
