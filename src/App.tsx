
import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from './store'
import type { Hex, Team, Unit, TerrainType } from './types'

async function loadTeams(): Promise<Team[]> {
  const index = await fetch('/data/teams/index.json').then(r => r.json());
  const teams: Team[] = await Promise.all(
    index.map((t: any) => fetch(t.unitsPath).then((r) => r.json()))
  );
  return teams;
}

const terrainColors: Record<TerrainType, string> = {
  open: '#1d2331',
  forest: '#11331c',
  rock: '#2b2d36',
  water: '#0f2438',
  ruin: '#2d1f1f'
}

const terrainLabel: Record<TerrainType, string> = {
  open: 'Offen',
  forest: 'Wald',
  rock: 'Fels',
  water: 'Wasser',
  ruin: 'Ruine'
}

function HexCell({hex, onClick, selected}:{hex:Hex; onClick:()=>void; selected:boolean}){
  const size = 26
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
  }, [x,y])

  return <g onClick={onClick} style={{cursor:'pointer'}}>
    <polygon points={points} fill={terrainColors[hex.terrain]} stroke={selected?'#9BD0FF':'#384760'} strokeWidth={selected?3:1} />
  </g>
}

function UnitSprite({u, selected, onClick}:{u:Unit; selected:boolean; onClick:()=>void}){
  const size = 22
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

function Controls(){
  const g = useGame()
  const [teams, setTeams] = useState<Team[]>([])
useEffect(()=>{
  loadTeams().then(t => { setTeams(t); g.loadTeams(t); });
},[]);
  return <div className="floating">
    {g.phase==='team-select' && <div className="panel">
      <div className="toolbar" style={{gap:12}}>
        <div>
          <div className="accent" style={{fontSize:12}}>Spieler 1 Team</div>
          <select className="select" onChange={(e)=>g.selectTeam(0,e.target.value)}>
            <option>— wählen —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <div className="danger" style={{fontSize:12}}>Spieler 2 Team</div>
          <select className="select" onChange={(e)=>g.selectTeam(1,e.target.value)}>
            <option>— wählen —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button className="btn" onClick={()=>g.startDeploy()}>Weiter: Aufstellung</button>
      </div>
    </div>}

    {g.phase==='deploy' && <div className="panel toolbar">
      <span className="tag">Aufstellung – Spieler {g.currentPlayer+1}</span>
      <button className="btn" onClick={()=>g.startGame()}>Spiel starten</button>
    </div>}

    {g.phase==='playing' && <div className="panel toolbar">
      <span className="tag">Am Zug: Spieler {g.currentPlayer+1}</span>
      <button className="btn" onClick={()=>g.endTurn()}>Zug beenden</button>
    </div>}
  </div>
}

function Grid(){
  const g = useGame()
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>()
  useEffect(()=>{ if(g.grid.length===0){ g.regenerate() } },[])

  
  const size = 26
  const w = Math.sqrt(3) * size
  const h = 2 * size
  const minQ = Math.min(...g.grid.map(h=>h.q), 0)
  const minR = Math.min(...g.grid.map(h=>h.r), 0)

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

  const width = 1200
  const height = 800
  const translateX = width/2 - (w * (minQ + minR/2))
  const translateY = height/2 - (h * (3/4) * minR)

  return <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
    <g transform={`translate(${translateX},${translateY})`}>
      {g.grid.map(hx => <HexCell key={`${hx.q},${hx.r}`} hex={hx} onClick={()=>handleHexClick(hx)} selected={selectedHex?.q===hx.q && selectedHex?.r===hx.r}/>)}
      {g.units.filter(u => u.position).map(u => <UnitSprite key={u.id} u={u as Unit} selected={g.selectedUnitId===u.id} onClick={()=>handleUnitClick(u as Unit)} />)}
    </g>
  </svg>
}

function DiceLog(){
  const g = useGame()
  return <div className="hud">
    <div style={{display:'flex', gap:12, overflowX:'auto'}}>
      {g.diceLog.slice(-6).map((dl,i)=>(
        <div className="panel" key={i} style={{minWidth:240}}>
          <div className="accent" style={{fontSize:12}}>{dl.label}</div>
          <div className="dice" style={{fontSize:18}}>{dl.dice.join(' ')}</div>
          <div style={{fontSize:12}}><span className="tag">Ziel: {dl.target}+</span> <span className="tag">Erfolge: {dl.success}</span></div>
        </div>
      ))}
    </div>
  </div>
}

export default function App(){
  return <div style={{height:'100%', display:'grid', gridTemplateRows:'1fr auto'}}>
    <Controls/>
    <Grid/>
    <DiceLog/>
  </div>
}
