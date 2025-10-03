
import React from 'react'
import type { Unit } from '@/types/battle'

export default function UnitSprite({u, selected, onClick}:{u:Unit; selected:boolean; onClick:()=>void}){
  const size = 26
  const w = Math.sqrt(3) * size
  const h = 2 * size
  const x = w * (u.position!.q + u.position!.r/2)
  const y = h * (3/4) * u.position!.r
  return <g onClick={onClick} style={{cursor:'pointer'}} transform={`translate(${x-18},${y-18})`}>
    <image href={u.image} width={36} height={36} style={{ filter: u.owner===0?'drop-shadow(0 0 12px #7aafff)': 'drop-shadow(0 0 12px #ff8a8a)'}}/>
    <rect x={-2} y={28} width={40} height={6} fill="#141824" stroke="#2a3143" rx={3}/>
    <rect x={0} y={30} width={Math.max(0, (u.wounds/u.maxWounds)*36)} height={2} fill={u.owner===0?'#7aafff':'#ff8a8a'}/>
    {selected && <circle cx={18} cy={18} r={20} fill="none" stroke="#9BD0FF" strokeDasharray="4 4" />}
  </g>
}
