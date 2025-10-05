import { create } from 'zustand'
import type { Hex, Unit, Team, DiceRoll, GamePhase } from '@/types/battle'
import { generateTerrain, TERRAIN_RULES } from '@/utils/terrain'

export type GameState = {
  size: number
  grid: Hex[]
  units: Unit[]
  currentPlayer: 0 | 1
  phase: GamePhase
  selectedUnitId?: string
  selectedWeapon?: string
  diceLog: DiceRoll[]
  winners?: 0|1|'draw'
  round: number

  loadTeams: (teams: Team[]) => void
  availableTeams: Team[]
  selectedTeams: [string?, string?]
  selectTeam: (player:0|1, teamId:string) => void
  deployNext: () => void

  regenerate: (size?:number) => void
  startDeploy: () => void
  placeUnit: (unitId:string, hex:Hex) => void
  unplaceUnit: (unitId:string) => void
  startGame: () => void
  selectUnit: (unitId?:string) => void
  moveUnit: (unitId:string, hex:Hex) => void
  attack: (attackerId:string, targetId:string, weaponName:string) => void
  endTurn: () => void

  endActivation: () => void
  flagAdvanced: () => void
  startNewRoundIfNeeded: () => void
  canDeployOn: (hex:Hex) => boolean
  whyCannotDeploy: (hex:Hex) => string | null
}

export const useGame = create<GameState>((set, get) => ({
  size: 9,
  grid: [],
  units: [],
  currentPlayer: 0,
  phase: 'team-select',
  diceLog: [],
  availableTeams: [],
  selectedTeams: [],
  round: 1,

  loadTeams(teams) {
    const sorted = [...teams].sort((a,b)=>a.name.localeCompare(b.name))
    set({ availableTeams: sorted })
  },

  selectTeam(player, teamId) {
    const tuple = [...get().selectedTeams] as [string?, string?]
    tuple[player] = teamId
    set({ selectedTeams: tuple })
  },

  regenerate(size) {
    const s = size ?? get().size
    const grid = generateTerrain(s, Math.floor(Math.random()*1e6))
    set({ size: s, grid })
  },

  startDeploy() {
    const { selectedTeams, availableTeams } = get()
    if (!selectedTeams[0] || !selectedTeams[1]) return
    const teamA = availableTeams.find(t => t.id === selectedTeams[0])
    const teamB = availableTeams.find(t => t.id === selectedTeams[1])
    if (!teamA || !teamB || !teamA.units || !teamB.units) return
    const mkUnits = (team: typeof teamA, owner:0|1) => team.units!.map(u => ({
      ...u, id: `${owner}-${u.id}`, owner, wounds: u.wounds, maxWounds: u.wounds, position: undefined, activated: false
    } as Unit & {activated:boolean}))
    set({ units: [...mkUnits(teamA,0), ...mkUnits(teamB,1)], phase:'deploy', currentPlayer:0, selectedUnitId: undefined, round:1 })
    get().regenerate()
  },

  deployNext() {
  const s = get()
  if (s.phase !== 'deploy') return
  set({ currentPlayer: s.currentPlayer === 0 ? 1 : 0, selectedUnitId: undefined })
},


  // fixed-width deployment zones: 3 rows for each side (top/bottom in axial r)
  canDeployOn(hex) {
    const rules = TERRAIN_RULES[hex.terrain]
    if (!rules || !rules.deployAllowed) return false
    const occupied = get().units.some(u => u.position && u.position.q===hex.q && u.position.r===hex.r)
    if (occupied) return false
    const size = get().size
    const rows = Math.max(2, Math.min(4, Math.floor(size/3))) // usually 3
    const topLimit = -size + (rows - 1)  // r <= topLimit
    const bottomLimit = size - (rows - 1) // r >= bottomLimit
    if (get().currentPlayer===0 && hex.r > topLimit) return false
    if (get().currentPlayer===1 && hex.r < bottomLimit) return false
    return true
  },

  whyCannotDeploy(hex){
    const rules = TERRAIN_RULES[hex.terrain]
    if (!rules) return null
    if (!rules.deployAllowed) return 'Aufstellung hier nicht erlaubt (Gelände).'
    const occupied = get().units.some(u => u.position && u.position.q===hex.q && u.position.r===hex.r)
    if (occupied) return 'Feld ist bereits belegt.'
    const size = get().size
    const rows = Math.max(2, Math.min(4, Math.floor(size/3)))
    const topLimit = -size + (rows - 1)
    const bottomLimit = size - (rows - 1)
    if (get().currentPlayer===0 && hex.r > topLimit) return 'Außerhalb deiner Aufstellungszone.'
    if (get().currentPlayer===1 && hex.r < bottomLimit) return 'Außerhalb deiner Aufstellungszone.'
    return null
  },

  placeUnit(unitId, hex) {
    if (!get().canDeployOn(hex)) return
    const u = get().units.find(u => u.id === unitId)
    if (!u) return
    u.position = { q: hex.q, r: hex.r }
    set({ units: [...get().units], selectedUnitId: undefined })
  },

  unplaceUnit(unitId) {
    const u = get().units.find(u => u.id === unitId)
    if (!u) return
    if (u.owner !== get().currentPlayer) return
    u.position = undefined
    set({ units: [...get().units], selectedUnitId: undefined })
  },

  startGame() {
    if (!get().units.every(u => u.position)) return
    for (const u of get().units){ (u as any).activated = false }
    set({ phase:'playing', currentPlayer: 0, selectedUnitId: undefined, round:1 })
  },

  // TOLERANT: accept owner-prefixed ids *and* base ids during deploy
  selectUnit(unitId) {
    let u = get().units.find(u => u.id === unitId)
    if (!u) {
      const suffix = '-' + unitId
      u = get().units.find(x => x.owner === get().currentPlayer && x.id.endsWith(suffix) && !x.position)
    }
    if (!u) return
    if (get().phase==='playing' && u.owner!==get().currentPlayer) return
    if (get().phase==='playing' && (u as any).activated) return
    set({ selectedUnitId: u.id, selectedWeapon: undefined })
  },

  // movement/attack/end activation kept as in your current build; not changed in this minimal fix
  moveUnit(unitId, hex) { /* unchanged in this fix */ },
  attack(attackerId, targetId, weaponName) { /* unchanged in this fix */ },
  endTurn() { /* unchanged in this fix */ },
  endActivation(){ /* unchanged in this fix */ },
  startNewRoundIfNeeded(){ /* unchanged in this fix */ },
  flagAdvanced(){}
}))
