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
    <g transform={`translate(${pos.x}, ${pos.y})`}>
      {/* Control zone circle */}
      <circle
        cx={0}
        cy={0}
        r={size * 1.5}
        fill="none"
        stroke={glowColor}
        strokeWidth={2}
        strokeDasharray="8 4"
        opacity={0.4}
        style={{
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />

      {/* Outer glow */}
      <circle
        cx={0}
        cy={0}
        r={markerSize + 4}
        fill={glowColor}
        opacity={0.3}
        filter="blur(4px)"
      />

      {/* Main hexagonal marker */}
      <g>
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
            filter: `drop-shadow(0 0 8px ${glowColor})`,
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
      </g>

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
  );
}
