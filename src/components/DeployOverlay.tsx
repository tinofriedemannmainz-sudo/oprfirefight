import React from 'react'
import type { Hex } from '@/types/battle'

export default function DeployOverlay({ grid, canDeploy }:{ grid:Hex[]; canDeploy:(h:Hex)=>boolean }){
  const size = 30
  const w = Math.sqrt(3) * size
  const h2 = 2 * size

  function hexToPolyPoints(q:number, r:number){
    const x = w * (q + r/2)
    const y = h2 * (3/4) * r
    const pts: string[] = []
    for (let i=0;i<6;i++){
      const ang = Math.PI/3 * i + Math.PI/6
      pts.push(`${x + size*Math.cos(ang)},${y + size*Math.sin(ang)}`)
    }
    return { points: pts.join(' ') }
  }

  return <g pointerEvents="none">
    {grid.map(hx => {
      if (!canDeploy(hx)) return null
      const { points } = hexToPolyPoints(hx.q,hx.r)
      return <polygon key={`d-${hx.q},${hx.r}`} points={points} fill="rgba(76,195,255,0.18)" stroke="rgba(76,195,255,0.75)" strokeWidth={2} />
    })}
  </g>
}
