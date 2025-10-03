
export type TerrainType = 'open' | 'forest' | 'rock' | 'water' | 'ruin'

export type Hex = { q:number; r:number; terrain: TerrainType; unitId?: string }

export type Weapon = {
  name: string
  range: number
  attacks: number
  ap: number
  type: 'ranged' | 'melee'
}

export type Unit = {
  id: string
  name: string
  image: string
  quality: number
  defense: number
  speed: number
  wounds: number
  maxWounds: number
  weapons: Weapon[]
  owner: 0 | 1
  position?: { q:number; r:number }
}

export type Team = {
  id: string
  name: string
  faction: string
  units: Omit<Unit, 'owner' | 'position'>[]
}

export type DiceRoll = {
  label: string
  dice: number[]
  success: number
  target: number
}

export type GamePhase = 'team-select' | 'deploy' | 'playing' | 'gameover'
