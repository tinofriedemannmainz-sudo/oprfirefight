
import React, { useMemo } from 'react'
import type { Hex, TerrainType } from '@/types/battle'

const terrainColors: Record<TerrainType, string> = {
  open: '#1d2331',
  forest: '#11331c',
  rock: '#2b2d36',
  water: '#0f2438',
  ruin: '#2d1f1f'
}

export default function HexCell({hex, size, selected, canDeploy, onClick}:{hex:Hex; size:number; selected:boolean; canDeploy?:boolean; onClick:()=>void}){
  const w = Math.sqrt(3) * size
  const h = 2 * size
  const x = w * (hex.q + hex.r/2)
  const y = h * (3/4) * hex.r
  const points = useMemo(() => {
    const pts = []
    for (let i=0;i<6;i++){
      const angle = Math.PI/3 * i + Math.PI/6
      pts.push(`${x + size*Math.cos(angle)},${y + size*Math.sin(angle)}`)
    }
    return pts.join(' ')
  }, [x,y,size])
  const stroke = selected ? '#9BD0FF' : canDeploy ? '#4cc3ff' : '#384760'
  const strokeWidth = selected ? 3 : canDeploy ? 2 : 1
  return <g onClick={onClick} style={{cursor:'pointer'}}>
    <polygon points={points} fill={terrainColors[hex.terrain]} stroke={stroke} strokeWidth={strokeWidth} />
  </g>
}
