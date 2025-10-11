
import React, { useEffect } from 'react'
import Controls from '@/components/Controls'
import GameView from '@/components/GameView'
import DiceLog from '@/components/DiceLog'
import DeployPanel from '@/components/DeployPanel'
import { useGame } from '@/stores/game'

export default function GamePage(){
  const g = useGame();
  
  // Initialize grid on mount
  useEffect(() => {
    console.log('🎮 GamePage mounted - grid length:', g.grid.length);
    if (g.grid.length === 0) {
      console.log('🔄 Calling regenerate()...');
      g.regenerate();
      console.log('✅ Regenerate called - new grid length:', g.grid.length);
    }
  }, []);
  
  return (
    <div style={{height:'100%', display:'grid', gridTemplateRows:'1fr auto auto auto'}}>
      <Controls/>
      <GameView/>
      <DeployPanel/>
      <DiceLog/>
    </div>
  )
}
