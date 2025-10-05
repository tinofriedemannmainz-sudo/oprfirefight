import type { Hex, Unit } from '@/types/battle'
import { gridLookup, axialNeighbors, hexKey } from '@/utils/hex'
import { canEnter, moveCost } from '@/utils/terrain'

/**
 * Returns a map of reachable hexes with their minimal movement cost (BFS with costs).
 * maxCost should be unit.speed*2 for run range, unit.speed for move range.
 */
export function reachableCosts(unit:Unit, grid:Hex[], start:{q:number;r:number}, maxCost:number){
  const map = gridLookup(grid)
  const best = new Map<string, number>()
  const open: {q:number;r:number; cost:number}[] = [{ q:start.q, r:start.r, cost:0 }]
  best.set(hexKey(start.q,start.r), 0)

  while (open.length){
    // pop lowest cost
    open.sort((a,b)=>a.cost-b.cost)
    const cur = open.shift()!
    if (cur.cost > maxCost) continue

    for (const nb of axialNeighbors(cur.q, cur.r)){
      const h = map.get(hexKey(nb.q, nb.r))
      if (!h) continue
      if (!canEnter(unit, h)) continue
      const stepCost = moveCost(unit, h, h)
      if (!isFinite(stepCost)) continue
      const nc = cur.cost + stepCost
      const k = hexKey(nb.q, nb.r)
      const prev = best.get(k)
      if (nc <= maxCost && (prev===undefined || nc < prev)){
        best.set(k, nc)
        open.push({ q: nb.q, r: nb.r, cost: nc })
      }
    }
  }
  return best // key -> min cost
}
