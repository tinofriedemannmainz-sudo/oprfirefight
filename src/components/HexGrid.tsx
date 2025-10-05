import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '@/stores/game'
import type { Hex, Unit } from '@/types/battle'
import HexCell from '@/components/HexCell'
import UnitSprite from '@/components/UnitSprite'
import UnitContextMenu from '@/components/UnitContextMenu'
import HexTextures from '@/components/HexTextures'

export default function HexGrid(){
  const g = useGame()
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>()
  const [menu, setMenu] = useState<{u:Unit, x:number, y:number}|null>(null)

  const svgRef = useRef<SVGSVGElement|null>(null)

  // --- Zoom & Pan state ---
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{x:number;y:number}|null>(null)

  useEffect(()=>{ if(g.grid.length===0){ g.regenerate() } },[])

  const size = 30
  const w = Math.sqrt(3) * size
  const h = 2 * size

  function hexToPixel(q:number, r:number) {
    return { x: w * (q + r / 2), y: h * (3 / 4) * r }
  }

  const positions = g.grid.map(hex => hexToPixel(hex.q, hex.r))
  const minX = positions.length ? Math.min(...positions.map(p => p.x)) : 0
  const maxX = positions.length ? Math.max(...positions.map(p => p.x)) : 0
  const minY = positions.length ? Math.min(...positions.map(p => p.y)) : 0
  const maxY = positions.length ? Math.max(...positions.map(p => p.y)) : 0

  const width = 1200
  const height = 800

  const centerX = (width - (maxX - minX)) / 2 - minX
  const centerY = (height - (maxY - minY)) / 2 - minY

  const occupantByKey = useMemo(() => {
    const m = new Map<string, 0|1>()
    for (const u of g.units){
      if (!u.position) continue
      m.set(`${u.position.q},${u.position.r}`, u.owner)
    }
    return m
  }, [g.units])

  const canDeployHere = (hex:Hex) => g.canDeployOn(hex)

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

  // --- Zoom handlers ---
  function svgPointFromClient(clientX:number, clientY:number){
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const m = svg.getScreenCTM()
    if (!m) return { x: clientX, y: clientY }
    const inv = m.inverse()
    const loc = pt.matrixTransform(inv)
    return { x: loc.x, y: loc.y }
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>){
    e.preventDefault()
    const direction = e.deltaY > 0 ? -1 : 1
    const factor = 1 + direction * 0.1
    const newZoom = Math.max(0.5, Math.min(2.5, zoom * factor))

    // Zoom to mouse position: adjust pan so focal point stays fixed
    const { left, top } = (e.target as Element).getBoundingClientRect()
    const clientX = e.clientX, clientY = e.clientY
    const mx = clientX - left, my = clientY - top

    const before = { x: (mx - pan.x - centerX) / zoom, y: (my - pan.y - centerY) / zoom }
    const after = { x: before.x, y: before.y }
    const newPan = {
      x: mx - centerX - after.x * newZoom,
      y: my - centerY - after.y * newZoom
    }

    setZoom(newZoom)
    setPan(newPan)
  }

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>){
    if (e.button !== 0) return
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>){
    if (!isPanning || !panStart.current) return
    const nx = e.clientX - panStart.current.x
    const ny = e.clientY - panStart.current.y
    setPan({ x: nx, y: ny })
  }
  function onMouseUp(){ setIsPanning(false); panStart.current = null }
  function onMouseLeave(){ setIsPanning(false); panStart.current = null }

  return <>
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={()=>setMenu(null)}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ background: '#0e1118', touchAction: 'none', userSelect: 'none' }}
    >
      <HexTextures/>
      <g transform={`translate(${centerX + pan.x},${centerY + pan.y}) scale(${zoom})`}>
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
