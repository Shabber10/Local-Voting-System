import React from 'react';
import { BarChart2, TrendingUp, Users, Award, EyeOff } from 'lucide-react';

const OPTION_COLORS = {
  'Yes': { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  'No': { fill: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
  'Maybe': { fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  'NOTA': { fill: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)' }
};

export default function ResultsView({ tally, isRevealed = true, mode = 'assembly', isHost = false }) {
  if (!tally) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Waiting for votes to be cast...</p>
      </div>
    );
  }

  if (!isRevealed && !isHost) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <EyeOff size={28} />
        </div>
        <h3 style={{ marginBottom: '0.5rem' }}>Live Results Hidden</h3>
        <p style={{ color: 'var(--text-muted)' }}>The host has paused live tally visibility until the poll ends.</p>
      </div>
    );
  }

  const totalVotes = tally.totalVotes || 0;
  const totalParticipants = tally.totalParticipants || 0;
  const turnout = tally.turnout || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
            Total Votes
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            {totalVotes}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
            Active Voters
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
            {totalParticipants}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
            Turnout Rate
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
            {turnout}%
          </div>
        </div>

        {mode === 'rating' && (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
              Average Score
            </div>
            <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
              {tally.average ? `${tally.average}/10` : 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Assembly Mode Breakdown */}
      {mode === 'assembly' && tally.counts && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} color="var(--primary-light)" /> Vote Distribution
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.keys(tally.counts).map((opt) => {
              const count = tally.counts[opt] || 0;
              const percent = tally.percentages ? (tally.percentages[opt] || 0) : 0;
              const colors = OPTION_COLORS[opt] || { fill: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' };

              return (
                <div key={opt} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
                      {opt}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {count} {count === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className="font-mono" style={{ fontWeight: 800, fontSize: '1.1rem', color: colors.fill }}>
                        {percent}%
                      </span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: 14,
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: colors.fill,
                      boxShadow: `0 0 12px ${colors.glow}`,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rating Mode Breakdown */}
      {mode === 'rating' && tally.distribution && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="#f59e0b" /> Rating Frequency Spectrum
          </h4>

          {/* Histogram Bar Charts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '0.5rem',
            alignItems: 'flex-end',
            minHeight: '160px',
            paddingTop: '1rem'
          }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
              const count = tally.distribution[String(score)] || 0;
              const maxCount = Math.max(...Object.values(tally.distribution), 1);
              const heightPercent = totalVotes > 0 ? (count / maxCount) * 100 : 0;
              
              const barColor = score <= 3 ? '#f43f5e' : score <= 6 ? '#f59e0b' : score <= 8 ? '#06b6d4' : '#10b981';

              return (
                <div key={score} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}>
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: count > 0 ? '#fff' : 'var(--text-dim)', fontWeight: 700 }}>
                    {count}
                  </span>
                  
                  <div style={{
                    width: '100%',
                    height: `${Math.max(6, heightPercent)}%`,
                    background: count > 0 ? barColor : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px 4px 0 0',
                    boxShadow: count > 0 ? `0 0 10px ${barColor}` : 'none',
                    transition: 'height 0.5s ease',
                    minHeight: 4
                  }} />

                  <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
