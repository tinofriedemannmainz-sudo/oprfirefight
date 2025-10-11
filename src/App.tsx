import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from './stores/game';
import type { Hex, Team, Unit, TerrainType, Weapon } from './types/battle';

async function loadTeams(): Promise<Team[]> {
  const index = await fetch('/data/teams/index.json').then((r) => r.json());
  const teams: Team[] = await Promise.all(
    index.map((t: any) => fetch(t.unitsPath).then((r) => r.json())),
  );
  return teams;
}

const terrainColors: Record<TerrainType, string> = {
  open: '#1d2331',
  forest: '#11331c',
  rock: '#2b2d36',
  water: '#0f2438',
  ruin: '#2d1f1f',
  river: '#0f2438',
  lake: '#0a1a2e',
  mountain: '#1a1c24',
  swamp: '#1a2b1f',
  road: '#2a2d36',
};

const terrainLabel: Record<TerrainType, string> = {
  open: 'Offen',
  forest: 'Wald',
  rock: 'Fels',
  water: 'Wasser',
  ruin: 'Ruine',
  river: 'Fluss',
  lake: 'See',
  mountain: 'Berg',
  swamp: 'Sumpf',
  road: 'Straße',
};

function HexCell({ hex, onClick, selected, highlight }: { hex: Hex; onClick: () => void; selected: boolean; highlight?: 'move' | 'shoot' | 'melee' }) {
  const size = 26;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const x = w * (hex.q + hex.r / 2);
  const y = h * (3 / 4) * hex.r;
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }, [x, y]);

  let strokeColor = '#384760';
  let strokeWidth = 1;
  if (selected) {
    strokeColor = '#9BD0FF';
    strokeWidth = 3;
  } else if (highlight === 'move') {
    strokeColor = '#7aafff';
    strokeWidth = 2;
  } else if (highlight === 'shoot') {
    strokeColor = '#ffaa00';
    strokeWidth = 2;
  } else if (highlight === 'melee') {
    strokeColor = '#ff4444';
    strokeWidth = 2;
  }

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <polygon
        points={points}
        fill={terrainColors[hex.terrain]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </g>
  );
}

function UnitSprite({ u, selected, onClick, highlight }: { u: Unit; selected: boolean; onClick: () => void; highlight?: 'shoot' | 'melee' }) {
  const size = 22;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const x = w * (u.position!.q + u.position!.r / 2);
  const y = h * (3 / 4) * u.position!.r;
  
  let glowColor = u.owner === 0 ? '#7aafff' : '#ff8a8a';
  if (highlight === 'shoot') glowColor = '#ffaa00';
  if (highlight === 'melee') glowColor = '#ff4444';
  
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} transform={`translate(${x - 18},${y - 18})`}>
      <image
        href={u.image}
        width={36}
        height={36}
        style={{
          filter: `drop-shadow(0 0 12px ${glowColor})`,
        }}
      />
      <rect x={-2} y={28} width={40} height={6} fill="#141824" stroke="#2a3143" rx={3} />
      <rect
        x={0}
        y={30}
        width={Math.max(0, (u.wounds / u.maxWounds) * 36)}
        height={2}
        fill={u.owner === 0 ? '#7aafff' : '#ff8a8a'}
      />
      {selected && (
        <circle cx={18} cy={18} r={20} fill="none" stroke="#9BD0FF" strokeDasharray="4 4" />
      )}
      {highlight && (
        <circle cx={18} cy={18} r={22} fill="none" stroke={glowColor} strokeWidth={2} />
      )}
    </g>
  );
}

function Controls() {
  const g = useGame();
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    loadTeams().then((t) => {
      setTeams(t);
      g.loadTeams(t);
    });
  }, []);
  return (
    <div className="floating">
      {g.phase === 'team-select' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: 12 }}>
            <div>
              <div className="accent" style={{ fontSize: 12 }}>
                Spieler 1 Team
              </div>
              <select className="select" onChange={(e) => g.selectTeam(0, e.target.value)}>
                <option>— wählen —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="danger" style={{ fontSize: 12 }}>
                Spieler 2 Team
              </div>
              <select className="select" onChange={(e) => g.selectTeam(1, e.target.value)}>
                <option>— wählen —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" onClick={() => g.startDeploy()}>
              Weiter: Aufstellung
            </button>
          </div>
        </div>
      )}

      {g.phase === 'deploy' && (
        <div className="panel toolbar">
          <span className="tag">Aufstellung – Spieler {g.currentPlayer + 1}</span>
          <button className="btn" onClick={() => g.autoDeployUnits()}>
            Automatische Aufstellung
          </button>
          <button className="btn" onClick={() => g.startGame()}>
            Spiel starten
          </button>
        </div>
      )}

      {g.phase === 'playing' && (
        <div className="panel toolbar">
          <span className="tag">Am Zug: Spieler {g.currentPlayer + 1}</span>
          <button className="btn" onClick={() => g.endTurn()}>
            Zug beenden
          </button>
        </div>
      )}
    </div>
  );
}

function Grid() {
  const g = useGame();
  const [selectedHex, setSelectedHex] = useState<Hex | undefined>();
  const [moveMode, setMoveMode] = useState<'normal' | 'run' | undefined>();
  
  useEffect(() => {
    console.log('🎮 App mounted - grid length:', g.grid.length);
    if (g.grid.length === 0) {
      console.log('🔄 Calling regenerate()...');
      g.regenerate();
      console.log('✅ Regenerate called - new grid length:', g.grid.length);
    }
  }, []);

  const size = 26;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const minQ = Math.min(...g.grid.map((h) => h.q), 0);
  const minR = Math.min(...g.grid.map((h) => h.r), 0);

  // Calculate valid targets when a unit is selected
  const validTargets = useMemo(() => {
    if (!g.selectedUnitId || g.phase !== 'playing') return { shootable: [], meleeable: [] };
    return g.getValidTargets(g.selectedUnitId);
  }, [g.selectedUnitId, g.units, g.phase]);

  // Calculate valid move hexes
  const validMoveHexes = useMemo(() => {
    if (!g.selectedUnitId || g.phase !== 'playing') return [];
    const unit = g.units.find(u => u.id === g.selectedUnitId);
    if (!unit || !unit.position || unit.hasMoved || (unit.usedWeapons?.length || 0) > 0) return [];
    
    const hexes: Hex[] = [];
    const maxDist = moveMode === 'run' ? unit.speed * 2 : unit.speed;
    
    for (const hex of g.grid) {
      const occupied = g.units.some(u => u.position && u.position.q === hex.q && u.position.r === hex.r);
      if (occupied) continue;
      
      const dist = Math.abs(unit.position.q - hex.q) + Math.abs(unit.position.q + unit.position.r - hex.q - hex.r) + Math.abs(unit.position.r - hex.r);
      if (dist / 2 <= maxDist) {
        hexes.push(hex);
      }
    }
    return hexes;
  }, [g.selectedUnitId, g.units, g.grid, g.phase, moveMode]);

  function handleHexClick(hex: Hex) {
    setSelectedHex(hex);
    if (g.phase === 'deploy' && g.selectedUnitId) {
      g.placeUnit(g.selectedUnitId, hex);
    }
    if (g.phase === 'playing' && g.selectedUnitId) {
      const unit = g.units.find(u => u.id === g.selectedUnitId);
      if (unit && !unit.hasMoved && (unit.usedWeapons?.length || 0) === 0) {
        g.moveUnit(g.selectedUnitId, hex, moveMode === 'run');
        setMoveMode(undefined);
      }
    }
  }

  function handleUnitClick(u: Unit) {
    if (g.phase === 'deploy') {
      if (u.owner !== g.currentPlayer) return;
      g.selectUnit(u.id);
    } else if (g.phase === 'playing') {
      if (u.owner === g.currentPlayer) {
        g.selectUnit(u.id);
        setMoveMode(undefined);
      } else if (g.selectedUnitId) {
        const atk = g.units.find((x) => x.id === g.selectedUnitId)!;
        // Find available weapon
        const availableWeapons = g.getAvailableWeapons(g.selectedUnitId);
        if (availableWeapons.length > 0) {
          g.attack(atk.id, u.id, availableWeapons[0].name);
        }
      }
    }
  }

  const width = 1200;
  const height = 800;
  const translateX = width / 2 - w * (minQ + minR / 2);
  const translateY = height / 2 - h * (3 / 4) * minR;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${translateX},${translateY})`}>
          {g.grid.map((hx) => {
            const isValidMove = validMoveHexes.some(h => h.q === hx.q && h.r === hx.r);
            return (
              <HexCell
                key={`${hx.q},${hx.r}`}
                hex={hx}
                onClick={() => handleHexClick(hx)}
                selected={selectedHex?.q === hx.q && selectedHex?.r === hx.r}
                highlight={isValidMove ? 'move' : undefined}
              />
            );
          })}
          {g.units
            .filter((u) => u.position)
            .map((u) => {
              const isShootable = validTargets.shootable.some(t => t.id === u.id);
              const isMeleeable = validTargets.meleeable.some(t => t.id === u.id);
              const highlight = isMeleeable ? 'melee' : isShootable ? 'shoot' : undefined;
              return (
                <UnitSprite
                  key={u.id}
                  u={u as Unit}
                  selected={g.selectedUnitId === u.id}
                  onClick={() => handleUnitClick(u as Unit)}
                  highlight={highlight}
                />
              );
            })}
        </g>
      </svg>
      {g.phase === 'playing' && g.selectedUnitId && (() => {
        const unit = g.units.find(u => u.id === g.selectedUnitId);
        if (!unit) return null;
        const canMove = !unit.hasMoved && (unit.usedWeapons?.length || 0) === 0;
        const canShoot = g.canUnitShoot(g.selectedUnitId);
        const availableWeapons = g.getAvailableWeapons(g.selectedUnitId);
        
        return (
          <div style={{ position: 'absolute', bottom: 100, left: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="panel" style={{ padding: 12 }}>
              <div className="accent" style={{ fontSize: 14, marginBottom: 8 }}>{unit.name}</div>
              {canMove && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button 
                    className="btn" 
                    onClick={() => setMoveMode(moveMode === 'normal' ? undefined : 'normal')}
                    style={{ background: moveMode === 'normal' ? '#7aafff' : undefined }}
                  >
                    Normal bewegen ({unit.speed}")
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => setMoveMode(moveMode === 'run' ? undefined : 'run')}
                    style={{ background: moveMode === 'run' ? '#7aafff' : undefined }}
                  >
                    Rennen ({unit.speed * 2}")
                  </button>
                </div>
              )}
              {canShoot && availableWeapons.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Verfügbare Waffen:</div>
                  {availableWeapons.map(w => (
                    <div key={w.name} style={{ fontSize: 11, color: '#9ca3af' }}>
                      • {w.name} ({w.type === 'melee' ? 'Nahkampf' : `${w.range}"`})
                    </div>
                  ))}
                </div>
              )}
              {unit.hasRun && (
                <div style={{ fontSize: 11, color: '#ff8a8a' }}>Gerannt - kann nicht schießen</div>
              )}
              <button className="btn" onClick={() => g.endActivation()} style={{ marginTop: 8, width: '100%' }}>
                Aktivierung beenden
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DiceLog() {
  const g = useGame();
  return (
    <div className="hud">
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
        {g.diceLog.slice(-6).map((dl, i) => (
          <div className="panel" key={i} style={{ minWidth: 240 }}>
            <div className="accent" style={{ fontSize: 12 }}>
              {dl.label}
            </div>
            <div className="dice" style={{ fontSize: 18 }}>
              {dl.dice.join(' ')}
            </div>
            <div style={{ fontSize: 12 }}>
              <span className="tag">Ziel: {dl.target}+</span>{' '}
              <span className="tag">Erfolge: {dl.success}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '1fr auto' }}>
      <Controls />
      <Grid />
      <DiceLog />
    </div>
  );
}
