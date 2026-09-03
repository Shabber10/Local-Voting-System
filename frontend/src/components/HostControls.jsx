import React from 'react';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle, 
  Download, 
  QrCode, 
  Edit3 
} from 'lucide-react';

export default function HostControls({
  isLocked,
  isRevealed,
  isEnded,
  onToggleLock,
  onToggleReveal,
  onResetVotes,
  onEndPoll,
  onExportCsv,
  onOpenQr,
  onEditTitle
}) {
  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      padding: '1rem 1.5rem',
      borderRadius: 'var(--radius-lg)'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
        {/* QR Code Button */}
        <button 
          onClick={onOpenQr}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.1rem' }}
        >
          <QrCode size={16} />
          <span>Show QR Code</span>
        </button>

        {/* Lock / Unlock */}
        <button 
          onClick={onToggleLock}
          className={`btn ${isLocked ? 'btn-danger' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 1rem' }}
        >
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          <span>{isLocked ? 'Room Locked' : 'Room Open'}</span>
        </button>

        {/* Reveal / Hide Results */}
        <button 
          onClick={onToggleReveal}
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1rem' }}
        >
          {isRevealed ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>{isRevealed ? 'Results Visible' : 'Results Hidden'}</span>
        </button>

        {/* Edit Question */}
        <button 
          onClick={onEditTitle}
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1rem' }}
        >
          <Edit3 size={16} />
          <span>Edit Prompt</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
        {/* Reset Votes */}
        <button 
          onClick={onResetVotes}
          disabled={isEnded}
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1rem' }}
          title="Reset all votes to 0"
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>

        {/* Export CSV */}
        <button 
          onClick={onExportCsv}
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1rem' }}
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>

        {/* End Session */}
        {!isEnded ? (
          <button 
            onClick={onEndPoll}
            className="btn btn-success"
            style={{ padding: '0.6rem 1.25rem' }}
          >
            <CheckCircle size={16} />
            <span>Conclude Poll</span>
          </button>
        ) : (
          <span className="badge badge-live" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
            Poll Concluded
          </span>
        )}
      </div>
    </div>
  );
}
