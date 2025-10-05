
import React from 'react'
import type { Hex, Unit } from '@/types/battle'
import { hexKey } from '@/utils/hex'

type OverlayProps = {
  moveCosts: Map<string, number>
  runCosts: Map<string, number>
  size: number
  grid: Hex[]
  chargeTargets: { unit: Unit }[]
  rangedTargets: Unit[]
}

export default function OverlayLayer({ moveCosts, runCosts, grid, size, chargeTargets, rangedTargets }: OverlayProps){
  const w = Math.sqrt(3) * size
  const h = 2 * size

  function hexToPolyPoints(q:number, r:number){
    const x = w * (q + r/2)
    const y = h * (3/4) * r
    const pts: string[] = []
    for (let i=0;i<6;i++){
      const ang = Math.PI/3 * i + Math.PI/6
      pts.push(`${x + size*Math.cos(ang)},${y + size*Math.sin(ang)}`)
    }
    return { x, y, points: pts.join(' ') }
  }

  return <g pointerEvents="none">
    {grid.map(h => {
      const k = hexKey(h.q,h.r)
      if (!moveCosts.has(k)) return null
      const { points } = hexToPolyPoints(h.q,h.r)
      return <polygon key={`m-${k}`} points={points} fill="rgba(76,195,255,0.22)" stroke="rgba(76,195,255,0.8)" strokeWidth={1.8} />
    })}
    {grid.map(h => {
      const k = hexKey(h.q,h.r)
      if (!runCosts.has(k)) return null
      const { points } = hexToPolyPoints(h.q,h.r)
      return <polygon key={`r-${k}`} points={points} fill="rgba(255,212,106,0.2)" stroke="rgba(255,212,106,0.75)" strokeWidth={1.6} />
    })}
    {chargeTargets.map(({unit}) => {
      if (!unit.position) return null
      const { x, y } = hexToPolyPoints(unit.position.q, unit.position.r)
      return <circle key={`c-${unit.id}`} cx={x} cy={y} r={18} fill="none" stroke="rgba(255,110,110,0.95)" strokeWidth={3} />
    })}
    {rangedTargets.map(u => {
      if (!u.position) return null
      const { x, y } = hexToPolyPoints(u.position.q, u.position.r)
      return <circle key={`rt-${u.id}`} cx={x} cy={y} r={10} fill="rgba(255,120,120,0.9)" />
    })}
  </g>
}
