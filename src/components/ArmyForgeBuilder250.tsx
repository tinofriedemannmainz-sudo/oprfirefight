
import React, { useState } from 'react'
import { buildAllOfficialTeams250 } from '@/services/armyForge250'
import { useGame } from '@/stores/game'

export default function ArmyForgeBuilder250(){
  const g = useGame()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string|undefined>()

  async function run(){
    setLoading(true); setError(undefined)
    try {
      const teams = await buildAllOfficialTeams250()
      g.loadTeams([...(g.availableTeams||[]), ...teams])
      setDone(teams.length)
    } catch (e:any){
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel" style={{marginTop:8}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
        <div>
          <div style={{fontWeight:700}}>Build 250pt Teams (Official)</div>
          <div style={{fontSize:12, opacity:0.8}}>Importiert alle offiziellen Firefight-Armeen und erzeugt ein 250-Punkte-Team je Armee.</div>
        </div>
        <button className="btn" onClick={run} disabled={loading}>
          {loading ? 'Bauen...' : 'Alle 250pt Teams bauen'}
        </button>
      </div>
      {loading && <div style={{marginTop:8, fontSize:12, opacity:0.8}}>Bitte warten, Teams werden geladen...</div>}
      {typeof done === 'number' && done>0 && !loading && <div style={{marginTop:8}}>Fertig: {done} Teams hinzugefügt. Du findest sie in der Team-Auswahl.</div>}
      {error && <div style={{marginTop:8, color:'#ff9a9a'}}>Fehler: {error}</div>}
    </div>
  )
}
