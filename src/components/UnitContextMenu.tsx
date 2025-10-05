
import React, { useEffect } from 'react'
import type { Unit } from '@/types/battle'

type Props = {
  unit: Unit
  x: number
  y: number
  onClose: () => void
}

export default function UnitContextMenu({ unit, x, y, onClose }: Props){
  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{ if (e.key==='Escape') onClose() }
    const onClick = (e:MouseEvent)=>{ onClose() }
    setTimeout(()=>{
      window.addEventListener('keydown', onKey)
      window.addEventListener('click', onClick, { once: true })
    }, 0)
    return ()=>{
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClick)
    }
  }, [onClose])

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(x, window.innerWidth - 260)),
    top: Math.max(8, Math.min(y, window.innerHeight - 180)),
    zIndex: 90,
    width: 250,
  }

  return (
    <div className="panel" style={style} onClick={(e)=>e.stopPropagation()}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:10}}>
  <img
    src={unit.image}
    alt={unit.name}
    width={168}
    height={168}
    style={{ borderRadius: 12, objectFit: "contain", background: "#111" }}
  />
  <div style={{ textAlign:'center' }}>
    <div style={{fontWeight:700}}>{unit.name}</div>
    <div style={{fontSize:12, opacity:0.8}}>Owner: Spieler {unit.owner+1}</div>
  </div>
</div>
      <div style={{marginTop:8, display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6, fontSize:13}}>
        <div className="tag">Q {unit.quality}+</div>
        <div className="tag">Def {unit.defense}+</div>
        <div className="tag">Speed {unit.speed}</div>
        <div className="tag">Wounds {unit.wounds}/{unit.maxWounds}</div>
      </div>
      <div style={{marginTop:8}}>
        <div style={{fontWeight:600, fontSize:13, marginBottom:4}}>Bewaffnung</div>
        {unit.weapons.map((w,i)=>(
          <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize:13}}>
            <span>{w.name}</span>
            <span className="tag">{w.type} | R {w.range} | A {w.attacks} | AP {w.ap}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
