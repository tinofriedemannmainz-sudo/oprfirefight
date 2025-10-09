import React, { useState } from 'react';
import HexGrid from './HexGrid';
import BabylonHexGrid from './BabylonHexGrid';
import TurnHUD from './TurnHUD';
import ScoreDisplay from './ScoreDisplay';
import ActionBar from './ActionBar';

// Export the state so Instructions can access it
export const ViewContext = React.createContext<{
  use3D: boolean;
  setUse3D: (value: boolean) => void;
}>({ use3D: true, setUse3D: () => {} });

export default function GameView() {
  const [use3D, setUse3D] = useState(true); // Toggle between 2D and 3D

  return (
    <ViewContext.Provider value={{ use3D, setUse3D }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Render either 2D or 3D view */}
        {use3D ? <BabylonHexGrid /> : <HexGrid />}

        {/* UI overlays (always visible) */}
        <TurnHUD />
        <ScoreDisplay />
        <ActionBar />
      </div>
    </ViewContext.Provider>
  );
}
