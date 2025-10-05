
import React, { useEffect, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Team } from '@/types/battle'
import { loadAllTeams } from '@/services/teamLoader'
import Instructions from '@/components/Instructions'

export default function Controls(){
  const g = useGame()
  const [teams, setTeams] = useState<Team[]>([])
  useEffect(()=>{
    loadAllTeams().then(t => { setTeams(t); g.loadTeams(t) })
  },[])

  const canStart = g.units.length > 0 && g.units.every(u => u.position)

  return <div className="floating">
    {g.phase==='team-select' && <div className="panel" style={{minWidth: 560}}>
      <div className="toolbar" style={{gap:12, flexWrap:'wrap'}}>
        <div>
          <div className="accent" style={{fontSize:12}}>Spieler 1 Team</div>
          <select className="select" onChange={(e)=>g.selectTeam(0,e.target.value)}>
            <option>-- waehlen --</option>
            {g.availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <div className="danger" style={{fontSize:12}}>Spieler 2 Team</div>
          <select className="select" onChange={(e)=>g.selectTeam(1,e.target.value)}>
            <option>-- waehlen --</option>
            {g.availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button className="btn" onClick={()=>g.startDeploy()}>Weiter: Aufstellung</button>
      </div>
      
    </div>}

    {g.phase==='deploy' && <div className="panel toolbar">
      <span className="tag">Aufstellung - Spieler {g.currentPlayer+1}</span>
      <button className="btn" onClick={()=>g.startGame()} disabled={!canStart} title={!canStart ? 'Erst muessen alle Einheiten beider Spieler platziert werden.' : ''}>Spiel starten</button>
    </div>}

    {g.phase==='playing' && <div className="panel toolbar">
      <span className="tag">Am Zug: Spieler {g.currentPlayer+1}</span>
      <button className="btn" onClick={()=>g.endTurn()}>Zug beenden</button>
    </div>}
    <Instructions/>
  </div>
}
