
import React from 'react'
import { useGame } from '@/stores/game'

export default function TurnHUD(){
  const g = useGame()

  const p0Left = g.units.filter(u => u.owner===0 && u.position && !u.activated).length
  const p1Left = g.units.filter(u => u.owner===1 && u.position && !u.activated).length

  return (
    <div style={{ position:'absolute', left:12, top:12, display:'flex', gap:12, alignItems:'center', zIndex: 50 }}>
      <span style={{ background:'#1b2538', border:'1px solid #2f3e5b', padding:'6px 10px', borderRadius: 10 }}>
        <strong>Runde {g.round}</strong>
      </span>
      <span style={{ background: g.currentPlayer===0?'#1f2b44':'#131a2b', border:'1px solid #2f3e5b', padding:'6px 10px', borderRadius: 10 }}>
        P1 übrig: {p0Left}
      </span>
      <span style={{ background: g.currentPlayer===1?'#1f2b44':'#131a2b', border:'1px solid #2f3e5b', padding:'6px 10px', borderRadius: 10 }}>
        P2 übrig: {p1Left}
      </span>
      <span style={{ opacity:0.8, fontSize:13 }}>
        Spieler am Zug: <strong>{g.currentPlayer+1}</strong>
      </span>
    </div>
  )
}
