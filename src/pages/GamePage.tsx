
import React from 'react'
import Controls from '@/components/Controls'
import HexGrid from '@/components/HexGrid'
import DiceLog from '@/components/DiceLog'
import DeployPanel from '@/components/DeployPanel'

export default function GamePage(){
  return (
    <div style={{height:'100%', display:'grid', gridTemplateRows:'1fr auto auto auto'}}>
      <Controls/>
      <HexGrid/>
      <DeployPanel/>
      <DiceLog/>
    </div>
  )
}
