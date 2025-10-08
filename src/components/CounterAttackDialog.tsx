import React from 'react'
import { useGame } from '@/stores/game'

export default function CounterAttackDialog() {
  const g = useGame()
  const prompt = g.counterAttackPrompt
  
  if (!prompt) return null
  
  const defender = g.units.find(u => u.id === prompt.defenderId)
  const attacker = g.units.find(u => u.id === prompt.attackerId)
  
  if (!defender || !attacker) return null
  
  const isExhausted = defender.hasAttackedInMelee || defender.isExhausted
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #0f1620 100%)',
        border: '2px solid #2a3a54',
        borderRadius: 16,
        padding: 32,
        minWidth: 400,
        maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#cfe3ff', fontSize: 24, marginBottom: 8 }}>
            Zurückschlagen?
          </h2>
          <div style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>
            <strong>{defender.name}</strong> wurde von <strong>{attacker.name}</strong> im Nahkampf angegriffen und hat überlebt.
          </div>
        </div>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ color: '#cfe3ff', fontSize: 14, marginBottom: 8 }}>
            Status: {isExhausted ? (
              <span style={{ color: '#ff8a8a' }}>⚠️ Erschöpft (trifft nur auf 6)</span>
            ) : (
              <span style={{ color: '#44cc88' }}>✓ Volle Stärke</span>
            )}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 13 }}>
            {isExhausted 
              ? `${defender.name} hat bereits im Nahkampf gekämpft und ist erschöpft.`
              : `${defender.name} hat noch nicht im Nahkampf gekämpft und kann in voller Stärke zurückschlagen.`
            }
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => g.acceptCounterAttack()}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #ff6644 0%, #dd4422 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,102,68,0.4)'
            }}
          >
            Ja, zurückschlagen!
          </button>
          <button
            onClick={() => g.declineCounterAttack()}
            style={{
              flex: 1,
              background: '#2a3a54',
              color: '#cfe3ff',
              border: '1px solid #34415d',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Nein, verzichten
          </button>
        </div>
      </div>
    </div>
  )
}
