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
  const imgSize = 44; // bigger icon visuals

  // Position unit so bottom edge is at the two bottom corners of the hex
  // Tilt more forward for stronger 3D effect
  const tiltAngle = 40; // Increased tilt for more dramatic 3D effect
  const scaleY = Math.cos((tiltAngle * Math.PI) / 180); // Compress height due to perspective
  const hexBottomY = size * 0.5; // Distance from hex center to bottom edge

  return (
    <g
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(e);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Position at hex center, then apply perspective transform */}
      <g transform={`translate(${x}, ${y + hexBottomY})`}>
        {/* Shadow for depth */}
        <ellipse
          cx={0}
          cy={2}
          rx={imgSize * 0.4}
          ry={imgSize * 0.15}
          fill="rgba(0,0,0,0.3)"
          opacity={0.6}
        />

        {/* Apply perspective: scale Y to simulate tilt, translate to position bottom at hex bottom edge */}
        <g transform={`translate(${-imgSize / 2}, ${-imgSize}) scale(1, ${scaleY})`}>
          <image
            href={u.image}
            width={imgSize}
            height={imgSize}
            style={{
              filter:
                u.owner === 0
                  ? 'drop-shadow(0 4px 8px rgba(122,175,255,0.6)) drop-shadow(0 0 12px #7aafff) brightness(1.1)'
                  : 'drop-shadow(0 4px 8px rgba(255,138,138,0.6)) drop-shadow(0 0 12px #ff8a8a) brightness(1.1)',
            }}
          />
          <rect
            x={-2}
            y={imgSize - 6}
            width={imgSize + 4}
            height={6}
            fill="#141824"
            stroke="#2a3143"
            rx={3}
          />
          <rect
            x={0}
            y={imgSize - 4}
            width={Math.max(0, (u.wounds / u.maxWounds) * imgSize)}
            height={2}
            fill={u.owner === 0 ? '#7aafff' : '#ff8a8a'}
          />
          {selected && (
            <circle
              cx={imgSize / 2}
              cy={imgSize / 2}
              r={imgSize / 2 + 6}
              fill="none"
              stroke="#9BD0FF"
              strokeDasharray="4 4"
              strokeWidth={2}
            />
          )}
        </g>
      </g>
    </g>
  );
}
