
import React, { useEffect, useState } from 'react'
import { fetchArmyBooks, fetchArmyBook, armyBookToTeam } from '@/services/armyForge'
import { useGame } from '@/stores/game'
import type { Team } from '@/types/battle'

export default function ArmyForgeImport(){
  const g = useGame()
  const [books, setBooks] = useState<{id:string; name:string}[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>()
  const [count, setCount] = useState(0)

  async function loadAll(){
    setLoading(true); setError(undefined)
    try {
      const list = await fetchArmyBooks(3) // GFF
      setBooks(list)
      // Fetch details sequentially to be gentle on API
      const teams: Team[] = []
      let i = 0
      for (const b of list){
        try {
          const book = await fetchArmyBook(b.id, 3)
          const team = armyBookToTeam(book)
          teams.push(team)
        } catch (e){ /* ignore single failures */ }
        i++; setCount(i)
      }
      // Merge with existing available teams
      g.loadTeams([...(g.availableTeams ?? []), ...teams])
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
          <div style={{fontWeight:700}}>Army Forge Import (GFF)</div>
          <div style={{fontSize:12, opacity:0.8}}>Lade offizielle Armeen direkt von army-forge.onepagerules.com</div>
        </div>
        <button className="btn" onClick={loadAll} disabled={loading}>
          {loading ? 'Lade...' : 'Alle Armeen importieren'}
        </button>
      </div>
      {loading && <div style={{marginTop:8}}>
        Fortschritt: {count}/{books.length || '...'}
      </div>}
      {error && <div style={{marginTop:8, color:'#ff9a9a'}}>Fehler: {error}</div>}
      {!!books.length && !loading && <div style={{marginTop:8, fontSize:12, opacity:0.8}}>
        Geladene Armeen: {books.length}. Du findest sie in der Team-Auswahl.
      </div>}
    </div>
  )
}
