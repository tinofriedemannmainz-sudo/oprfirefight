
import { create } from 'zustand'
import type { Hex, Unit, Team, DiceRoll, GamePhase } from '@/types/battle'
import { randomTerrain, axialDistance } from '@/utils/hex'

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

  loadTeams: (teams: Team[]) => void
  availableTeams: Team[]
  selectedTeams: [string?, string?]
  selectTeam: (player:0|1, teamId:string) => void

  regenerate: (size?:number) => void
  startDeploy: () => void
  placeUnit: (unitId:string, hex:Hex) => void
  startGame: () => void
  selectUnit: (unitId?:string) => void
  moveUnit: (unitId:string, hex:Hex) => void
  attack: (attackerId:string, targetId:string, weaponName:string) => void
  endTurn: () => void
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

  loadTeams(teams) { set({ availableTeams: teams }) },

  selectTeam(player, teamId) {
    const tuple = [...get().selectedTeams] as [string?, string?]
    tuple[player] = teamId
    set({ selectedTeams: tuple })
  },

  regenerate(size) {
    const s = size ?? get().size
    const grid: Hex[] = []
    for (let q = -s; q <= s; q++) {
      for (let r = -s; r <= s; r++) {
        if (Math.abs(q + r) <= s) grid.push({ q, r, terrain: randomTerrain() })
      }
    }
    set({ size: s, grid })
  },

  startDeploy() {
    const { selectedTeams, availableTeams } = get()
    if (!selectedTeams[0] || !selectedTeams[1]) return

    const teamA = availableTeams.find(t => t.id === selectedTeams[0])
    const teamB = availableTeams.find(t => t.id === selectedTeams[1])
    if (!teamA || !teamB || !teamA.units || !teamB.units) {
      console.warn("Teams nicht korrekt geladen:", { teamA, teamB })
      return
    }

    const mkUnits = (team: typeof teamA, owner:0|1) => team.units!.map(u => ({
      ...u, id: `${owner}-${u.id}`, owner, wounds: u.wounds, maxWounds: u.wounds, position: undefined
    }))

    set({ units: [...mkUnits(teamA,0), ...mkUnits(teamB,1)], phase:'deploy', currentPlayer:0, selectedUnitId: undefined })
    get().regenerate()
  },

  placeUnit(unitId, hex) {
    const u = get().units.find(u => u.id === unitId)
    if (!u) return
    const occupied = get().units.some(x => x.position && x.position.q===hex.q && x.position.r===hex.r)
    if (occupied) return
    const size = get().size
    if (u.owner===0 && hex.r > -Math.floor(size/2)) return
    if (u.owner===1 && hex.r <  Math.floor(size/2)) return
    u.position = { q: hex.q, r: hex.r }
    set({ units: [...get().units] })
  },

  startGame() {
    set({ phase:'playing', currentPlayer: 0 })
  },

  selectUnit(unitId) {
    set({ selectedUnitId: unitId, selectedWeapon: undefined })
  },

  moveUnit(unitId, hex) {
    const state = get()
    const u = state.units.find(u => u.id === unitId)
    if (!u || !u.position) return
    const destOccupied = state.units.some(x => x.position && x.position.q===hex.q && x.position.r===hex.r)
    if (destOccupied) return
    const dist = axialDistance(u.position, hex)
    const terrain = state.grid.find(h => h.q===hex.q && h.r===hex.r)?.terrain
    const penalty = terrain === 'water' || terrain === 'rock' ? 1 : 0
    const required = dist + penalty
    if (required <= u.speed) {
      u.position = { q: hex.q, r: hex.r }
      set({ units: [...state.units] })
    }
  },

  attack(attackerId, targetId, weaponName) {
    const state = get()
    const atk = state.units.find(u => u.id === attackerId)
    const tgt = state.units.find(u => u.id === targetId)
    if (!atk || !tgt || !atk.position || !tgt.position) return
    const weapon = atk.weapons.find(w => w.name === weaponName)
    if (!weapon) return
    const dist = axialDistance(atk.position, tgt.position)
    if (weapon.type==='ranged' && dist > weapon.range) return
    if (weapon.type==='melee' && dist !== 1) return

    const rollDice = (n:number) => Array.from({length:n}, () => 1 + Math.floor(Math.random()*6))
    const hitRolls = rollDice(weapon.attacks)
    const hits = hitRolls.filter(d => d >= atk.quality).length

    const saveTarget = Math.max(2, Math.min(6, tgt.defense + weapon.ap))
    const saveRolls = rollDice(hits)
    const failed = saveRolls.filter(d => d < saveTarget).length

    const newDice: DiceRoll[] = [
      { label: `Trefferwurf (${weapon.name})`, dice: hitRolls, success: hits, target: atk.quality },
      { label: `Rettungswurf (AP ${weapon.ap})`, dice: saveRolls, success: hits - failed, target: saveTarget }
    ]

    tgt.wounds -= failed
    let units = state.units
    if (tgt.wounds <= 0) {
      units = state.units.filter(u => u.id !== tgt.id)
    }
    set({ units: [...units], diceLog: [...state.diceLog, ...newDice], selectedWeapon: weapon.name })
  },

  endTurn() {
    set({ currentPlayer: (get().currentPlayer===0?1:0), selectedUnitId: undefined, selectedWeapon: undefined })
  }
}))
