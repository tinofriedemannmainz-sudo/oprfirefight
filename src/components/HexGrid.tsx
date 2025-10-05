import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Hex, Unit } from '@/types/battle'
import HexCell from '@/components/HexCell'
import UnitSprite from '@/components/UnitSprite'
import UnitContextMenu from '@/components/UnitContextMenu'
import HexTextures from '@/components/HexTextures'
import OverlayLayer from '@/components/OverlayLayer'
import DeployOverlay from '@/components/DeployOverlay'
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

  // board center/translate to fit
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

  // ====== OVERLAYS when selecting your unit ======
  const selUnit = g.units.find(u => u.id===g.selectedUnitId)
  const { moveCosts, runCosts, rangedTargets, chargeTargets } = useMemo(() => {
    if (!selUnit || !selUnit.position) return { moveCosts:new Map(), runCosts:new Map(), rangedTargets:[], chargeTargets:[] as {unit:Unit}[] }
    const maxMove = selUnit.speed
    const maxRun = selUnit.speed * 2
    const allCosts = reachableCosts(selUnit, g.grid, selUnit.position, maxRun)
    const move = new Map<string,number>()
    const run = new Map<string,number>()
    for (const [k,c] of allCosts){
      if (k===hexKey(selUnit.position.q, selUnit.position.r)) continue
      if (c <= maxMove) move.set(k, c)
      else if (c <= maxRun) run.set(k, c)
    }

    const enemies = g.units.filter(u => u.owner !== selUnit.owner && u.position) as Unit[]

    // Ranged targets: use first ranged weapon if any
    const rangedWpn = selUnit.weapons.find(w => w.type==='ranged')
    const ranged: Unit[] = []
    if (rangedWpn){
      for (const e of enemies){
        const d = axialDistance(selUnit.position, e.position!)
        if (d <= rangedWpn.range) ranged.push(e)
      }
    }

    // Charge targets: if any adjacent approach hex to an enemy is reachable within run budget
    const charge: {unit:Unit}[] = []
    for (const e of enemies){
      const pos = e.position!
      const adj = axialNeighbors(pos.q, pos.r)
        .filter(p => {
          const hh = map.get(hexKey(p.q,p.r))
          if (!hh) return false
          if (TERRAIN_RULES[hh.terrain]?.impassable) return false
          const occ = occupantByKey.get(hexKey(p.q,p.r))
          if (occ) return false
          const c = allCosts.get(hexKey(p.q,p.r))
          return c !== undefined && c <= maxRun
        })
      if (adj.length>0) charge.push({ unit:e })
    }

    return { moveCosts: move, runCosts: run, rangedTargets: ranged, chargeTargets: charge }
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
      const k = hexKey(hex.q, hex.r)
      if (moveCosts.has(k) || runCosts.has(k)){
        g.moveUnit(selUnit.id, hex)
        // end activation right after a run (optional behaviour)
        const cost = moveCosts.get(k) ?? runCosts.get(k)
        if (cost && cost > (selUnit.speed || 0)) {
          g.endActivation()
        }
      }
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
      if (u.owner===g.currentPlayer && !u.activated) { g.selectUnit(u.id) }
      // clicking enemy to attack can be added as needed
    }
  }

  function handleUnitContext(e:React.MouseEvent, u:Unit){
    setMenu({ u, x: e.clientX, y: e.clientY })
  }

  return <>
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <HexTextures/>
      <g transform={`translate(${translateX},${translateY})`}>
        {/* Overlays */}
        {g.phase==='deploy' && <DeployOverlay grid={g.grid} canDeploy={g.canDeployOn} />}
        {g.phase==='playing' && selUnit && (
          <OverlayLayer
            moveCosts={moveCosts}
            runCosts={runCosts}
            size={size}
            grid={g.grid}
            chargeTargets={chargeTargets}
            rangedTargets={rangedTargets}
          />
        )}
        {/* Grid */}
        {g.grid.map(hx => (
          <HexCell
            key={`${hx.q},${hx.r}`}
            hex={hx}
            size={size}
            onClick={()=>handleHexClick(hx)}
            selected={selectedHex?.q===hx.q && selectedHex?.r===hx.r}
            canDeploy={g.phase==='deploy' ? g.canDeployOn(hx) : false}
            occupantOwner={occupantByKey.get(hexKey(hx.q,hx.r))?.owner as 0|1|undefined}
          />
        ))}
        {/* Units */}
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
