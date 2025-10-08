import React from 'react';
import type { Unit, TerrainType } from '@/types/battle';

// Match terrain heights from HexCell
const terrainHeight: Record<TerrainType, number> = {
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

export default function UnitSprite({
  u,
  selected,
  onClick,
  onContext,
  terrain,
}: {
  u: Unit;
  selected: boolean;
  onClick: () => void;
  onContext: (e: React.MouseEvent) => void;
  terrain?: TerrainType;
}) {
  const size = 30; // hex radius
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const heightOffset = terrain ? terrainHeight[terrain] || 0 : 0;
  const x = w * (u.position!.q + u.position!.r / 2);
  const y = h * (3 / 4) * u.position!.r + heightOffset;

  // ============================================
  // QUADER DIMENSIONEN - Hier anpassen:
  // ============================================
  const imgSize = 40; // Breite des Quaders (X-Achse) - größer = breiter
  const cubeHeight = 50; // Höhe des Quaders (Y-Achse) - größer = höher
  const depth = 8; // Tiefe des Quaders (Z-Achse) - größer = mehr 3D-Effekt

  // ============================================
  // PERSPEKTIVE - Hier anpassen:
  // ============================================
  // SVG unterstützt nur 2D-Rotation. Für 3D-Effekte:
  // - depth: Steuert wie weit die Seiten nach hinten gehen
  // - depthOffset: Vertikaler Versatz der hinteren Kanten (simuliert X-Rotation)
  // - sideVisible: true = rechte Seite sichtbar, false = linke Seite sichtbar

  const depthOffset = -3; // Negativ = Oberseite kippt nach vorne, Positiv = nach hinten
  const sideVisible = true; // true = rechte Seite, false = linke Seite
  const rotation2D = 0; // 2D-Rotation in Grad (dreht den ganzen Quader)

  return (
    <g
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Position at hex center */}
      <g
        transform={`translate(${x}, ${y})`}
        style={{
          transition: 'transform 0.5s ease-in-out',
        }}
      >
        {/* Shadow for depth */}
        <ellipse
          cx={0}
          cy={size * 0.5}
          rx={imgSize * 0.5}
          ry={imgSize * 0.2}
          fill="rgba(0,0,0,0.4)"
          opacity={0.7}
        />

        {/* 3D Cuboid - positioned so bottom aligns with lower hex corners */}
        <g
          transform={`translate(${-imgSize / 2}, ${size * 0.5 - cubeHeight}) rotate(${rotation2D}, ${imgSize / 2}, ${cubeHeight / 2})`}
        >
          {/* Top face (parallelogram) - mit depthOffset für Kippung */}
          <polygon
            points={`0,0 ${imgSize},0 ${imgSize + depth},${depthOffset} ${depth},${depthOffset}`}
            fill={u.owner === 0 ? '#1e3a8a' : '#7f1d1d'}
            stroke="#000"
            strokeWidth={0.5}
            opacity={0.8}
          />

          {/* Side face (parallelogram) - rechts oder links je nach sideVisible */}
          {sideVisible ? (
            <polygon
              points={`${imgSize},0 ${imgSize + depth},${depthOffset} ${imgSize + depth},${cubeHeight + depthOffset} ${imgSize},${cubeHeight}`}
              fill={u.owner === 0 ? '#1e40af' : '#991b1b'}
              stroke="#000"
              strokeWidth={0.5}
              opacity={0.6}
            />
          ) : (
            <polygon
              points={`0,0 ${depth},${depthOffset} ${depth},${cubeHeight + depthOffset} 0,${cubeHeight}`}
              fill={u.owner === 0 ? '#1e40af' : '#991b1b'}
              stroke="#000"
              strokeWidth={0.5}
              opacity={0.6}
            />
          )}

          {/* Front face (rectangle) with image */}
          <rect
            x={0}
            y={0}
            width={imgSize}
            height={cubeHeight}
            fill={u.owner === 0 ? '#1e3a8a' : '#7f1d1d'}
            stroke="#000"
            strokeWidth={1}
          />

          {/* Image on front face */}
          <image
            href={u.image}
            x={2}
            y={2}
            width={imgSize - 4}
            height={imgSize - 4}
            style={{
              filter:
                u.owner === 0
                  ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) brightness(1.1)'
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5)) brightness(1.1)',
            }}
          />

          {/* Health bar background */}
          <rect
            x={2}
            y={cubeHeight - 10}
            width={imgSize - 4}
            height={8}
            fill="#0a0c12"
            stroke="#2a3143"
            strokeWidth={1}
            rx={2}
          />

          {/* Health bar fill */}
          <rect
            x={3}
            y={cubeHeight - 9}
            width={Math.max(0, (u.wounds / u.maxWounds) * (imgSize - 6))}
            height={6}
            fill={u.owner === 0 ? '#3b82f6' : '#ef4444'}
            rx={1}
          />

          {/* Selection indicator */}
          {selected && (
            <rect
              x={-3}
              y={-3}
              width={imgSize + 6}
              height={cubeHeight + 6}
              fill="none"
              stroke="#9BD0FF"
              strokeDasharray="4 4"
              strokeWidth={2}
            />
          )}

          {/* Glow effect for player color */}
          <rect
            x={0}
            y={0}
            width={imgSize}
            height={cubeHeight}
            fill="none"
            stroke={u.owner === 0 ? '#3b82f6' : '#ef4444'}
            strokeWidth={2}
            opacity={0.6}
          />
        </g>
      </g>
    </g>
  );
}
