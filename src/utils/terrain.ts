import type { Hex, TerrainType, Unit } from '@/types/battle'

export const TERRAIN_RULES: Record<TerrainType, { moveCost: number; impassable: boolean; deployAllowed: boolean }> = {
  open:      { moveCost: 1, impassable: false, deployAllowed: true },
  road:      { moveCost: 1, impassable: false, deployAllowed: true },
  forest:    { moveCost: 2, impassable: false, deployAllowed: true },
  ruin:      { moveCost: 2, impassable: false, deployAllowed: true },
  swamp:     { moveCost: 2, impassable: false, deployAllowed: true },
  water:     { moveCost: 2, impassable: false, deployAllowed: false },
  river:     { moveCost: 2, impassable: false, deployAllowed: false },
  lake:      { moveCost: 2, impassable: true,  deployAllowed: false },
  rock:      { moveCost: 2, impassable: true,  deployAllowed: false },
  mountain:  { moveCost: 2, impassable: true,  deployAllowed: false },
}

export function canEnter(unit:Unit, hex:Hex): boolean {
  const rules = TERRAIN_RULES[hex.terrain]
  if (!rules) return true
  if (rules.impassable) return false
  // Buildings block movement
  if (hex.hasBuilding) return false
  return true
}

export function moveCost(unit:Unit, from:Hex, to:Hex): number {
  const fly = (unit.traits||[]).map(t=>t.toLowerCase()).includes('fliegen')
  const rules = TERRAIN_RULES[to.terrain]
  if (!rules) return 1
  if (rules.impassable) return Infinity
  if (fly) return 1
  return Math.max(1, rules.moveCost)
}

function seededRand(seed:number){ return function(){ let t = seed += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

function valueNoise2D(rx:number, ry:number, seed:number){
  const rnd = seededRand(Math.floor(seed*1e6) + rx*374761393 + ry*668265263)
  return rnd()
}

function smoothNoise(q:number, r:number, seed:number){
  const w = [1,2,1,2,4,2,1,2,1]
  const ns = [[q-1,r-1],[q,r-1],[q+1,r-1],[q-1,r],[q,r],[q+1,r],[q-1,r+1],[q,r+1],[q+1,r+1]]
  let s=0, sw=0
  for (let i=0;i<ns.length;i++){ const [x,y] = ns[i]; const n = valueNoise2D(x,y,seed); s += n*w[i]; sw += w[i] }
  return s/sw
}

export function generateTerrain(size:number, seed:number=42): Hex[] {
  const grid: Hex[] = []
  for (let q = -size; q <= size; q++) {
    for (let r = -size; r <= size; r++) {
      if (Math.abs(q + r) <= size){
        const n1 = smoothNoise(q, r, seed)
        const n2 = smoothNoise(q*2, r*2, seed+13)
        const n = (n1*0.7 + n2*0.3)
        let terrain: TerrainType = 'open'
        if (n > 0.72) terrain = 'mountain'
        else if (n > 0.6) terrain = 'rock'
        else if (n > 0.52) terrain = 'forest'
        else if (n < 0.18) terrain = 'water'
        else if (n < 0.24) terrain = 'swamp'
        else if (n < 0.3) terrain = 'ruin'
        else terrain = 'open'
        grid.push({ q, r, terrain })
      }
    }
  }

  // river
  const riverCols: {q:number; val:number}[] = []
  for (let q=-size; q<=size; q++){ riverCols.push({ q, val: smoothNoise(q, -size, seed+99) }) }
  riverCols.sort((a,b)=>a.val-b.val)
  const startQ = riverCols[0].q
  let cq = startQ, cr = -size
  const inBounds = (q:number,r:number)=> Math.abs(q+r) <= size && q>=-size && q<=size && r>=-size && r<=size
  while (cr <= size){
    const idx = grid.findIndex(h => h.q===cq && h.r===cr)
    if (idx>=0) grid[idx].terrain = (Math.random()<0.85 ? 'river' : 'water')
    const candidates = [[cq, cr+1],[cq+1, cr],[cq-1, cr+1],[cq, cr+2]]
    const next = candidates.find(([nq,nr])=>inBounds(nq,nr))
    if (!next) break
    cq = next[0]; cr = next[1]
  }

  // lakes
  let made=0
  for (const h of grid){
    if (made>=2) break
    if ((h.terrain==='water' || h.terrain==='river') && Math.random()<0.08){
      const blob = [{q:h.q,r:h.r}]
      for (const d of [{q:1,r:0},{q:-1,r:0},{q:0,r:1},{q:0,r:-1},{q:1,r:-1},{q:-1,r:1}]){
        if (Math.random()<0.7) blob.push({q:h.q+d.q, r:h.r+d.r})
      }
      for (const b of blob){
        const idx = grid.findIndex(x => x.q===b.q && x.r===b.r)
        if (idx>=0) grid[idx].terrain = 'lake'
      }
      made++
    }
  }

  // roads
  for (let r=-size; r<=size; r+=Math.max(2, Math.floor(size/3))){
    for (let q=-size; q<=size; q++){
      if (Math.abs(q+r) <= size){
        const idx = grid.findIndex(h=>h.q===q && h.r===r)
        if (idx>=0 && grid[idx].terrain!=='lake' && grid[idx].terrain!=='river'){
          if (Math.random()<0.8) grid[idx].terrain='road'
        }
      }
    }
  }

  return grid
}
