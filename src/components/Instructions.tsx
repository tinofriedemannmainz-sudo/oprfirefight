
import React, { useState } from 'react'
import { useGame } from '@/stores/game'

export default function Instructions(){
  const g = useGame()
  const size = g.size
  const topZone = `r <= -${Math.floor(size/2)}`
  const bottomZone = `r >= ${Math.floor(size/2)}`

  const [open, setOpen] = useState(false)

  let lines: string[] = []

  if (g.phase === 'team-select') {
    lines = [
      '1) Waehle fuer beide Spieler je ein Team im Panel oben rechts.',
      '2) Klicke auf "Weiter: Aufstellung".'
    ]
  } else if (g.phase === 'deploy') {
    lines = [
      `Aufstellung – Spieler ${g.currentPlayer + 1}`,
      g.currentPlayer === 0
        ? `Gueltige Zone fuer Spieler 1: ${topZone} (oberes Spielfeld-Drittel).`
        : `Gueltige Zone fuer Spieler 2: ${bottomZone} (unteres Spielfeld-Drittel).`,
      'Ablauf: Einheit in der Liste auswaehlen -> gueltiges Hex klicken.',
      'Entfernen: Platzierten Trupp anklicken, um ihn zurueck in die Liste zu legen.',
      'Wenn beide Teams komplett stehen: "Spiel starten".'
    ]
  } else if (g.phase === 'playing') {
    lines = [
      `Zug – Spieler ${g.currentPlayer + 1}`,
      'Bewegen: Eigene Einheit anklicken -> freies Hex in Reichweite anklicken.',
      'Angreifen: Eigene Einheit anklicken -> Gegner anklicken (RW beachten).',
      'Wuerfel: Unten werden Treffer/Rettungen geloggt.',
      'Zug beenden: Button oben rechts.'
    ]
  } else if (g.phase === 'gameover') {
    lines = [
      'Spielende.',
      'Neustart ueber Teamwahl und Aufstellung.'
    ]
  }

  return (
    <div style={{position:'fixed', left:12, bottom:12, zIndex:60}}>
      <button className="btn" onClick={()=>setOpen(o=>!o)}>
        {open ? 'Anleitung schliessen' : 'Anleitung anzeigen'}
      </button>
      {open && (
        <div className="panel" style={{marginTop:8, maxWidth:420}}>
          <div style={{fontWeight:600, marginBottom:6}}>Anleitung</div>
          <ul style={{margin:0, paddingLeft:18, lineHeight:1.6}}>
            {lines.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
