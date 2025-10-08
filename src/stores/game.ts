import { create } from 'zustand'
import type { Hex, Unit, Team, DiceRoll, GamePhase, Weapon } from '@/types/battle'
import { generateTerrain, TERRAIN_RULES, canEnter, moveCost } from '@/utils/terrain'
import { axialDistance, axialNeighbors } from '@/utils/hex'

type ActionMode = 'move' | 'shoot' | undefined

export type AttackData = {
  attackerId: string
  targetId: string
  weaponName: string
  isCounterAttack?: boolean
}

export type CounterAttackPrompt = {
  defenderId: string
  attackerId: string
}

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
  pendingAttack?: AttackData
  counterAttackPrompt?: CounterAttackPrompt

  loadTeams: (teams: Team[]) => void
  availableTeams: Team[]
  selectedTeams: [string?, string?]
  selectTeam: (player:0|1, teamId:string) => void

  regenerate: (size?:number) => void
  startDeploy: () => void
  autoDeployUnits: () => void
  placeUnit: (unitId:string, hex:Hex) => void
  unplaceUnit: (unitId:string) => void
  startGame: () => void
  selectUnit: (unitId?:string) => void
  setActionMode: (mode: ActionMode) => void
  moveUnit: (unitId:string, hex:Hex, isRun?: boolean) => void
  attack: (attackerId:string, targetId:string, weaponName:string, isCounterAttack?: boolean) => void
  executeAttack: (hits: number, wounds: number) => void
  acceptCounterAttack: () => void
  declineCounterAttack: () => void
  endTurn: () => void
  getValidTargets: (unitId: string) => { shootable: Unit[], meleeable: Unit[] }
  canUnitShoot: (unitId: string) => boolean
  getAvailableWeapons: (unitId: string) => Weapon[]

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
  pendingAttack: undefined,
  counterAttackPrompt: undefined,

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

  autoDeployUnits() {
    const { units, grid, size } = get()
    const rows = Math.max(2, Math.min(4, Math.floor(size/3)))
    const topLimit = -size + (rows - 1)
    const bottomLimit = size - (rows - 1)

    // Get valid deployment hexes for each player
    const validHexesP1 = grid.filter(h => {
      const rules = TERRAIN_RULES[h.terrain]
      return rules && rules.deployAllowed && h.r <= topLimit
    })
    const validHexesP2 = grid.filter(h => {
      const rules = TERRAIN_RULES[h.terrain]
      return rules && rules.deployAllowed && h.r >= bottomLimit
    })

    // Deploy each unit
    let p1Index = 0
    let p2Index = 0

    units.forEach(unit => {
      if (unit.owner === 0 && p1Index < validHexesP1.length) {
        const hex = validHexesP1[p1Index]
        const occupied = units.some(u => u.position && u.position.q === hex.q && u.position.r === hex.r && u.id !== unit.id)
        if (!occupied) {
          unit.position = { q: hex.q, r: hex.r }
          p1Index++
        }
      } else if (unit.owner === 1 && p2Index < validHexesP2.length) {
        const hex = validHexesP2[p2Index]
        const occupied = units.some(u => u.position && u.position.q === hex.q && u.position.r === hex.r && u.id !== unit.id)
        if (!occupied) {
          unit.position = { q: hex.q, r: hex.r }
          p2Index++
        }
      }
    })

    set({ units: [...units] })
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
    
    // Reset unit state when selecting
    if (get().phase === 'playing') {
      u.hasMoved = u.hasMoved || false
      u.hasRun = u.hasRun || false
      u.usedWeapons = u.usedWeapons || []
    }
    
    set({ selectedUnitId: u.id, selectedWeapon: undefined, actionMode: undefined })
  },

  setActionMode(mode){ set({ actionMode: mode }) },

  moveUnit(unitId, hex, isRun = false) {
    const state = get()
    const u = state.units.find(u => u.id === unitId)
    if (!u || !u.position) return
    
    // Check if unit has already moved or shot
    if (u.hasMoved) return
    if ((u.usedWeapons?.length || 0) > 0) return // Cannot move after shooting

    const occupied = state.units.some(x => x.position && x.position.q===hex.q && x.position.r===hex.r)
    if (occupied) return
    const toHex = state.grid.find(h => h.q===hex.q && h.r===hex.r)
    if (!toHex) return
    if (!canEnter(u, toHex)) return

    const dist = axialDistance(u.position, hex)
    const maxMove = isRun ? u.speed * 2 : u.speed
    
    if (dist <= maxMove) {
      u.position = { q: hex.q, r: hex.r }
      u.hasMoved = true
      u.hasRun = isRun
      set({ units: [...state.units] })
      
      // Auto-end activation only if run AND no melee enemies nearby
      if (isRun) {
        // Check if there are any enemies in melee range
        const hasNearbyEnemies = state.units.some(enemy => {
          if (!enemy.position || enemy.owner === u.owner) return false
          const enemyDist = axialDistance(hex, enemy.position)
          return enemyDist === 1
        })
        
        // Check if unit has melee weapons (range 0)
        const hasMeleeWeapons = u.weapons.some(w => (w.range || 0) === 0)
        
        if (!hasNearbyEnemies || !hasMeleeWeapons) {
          setTimeout(() => get().endActivation(), 500)
        }
      }
    }
  },

  attack(attackerId, targetId, weaponName, isCounterAttack = false) {
    const state = get()
    const atk = state.units.find(u => u.id === attackerId)
    const tgt = state.units.find(u => u.id === targetId)
    if (!atk || !tgt || !atk.position || !tgt.position) return
    
    // Check if weapon already used (only for non-counter attacks)
    if (!isCounterAttack && atk.usedWeapons?.includes(weaponName)) return
    
    const weapon = atk.weapons.find(w => w.name === weaponName) || atk.weapons[0]
    if (!weapon) return
    const dist = axialDistance(atk.position, tgt.position)
    
    // Determine if weapon is melee (range 0) or ranged (range > 0)
    const isMelee = (weapon.range || 0) === 0
    
    if (isMelee) {
      // Melee weapons: must be adjacent, can use after running
      if (dist !== 1) return
    } else {
      // Ranged weapons: cannot use if run, must be in range
      if (atk.hasRun) return // Cannot shoot ranged after running
      if (dist > (weapon.range || 0)) return
    }

    // Open dice dialog instead of rolling immediately
    set({ pendingAttack: { attackerId, targetId, weaponName, isCounterAttack } })
  },

  executeAttack(hits, wounds) {
    const state = get()
    const { pendingAttack } = state
    if (!pendingAttack) return

    const atk = state.units.find(u => u.id === pendingAttack.attackerId)
    const tgt = state.units.find(u => u.id === pendingAttack.targetId)
    if (!atk || !tgt) return

    const weapon = atk.weapons.find(w => w.name === pendingAttack.weaponName)
    const isMelee = weapon && (weapon.range || 0) === 0
    const isCounterAttack = pendingAttack.isCounterAttack

    // Apply wounds
    tgt.wounds -= wounds
    let units = state.units
    const targetDied = tgt.wounds <= 0
    if (targetDied) { 
      units = state.units.filter(u => u.id !== tgt.id) 
    }
    
    // Mark weapon as used (only for non-counter attacks)
    if (!isCounterAttack) {
      if (!atk.usedWeapons) atk.usedWeapons = []
      atk.usedWeapons.push(pendingAttack.weaponName)
      
      // Mark as having attacked in melee (for exhaustion tracking)
      if (isMelee) {
        atk.hasAttackedInMelee = true
        // If already exhausted, stays exhausted. Otherwise becomes exhausted after first melee attack
        if (!atk.isExhausted) {
          atk.isExhausted = true
        }
      }
    }
    
    set({ units: [...units], pendingAttack: undefined })
    
    // Counter-attack prompt: If this was a melee attack and target is still alive and has melee weapons
    if (isMelee && !isCounterAttack && !targetDied && tgt.wounds > 0) {
      const targetHasMeleeWeapons = tgt.weapons.some(w => (w.range || 0) === 0)
      if (targetHasMeleeWeapons) {
        // Show counter-attack prompt
        set({ counterAttackPrompt: { defenderId: tgt.id, attackerId: atk.id } })
        return // Don't end activation yet, wait for player decision
      }
    }
    
    // Check if all weapons used or no more actions possible (only for non-counter attacks)
    if (!isCounterAttack) {
      const allWeaponsUsed = atk.weapons.every(w => atk.usedWeapons?.includes(w.name))
      const canStillAct = !atk.hasMoved || !allWeaponsUsed
      
      if (!canStillAct || allWeaponsUsed) {
        setTimeout(() => get().endActivation(), 500)
      }
    }
  },

  acceptCounterAttack() {
    const state = get()
    const prompt = state.counterAttackPrompt
    if (!prompt) return

    const defender = state.units.find(u => u.id === prompt.defenderId)
    const attacker = state.units.find(u => u.id === prompt.attackerId)
    if (!defender || !attacker) return

    // Find first melee weapon
    const meleeWeapon = defender.weapons.find(w => (w.range || 0) === 0)
    if (!meleeWeapon) return

    // Clear prompt and trigger counter-attack
    set({ counterAttackPrompt: undefined })
    
    // Mark defender as having attacked in melee if not already
    if (!defender.hasAttackedInMelee) {
      defender.hasAttackedInMelee = true
      defender.isExhausted = true
    }
    
    setTimeout(() => {
      get().attack(defender.id, attacker.id, meleeWeapon.name, true)
    }, 300)
  },

  declineCounterAttack() {
    set({ counterAttackPrompt: undefined })
    
    // Check if activation should end
    const state = get()
    const atk = state.units.find(u => u.id === state.selectedUnitId)
    if (atk) {
      const allWeaponsUsed = atk.weapons.every(w => atk.usedWeapons?.includes(w.name))
      const canStillAct = !atk.hasMoved || !allWeaponsUsed
      
      if (!canStillAct || allWeaponsUsed) {
        setTimeout(() => get().endActivation(), 500)
      }
    }
  },

  endTurn() { get().endActivation() },

  flagAdvanced(){},

  endActivation(){
    const s = get()
    const sel = s.units.find(u => u.id===s.selectedUnitId)
    if (sel){ 
      (sel as any).activated = true
      // Reset per-activation state
      sel.hasMoved = false
      sel.hasRun = false
      sel.usedWeapons = []
    }
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
    for (const u of s.units){ 
      (u as any).activated = false
      u.hasMoved = false
      u.hasRun = false
      u.usedWeapons = []
      // Reset melee exhaustion at start of new round
      u.hasAttackedInMelee = false
      u.isExhausted = false
    }
    set({ round: s.round + 1, currentPlayer: 0, selectedUnitId: undefined, actionMode: undefined })
  },

  getValidTargets(unitId) {
    const state = get()
    const u = state.units.find(x => x.id === unitId)
    if (!u || !u.position) return { shootable: [], meleeable: [] }
    
    const shootable: Unit[] = []
    const meleeable: Unit[] = []
    
    for (const target of state.units) {
      if (!target.position || target.owner === u.owner) continue
      
      const dist = axialDistance(u.position, target.position)
      
      // Check melee range (adjacent hexes) - range 0 weapons, always possible even after running
      if (dist === 1) {
        const hasMeleeWeapons = u.weapons.some(w => (w.range || 0) === 0 && !u.usedWeapons?.includes(w.name))
        if (hasMeleeWeapons) {
          meleeable.push(target)
        }
      }
      
      // Check ranged weapons (range > 0) - only if not run
      if (!u.hasRun) {
        for (const weapon of u.weapons) {
          if ((weapon.range || 0) > 0 && dist <= (weapon.range || 0) && !u.usedWeapons?.includes(weapon.name)) {
            // TODO: Add cover check here
            if (!shootable.find(t => t.id === target.id)) {
              shootable.push(target)
            }
            break
          }
        }
      }
    }
    
    return { shootable, meleeable }
  },

  canUnitShoot(unitId) {
    const u = get().units.find(x => x.id === unitId)
    if (!u) return false
    
    // Can use melee weapons (range 0) even after running
    const hasMeleeWeapons = u.weapons.some(w => (w.range || 0) === 0 && !u.usedWeapons?.includes(w.name))
    if (hasMeleeWeapons) return true
    
    // Can use ranged weapons (range > 0) only if not run
    const hasRangedWeapons = u.weapons.some(w => (w.range || 0) > 0 && !u.usedWeapons?.includes(w.name))
    return !u.hasRun && hasRangedWeapons
  },

  getAvailableWeapons(unitId) {
    const u = get().units.find(x => x.id === unitId)
    if (!u) return []
    
    // If unit has run, only melee weapons (range 0) are available
    if (u.hasRun) {
      return u.weapons.filter(w => (w.range || 0) === 0 && !u.usedWeapons?.includes(w.name))
    }
    
    // Otherwise all unused weapons
    return u.weapons.filter(w => !u.usedWeapons?.includes(w.name))
  },
}))
