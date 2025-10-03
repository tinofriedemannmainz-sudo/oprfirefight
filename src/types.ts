
export type TerrainType = 'open' | 'forest' | 'rock' | 'water' | 'ruin'
export type Hex = { q:number; r:number; terrain: TerrainType; unitId?: string }
export type UnitImage = string

export type Weapon = {
  name: string
  range: number // in hexes; 1 = melee only
  attacks: number // number of dice
  ap: number // armor penetration (reduces defense)
  type: 'ranged' | 'melee'
}

export type Unit = {
  id: string
  name: string
  image: UnitImage
  quality: number // hit on >= quality
  defense: number // save on >= defense
  speed: number // hexes per move
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
