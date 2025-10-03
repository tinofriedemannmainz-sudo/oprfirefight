
import React, { useEffect, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Hex, Unit } from '@/types/battle'
import HexCell from './HexCell'
import UnitSprite from './UnitSprite'

export default function HexGrid(){
  const g = useGame()
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>()
  useEffect(()=>{ if(g.grid.length===0){ g.regenerate() } },[])

  const size = 26
  const w = Math.sqrt(3) * size
  const h = 2 * size

  function hexToPixel(q:number, r:number) {
    return { x: w * (q + r / 2), y: h * (3 / 4) * r }
  }

  const positions = g.grid.map(hex => hexToPixel(hex.q, hex.r));
  const minX = positions.length ? Math.min(...positions.map(p => p.x)) : 0;
  const maxX = positions.length ? Math.max(...positions.map(p => p.x)) : 0;
  const minY = positions.length ? Math.min(...positions.map(p => p.y)) : 0;
  const maxY = positions.length ? Math.max(...positions.map(p => p.y)) : 0;

  const width = 1200
  const height = 800

  const translateX = (width - (maxX - minX)) / 2 - minX
  const translateY = (height - (maxY - minY)) / 2 - minY

  function handleHexClick(hex:Hex){
    setSelectedHex(hex)
    if (g.phase==='deploy' && g.selectedUnitId){
      g.placeUnit(g.selectedUnitId, hex)
    }
    if (g.phase==='playing' && g.selectedUnitId){
      g.moveUnit(g.selectedUnitId, hex)
    }
  }

  function handleUnitClick(u:Unit){
    if (g.phase==='deploy'){
      if (u.owner!==g.currentPlayer) return
      g.selectUnit(u.id)
    } else if (g.phase==='playing'){
      if (u.owner===g.currentPlayer) { g.selectUnit(u.id) }
      else if (g.selectedUnitId){
        const atk = g.units.find(x => x.id===g.selectedUnitId)!
        const weapon = atk.weapons[0]
        g.attack(atk.id, u.id, weapon.name)
      }
    }
  }

  return <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
    <g transform={`translate(${translateX},${translateY})`}>
      {g.grid.map(hx => <HexCell key={`${hx.q},${hx.r}`} hex={hx} size={26} onClick={()=>handleHexClick(hx)} selected={selectedHex?.q===hx.q && selectedHex?.r===hx.r}/>)}
      {g.units.filter(u => u.position).map(u => <UnitSprite key={u.id} u={u as Unit} selected={g.selectedUnitId===u.id} onClick={()=>handleUnitClick(u as Unit)} />)}
    </g>
  </svg>
}
