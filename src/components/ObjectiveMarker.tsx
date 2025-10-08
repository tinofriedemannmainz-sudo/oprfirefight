import React from 'react';
import type { ObjectiveMarker } from '@/types/battle';

export default function ObjectiveMarkerComponent({
  marker,
  size,
  hexToPixel,
}: {
  marker: ObjectiveMarker;
  size: number;
  hexToPixel: (q: number, r: number) => { x: number; y: number };
}) {
  const pos = hexToPixel(marker.position.q, marker.position.r);
  const markerSize = size * 0.6;
  const hoverHeight = -30; // Height above ground (negative = up)
  const controlRadius = size * 1.5; // Control zone radius
  const beamWidth = controlRadius * 2; // Light cone covers entire control zone

  // Color based on control status
  let fillColor = '#4a5568'; // neutral gray
  let glowColor = '#718096';
  
  if (marker.contested) {
    fillColor = '#d97706'; // orange for contested
    glowColor = '#f59e0b';
  } else if (marker.controlledBy === 0) {
    fillColor = '#3b82f6'; // blue for player 0
    glowColor = '#60a5fa';
  } else if (marker.controlledBy === 1) {
    fillColor = '#ef4444'; // red for player 1
    glowColor = '#f87171';
  }

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} style={{ pointerEvents: 'none' }}>
      {/* Light cone from marker to ground */}
      <defs>
        <linearGradient id={`beam-${marker.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={glowColor} stopOpacity={0.8} />
          <stop offset="50%" stopColor={glowColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={glowColor} stopOpacity={0.05} />
        </linearGradient>
        <radialGradient id={`groundGlow-${marker.id}`}>
          <stop offset="0%" stopColor={glowColor} stopOpacity={0.6} />
          <stop offset="70%" stopColor={glowColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
        </radialGradient>
      </defs>
      
      {/* Cone-shaped light beam covering control zone */}
      <polygon
        points={`${-markerSize * 0.4},${hoverHeight} ${markerSize * 0.4},${hoverHeight} ${beamWidth / 2},0 ${-beamWidth / 2},0`}
        fill={`url(#beam-${marker.id})`}
        opacity={0.7}
        style={{
          animation: 'glowPulse 3s ease-in-out infinite',
        }}
      />
      
      {/* Stronger ground glow where light hits */}
      <circle
        cx={0}
        cy={0}
        r={controlRadius}
        fill={`url(#groundGlow-${marker.id})`}
        opacity={0.8}
        style={{
          animation: 'glowPulse 3s ease-in-out infinite',
        }}
      />
      
      {/* Additional bright center spot */}
      <ellipse
        cx={0}
        cy={0}
        rx={controlRadius * 0.6}
        ry={controlRadius * 0.3}
        fill={glowColor}
        opacity={0.5}
        filter="blur(8px)"
        style={{
          animation: 'glowPulse 2.5s ease-in-out infinite',
        }}
      />

      {/* Control zone circle on ground */}
      <circle
        cx={0}
        cy={0}
        r={size * 1.5}
        fill="none"
        stroke={glowColor}
        strokeWidth={2}
        strokeDasharray="8 4"
        opacity={0.3}
        style={{
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />

      {/* Main hexagonal marker - floating in the air */}
      <g transform={`translate(0, ${hoverHeight})`}>
        {/* Outer glow */}
        <circle
          cx={0}
          cy={0}
          r={markerSize + 6}
          fill={glowColor}
          opacity={0.2}
          filter="blur(8px)"
          style={{
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        />
        
        {/* Hexagon background */}
        <polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 3) * i;
            const x = markerSize * Math.cos(angle);
            const y = markerSize * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ')}
          fill={fillColor}
          stroke={glowColor}
          strokeWidth={2}
          style={{
            filter: `drop-shadow(0 4px 12px ${glowColor})`,
          }}
        />

        {/* Inner hexagon detail */}
        <polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 3) * i;
            const x = (markerSize * 0.7) * Math.cos(angle);
            const y = (markerSize * 0.7) * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke={glowColor}
          strokeWidth={1.5}
          opacity={0.6}
        />

        {/* Center circle */}
        <circle
          cx={0}
          cy={0}
          r={markerSize * 0.4}
          fill="#1a202c"
          stroke={glowColor}
          strokeWidth={2}
        />

        {/* Objective number */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill={glowColor}
          fontSize={markerSize * 0.6}
          fontWeight="bold"
          fontFamily="monospace"
          style={{
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        >
          {marker.id}
        </text>

        {/* Rotating outer ring */}
        <circle
          cx={0}
          cy={0}
          r={markerSize + 2}
          fill="none"
          stroke={glowColor}
          strokeWidth={1}
          strokeDasharray="4 8"
          opacity={0.5}
          style={{
            animation: 'spin 8s linear infinite',
          }}
        />

        {/* Status indicator */}
        {marker.contested && (
          <g transform={`translate(0, ${-markerSize - 8})`}>
            <rect
              x={-15}
              y={-6}
              width={30}
              height={12}
              fill="#d97706"
              stroke="#f59e0b"
              strokeWidth={1}
              rx={6}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={8}
              fontWeight="bold"
            >
              !
            </text>
          </g>
        )}
      </g>
    </g>
  );
}
