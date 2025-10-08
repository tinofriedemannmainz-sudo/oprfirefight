import React from 'react';
import { useGame } from '@/stores/game';

export default function ScoreDisplay() {
  const g = useGame();

  if (g.phase !== 'playing' && g.phase !== 'gameover') return null;

  const [score0, score1] = g.objectiveScores;
  const controlledByP0 = g.objectives.filter(obj => obj.controlledBy === 0 && !obj.contested).length;
  const controlledByP1 = g.objectives.filter(obj => obj.controlledBy === 1 && !obj.contested).length;
  const contested = g.objectives.filter(obj => obj.contested).length;

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        background: 'linear-gradient(180deg, #1b2538, #141824)',
        border: '2px solid #2f3e5b',
        borderRadius: 16,
        padding: '12px 16px',
        minWidth: 200,
        zIndex: 50,
      }}
    >
      <div style={{ marginBottom: 12, textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#9BD0FF' }}>
        🎯 Missionsziele
      </div>

      {/* Total Scores */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            flex: 1,
            background: '#1f2b44',
            border: '2px solid #3b82f6',
            borderRadius: 10,
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: '#9BD0FF', marginBottom: 4 }}>Spieler 1</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#60a5fa' }}>{score0}</div>
          <div style={{ fontSize: 10, color: '#718096', marginTop: 2 }}>Punkte</div>
        </div>

        <div
          style={{
            flex: 1,
            background: '#2b1f1f',
            border: '2px solid #ef4444',
            borderRadius: 10,
            padding: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 4 }}>Spieler 2</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f87171' }}>{score1}</div>
          <div style={{ fontSize: 10, color: '#718096', marginTop: 2 }}>Punkte</div>
        </div>
      </div>

      {/* Current Control */}
      <div
        style={{
          background: '#0f1419',
          border: '1px solid #2a3143',
          borderRadius: 8,
          padding: '8px',
          fontSize: 12,
        }}
      >
        <div style={{ marginBottom: 6, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
          Aktuelle Kontrolle
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#3b82f6',
              }}
            />
            <span style={{ color: '#9BD0FF' }}>{controlledByP0}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#d97706',
              }}
            />
            <span style={{ color: '#f59e0b' }}>{contested}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
              }}
            />
            <span style={{ color: '#fca5a5' }}>{controlledByP1}</span>
          </div>
        </div>
      </div>

      {/* Round Info */}
      <div
        style={{
          marginTop: 8,
          textAlign: 'center',
          fontSize: 11,
          color: '#718096',
        }}
      >
        Runde {g.round} / 4
      </div>

      {g.phase === 'gameover' && (
        <div
          style={{
            marginTop: 12,
            padding: '8px',
            background: g.winners === 0 ? '#1e3a8a' : g.winners === 1 ? '#7f1d1d' : '#374151',
            border: '2px solid ' + (g.winners === 0 ? '#3b82f6' : g.winners === 1 ? '#ef4444' : '#6b7280'),
            borderRadius: 8,
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#fff',
          }}
        >
          {g.winners === 'draw' ? '🤝 Unentschieden!' : `🏆 Spieler ${(g.winners as number) + 1} gewinnt!`}
        </div>
      )}
    </div>
  );
}
