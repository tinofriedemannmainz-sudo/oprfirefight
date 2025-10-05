
import React from 'react'
import { useGame } from '@/stores/game'

export default function ActionBar(){
  const g = useGame()
  const u = g.units.find(x => x.id===g.selectedUnitId)

  if (g.phase!=='playing' || !u || u.owner!==g.currentPlayer || u.activated) return null

  const btn = (label:string, onClick:()=>void, disabled=false) => (
    <button disabled={disabled} onClick={onClick} className="abtn">{label}</button>
  )

  return (
    <div style={{ position:'absolute', left:12, bottom:12, background:'rgba(10,14,22,0.95)', border:'1px solid #2a3a54', borderRadius:10, padding:8, display:'flex', gap:8, zIndex: 51 }}>
      {btn('Advance', ()=>g.setActionMode('advance'))}
      {btn('Run', ()=>g.setActionMode('run'))}
      {btn('Shoot', ()=>g.setActionMode('shoot'))}
      {btn('Charge', ()=>g.setActionMode('charge'))}
      <div style={{ width:1, background:'#2a3a54', margin:'0 4px' }} />
      {btn('End', ()=>g.endActivation())}
      <style>{`
        .abtn { background:#1e2638; color:#cfe3ff; border:1px solid #34415d; padding:6px 10px; border-radius:8px; cursor:pointer }
        .abtn:disabled { opacity:0.5; cursor:not-allowed }
        .abtn:hover { background:#26304a }
      `}</style>
    </div>
  )
}
