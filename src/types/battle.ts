export type TerrainType =
  | 'open'
  | 'forest'
  | 'rock'
  | 'water'
  | 'ruin'
  | 'swamp'
  | 'mountain'
  | 'river'
  | 'lake'
  | 'road'

export type Hex = { q: number; r: number; terrain: TerrainType }

export type Weapon = { name:string; range:number; attacks:number; ap:number; type:'melee'|'ranged' }

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
  position?: { q: number; r: number }
  traits?: string[] // e.g. ['Fliegen']
  activated?: boolean // <- NEU: für Alternating Activations
}


export type Team = { id:string; name:string; faction:string; units: Omit<Unit,'owner'|'position'>[] }

export type DiceRoll = { label:string; dice:number[]; success:number; target:number }

export type GamePhase = 'team-select' | 'deploy' | 'playing' | 'gameover'
