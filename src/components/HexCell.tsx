import React, { useMemo } from 'react';
import type { Hex, TerrainType } from '@/types/battle';
import { TERRAIN_RULES } from '@/utils/terrain';
import { TERRAIN_SKINS } from '@/config/terrainSkins';

const fillFor: Record<TerrainType, string> = {
  open: 'url(#tex-open)',
  forest: 'url(#tex-forest)',
  rock: 'url(#tex-rock)',
  water: 'url(#tex-water)',
  ruin: 'url(#tex-ruin)',
  swamp: 'url(#tex-swamp)',
  mountain: 'url(#tex-mountain)',
  river: 'url(#tex-river)',
  lake: 'url(#tex-lake)',
  road: 'url(#tex-road)',
};

// 3D height offsets for terrain types (negative = higher up)
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

export default function HexCell({
  hex,
  size,
  selected,
  canDeploy,
  occupantOwner,
  onClick,
}: {
  hex: Hex;
  size: number;
  selected: boolean;
  canDeploy?: boolean;
  occupantOwner?: 0 | 1;
  onClick: () => void;
}) {
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const heightOffset = terrainHeight[hex.terrain] || 0;
  const x = w * (hex.q + hex.r / 2);
  const y = h * (3 / 4) * hex.r + heightOffset;

  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${x + size * Math.cos(angle)},${y + size * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }, [x, y, size]);

  // Create 3D side walls for elevated terrain
  const sideWalls = useMemo(() => {
    if (heightOffset >= 0) return null; // Only for elevated terrain
    const walls = [];
    for (let i = 0; i < 6; i++) {
      const angle1 = (Math.PI / 3) * i + Math.PI / 6;
      const angle2 = (Math.PI / 3) * (i + 1) + Math.PI / 6;
      const x1 = x + size * Math.cos(angle1);
      const y1 = y + size * Math.sin(angle1);
      const x2 = x + size * Math.cos(angle2);
      const y2 = y + size * Math.sin(angle2);
      const y1Bottom = y1 - heightOffset;
      const y2Bottom = y2 - heightOffset;
      walls.push(`${x1},${y1} ${x2},${y2} ${x2},${y2Bottom} ${x1},${y1Bottom}`);
    }
    return walls;
  }, [x, y, size, heightOffset]);

  const ownerColor = occupantOwner === 0 ? '#7aafff' : occupantOwner === 1 ? '#ff8a8a' : undefined;
  const stroke = selected ? '#9BD0FF' : (ownerColor ?? (canDeploy ? '#4cc3ff' : '#384760'));
  const strokeWidth = ownerColor ? 3.5 : selected ? 3 : canDeploy ? 2 : 1;
  const impassable = TERRAIN_RULES[hex.terrain]?.impassable;

  const clipId = `hexclip-${hex.q}-${hex.r}`;
  const skin = TERRAIN_SKINS[hex.terrain];

  // We clip the image to the exact hex polygon, and slightly oversize the image bbox
  // to avoid subpixel seams between adjacent hexes.
  const imgX = x - w / 2 - 1;
  const imgY = y - h / 2 - 1;
  const imgW = w + 2;
  const imgH = h + 2;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={points} />
        </clipPath>
      </defs>

      {/* 3D side walls for elevated terrain */}
      {sideWalls &&
        sideWalls.map((wall, i) => (
          <polygon
            key={i}
            points={wall}
            fill="rgba(0,0,0,0.4)"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={0.5}
          />
        ))}

      {skin ? (
        <image
          href={skin}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          style={{ imageRendering: 'auto' }}
        />
      ) : (
        <polygon points={points} fill={fillFor[hex.terrain]} />
      )}

      {/* Shadow overlay for depth */}
      {heightOffset < 0 && <polygon points={points} fill="rgba(0,0,0,0.15)" />}

      {/* Draw stroke on top so borders remain crisp */}
      <polygon points={points} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Impassable overlay hatch */}
      {impassable && <polygon points={points} fill="url(#tex-hatch)" opacity={0.35} />}
    </g>
  );
}
