
import React, { useState, useContext } from 'react'
import { useGame } from '@/stores/game'
import { ViewContext } from './GameView'

export default function Instructions(){
  const g = useGame()
  const { use3D, setUse3D } = useContext(ViewContext)
  const size = g.size
  const topZone = `r <= -${Math.floor(size/2)}`
  const bottomZone = `r >= ${Math.floor(size/2)}`

  const [open, setOpen] = useState(false)

  let lines: string[] = []

  if (g.phase === 'team-select') {
    lines = [
      '🎮 Willkommen zu OPR Firefight!',
      '',
      '📋 Spielvorbereitung:',
      '1) Wähle für beide Spieler je ein Team aus',
      '2) Klicke auf "Weiter: Aufstellung"',
      '',
      '🎯 Spielziel:',
      'Kontrolliere Missionsziele über 4 Runden und sammle die meisten Punkte!'
    ]
  } else if (g.phase === 'deploy') {
    lines = [
      `⚔️ Aufstellung – Spieler ${g.currentPlayer + 1}`,
      '',
      g.currentPlayer === 0
        ? `📍 Deine Zone: Oberes Drittel des Spielfelds (${topZone})`
        : `📍 Deine Zone: Unteres Drittel des Spielfelds (${bottomZone})`,
      '',
      '🔹 Einheit auswählen → Gültiges Hex anklicken',
      '🔹 Platzierte Einheit anklicken = Zurück in Liste',
      '🔹 Wenn beide Teams aufgestellt sind: "Spiel starten"',
      '',
      '💡 Tipp: Nach dem Start erscheinen 3-5 Missionsziele!'
    ]
  } else if (g.phase === 'playing') {
    lines = [
      `⚔️ Spieler ${g.currentPlayer + 1} am Zug | Runde ${g.round}/4`,
      '',
      '🎯 Missionsziele:',
      '• Stehe auf oder neben einem Marker (1 Hex) um ihn zu kontrollieren',
      '• Beide Spieler am Marker = Umkämpft (keine Punkte)',
      '• Am Ende jeder Runde: +1 Punkt pro kontrolliertem Marker',
      '',
      '🏃 Bewegung:',
      '• Eigene Einheit anklicken → Ziel-Hex anklicken',
      '• Normal: Speed-Wert | Rennen: 2× Speed (kein Fernkampf)',
      '• Keine Gegner in Reichweite? → Zug endet automatisch',
      '',
      '⚔️ Kampf:',
      '• Einheit auswählen → Gegner anklicken',
      '• Nahkampf: 1 Hex Entfernung | Fernkampf: Waffenreichweite',
      '• Nach Bewegung nur angreifen wenn Gegner in Reichweite!',
      '',
      '🎲 Würfeln:',
      '• Treffer: Quality-Wert oder höher',
      '• Rettung: Defense-Wert oder höher (minus AP)',
      '',
      '🏆 Sieg nach 4 Runden: Meiste Punkte gewinnt!'
    ]
  } else if (g.phase === 'gameover') {
    lines = [
      '🏁 Spielende!',
      '',
      g.winners === 'draw' 
        ? '🤝 Unentschieden! Beide Spieler haben gleich viele Punkte.'
        : `🏆 Spieler ${(g.winners as number) + 1} gewinnt mit ${g.objectiveScores[g.winners as number]} Punkten!`,
      '',
      '🔄 Neustart: Zurück zur Teamwahl'
    ]
  }

  return (
    <div style={{position:'fixed', right:12, bottom:12, zIndex:60}}>
      {open && (
        <div className="panel" style={{marginBottom:8, maxWidth:480, maxHeight:'70vh', overflowY:'auto'}}>
          <div style={{fontWeight:600, marginBottom:12, fontSize:16, color:'#9BD0FF'}}>
            📖 Spielanleitung
          </div>
          <div style={{lineHeight:1.7, fontSize:13}}>
            {lines.map((l, i) => {
              if (l === '') return <div key={i} style={{height:8}} />
              if (l.startsWith('🎮') || l.startsWith('⚔️') || l.startsWith('🏁')) {
                return <div key={i} style={{fontWeight:600, fontSize:14, marginBottom:8, color:'#9BD0FF'}}>{l}</div>
              }
              if (l.startsWith('📋') || l.startsWith('🎯') || l.startsWith('🏃') || l.startsWith('🎲') || l.startsWith('🏆')) {
                return <div key={i} style={{fontWeight:600, marginTop:8, marginBottom:4, color:'#7affae'}}>{l}</div>
              }
              return <div key={i} style={{marginLeft: l.startsWith('•') || l.startsWith('🔹') ? 0 : 0, marginBottom:3}}>{l}</div>
            })}
          </div>
        </div>
      )}
      <div style={{display:'flex', gap:8}}>
        <button className="btn" onClick={()=>setUse3D(!use3D)} style={{flex:1}}>
          {use3D ? '📐 2D' : '🎮 3D'}
        </button>
        <button className="btn" onClick={()=>setOpen(o=>!o)} style={{flex:1}}>
          {open ? '❌ Schließen' : '📖 Anleitung'}
        </button>
      </div>
    </div>
  )
}
