
import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Hex, Unit } from '@/types/battle'
import HexCell from '@/components/HexCell'
import UnitSprite from '@/components/UnitSprite'
import UnitContextMenu from '@/components/UnitContextMenu'
import HexTextures from '@/components/HexTextures'
import OverlayLayer from '@/components/OverlayLayer'
import DeployOverlay from '@/components/DeployOverlay'
import ActionBar from '@/components/ActionBar'
import TurnHUD from '@/components/TurnHUD'
import { reachableCosts } from '@/utils/path'
import { gridLookup, axialNeighbors, axialDistance, hexKey } from '@/utils/hex'
import { TERRAIN_RULES } from '@/utils/terrain'

export default function HexGrid(){
  const g = useGame()
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>()
  const [menu, setMenu] = useState<{u:Unit, x:number, y:number}|null>(null)

  useEffect(()=>{ if(g.grid.length===0){ g.regenerate() } },[])

  const size = 30
  const w = Math.sqrt(3) * size
  const h = 2 * size

  function hexToPixel(q:number, r:number) { return { x: w * (q + r/2), y: h * (3/4) * r } }
  function hexCorner(x:number, y:number, i:number){
    const ang = Math.PI/3 * i + Math.PI/6
    return { cx: x + size*Math.cos(ang), cy: y + size*Math.sin(ang) }
  }

  const positions = g.grid.map(hex => hexToPixel(hex.q, hex.r))
  const minX = positions.length ? Math.min(...positions.map(p => p.x)) : 0
  const maxX = positions.length ? Math.max(...positions.map(p => p.x)) : 0
  const minY = positions.length ? Math.min(...positions.map(p => p.y)) : 0
  const maxY = positions.length ? Math.max(...positions.map(p => p.y)) : 0
  const width = 1200, height = 800
  const translateX = (width - (maxX - minX)) / 2 - minX
  const translateY = (height - (maxY - minY)) / 2 - minY

  const map = useMemo(()=>gridLookup(g.grid), [g.grid])

  const occupantByKey = useMemo(() => {
    const m = new Map<string, Unit>()
    for (const u of g.units){
      if (!u.position) continue
      m.set(hexKey(u.position.q, u.position.r), u)
    }
    return m
  }, [g.units])

  const selUnit = g.units.find(u => u.id===g.selectedUnitId)
  const { moveCosts, runCosts } = useMemo(() => {
    if (!selUnit || !selUnit.position) return { moveCosts:new Map(), runCosts:new Map() }
    const maxMove = selUnit.speed
    const maxRun = selUnit.speed * 2
    const allCosts = reachableCosts(selUnit, g.grid, selUnit.position, maxRun)
    const move = new Map<string,number>()
    const run = new Map<string,number>()
    for (const [k,c] of allCosts){
      if (k===`${selUnit.position.q},${selUnit.position.r}`) continue
      if (c <= maxMove) move.set(k, c)
      else if (c <= maxRun) run.set(k, c)
    }
    return { moveCosts: move, runCosts: run }
  }, [g.selectedUnitId, g.units, g.grid])

  function handleHexClick(hex:Hex){
    setSelectedHex(hex)
    if (g.phase==='deploy'){
      if (!g.selectedUnitId) return
      if (!g.canDeployOn(hex)) return
      g.placeUnit(g.selectedUnitId, hex)
      return
    }
    if (g.phase==='playing' && selUnit){
      const k = `${hex.q},${hex.r}`
      if (g.actionMode==='advance' && moveCosts.has(k)){
        g.moveUnit(selUnit.id, hex)
        return
      }
      if (g.actionMode==='run' && (moveCosts.has(k) || runCosts.has(k))){
        g.moveUnit(selUnit.id, hex)
        g.endActivation()
        return
      }
    }
  }

  function handleUnitClick(u:Unit){
    if (g.phase==='deploy'){
      if (u.owner===g.currentPlayer && u.position){ g.unplaceUnit(u.id) }
      else if (u.owner===g.currentPlayer) { g.selectUnit(u.id) }
    } else if (g.phase==='playing'){
      if (u.owner===g.currentPlayer && !u.activated) {
        g.selectUnit(u.id)
      }
    }
  }

  function ActivatedMarker({u}:{u:Unit}){
    if (!u.position || !u.activated) return null
    const center = hexToPixel(u.position.q, u.position.r)
    const { cx, cy } = hexCorner(center.x, center.y, 0) // top-right corner
    return <circle cx={cx - 4} cy={cy + 4} r={5} fill="rgba(255,120,120,0.95)" stroke="rgba(30,30,30,0.9)" strokeWidth={1.2} />
  }

  return <>
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <HexTextures/>
      <g transform={`translate(${translateX},${translateY})`}>
        {g.grid.map(hx => (
          <HexCell
            key={`${hx.q},${hx.r}`}
            hex={hx}
            size={size}
            onClick={()=>handleHexClick(hx)}
            selected={selectedHex?.q===hx.q && selectedHex?.r===hx.r}
            canDeploy={g.phase==='deploy' ? g.canDeployOn(hx) : false}
            occupantOwner={occupantByKey.get(`${hx.q},${hx.r}`)?.owner as 0|1|undefined}
          />
        ))}

        {/* Overlays AFTER cells to sit on top of textures/cells, BEFORE units */}
        {g.phase==='deploy' && <DeployOverlay grid={g.grid} canDeploy={g.canDeployOn} />}
        {g.phase==='playing' && selUnit && (
          <OverlayLayer
            moveCosts={ (g.actionMode==='run' || g.actionMode==='advance') ? moveCosts : new Map() }
            runCosts={ g.actionMode==='run' ? runCosts : new Map() }
            size={size}
            grid={g.grid}
          />
        )}

        {g.units.filter(u => u.position).map(u => (
          <g key={u.id}>
            <UnitSprite
              u={u as Unit}
              selected={g.selectedUnitId===u.id}
              onClick={()=>handleUnitClick(u as Unit)}
            />
            <ActivatedMarker u={u as Unit} />
          </g>
        ))}
      </g>
    </svg>
    <TurnHUD/>
    <ActionBar/>
    {menu && <UnitContextMenu unit={menu.u} x={menu.x} y={menu.y} onClose={()=>setMenu(null)} />}
  </>
}
