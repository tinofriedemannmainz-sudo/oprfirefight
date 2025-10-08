
import React from 'react'
import { useGame } from '@/stores/game'

export default function TurnHUD(){
  const g = useGame()

  // Only show during playing phase
  if (g.phase !== 'playing') return null

  const p0Left = g.units.filter(u => u.owner===0 && u.position && !u.activated).length
  const p1Left = g.units.filter(u => u.owner===1 && u.position && !u.activated).length

  return (
    <div style={{ position:'absolute', left:12, top:12, display:'flex', gap:12, alignItems:'center', zIndex: 50 }}>
      <span style={{ background:'#1b2538', border:'1px solid #2f3e5b', padding:'6px 10px', borderRadius: 10 }}>
        <strong>Runde {g.round}/4</strong>
      </span>
      <span style={{ 
        background: g.currentPlayer===0 ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' : '#131a2b',
        border: g.currentPlayer===0 ? '2px solid #3b82f6' : '1px solid #2f3e5b',
        padding:'6px 10px',
        borderRadius: 10,
        boxShadow: g.currentPlayer===0 ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
        fontWeight: g.currentPlayer===0 ? 'bold' : 'normal'
      }}>
        🔵 P1: {p0Left}
      </span>
      <span style={{ 
        background: g.currentPlayer===1 ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : '#131a2b',
        border: g.currentPlayer===1 ? '2px solid #ef4444' : '1px solid #2f3e5b',
        padding:'6px 10px',
        borderRadius: 10,
        boxShadow: g.currentPlayer===1 ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
        fontWeight: g.currentPlayer===1 ? 'bold' : 'normal'
      }}>
        🔴 P2: {p1Left}
      </span>
    </div>
  )
}
