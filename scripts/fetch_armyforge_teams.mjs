
// scripts/fetch_armyforge_teams.mjs
// Node 18+ required (global fetch).
// Robust paging + logging if your previous run found 0 armies.

import fs from 'node:fs'
import path from 'node:path'

const API_ROOT = 'https://army-forge.onepagerules.com/api'

const ROOT = process.cwd()
const OUT_DATA = path.join(ROOT, 'public', 'data', 'teams')
const OUT_ASSETS = path.join(ROOT, 'public', 'assets', 'armies')

function sleep(ms){ return new Promise(r => setTimeout(r, ms)) }

const hdrs = { 'accept': 'application/json' }

function pick(obj, keys, d){
  for (const k of keys){
    const v = obj?.[k]
    if (v !== undefined && v !== null) return v
  }
  return d
}
const num = (x, d=0) => Number.isFinite(Number(x)) ? Number(x) : d

function mkWeapon(src){
  const name = String(pick(src, ['name','weapon','title'], 'Weapon'))
  const rng = num(pick(src, ['range','rng','r'], 1), 1)
  const atk = num(pick(src, ['attacks','shots','a'], 1), 1)
  const ap  = num(pick(src, ['ap','pierce','armorPiercing'], 0), 0)
  const type = (String(pick(src, ['type','category'], 'ranged')).toLowerCase()==='melee' || rng===1) ? 'melee' : 'ranged'
  return { name, range: rng, attacks: atk, ap, type }
}

function makeSVG(armyName, unitName, hue){
  const bg = `hsl(${hue},70%,40%)`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect x="0" y="0" width="128" height="128" fill="${bg}"/>
  <circle cx="64" cy="50" r="26" fill="#ffffff" fill-opacity="0.85"/>
  <rect x="34" y="84" width="60" height="28" rx="12" fill="#ffffff" fill-opacity="0.85"/>
  <text x="64" y="16" dominant-baseline="hanging" text-anchor="middle" font-size="12" fill="#fff">${armyName.slice(0,12)}</text>
  <text x="64" y="64" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#111">${unitName.slice(0,14)}</text>
</svg>`
}

function sanitize(s){
  return String(s).toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'')
}

function getUnitPoints(src){
  const direct = num(pick(src, ['pts','points','cost','value']), NaN)
  if (Number.isFinite(direct)) return direct
  const stats = pick(src, ['stats','attributes','profile','values'], {})
  const inStats = num(pick(stats, ['pts','points','cost']), NaN)
  if (Number.isFinite(inStats)) return inStats
  const opt = pick(src, ['options','upgrades','loadout'], [])
  if (Array.isArray(opt)){
    const sum = opt.reduce((a,o)=>a + num(pick(o,['pts','points','cost'],0),0), 0)
    if (sum>0) return sum
  }
  const q = num(pick(stats, ['quality','q'], 4), 4)
  const d = num(pick(stats, ['defense','def'], 4), 4)
  const a = Array.isArray(pick(src, ['weapons'], [])) ? pick(src, ['weapons'], []).reduce((m,w)=>m+num(pick(w,['attacks','a'],1),1),0) : 2
  const w = num(pick(stats, ['wounds','hp'], 2), 2)
  return Math.max(10, Math.round(20 + (6-q)*4 + (6-d)*3 + a*2 + (w-2)*3))
}

function unitFromEntry(e, i, armyName, hueBase){
  const stats = pick(e, ['stats','attributes','profile','values'], e) || {}
  const name = String(pick(e, ['name','title','unitName'], `Unit ${i+1}`))
  const quality = num(pick(stats, ['quality','q','skill','hitOn'], 4), 4)
  const defense = num(pick(stats, ['defense','def','save','armor'], 4), 4)
  const speed   = num(pick(stats, ['speed','spd','m','move'], 3), 3)
  const wounds  = num(pick(stats, ['wounds','hp','health'], 2), 2)

  const wsrc = pick(e, ['weapons','loadout','gear','equipment','w'], [])
  const weapons = Array.isArray(wsrc) && wsrc.length ? wsrc.slice(0,2).map(mkWeapon) : [mkWeapon({ name:'Basic', range:4, attacks:2, ap:0, type:'ranged' })]

  const uid = String(pick(e, ['id','_id','key','slug'], `u-${i+1}`))
  const hue = (hueBase + i*17) % 360
  const svg = makeSVG(armyName, name, hue)
  return {
    id: uid,
    name, quality, defense, speed, wounds, maxWounds: wounds, weapons,
    image: null,
    __svg: svg
  }
}

// ---- ROBUST LIST FETCH ----

async function fetchOfficialPage(page, variant=0){
  let url
  if (variant === 0){
    url = `${API_ROOT}/army-books?filters=official&gameSystemSlug=grimdark-future-firefight&searchText=&page=${page}&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null`
  } else if (variant === 1){
    url = `${API_ROOT}/army-books?filters=official&gameSystemSlug=grimdark-future-firefight&page=${page}`
  } else {
    url = `${API_ROOT}/army-books?gameSystem=3&filters=official&page=${page}`
  }
  const res = await fetch(url, { headers: hdrs })
  if (!res.ok) throw new Error('List fetch failed: ' + res.status + ' @ ' + url)
  const data = await res.json()
  // Extract items: supports several shapes
  const items = Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.data?.items) ? data.data.items
    : Array.isArray(data) ? data
    : []
  const hasMore = Boolean(data?.hasMore || data?.data?.hasMore || (data?.nextPage != null))
  const totalPages = num(pick(data, ['totalPages','data.totalPages'], NaN), NaN)
  return { items, hasMore, totalPages, raw: data }
}

async function fetchAllOfficialList(){
  const results = new Map() // uid -> {uid,name}
  const variants = [0, 1, 2]
  for (const v of variants){
    // try both 0-based and 1-based pages
    for (const start of [0,1]){
      let page = start
      let lastLen = 0
      for (let hardStop = 0; hardStop < 20; hardStop++){
        const { items, hasMore, totalPages, raw } = await fetchOfficialPage(page, v)
        if (!Array.isArray(items) || items.length === 0){
          // stop if we got empties twice in a row
          if (lastLen === 0) break
          lastLen = 0
          page++
          continue
        }
        for (const x of items){
          const uid = String(x.uid ?? x.id ?? x._id ?? x.slug ?? '')
          const name = String(x.name ?? x.displayName ?? 'Unknown')
          if (uid) results.set(uid, { uid, name })
        }
        lastLen = items.length
        // break conditions
        if (!hasMore && Number.isFinite(totalPages) && page >= (totalPages-1)) break
        page++
        await sleep(120)
      }
      if (results.size > 0) break
    }
    if (results.size > 0) break
  }
  return Array.from(results.values())
}

async function fetchBook(uid){
  const url = `${API_ROOT}/army-books/${encodeURIComponent(uid)}?gameSystem=3`
  const res = await fetch(url, { headers: hdrs })
  if (!res.ok) throw new Error('Book fetch failed: ' + res.status)
  return await res.json()
}

function greedy250(unitsWithPts){
  unitsWithPts.sort((a,b)=>a.pts-b.pts)
  const target = 250
  const picked = []
  let total = 0

  const leaderIdx = unitsWithPts.findIndex(c => String(c.unit.name).toLowerCase().includes('leader') || String(c.unit.name).toLowerCase().includes('captain') || String(c.unit.name).toLowerCase().includes('sergeant'))
  if (leaderIdx>=0 && total + unitsWithPts[leaderIdx].pts <= target){
    picked.push(unitsWithPts[leaderIdx])
    total += unitsWithPts[leaderIdx].pts
  }

  for (const c of unitsWithPts){
    if (picked.includes(c)) continue
    if (total + c.pts <= target){
      picked.push(c)
      total += c.pts
    }
    if (total >= target-5) break
  }

  if (picked.length === 0 && unitsWithPts.length){
    picked.push(...unitsWithPts.slice(0,6))
  }

  return { picked: picked.map(p => p.unit), total }
}

async function main(){
  fs.mkdirSync(OUT_DATA, { recursive: true })
  fs.mkdirSync(OUT_ASSETS, { recursive: true })

  console.log('Fetching official Firefight army list...')
  const list = await fetchAllOfficialList()
  console.log('Found armies:', list.length)
  if (!list.length){
    console.log('DEBUG: Endpoint may have changed. Try opening this in a browser to inspect JSON:')
    console.log(`${API_ROOT}/army-books?filters=official&gameSystemSlug=grimdark-future-firefight&searchText=&page=1&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null`)
    console.log('If it returns, please share the shape (keys) so we can adjust the parser.')
  } else {
    console.log('First 3 armies:', list.slice(0,3))
  }

  let ok = 0, fail = 0

  for (const it of list){
    try {
      const book = await fetchBook(it.uid)
      const name = String(book?.name ?? it.name ?? 'Army')
      const uid  = String(book?.uid ?? it.uid)

      const entries = Array.isArray(book?.units) ? book.units
        : Array.isArray(book?.profiles) ? book.profiles
        : Array.isArray(book?.entries) ? book.entries
        : Array.isArray(book?.datasheets) ? book.datasheets
        : []

      let hueBase = [...uid].reduce((a,c)=>a + c.charCodeAt(0), 0) % 360
      const units = entries.map((e,i) => {
        const u = unitFromEntry(e, i, name, hueBase)
        const pts = getUnitPoints(e)
        return { unit: u, pts }
      }).filter(x => Number.isFinite(x.pts) && x.pts > 0)

      const { picked } = greedy250(units)

      const aDir = path.join(OUT_ASSETS, sanitize(uid))
      const tDir = path.join(OUT_DATA, sanitize(uid))
      fs.mkdirSync(aDir, { recursive: true })
      fs.mkdirSync(tDir, { recursive: true })

      const finalUnits = picked.map((u, idx) => {
        const fname = sanitize(`${idx+1}-${u.name || 'unit'}`).slice(0,60) + '.svg'
        const fpath = path.join(aDir, fname)
        fs.writeFileSync(fpath, u.__svg, 'utf-8')
        return {
          id: String(u.id || `u-${idx+1}`),
          name: u.name,
          image: `/assets/armies/${sanitize(uid)}/${fname}`,
          quality: u.quality,
          defense: u.defense,
          speed: u.speed,
          wounds: u.wounds,
          maxWounds: u.maxWounds,
          weapons: u.weapons
        }
      })

      const team = {
        id: sanitize(uid),
        name: `${name} – 250pts`,
        faction: name,
        units: finalUnits
      }

      fs.writeFileSync(path.join(tDir, 'team.json'), JSON.stringify(team, null, 2), 'utf-8')
      ok++
      console.log('OK', ok, '/', list.length, '-', name)
      await sleep(120)
    } catch (e){
      fail++
      console.warn('FAIL', it.name, e?.message || e)
      await sleep(250)
    }
  }

  const teamsDirs = fs.existsSync(OUT_DATA) ? fs.readdirSync(OUT_DATA, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : []
  const index = teamsDirs.map(id => ({
    id,
    name: id.replace(/-/g,' '),
    faction: id.replace(/-/g,' '),
    unitsPath: `/data/teams/${id}/team.json`
  }))
  fs.mkdirSync(OUT_DATA, { recursive: true })
  fs.writeFileSync(path.join(OUT_DATA, 'index.json'), JSON.stringify(index, null, 2), 'utf-8')

  console.log('Done. OK:', ok, 'FAIL:', fail)
}

main().catch(e => { console.error(e); process.exit(1) })
