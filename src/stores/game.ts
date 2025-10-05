
import { create } from 'zustand'
import type { Hex, Unit, Team, DiceRoll, GamePhase } from '@/types/battle'
import { generateTerrain, TERRAIN_RULES, canEnter, moveCost } from '@/utils/terrain'
import { axialDistance, axialNeighbors } from '@/utils/hex'

type ActionMode = 'advance' | 'run' | 'shoot' | 'charge' | undefined

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
  actionMode: ActionMode

  loadTeams: (teams: Team[]) => void
  availableTeams: Team[]
  selectedTeams: [string?, string?]
  selectTeam: (player:0|1, teamId:string) => void

  regenerate: (size?:number) => void
  startDeploy: () => void
  placeUnit: (unitId:string, hex:Hex) => void
  unplaceUnit: (unitId:string) => void
  startGame: () => void
  selectUnit: (unitId?:string) => void
  setActionMode: (mode: ActionMode) => void
  moveUnit: (unitId:string, hex:Hex) => void
  attack: (attackerId:string, targetId:string, weaponName:string) => void
  endTurn: () => void

  endActivation: () => void
  flagAdvanced: () => void
  startNewRoundIfNeeded: () => void

  canDeployOn: (hex:Hex) => boolean
  whyCannotDeploy: (hex:Hex) => string | null
  deployNext: () => void
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
  actionMode: undefined,

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

  canDeployOn(hex) {
    const rules = TERRAIN_RULES[hex.terrain]
    if (!rules || !rules.deployAllowed) return false
    const occupied = get().units.some(u => u.position && u.position.q===hex.q && u.position.r===hex.r)
    if (occupied) return false
    const size = get().size
    const rows = Math.max(2, Math.min(4, Math.floor(size/3)))
    const topLimit = -size + (rows - 1)
    const bottomLimit = size - (rows - 1)
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

  deployNext() {
    const s = get()
    if (s.phase !== 'deploy') return
    const next = s.currentPlayer === 0 ? 1 : 0
    set({ currentPlayer: next, selectedUnitId: undefined })
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
    set({ phase:'playing', currentPlayer: 0, selectedUnitId: undefined, round:1, actionMode: undefined })
  },

  selectUnit(unitId) {
    let u = get().units.find(u => u.id === unitId)
    if (!u) {
      const suffix = '-' + unitId
      u = get().units.find(x => x.owner === get().currentPlayer && x.id.endsWith(suffix) && (!!x.position || get().phase==='deploy'))
    }
    if (!u) return
    if (get().phase==='playing' && u.owner!==get().currentPlayer) return
    if (get().phase==='playing' && (u as any).activated) return
    set({ selectedUnitId: u.id, selectedWeapon: undefined, actionMode: undefined })
  },

  setActionMode(mode){ set({ actionMode: mode }) },

  moveUnit(unitId, hex) {
    const state = get()
    const u = state.units.find(u => u.id === unitId)
    if (!u || !u.position) return

    const occupied = state.units.some(x => x.position && x.position.q===hex.q && x.position.r===hex.r)
    if (occupied) return
    const toHex = state.grid.find(h => h.q===hex.q && h.r===hex.r)
    if (!toHex) return
    if (!canEnter(u, toHex)) return

    const dist = Math.round((Math.abs(u.position.q - hex.q) + Math.abs(u.position.q + u.position.r - hex.q - hex.r) + Math.abs(u.position.r - hex.r))/2)
    const step = moveCost(u, toHex, toHex)
    const req = dist * (isFinite(step) ? step : 9999)
    if (req <= u.speed * 2) {
      u.position = { q: hex.q, r: hex.r }
      set({ units: [...state.units] })
    }
  },

  attack(attackerId, targetId, weaponName) {
    const state = get()
    const atk = state.units.find(u => u.id === attackerId)
    const tgt = state.units.find(u => u.id === targetId)
    if (!atk || !tgt || !atk.position || !tgt.position) return
    const weapon = atk.weapons.find(w => w.name === weaponName) || atk.weapons[0]
    if (!weapon) return
    const dist = Math.round((Math.abs(atk.position.q - tgt.position.q) + Math.abs(atk.position.q + atk.position.r - tgt.position.q - tgt.position.r) + Math.abs(atk.position.r - tgt.position.r))/2)
    if (weapon.type==='ranged' && dist > (weapon.range || 0)) return
    if (weapon.type==='melee' && dist !== 1) return

    const rollDice = (n:number) => Array.from({length:n}, () => 1 + Math.floor(Math.random()*6))
    const hitRolls = rollDice(weapon.attacks)
    const hits = hitRolls.filter(d => d >= atk.quality).length
    const saveTarget = Math.max(2, Math.min(6, tgt.defense + weapon.ap))
    const saveRolls = rollDice(hits)
    const failed = saveRolls.filter(d => d < saveTarget).length

    const newDice: any[] = [
      { label: `Trefferwurf (${weapon.name})`, dice: hitRolls, success: hits, target: atk.quality },
      { label: `Rettungswurf (AP ${weapon.ap})`, dice: saveRolls, success: hits - failed, target: saveTarget }
    ]

    tgt.wounds -= failed
    let units = state.units
    if (tgt.wounds <= 0) { units = state.units.filter(u => u.id !== tgt.id) }
    set({ units: [...units], diceLog: [...state.diceLog, ...newDice], selectedWeapon: weapon.name })
  },

  endTurn() { get().endActivation() },

  flagAdvanced(){},

  endActivation(){
    const s = get()
    const sel = s.units.find(u => u.id===s.selectedUnitId)
    if (sel){ (sel as any).activated = true }
    set({ selectedUnitId: undefined, actionMode: undefined })
    const cur = s.currentPlayer, other = cur===0?1:0
    const hasOther = s.units.some(u => u.owner===other && (u as any).activated!==true && u.position)
    const hasCur = s.units.some(u => u.owner===cur && (u as any).activated!==true && u.position)
    if (hasOther){ set({ currentPlayer: other }) }
    else if (hasCur){ set({ currentPlayer: cur }) }
    else { get().startNewRoundIfNeeded() }
  },

  startNewRoundIfNeeded(){
    const s = get()
    const anyUnactivated = s.units.some(u => (u as any).activated!==true && u.position)
    if (anyUnactivated) return
    for (const u of s.units){ (u as any).activated = false }
    set({ round: s.round + 1, currentPlayer: 0, selectedUnitId: undefined, actionMode: undefined })
  },
}))
