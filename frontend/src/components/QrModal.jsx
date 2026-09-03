import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Copy, Check } from 'lucide-react';

export default function QrModal({ isOpen, onClose, roomId, passcode }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Build join URL
  const joinUrl = `${window.location.origin}/?room=${roomId}&pin=${passcode || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="glass-panel-glow animate-pop" style={{
        maxWidth: 440,
        width: '100%',
        padding: '2rem',
        background: '#0f172a',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-muted)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <Smartphone size={24} />
        </div>

        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Scan to Join Room</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Open camera on any smartphone or tablet connected to the local Wi-Fi.
        </p>

        {/* QR Code Container */}
        <div style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'inline-block',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          marginBottom: '1.5rem'
        }}>
          <QRCodeSVG 
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Room & PIN badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '0.85rem',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Room Code</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)' }}>#{roomId}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-subtle)' }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Active PIN</div>
            <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>{passcode || '----'}</div>
          </div>
        </div>

        {/* Copy Link Button */}
        <button 
          onClick={handleCopy}
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '0.9rem' }}
        >
          {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          <span>{copied ? 'Direct Link Copied!' : 'Copy Direct URL'}</span>
        </button>
      </div>
    </div>
  );
}
