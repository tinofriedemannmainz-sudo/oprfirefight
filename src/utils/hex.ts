
import type { Hex, TerrainType } from '@/types/battle'

export const terrainWeights: Record<TerrainType, number> = {
  open: 50, forest: 18, rock: 18, water: 7, ruin: 7
}

export function randomTerrain(): TerrainType {
  const entries = Object.entries(terrainWeights)
  const total = entries.reduce((a, [,w]) => a+w, 0)
  let r = Math.random()*total
  for (const [t, w] of entries) { if ((r -= w) <= 0) return t as TerrainType }
  return 'open'
}

export function axialDistance(a:{q:number;r:number}, b:{q:number;r:number}) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

export function hexToPixel(size:number, q:number, r:number) {
  const w = Math.sqrt(3) * size
  const h = 2 * size
  return { x: w * (q + r / 2), y: h * (3/4) * r }
}
