
import type { Team, Unit, Weapon } from '@/types/battle'

const API_ROOT = 'https://army-forge.onepagerules.com/api'

export const CORS_PROXY = '' // e.g. 'https://cors.isomorphic-git.org/'

export type ArmySummary = { uid: string; name: string }

export async function fetchOfficialFirefightArmies(): Promise<ArmySummary[]> {
  const url = `${CORS_PROXY}${API_ROOT}/army-books?filters=official&gameSystemSlug=grimdark-future-firefight&searchText=&page=1&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load army list: ' + res.status)
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
  return items.map((x:any) => ({ uid: String(x.uid ?? x.id ?? x._id ?? x.slug), name: String(x.name ?? x.displayName ?? 'Unknown') }))
}

export async function fetchArmyBookByUid(uid: string): Promise<any> {
  const url = `${CORS_PROXY}${API_ROOT}/army-books/${encodeURIComponent(uid)}?gameSystem=3`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load army book: ' + res.status)
  return await res.json()
}

function pick<T=any>(o:any, keys:string[], d?:T): T {
  for (const k of keys) { const v = o?.[k]; if (v !== undefined && v !== null) return v as T }
  return d as T
}

function normalizeNumber(x:any, d=0){ const n = Number(x); return Number.isFinite(n) ? n : d }

function mkWeapon(src:any): Weapon {
  const name = String(pick(src, ['name','weapon','title'], 'Weapon'))
  const rng = normalizeNumber(pick(src, ['range','rng','r'], 1), 1)
  const atk = normalizeNumber(pick(src, ['attacks','shots','a'], 1), 1)
  const ap  = normalizeNumber(pick(src, ['ap','pierce','armorPiercing'], 0), 0)
  const type = (String(pick(src, ['type','category'], 'ranged')).toLowerCase()==='melee' || rng===1) ? 'melee' : 'ranged'
  return { name, range: rng, attacks: atk, ap, type }
}

function mkUnitFromEntry(src:any, idx:number, fallbackImg:string): Omit<Unit,'owner'|'position'> {
  const stats = pick(src, ['stats','attributes','profile','values'], src) || {}
  const name = String(pick(src, ['name','title','unitName'], `Unit ${idx+1}`))
  const quality = normalizeNumber(pick(stats, ['quality','q','skill','hitOn'], 4), 4)
  const defense = normalizeNumber(pick(stats, ['defense','def','save','armor'], 4), 4)
  const speed   = normalizeNumber(pick(stats, ['speed','spd','m','move'], 3), 3)
  const wounds  = normalizeNumber(pick(stats, ['wounds','hp','health'], 2), 2)

  const wsrc = pick(src, ['weapons','loadout','gear','equipment','w'], [])
  const weapons: Weapon[] = Array.isArray(wsrc) && wsrc.length ? wsrc.slice(0,2).map(mkWeapon) : [mkWeapon({ name:'Basic', range:4, attacks:2, ap:0, type:'ranged' })]

  return {
    id: String(pick(src, ['id','_id','key','slug'], `u-${idx+1}`)),
    name, image: fallbackImg, quality, defense, speed, wounds, maxWounds: wounds, weapons
  }
}

function getUnitPoints(src:any): number {
  const direct = normalizeNumber(pick(src, ['pts','points','cost','value'], NaN), NaN)
  if (Number.isFinite(direct)) return direct
  const stats = pick(src, ['stats','attributes','profile','values'], {})
  const inStats = normalizeNumber(pick(stats, ['pts','points','cost'], NaN), NaN)
  if (Number.isFinite(inStats)) return inStats
  const opt = pick(src, ['options','upgrades','loadout'], [])
  if (Array.isArray(opt)) {
    const sum = opt.reduce((a:number, o:any)=>a + (normalizeNumber(pick(o, ['pts','points','cost'], 0), 0)), 0)
    if (sum>0) return sum
  }
  const q = normalizeNumber(pick(stats, ['quality','q'], 4), 4)
  const d = normalizeNumber(pick(stats, ['defense','def'], 4), 4)
  const a = Array.isArray(pick(src, ['weapons'], [])) ? pick(src, ['weapons'], []).reduce((m:number,w:any)=>m+normalizeNumber(pick(w,['attacks','a'],1),1),0) : 2
  const w = normalizeNumber(pick(stats, ['wounds','hp'], 2), 2)
  const heuristic = Math.max(10, 20 + (6-q)*4 + (6-d)*3 + a*2 + (w-2)*3)
  return Math.round(heuristic)
}

export function makeUnitImageDataURL(armyName:string, unitName:string, hue:number): string {
  const bg = `hsl(${hue},70%,40%)`
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <rect x='0' y='0' width='128' height='128' fill='${bg}'/>
      <circle cx='64' cy='50' r='26' fill='white' fill-opacity='0.85'/>
      <rect x='34' y='84' width='60' height='28' rx='12' fill='white' fill-opacity='0.85'/>
      <text x='64' y='16' dominant-baseline='hanging' text-anchor='middle' font-size='12' fill='#fff'>${armyName.slice(0,12)}</text>
      <text x='64' y='64' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='#111'>${unitName.slice(0,14)}</text>
    </svg>`
  )
  return `data:image/svg+xml;charset=utf-8,${svg}`
}

export function armyBookTo250Team(book:any): Team {
  const uid = String(book?.uid ?? book?.id ?? book?._id ?? book?.slug ?? Math.random().toString(36).slice(2))
  const name = String(book?.name ?? book?.displayName ?? 'Unnamed Army')
  const entries: any[] = Array.isArray(book?.units) ? book.units
    : Array.isArray(book?.profiles) ? book.profiles
    : Array.isArray(book?.entries) ? book.entries
    : Array.isArray(book?.datasheets) ? book.datasheets
    : []

  let hueBase = Math.floor((uid.split('').reduce((a:number,c:string)=>a+c.charCodeAt(0),0) % 360))
  const candidates = entries.map((e:any, i:number) => {
    const pts = getUnitPoints(e)
    const unit = mkUnitFromEntry(e, i, makeUnitImageDataURL(name, String(pick(e,['name','title'],'Unit')), (hueBase + i*17) % 360))
    return { pts, unit }
  }).filter(x => Number.isFinite(x.pts) && x.pts > 0)

  candidates.sort((a,b)=>a.pts-b.pts)
  const target = 250
  const picked: Omit<Unit,'owner'|'position'>[] = []
  let total = 0

  const leaderIdx = candidates.findIndex(c => String(c.unit.name).toLowerCase().includes('leader') || String(c.unit.name).toLowerCase().includes('captain') || String(c.unit.name).toLowerCase().includes('sergeant'))
  if (leaderIdx>=0 && total + candidates[leaderIdx].pts <= target){
    picked.push(candidates[leaderIdx].unit)
    total += candidates[leaderIdx].pts
  }

  for (const c of candidates){
    if (picked.includes(c.unit)) continue
    if (total + c.pts <= target) { picked.push(c.unit); total += c.pts }
    if (total >= target-5) break
  }

  if (picked.length === 0 && candidates.length){
    picked.push(...candidates.slice(0,6).map(x=>x.unit))
  }

  return { id: uid, name: name + ' – 250pts', faction: name, units: picked }
}

export async function buildAllOfficialTeams250(): Promise<Team[]> {
  const list = await fetchOfficialFirefightArmies()
  const teams: Team[] = []
  for (const it of list){
    try {
      const book = await fetchArmyBookByUid(it.uid)
      const team = armyBookTo250Team(book)
      teams.push(team)
    } catch (e) {
      console.warn('army build failed', it, e)
    }
  }
  return teams
}
