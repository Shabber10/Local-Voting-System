import React, { useState } from 'react';
import { Star, Sparkles, Check } from 'lucide-react';

export default function RatingVoteScale({ selectedVote, onVote, disabled }) {
  const [hoveredScore, setHoveredScore] = useState(null);
  const activeScore = hoveredScore || selectedVote;

  const handleSelect = (score) => {
    if (disabled) return;
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
    onVote(score);
  };

  const getScoreColor = (score) => {
    if (score <= 3) return '#f43f5e'; // Rose / Red
    if (score <= 6) return '#f59e0b'; // Amber / Yellow
    if (score <= 8) return '#06b6d4'; // Cyan / Blue
    return '#10b981';                // Emerald / Green
  };

  return (
    <div className="glass-panel" style={{
      maxWidth: '750px',
      width: '100%',
      margin: '0 auto',
      padding: '2.5rem 1.75rem',
      textAlign: 'center'
    }}>
      {/* Current Score Display */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontSize: '4.5rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          color: activeScore ? getScoreColor(activeScore) : 'var(--text-dim)',
          textShadow: activeScore ? `0 0 30px ${getScoreColor(activeScore)}` : 'none',
          lineHeight: 1,
          marginBottom: '0.5rem',
          transition: 'all 0.2s ease'
        }}>
          {activeScore || '--'}
          <span style={{ fontSize: '1.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>/10</span>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
          {activeScore === 10 ? '⭐ Exceptional / Perfect' :
           activeScore >= 8 ? '✨ Great / Strongly Agree' :
           activeScore >= 5 ? '👍 Neutral / Acceptable' :
           activeScore >= 1 ? '👎 Needs Improvement' : 'Select a rating from 1 to 10'}
        </p>
      </div>

      {/* 1 to 10 Grid Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.85rem',
        marginBottom: '2rem'
      }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
          const isSelected = selectedVote === score;
          const scoreColor = getScoreColor(score);

          return (
            <button
              key={score}
              onClick={() => handleSelect(score)}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              disabled={disabled}
              style={{
                height: 64,
                borderRadius: 'var(--radius-md)',
                background: isSelected 
                  ? scoreColor 
                  : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${isSelected ? scoreColor : 'rgba(255, 255, 255, 0.1)'}`,
                color: isSelected ? '#ffffff' : 'var(--text-main)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 800,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: isSelected ? `0 0 25px ${scoreColor}` : 'none',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {score}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  color: scoreColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rating Scale Indicator labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span>1: Poor</span>
        <span>5: Neutral</span>
        <span>10: Excellent</span>
      </div>
    </div>
  );
}
