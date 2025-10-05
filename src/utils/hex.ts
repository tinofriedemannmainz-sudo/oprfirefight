import type { Hex } from '@/types/battle'

export function axialNeighbors(q:number, r:number){
  return [
    { q: q+1, r },
    { q: q-1, r },
    { q, r: r+1 },
    { q, r: r-1 },
    { q: q+1, r: r-1 },
    { q: q-1, r: r+1 },
  ]
}

export function axialDistance(a:{q:number;r:number}, b:{q:number;r:number}){
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

export function hexKey(q:number,r:number){ return `${q},${r}` }

export function gridLookup(grid:Hex[]){
  const m = new Map<string, Hex>()
  for (const h of grid) m.set(hexKey(h.q,h.r), h)
  return m
}
