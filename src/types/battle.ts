
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
  hasMoved?: boolean // Track if unit has moved this activation
  hasRun?: boolean // Track if unit has run (cannot shoot)
  usedWeapons?: string[] // Track which weapons have been used this activation
  hasAttackedInMelee?: boolean // Track if unit has attacked in melee this round (full strength)
  isExhausted?: boolean // Track if unit is exhausted (hits only on 6)
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
