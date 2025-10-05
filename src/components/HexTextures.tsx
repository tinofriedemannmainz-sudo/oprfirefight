import React from 'react'
export default function HexTextures(){
  return (
    <defs>
      <pattern id="tex-forest" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#11331c"/>
        <circle cx="2" cy="2" r="1" fill="#155b2a"/>
        <circle cx="5" cy="4" r="1" fill="#0e4721"/>
      </pattern>
      <pattern id="tex-rock" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#2b2d36"/>
        <path d="M0,6 L4,2 L8,6" stroke="#3a3e4a" strokeWidth="1" fill="none"/>
      </pattern>
      <pattern id="tex-mountain" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#3a3e4a"/>
        <path d="M0,6 L3,2 L6,6" stroke="#596174" strokeWidth="1" fill="none"/>
      </pattern>
      <pattern id="tex-water" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#0f2438"/>
        <path d="M0,3 Q2,2 4,3 T8,3" stroke="#1c5a8c" strokeWidth="0.8" fill="none"/>
      </pattern>
      <pattern id="tex-river" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#133a5a"/>
        <path d="M0,3 Q2,4 4,3 T8,3" stroke="#1c78b8" strokeWidth="0.8" fill="none"/>
      </pattern>
      <pattern id="tex-lake" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#0c2a48"/>
        <circle cx="3" cy="3" r="1" fill="#114a7a"/>
      </pattern>
      <pattern id="tex-swamp" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#23321a"/>
        <circle cx="2" cy="4" r="1" fill="#2d4a1e"/>
        <rect x="4" y="1" width="2" height="1" fill="#2d4a1e"/>
      </pattern>
      <pattern id="tex-ruin" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#2d1f1f"/>
        <path d="M1,5 L5,5" stroke="#5a3a3a" strokeWidth="1"/>
        <rect x="2" y="2" width="1" height="1" fill="#5a3a3a"/>
      </pattern>
      <pattern id="tex-road" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#4a3c2f"/>
        <path d="M0,3 L6,3" stroke="#c8b59a" strokeWidth="1" strokeDasharray="1 1"/>
      </pattern>
      <pattern id="tex-open" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="#1d2331"/>
        <rect x="3" y="3" width="1" height="1" fill="#222a3b"/>
      </pattern>
      <pattern id="tex-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="transparent"/>
        <path d="M0,0 L0,6" stroke="#000" strokeWidth="1" opacity="0.25"/>
      </pattern>
    </defs>
  )
}
