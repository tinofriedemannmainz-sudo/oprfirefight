
import type { Team } from '@/types/battle'

export async function loadAllTeams(): Promise<Team[]> {
  const index = await fetch('/data/teams/index.json').then(r => r.json())
  const teams: Team[] = await Promise.all(
    index.map((t: any) => fetch(t.unitsPath).then((r) => r.json()))
  )
  return teams
}
