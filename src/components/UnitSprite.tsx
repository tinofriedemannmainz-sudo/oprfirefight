
import React from 'react'
import type { Unit } from '@/types/battle'

export default function UnitSprite({u, selected, onClick, onContext}:{u:Unit; selected:boolean; onClick:()=>void; onContext:(e:React.MouseEvent)=>void}){
  const size = 30 // hex radius
  const w = Math.sqrt(3) * size
  const h = 2 * size
  const x = w * (u.position!.q + u.position!.r/2)
  const y = h * (3/4) * u.position!.r
  const imgSize = 44 // bigger icon visuals

  return <g onClick={onClick} onContextMenu={(e)=>{ e.preventDefault(); onContext(e) }} style={{cursor:'pointer'}} transform={`translate(${x - imgSize/2},${y - imgSize/2})`}>
    <image href={u.image} width={imgSize} height={imgSize} style={{ filter: u.owner===0?'drop-shadow(0 0 12px #7aafff)': 'drop-shadow(0 0 12px #ff8a8a)'}}/>
    <rect x={-2} y={imgSize-6} width={imgSize+4} height={6} fill="#141824" stroke="#2a3143" rx={3}/>
    <rect x={0} y={imgSize-4} width={Math.max(0, (u.wounds/u.maxWounds)*imgSize)} height={2} fill={u.owner===0?'#7aafff':'#ff8a8a'}/>
    {selected && <circle cx={imgSize/2} cy={imgSize/2} r={imgSize/2 + 6} fill="none" stroke="#9BD0FF" strokeDasharray="4 4" />}
  </g>
}
