
import React, { useState } from 'react'
import { useGame } from '@/stores/game'

export default function DeployPanel(){
  const g = useGame()
  const [open, setOpen] = useState(false)
  if (g.phase !== 'deploy') return null

  const myUnits = g.units.filter(u => u.owner === g.currentPlayer)
  const placed = myUnits.filter(u => u.position).length
  const total = myUnits.length
  const remaining = myUnits.filter(u => !u.position)
  const other = g.currentPlayer === 0 ? 1 : 0
  const canStart = g.units.length > 0 && g.units.every(u => u.position)

  return (
    <div style={{position:'fixed', right:12, bottom:12, zIndex:60, maxWidth:520}}>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <button className="btn" onClick={()=>setOpen(o=>!o)}>
          {open ? 'Aufstell-Liste schliessen' : 'Aufstell-Liste oeffnen'}
        </button>
        <button className="btn" onClick={()=>g.autoDeployUnits()} title="Alle Einheiten automatisch platzieren">
          Automatische Aufstellung
        </button>
        <button className="btn" onClick={()=>g.deployNext()} title="Zum anderen Spieler wechseln">
          Fertig mit Aufstellung (zu Spieler {other+1})
        </button>
        <button className="btn" onClick={()=>g.startGame()} disabled={!canStart} title={!canStart ? 'Erst muessen alle Einheiten beider Spieler platziert werden.' : ''}>
          Spiel starten
        </button>
      </div>
      {open && (
        <div className="panel" style={{marginTop:8}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div>
              <div style={{fontWeight:700}}>Aufstellung - Spieler {g.currentPlayer + 1}</div>
              <div style={{fontSize:12, opacity:0.8}}>Platziert: {placed}/{total}</div>
            </div>
          </div>

          {remaining.length === 0 ? (
            <div style={{opacity:0.8}}>Alle Einheiten dieses Spielers sind platziert.</div>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8}}>
              {remaining.map(u => (
                <div key={u.id} className="panel" style={{display:'flex', alignItems:'center', gap:10}}>
                  <img src={u.image} alt={u.name} width={36} height={36} style={{borderRadius:8}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600, fontSize:14}}>{u.name}</div>
                    <div style={{fontSize:12, opacity:0.8}}>Speed {u.speed} / Q {u.quality}+ / Def {u.defense}+</div>
                  </div>
                  <button className="btn" onClick={()=>g.selectUnit(u.id)}>Auswaehlen</button>
                </div>
              ))}
            </div>
          )}

          <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
            <span className="tag">Hinweis</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}>
  Einheit auswaehlen &gt; gueltiges Hex in deiner Zone anklicken. Platzierten Trupp anklicken, um ihn zu entfernen.
</span>

          </div>
        </div>
      )}
    </div>
  )
}
