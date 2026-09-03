import React from 'react';
import { ShieldCheck, Clock } from 'lucide-react';

export default function OtpBadge({ passcode, expiresIn, maxDuration = 20 }) {
  const percent = Math.min(100, Math.max(0, (expiresIn / maxDuration) * 100));
  const strokeDashoffset = 100 - percent;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.65rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 0 25px rgba(99, 102, 241, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ 
          fontSize: '0.7rem', 
          textTransform: 'uppercase', 
          fontWeight: 700, 
          letterSpacing: '0.08em',
          color: 'var(--primary-light)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <ShieldCheck size={13} /> 20s Dynamic Passcode
        </span>
        <span className="font-mono" style={{ 
          fontSize: '1.75rem', 
          fontWeight: 800, 
          letterSpacing: '0.2em',
          color: '#ffffff',
          textShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
        }}>
          {passcode || '----'}
        </span>
      </div>

      {/* Circular animated countdown timer */}
      <div style={{ position: 'relative', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="3.5"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="url(#otpGradient)"
            strokeWidth="3.5"
            strokeDasharray="100, 100"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s linear' }}
          />
          <defs>
            <linearGradient id="otpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span className="font-mono" style={{
          position: 'absolute',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-main)'
        }}>
          {expiresIn}s
        </span>
      </div>
    </div>
  );
}
