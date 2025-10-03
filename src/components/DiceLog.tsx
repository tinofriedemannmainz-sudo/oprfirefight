import React from 'react'
import { useGame } from '@/stores/game'

export default function DiceLog(){
  const g = useGame()
  return (
    <div className="hud">
      <div style={{display:'flex', gap:12, overflowX:'auto'}}>
        {g.diceLog.slice(-6).map((dl,i)=>(
          <div className="panel" key={i} style={{minWidth:240}}>
            <div className="accent" style={{fontSize:12}}>{dl.label}</div>
            <div style={{fontSize:18, fontFamily:'ui-monospace,Menlo,Consolas'}}>{dl.dice.join(' ')}</div>
            <div style={{fontSize:12}}>
              <span className="tag">Ziel: {dl.target}+</span>{' '}
              <span className="tag">Erfolge: {dl.success}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
