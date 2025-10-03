
import React from 'react'
import Controls from '@/components/Controls'
import HexGrid from '@/components/HexGrid'
import DiceLog from '@/components/DiceLog'

export default function GamePage(){
  return <div style={{height:'100%', display:'grid', gridTemplateRows:'1fr auto'}}>
    <Controls/>
    <HexGrid/>
    <DiceLog/>
  </div>
}
