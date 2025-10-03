
/**
 * Army Forge Import Service (best-effort)
 * - Fetches all Army Books for a given gameSystem (3 = GFF)
 * - Fetches a single Army Book by id
 * - Transforms to our internal Team format with sensible fallbacks
 *
 * NOTE: This relies on public endpoints such as:
 *   https://army-forge.onepagerules.com/api/army-books?gameSystem=3
 *   https://army-forge.onepagerules.com/api/army-books/:id?gameSystem=3
 * Some environments may require a CORS proxy. See the 'proxy' helper below.
 */
import type { Team, Unit, Weapon } from '@/types/battle'

const API_ROOT = 'https://army-forge.onepagerules.com/api'

/** Optional CORS proxy; set to '' to call API directly */
const proxy = '' // e.g. 'https://cors.isomorphic-git.org/'

export type ArmyBookSummary = {
  id: string
  name: string
  faction?: string
}

export async function fetchArmyBooks(gameSystem = 3): Promise<ArmyBookSummary[]> {
  const url = `${proxy}${API_ROOT}/army-books?gameSystem=${gameSystem}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Army Forge list failed: ${res.status}`)
  const data = await res.json()
  // Try to normalize: array of { id, name }
  if (Array.isArray(data)) {
    return data.map((b: any) => ({
      id: String(b.id ?? b._id ?? b.armyId ?? b.slug ?? b.key ?? ''),
      name: String(b.name ?? b.displayName ?? b.title ?? 'Unknown Army'),
      faction: String(b.faction ?? b.category ?? '').trim() || undefined,
    })).filter(b => b.id)
  }
  // Fallback if object with .items
  if (Array.isArray((data as any).items)) {
    return (data as any).items.map((b: any) => ({
      id: String(b.id ?? b._id ?? b.armyId ?? b.slug ?? ''),
      name: String(b.name ?? b.displayName ?? 'Unknown Army'),
      faction: String(b.faction ?? '').trim() || undefined,
    })).filter(b => b.id)
  }
  return []
}

export async function fetchArmyBook(bookId: string, gameSystem = 3): Promise<any> {
  const url = `${proxy}${API_ROOT}/army-books/${encodeURIComponent(bookId)}?gameSystem=${gameSystem}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Army Forge book failed: ${res.status}`)
  return await res.json()
}

/**
 * Best-effort transform: takes an army book JSON and emits a playable Team.
 * We try to pick some 'core' unit profiles as baseline units.
 * Because schemas vary, we probe multiple common property names.
 */
export function armyBookToTeam(book: any): Team {
  const teamId = String(
    book?.id ?? book?._id ?? book?.armyId ?? book?.slug ?? book?.key ?? cryptoRandom('army')
  )
  const name = String(book?.name ?? book?.displayName ?? book?.title ?? 'Unnamed Army')

  // Attempt to find unit entries:
  const unitsSource: any[] =
    book?.units ?? book?.profiles ?? book?.entries ?? book?.datasheets ?? book?.list ?? []

  const pick = (o: any, keys: string[], d: any=null) => {
    for (const k of keys) {
      const v = o?.[k]
      if (v !== undefined && v !== null) return v
    }
    return d
  }

  const mkWeapon = (src: any): Weapon => ({
    name: String(pick(src, ['name','weapon','title'], 'Waffe')),
    range: Number(pick(src, ['range','rng','r'], 1)) || 1,
    attacks: Number(pick(src, ['attacks','shots','a'], 1)) || 1,
    ap: Number(pick(src, ['ap','pierce','armorPiercing'], 0)) || 0,
    type: (String(pick(src, ['type','category'], 'ranged')) === 'melee' || Number(pick(src, ['range'], 1)) === 1) ? 'melee' : 'ranged'
  })

  const mkUnit = (src: any, idx: number): Omit<Unit,'owner'|'position'> => {
    const stats = pick(src, ['stats','attributes','profile','values'], src) || {}
    const image = '/assets/unit_1.svg'
    const name = String(pick(src, ['name','title','unitName'], `Unit ${idx+1}`))
    const quality = Number(pick(stats, ['quality','q','skill','hitOn'], 4)) || 4
    const defense = Number(pick(stats, ['defense','def','save','armor'], 4)) || 4
    const speed = Number(pick(stats, ['speed','spd','m','move'], 3)) || 3
    const wounds = Number(pick(stats, ['wounds','hp','health'], 2)) || 2

    // try weapons arrays
    const wsrc = pick(src, ['weapons','loadout','gear','equipment','w'], [])
    const weapons: Weapon[] = Array.isArray(wsrc) && wsrc.length
      ? wsrc.slice(0,2).map(mkWeapon)
      : [mkWeapon({ name: 'Basic', range: 4, attacks: 2, ap: 0, type: 'ranged' })]

    return {
      id: String(pick(src, ['id','_id','key','slug'], `${teamId}-${idx+1}`)),
      name, image, quality, defense, speed, wounds, maxWounds: wounds, weapons
    }
  }

  const picked = (Array.isArray(unitsSource) ? unitsSource : []).slice(0, 10).map(mkUnit)

  return {
    id: teamId,
    name,
    faction: String(book?.faction ?? '').trim() || name,
    units: picked
  }
}

function cryptoRandom(prefix='id'){
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const a = new Uint32Array(2); crypto.getRandomValues(a); return `${prefix}-${a[0].toString(16)}${a[1].toString(16)}`
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}`
}
