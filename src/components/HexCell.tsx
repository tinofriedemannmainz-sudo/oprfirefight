import React, { useMemo } from 'react'
import type { Hex, TerrainType } from '@/types/battle'
import { TERRAIN_RULES } from '@/utils/terrain'
import { TERRAIN_SKINS } from '@/config/terrainSkins'

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
}

export default function HexCell({
  hex, size, selected, canDeploy, occupantOwner, onClick
}:{
  hex:Hex; size:number; selected:boolean; canDeploy?:boolean; occupantOwner?:0|1; onClick:()=>void
}){
  const w = Math.sqrt(3) * size
  const h = 2 * size
  const x = w * (hex.q + hex.r/2)
  const y = h * (3/4) * hex.r
  const points = useMemo(() => {
    const pts = []
    for (let i=0;i<6;i++){
      const angle = Math.PI/3 * i + Math.PI/6
      pts.push(`${x + size*Math.cos(angle)},${y + size*Math.sin(angle)}`)
    }
    return pts.join(' ')
  }, [x,y,size])

  const ownerColor = occupantOwner===0 ? '#7aafff' : occupantOwner===1 ? '#ff8a8a' : undefined
  const stroke = selected ? '#9BD0FF' : ownerColor ?? (canDeploy ? '#4cc3ff' : '#384760')
  const strokeWidth = ownerColor ? 3.5 : selected ? 3 : canDeploy ? 2 : 1
  const impassable = TERRAIN_RULES[hex.terrain]?.impassable

  const clipId = `hexclip-${hex.q}-${hex.r}`
  const skin = TERRAIN_SKINS[hex.terrain]

  // We clip the image to the exact hex polygon, and slightly oversize the image bbox
  // to avoid subpixel seams between adjacent hexes.
  const imgX = x - (w/2) - 1
  const imgY = y - (h/2) - 1
  const imgW = w + 2
  const imgH = h + 2

  return (
    <g onClick={onClick} style={{cursor:'pointer'}}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={points} />
        </clipPath>
      </defs>

      {skin
        ? <image
            href={skin}
            x={imgX}
            y={imgY}
            width={imgW}
            height={imgH}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            style={{ imageRendering: 'auto' }}
          />
        : <polygon points={points} fill={fillFor[hex.terrain]} />
      }

      {/* Draw stroke on top so borders remain crisp */}
      <polygon points={points} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Impassable overlay hatch */}
      {impassable && <polygon points={points} fill="url(#tex-hatch)" opacity={0.35}/>}
    </g>
  )
}
