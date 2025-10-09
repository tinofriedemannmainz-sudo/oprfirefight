
import React from 'react'
import Controls from '@/components/Controls'
import GameView from '@/components/GameView'
import DiceLog from '@/components/DiceLog'
import DeployPanel from '@/components/DeployPanel'

export default function GamePage(){
  return (
    <div style={{height:'100%', display:'grid', gridTemplateRows:'1fr auto auto auto'}}>
      <Controls/>
      <GameView/>
      <DeployPanel/>
      <DiceLog/>
    </div>
  )
}
