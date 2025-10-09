import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/stores/game';
import type { Hex, Unit } from '@/types/battle';
import HexCell from '@/components/HexCell';
import UnitSprite from '@/components/UnitSprite';
import UnitContextMenu from '@/components/UnitContextMenu';
import HexTextures from '@/components/HexTextures';
import OverlayLayer from '@/components/OverlayLayer';
import DeployOverlay from '@/components/DeployOverlay';
import ActionBar from '@/components/ActionBar';
import TurnHUD from '@/components/TurnHUD';
import DiceDialog from '@/components/DiceDialog';
import CounterAttackDialog from '@/components/CounterAttackDialog';
import ObjectiveMarkerComponent from '@/components/ObjectiveMarker';
import ScoreDisplay from '@/components/ScoreDisplay';
import { reachableCosts } from '@/utils/path';
import { gridLookup, axialNeighbors, axialDistance, hexKey } from '@/utils/hex';
import { TERRAIN_RULES } from '@/utils/terrain';

export default function HexGrid() {
  const g = useGame();
  const [selectedHex, setSelectedHex] = useState<Hex | undefined>();
  const [menu, setMenu] = useState<{ u: Unit; x: number; y: number } | null>(null);

  useEffect(() => {
    if (g.grid.length === 0) {
      g.regenerate();
    }
  }, []);

  const size = 30;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;

  function hexToPixel(q: number, r: number) {
    return { x: w * (q + r / 2), y: h * (3 / 4) * r };
  }
  function hexCorner(x: number, y: number, i: number) {
    const ang = (Math.PI / 3) * i + Math.PI / 6;
    return { cx: x + size * Math.cos(ang), cy: y + size * Math.sin(ang) };
  }

  // Calculate bounds including terrain heights
  const terrainHeights: Record<string, number> = {
    open: 0,
    road: 0,
    forest: -3,
    ruin: -2,
    swamp: 1,
    water: 2,
    river: 2,
    lake: 3,
    rock: -8,
    mountain: -15,
  };

  const positions = g.grid.map((hex) => {
    const terrain = hex.terrain;
    const heightOffset = terrainHeights[terrain] || 0;
    const pos = hexToPixel(hex.q, hex.r);
    return { x: pos.x, y: pos.y + heightOffset };
  });

  const minX = positions.length ? Math.min(...positions.map((p) => p.x)) : 0;
  const maxX = positions.length ? Math.max(...positions.map((p) => p.x)) : 0;
  const minY = positions.length ? Math.min(...positions.map((p) => p.y)) : 0;
  const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) : 0;

  // Add padding around the field
  const padding = size * 3;
  const fieldWidth = maxX - minX + padding * 2;
  const fieldHeight = maxY - minY + padding * 2;

  // Center the field
  const translateX = -minX + padding;
  const translateY = -minY + padding;

  const map = useMemo(() => gridLookup(g.grid), [g.grid]);

  const occupantByKey = useMemo(() => {
    const m = new Map<string, Unit>();
    for (const u of g.units) {
      if (!u.position) continue;
      m.set(hexKey(u.position.q, u.position.r), u);
    }
    return m;
  }, [g.units]);

  const selUnit = g.units.find((u) => u.id === g.selectedUnitId);

  // Calculate valid targets
  const validTargets = useMemo(() => {
    if (!g.selectedUnitId || g.phase !== 'playing') return { shootable: [], meleeable: [] };
    return g.getValidTargets(g.selectedUnitId);
  }, [g.selectedUnitId, g.units, g.phase]);

  const { moveCosts, runCosts } = useMemo(() => {
    if (!selUnit || !selUnit.position) return { moveCosts: new Map(), runCosts: new Map() };
    if (selUnit.hasMoved || (selUnit.usedWeapons?.length || 0) > 0)
      return { moveCosts: new Map(), runCosts: new Map() };
    const maxMove = selUnit.speed;
    const maxRun = selUnit.speed * 2;
    const allCosts = reachableCosts(selUnit, g.grid, selUnit.position, maxRun);
    const move = new Map<string, number>();
    const run = new Map<string, number>();
    for (const [k, c] of allCosts) {
      if (k === `${selUnit.position.q},${selUnit.position.r}`) continue;
      if (c <= maxMove) move.set(k, c);
      else if (c <= maxRun) run.set(k, c);
    }
    return { moveCosts: move, runCosts: run };
  }, [g.selectedUnitId, g.units, g.grid]);

  function handleHexClick(hex: Hex) {
    setSelectedHex(hex);
    if (g.phase === 'deploy') {
      if (!g.selectedUnitId) return;
      if (!g.canDeployOn(hex)) return;
      g.placeUnit(g.selectedUnitId, hex);
      return;
    }
    if (g.phase === 'playing' && selUnit) {
      const k = `${hex.q},${hex.r}`;
      // Automatisch erkennen ob normal oder rennen basierend auf Distanz
      const isRun = runCosts.has(k) && !moveCosts.has(k);
      if (moveCosts.has(k) || runCosts.has(k)) {
        g.moveUnit(selUnit.id, hex, isRun);
        return;
      }
    }
  }

  function handleUnitClick(u: Unit) {
    if (g.phase === 'deploy') {
      if (u.owner === g.currentPlayer && u.position) {
        g.unplaceUnit(u.id);
      } else if (u.owner === g.currentPlayer) {
        g.selectUnit(u.id);
      }
    } else if (g.phase === 'playing') {
      if (u.owner === g.currentPlayer && !u.activated) {
        g.selectUnit(u.id);
      } else if (g.selectedUnitId && u.owner !== g.currentPlayer) {
        // Attack enemy unit
        const availableWeapons = g.getAvailableWeapons(g.selectedUnitId);
        if (availableWeapons.length > 0) {
          g.attack(g.selectedUnitId, u.id, availableWeapons[0].name);
        }
      }
    }
  }

  function ActivatedMarker({ u }: { u: Unit }) {
    if (!u.position || !u.activated) return null;
    const center = hexToPixel(u.position.q, u.position.r);
    const { cx, cy } = hexCorner(center.x, center.y, 0); // top-right corner
    return (
      <circle
        cx={cx - 4}
        cy={cy + 4}
        r={5}
        fill="rgba(255,120,120,0.95)"
        stroke="rgba(30,30,30,0.9)"
        strokeWidth={1.2}
      />
    );
  }

  return (
    <>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: 'perspective(1500px) rotateX(45deg)',
          transformOrigin: 'center center',
        }}
      >
        <defs>
          {/* Gradient for 3D ground effect */}
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <HexTextures />
        <g transform={`translate(${translateX},${translateY})`}>
          {g.grid.map((hx) => (
            <HexCell
              key={`${hx.q},${hx.r}`}
              hex={hx}
              size={size}
              onClick={() => handleHexClick(hx)}
              selected={selectedHex?.q === hx.q && selectedHex?.r === hx.r}
              canDeploy={g.phase === 'deploy' ? g.canDeployOn(hx) : false}
              occupantOwner={occupantByKey.get(`${hx.q},${hx.r}`)?.owner as 0 | 1 | undefined}
            />
          ))}

          {/* Objective Markers */}
          {g.phase === 'playing' &&
            g.objectives.map((obj) => (
              <ObjectiveMarkerComponent
                key={obj.id}
                marker={obj}
                size={size}
                hexToPixel={hexToPixel}
              />
            ))}

          {/* Overlays AFTER cells to sit on top of textures/cells, BEFORE units */}
          {g.phase === 'deploy' && <DeployOverlay grid={g.grid} canDeploy={g.canDeployOn} />}
          {g.phase === 'playing' && selUnit && (
            <OverlayLayer moveCosts={moveCosts} runCosts={runCosts} size={size} grid={g.grid} />
          )}

          {/* Highlight valid targets with colored hex overlays */}
          {g.phase === 'playing' &&
            selUnit &&
            validTargets.shootable.map((target) => {
              if (!target.position) return null;
              const terrain = g.grid.find(
                (h) => h.q === target.position?.q && h.r === target.position?.r,
              )?.terrain;
              const terrainHeights: Record<string, number> = {
                open: 0,
                road: 0,
                forest: -3,
                ruin: -2,
                swamp: 1,
                water: 2,
                river: 2,
                lake: 3,
                rock: -8,
                mountain: -15,
              };
              const heightOffset = terrain ? terrainHeights[terrain] || 0 : 0;
              const pos = hexToPixel(target.position.q, target.position.r);

              // Create hex polygon points
              const hexPoints = [];
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + Math.PI / 6;
                hexPoints.push(
                  `${pos.x + size * Math.cos(angle)},${pos.y + heightOffset + size * Math.sin(angle)}`,
                );
              }

              return (
                <g key={`shoot-${target.id}`}>
                  <polygon
                    points={hexPoints.join(' ')}
                    fill="rgba(255, 170, 0, 0.35)"
                    stroke="rgba(255, 170, 0, 1)"
                    strokeWidth={3}
                  />
                  <circle cx={pos.x} cy={pos.y + heightOffset} r={5} fill="rgba(255, 170, 0, 1)" />
                </g>
              );
            })}
          {g.phase === 'playing' &&
            selUnit &&
            validTargets.meleeable.map((target) => {
              if (!target.position) return null;
              const terrain = g.grid.find(
                (h) => h.q === target.position?.q && h.r === target.position?.r,
              )?.terrain;
              const terrainHeights: Record<string, number> = {
                open: 0,
                road: 0,
                forest: -3,
                ruin: -2,
                swamp: 1,
                water: 2,
                river: 2,
                lake: 3,
                rock: -8,
                mountain: -15,
              };
              const heightOffset = terrain ? terrainHeights[terrain] || 0 : 0;
              const pos = hexToPixel(target.position.q, target.position.r);

              // Create hex polygon points
              const hexPoints = [];
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + Math.PI / 6;
                hexPoints.push(
                  `${pos.x + size * Math.cos(angle)},${pos.y + heightOffset + size * Math.sin(angle)}`,
                );
              }

              return (
                <g key={`melee-${target.id}`}>
                  <polygon
                    points={hexPoints.join(' ')}
                    fill="rgba(255, 50, 200, 0.4)"
                    stroke="rgba(255, 50, 200, 1)"
                    strokeWidth={4}
                  />
                  <circle cx={pos.x} cy={pos.y + heightOffset} r={6} fill="rgba(255, 50, 200, 1)" />
                </g>
              );
            })}

          {g.units
            .filter((u) => u.position)
            .map((u) => {
              const terrain = g.grid.find(
                (h) => h.q === u.position?.q && h.r === u.position?.r,
              )?.terrain;
              return (
                <g key={u.id}>
                  <UnitSprite
                    u={u as Unit}
                    selected={g.selectedUnitId === u.id}
                    onClick={() => handleUnitClick(u as Unit)}
                    onContext={(e) => {
                      e.preventDefault();
                      setMenu({ u: u as Unit, x: e.clientX, y: e.clientY });
                    }}
                    terrain={terrain}
                  />
                  <ActivatedMarker u={u as Unit} />
                </g>
              );
            })}
        </g>
      </svg>
      <TurnHUD />
      <ScoreDisplay />
      <ActionBar />
      {menu && (
        <UnitContextMenu unit={menu.u} x={menu.x} y={menu.y} onClose={() => setMenu(null)} />
      )}
      <CounterAttackDialog />
      {g.pendingAttack &&
        (() => {
          const atk = g.units.find((u) => u.id === g.pendingAttack!.attackerId);
          const tgt = g.units.find((u) => u.id === g.pendingAttack!.targetId);
          const weapon = atk?.weapons.find((w) => w.name === g.pendingAttack!.weaponName);
          if (!atk || !tgt || !weapon) return null;

          return (
            <DiceDialog
              attackerName={atk.name}
              targetName={tgt.name}
              weaponName={weapon.name}
              attackerQuality={atk.quality}
              targetDefense={tgt.defense}
              weaponAP={weapon.ap}
              attacks={weapon.attacks}
              isExhausted={atk.isExhausted}
              isCounterAttack={g.pendingAttack.isCounterAttack}
              onClose={(hits, wounds) => g.executeAttack(hits, wounds)}
            />
          );
        })()}
    </>
  );
}
