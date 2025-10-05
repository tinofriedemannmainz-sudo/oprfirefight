import type { TerrainType } from '@/types/battle'

// Optional image skin per terrain type.
// Put your images under `public/assets/terrain/` (webp/png/jpg/svg).
// You can change/extend this mapping; leave a key undefined to fall back to SVG textures.
export type TerrainSkinMap = Partial<Record<TerrainType, string>>

export const TERRAIN_SKINS: TerrainSkinMap = {
  open: '/assets/terrain/grass.webp',
  forest: '/assets/terrain/forest.webp',
  rock: '/assets/terrain/rock.webp',
  water: '/assets/terrain/water.webp',
  ruin: '/assets/terrain/ruin.webp',
  swamp: '/assets/terrain/swamp.webp',
  mountain: '/assets/terrain/mountain.webp',
  river: '/assets/terrain/river.webp',
  lake: '/assets/terrain/lake.webp',
  road: '/assets/terrain/road.webp',
}
