import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, Ban, Check } from 'lucide-react';

const OPTIONS_CONFIG = [
  {
    id: 'Yes',
    label: 'YES',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    border: 'rgba(16, 185, 129, 0.6)',
    bg: 'linear-gradient(145deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
    activeBg: 'linear-gradient(145deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.2) 100%)',
    icon: CheckCircle2,
    shortcut: '1'
  },
  {
    id: 'No',
    label: 'NO',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.4)',
    border: 'rgba(244, 63, 94, 0.6)',
    bg: 'linear-gradient(145deg, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.05) 100%)',
    activeBg: 'linear-gradient(145deg, rgba(244, 63, 94, 0.4) 0%, rgba(244, 63, 94, 0.2) 100%)',
    icon: XCircle,
    shortcut: '2'
  },
  {
    id: 'Maybe',
    label: 'MAYBE',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    border: 'rgba(245, 158, 11, 0.6)',
    bg: 'linear-gradient(145deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
    activeBg: 'linear-gradient(145deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.2) 100%)',
    icon: HelpCircle,
    shortcut: '3'
  },
  {
    id: 'NOTA',
    label: 'NOTA',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    border: 'rgba(168, 85, 247, 0.6)',
    bg: 'linear-gradient(145deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
    activeBg: 'linear-gradient(145deg, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.2) 100%)',
    icon: Ban,
    shortcut: '4'
  }
];

export default function AssemblyVoteCards({ selectedVote, onVote, disabled }) {
  const handleSelect = (optionId) => {
    if (disabled) return;
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onVote(optionId);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {OPTIONS_CONFIG.map((opt) => {
        const isSelected = selectedVote === opt.id;
        const IconComponent = opt.icon;

        return (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={disabled}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 1.5rem',
              borderRadius: 'var(--radius-xl)',
              background: isSelected ? opt.activeBg : opt.bg,
              border: `2px solid ${isSelected ? opt.color : 'rgba(255, 255, 255, 0.1)'}`,
              boxShadow: isSelected ? `0 0 35px ${opt.glow}` : '0 10px 25px rgba(0, 0, 0, 0.3)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isSelected ? 'scale(1.03)' : 'scale(1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Selected Checkmark badge */}
            {isSelected && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: opt.color,
                color: '#fff',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 10px ${opt.glow}`
              }}>
                <Check size={16} strokeWidth={3} />
              </div>
            )}

            {/* Icon */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `rgba(255, 255, 255, 0.05)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: opt.color,
              marginBottom: '1rem',
              transition: 'transform 0.2s ease'
            }}>
              <IconComponent size={36} strokeWidth={2.2} />
            </div>

            {/* Label */}
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#ffffff',
              marginBottom: '0.25rem'
            }}>
              {opt.label}
            </span>

            {/* Shortcut hint */}
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Key [{opt.shortcut}]
            </span>
          </button>
        );
      })}
    </div>
  );
}
