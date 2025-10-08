
import React from 'react'
import { useGame } from '@/stores/game'

export default function ActionBar(){
  const g = useGame()
  const u = g.units.find(x => x.id===g.selectedUnitId)

  if (g.phase!=='playing' || !u || u.owner!==g.currentPlayer || u.activated) return null

  const canMove = !u.hasMoved && (u.usedWeapons?.length || 0) === 0
  const canShoot = g.canUnitShoot(u.id)
  const availableWeapons = g.getAvailableWeapons(u.id)

  const btn = (label:string, onClick:()=>void, disabled=false) => (
    <button disabled={disabled} onClick={onClick} className="abtn">{label}</button>
  )

  return (
    <div style={{ position:'absolute', left:12, bottom:12, background:'rgba(10,14,22,0.95)', border:'1px solid #2a3a54', borderRadius:10, padding:8, display:'flex', flexDirection:'column', gap:8, zIndex: 51, minWidth: 200 }}>
      <div style={{ color:'#cfe3ff', fontSize:14, fontWeight:600 }}>{u.name}</div>
      {canMove && (
        <div style={{ fontSize:11, color:'#9ca3af' }}>
          Bewegung: {u.speed}" normal / {u.speed*2}" rennen
        </div>
      )}
      {canShoot && availableWeapons.length > 0 && (
        <div>
          <div style={{ color:'#9ca3af', fontSize:11, marginBottom:4 }}>Verfügbare Waffen:</div>
          {availableWeapons.map(w => (
            <div key={w.name} style={{ fontSize:11, color:'#cfe3ff', marginBottom:2 }}>
              • {w.name} ({(w.range || 0) === 0 ? 'Nahkampf' : `${w.range}"`}, {w.attacks} Würfel)
            </div>
          ))}
        </div>
      )}
      {u.hasRun && (
        <div style={{ fontSize:11, color:'#ff8a8a' }}>Gerannt - kann nicht schießen</div>
      )}
      <div style={{ width:'100%', height:1, background:'#2a3a54' }} />
      {btn('Aktivierung beenden', ()=>g.endActivation())}
      <style>{`
        .abtn { background:#1e2638; color:#cfe3ff; border:1px solid #34415d; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px }
        .abtn:disabled { opacity:0.5; cursor:not-allowed }
        .abtn:hover:not(:disabled) { background:#26304a }
      `}</style>
    </div>
  )
}
