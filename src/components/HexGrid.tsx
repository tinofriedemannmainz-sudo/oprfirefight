
import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Hex, Unit } from '@/types/battle'
import HexCell from '@/components/HexCell'
import UnitSprite from '@/components/UnitSprite'
import UnitContextMenu from '@/components/UnitContextMenu'

export default function HexGrid(){
  const g = useGame()
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>()
  const [menu, setMenu] = useState<{u:Unit, x:number, y:number}|null>(null)

  useEffect(()=>{ if(g.grid.length===0){ g.regenerate() } },[])

  const size = 30
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

  const occupantByKey = useMemo(() => {
    const m = new Map<string, 0|1>()
    for (const u of g.units){
      if (!u.position) continue
      m.set(`${u.position.q},${u.position.r}`, u.owner)
    }
    return m
  }, [g.units])

  const canDeployHere = (hex:Hex) => {
    if (g.phase !== 'deploy') return false
    const occupied = occupantByKey.has(`${hex.q},${hex.r}`)
    if (occupied) return false
    if (g.currentPlayer === 0) return hex.r <= -Math.floor(g.size/2)
    return hex.r >= Math.floor(g.size/2)
  }

  function handleHexClick(hex:Hex){
    setSelectedHex(hex)
    if (g.phase==='deploy' && g.selectedUnitId){
      if (!canDeployHere(hex)) return
      g.placeUnit(g.selectedUnitId, hex)
    }
    if (g.phase==='playing' && g.selectedUnitId){
      g.moveUnit(g.selectedUnitId, hex)
    }
  }

  function handleUnitClick(u:Unit){
    if (g.phase==='deploy'){
      if (u.owner===g.currentPlayer && u.position){
        g.unplaceUnit(u.id)
      } else if (u.owner===g.currentPlayer) {
        g.selectUnit(u.id)
      }
    } else if (g.phase==='playing'){
      if (u.owner===g.currentPlayer) { g.selectUnit(u.id) }
      else if (g.selectedUnitId){
        const atk = g.units.find(x => x.id===g.selectedUnitId)!
        const weapon = atk.weapons[0]
        g.attack(atk.id, u.id, weapon.name)
      }
    }
  }

  function handleUnitContext(e:React.MouseEvent, u:Unit){
    setMenu({ u, x: e.clientX, y: e.clientY })
  }

  return <>
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" onClick={()=>setMenu(null)}>
      <g transform={`translate(${translateX},${translateY})`}>
        {g.grid.map(hx => (
          <HexCell
            key={`${hx.q},${hx.r}`}
            hex={hx}
            size={size}
            onClick={()=>handleHexClick(hx)}
            selected={selectedHex?.q===hx.q && selectedHex?.r===hx.r}
            canDeploy={canDeployHere(hx)}
            occupantOwner={occupantByKey.get(`${hx.q},${hx.r}`)}
          />
        ))}
        {g.units.filter(u => u.position).map(u => (
          <UnitSprite
            key={u.id}
            u={u as Unit}
            selected={g.selectedUnitId===u.id}
            onClick={()=>handleUnitClick(u as Unit)}
            onContext={(e)=>handleUnitContext(e, u as Unit)}
          />
        ))}
      </g>
    </svg>
    {menu && <UnitContextMenu unit={menu.u} x={menu.x} y={menu.y} onClose={()=>setMenu(null)} />}
  </>
}
