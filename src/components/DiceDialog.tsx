import React, { useState } from 'react'

type DiceDialogProps = {
  attackerName: string
  targetName: string
  weaponName: string
  attackerQuality: number
  targetDefense: number
  weaponAP: number
  attacks: number
  isExhausted?: boolean
  isCounterAttack?: boolean
  onClose: (hits: number, wounds: number) => void
}

export default function DiceDialog({
  attackerName,
  targetName,
  weaponName,
  attackerQuality,
  targetDefense,
  weaponAP,
  attacks,
  isExhausted,
  isCounterAttack,
  onClose
}: DiceDialogProps) {
  const [phase, setPhase] = useState<'ready' | 'hit-rolling' | 'hit-result' | 'save-rolling' | 'save-result' | 'done'>('ready')
  const [hitRolls, setHitRolls] = useState<number[]>([])
  const [saveRolls, setSaveRolls] = useState<number[]>([])
  const [hits, setHits] = useState(0)
  const [wounds, setWounds] = useState(0)

  const rollDice = (count: number) => {
    return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6))
  }

  const handleHitRoll = () => {
    setPhase('hit-rolling')
    const rolls = rollDice(attacks)
    setHitRolls(rolls)
    // If exhausted, only 6s hit. Otherwise use normal quality
    const hitThreshold = isExhausted ? 6 : attackerQuality
    const successCount = rolls.filter(d => d >= hitThreshold).length
    setHits(successCount)
    
    setTimeout(() => {
      setPhase('hit-result')
    }, 800)
  }

  const handleSaveRoll = () => {
    if (hits === 0) {
      setPhase('done')
      return
    }
    
    setPhase('save-rolling')
    const saveTarget = Math.max(2, Math.min(6, targetDefense + weaponAP))
    const rolls = rollDice(hits)
    setSaveRolls(rolls)
    const failed = rolls.filter(d => d < saveTarget).length
    setWounds(failed)
    
    setTimeout(() => {
      setPhase('save-result')
    }, 800)
  }

  const handleFinish = () => {
    onClose(hits, wounds)
  }

  const renderDie = (value: number, success: boolean, index: number) => {
    const colors = {
      1: '#ff4444',
      2: '#ff8844',
      3: '#ffaa44',
      4: '#88cc44',
      5: '#44cc88',
      6: '#44ccff'
    }
    
    const color = success ? colors[value as keyof typeof colors] : '#666'
    const dotPositions: Record<number, Array<[number, number]>> = {
      1: [[50, 50]],
      2: [[30, 30], [70, 70]],
      3: [[30, 30], [50, 50], [70, 70]],
      4: [[30, 30], [70, 30], [30, 70], [70, 70]],
      5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
      6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]]
    }

    return (
      <div
        key={index}
        style={{
          width: 50,
          height: 50,
          background: color,
          borderRadius: 6,
          position: 'relative',
          boxShadow: success ? '0 3px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
          border: success ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.2)',
          animation: phase.includes('rolling') ? 'roll 0.5s ease-out' : 'none'
        }}
      >
        <svg width="50" height="50" style={{ position: 'absolute', top: 0, left: 0 }}>
          {dotPositions[value].map(([x, y], i) => (
            <circle key={i} cx={x + '%'} cy={y + '%'} r="4" fill="white" />
          ))}
        </svg>
      </div>
    )
  }

  const saveTarget = Math.max(2, Math.min(6, targetDefense + weaponAP))
  const hitThreshold = isExhausted ? 6 : attackerQuality

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #0f1620 100%)',
        border: '2px solid #2a3a54',
        borderRadius: 12,
        padding: '20px',
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#cfe3ff', fontSize: 24, marginBottom: 8 }}>
            {weaponName} {isCounterAttack && '(Zurückschlagen)'}
          </h2>
          <div style={{ color: '#9ca3af', fontSize: 14 }}>
            {attackerName} greift {targetName} an
          </div>
          {isExhausted && (
            <div style={{ color: '#ff8a8a', fontSize: 13, marginTop: 4 }}>
              ⚠️ Erschöpft - trifft nur auf 6
            </div>
          )}
        </div>

        {phase === 'ready' && (
          <div>
            <div style={{ marginBottom: 24, color: '#cfe3ff' }}>
              <div style={{ fontSize: 16, marginBottom: 12 }}>Trefferwurf:</div>
              <div style={{ fontSize: 14, color: '#9ca3af' }}>
                Würfle {attacks} Würfel. Erfolg bei {hitThreshold}+
              </div>
            </div>
            <button
              onClick={handleHitRoll}
              style={{
                background: 'linear-gradient(135deg, #4a7cff 0%, #2a5cdd 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(74,124,255,0.4)',
                width: '100%'
              }}
            >
              Trefferwurf würfeln
            </button>
          </div>
        )}

        {(phase === 'hit-rolling' || phase === 'hit-result') && (
          <div>
            <div style={{ marginBottom: 16, color: '#cfe3ff', fontSize: 16 }}>
              Trefferwurf (Ziel: {hitThreshold}+)
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {hitRolls.map((roll, i) => renderDie(roll, roll >= hitThreshold, i))}
            </div>
            {phase === 'hit-result' && (
              <div>
                <div style={{ color: '#44cc88', fontSize: 18, marginBottom: 24, fontWeight: 600 }}>
                  {hits} Treffer!
                </div>
                {hits > 0 ? (
                  <button
                    onClick={handleSaveRoll}
                    style={{
                      background: 'linear-gradient(135deg, #ff6644 0%, #dd4422 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 32px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(255,102,68,0.4)',
                      width: '100%'
                    }}
                  >
                    Rettungswurf würfeln
                  </button>
                ) : (
                  <button
                    onClick={() => onClose(0, 0)}
                    style={{
                      background: '#2a3a54',
                      color: 'white',
                      border: 'none',
                      padding: '12px 32px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Schließen
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {(phase === 'save-rolling' || phase === 'save-result') && (
          <div>
            <div style={{ marginBottom: 16, color: '#cfe3ff', fontSize: 16 }}>
              Rettungswurf (Ziel: {saveTarget}+, AP: {weaponAP})
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {saveRolls.map((roll, i) => renderDie(roll, roll >= saveTarget, i))}
            </div>
            {phase === 'save-result' && (
              <div>
                <div style={{ color: wounds > 0 ? '#ff6644' : '#44cc88', fontSize: 18, marginBottom: 24, fontWeight: 600 }}>
                  {wounds} Wunde{wounds !== 1 ? 'n' : ''}!
                </div>
                <button
                  onClick={handleFinish}
                  style={{
                    background: 'linear-gradient(135deg, #44cc88 0%, #22aa66 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(68,204,136,0.4)',
                    width: '100%'
                  }}
                >
                  Fertig
                </button>
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes roll {
            0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
