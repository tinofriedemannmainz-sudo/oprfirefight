
import React from 'react'
import type { Hex, Unit } from '@/types/battle'
import { hexKey } from '@/utils/hex'

type OverlayProps = {
  moveCosts: Map<string, number>
  runCosts: Map<string, number>
  size: number
  grid: Hex[]
  chargeTargets?: { unit: Unit }[]
  rangedTargets?: Unit[]
}

export default function OverlayLayer({ moveCosts, runCosts, grid, size, chargeTargets = [], rangedTargets = [] }: OverlayProps){
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
    <defs>
      <filter id="moveGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="runGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {grid.map(h => {
      const k = hexKey(h.q,h.r)
      if (!runCosts.has(k)) return null
      const { x, y, points } = hexToPolyPoints(h.q,h.r)
      return (
        <g key={`r-${k}`} filter="url(#runGlow)">
          <polygon points={points} fill="rgba(255, 185, 56, 0.35)" stroke="rgba(255, 185, 56, 0.95)" strokeWidth={3} />
          <circle cx={x} cy={y} r={4} fill="rgba(255,185,56,0.95)" />
        </g>
      )
    })}

    {grid.map(h => {
      const k = hexKey(h.q,h.r)
      if (!moveCosts.has(k)) return null
      const { x, y, points } = hexToPolyPoints(h.q,h.r)
      return (
        <g key={`m-${k}`} filter="url(#moveGlow)">
          <polygon points={points} fill="rgba(56, 190, 255, 0.45)" stroke="rgba(56, 190, 255, 1)" strokeWidth={3.2} />
          <circle cx={x} cy={y} r={4} fill="rgba(56,190,255,1)" />
        </g>
      )
    })}
  </g>
}
