import React from 'react';
import { Layers, Wifi, WifiOff, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';

export default function Header({ 
  isConnected, 
  roomId, 
  title, 
  mode, 
  onBack, 
  isHost = false, 
  isFullscreen = false, 
  onToggleFullscreen 
}) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 1.5rem',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onBack && (
          <button 
            onClick={onBack} 
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
            title="Return to Home"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Layers size={20} color="#fff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                VoteSphere
              </span>
              {roomId && (
                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  Room #{roomId}
                </span>
              )}
              {isHost && (
                <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  HOST
                </span>
              )}
            </div>

            {title && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Connection status indicator */}
        <div 
          className="badge" 
          style={{ 
            background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: isConnected ? '#34d399' : '#fb7185',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
          }}
        >
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{isConnected ? 'ONLINE' : 'CONNECTING...'}</span>
        </div>

        {/* Fullscreen Toggle for Host Screen */}
        {isHost && onToggleFullscreen && (
          <button 
            onClick={onToggleFullscreen} 
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Presentation Mode"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}
