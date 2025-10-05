
// Minimal type additions compatible with your existing shapes.
export type GamePhase = 'team-select' | 'deploy' | 'playing' | 'gameover'

export type Weapon = {
  name: string
  type: 'melee' | 'ranged'
  attacks: number
  range?: number
  ap: number
}

export type Unit = {
  id: string
  name: string
  owner: 0 | 1
  image: string
  quality: number
  defense: number
  speed: number
  wounds: number
  maxWounds: number
  weapons: Weapon[]
  position?: { q:number; r:number }
  traits?: string[]
  activated?: boolean // NEW: for alternating activations
}

export type TerrainType =
  | 'open' | 'forest' | 'rock' | 'water' | 'river' | 'lake' | 'mountain' | 'swamp' | 'ruin' | 'road'

export type Hex = {
  q:number
  r:number
  terrain: TerrainType
}

export type Team = {
  id: string
  name: string
  faction?: string
  units?: Unit[]
}

export type DiceRoll = {
  label: string
  dice: number[]
  success: number
  target: number
}
