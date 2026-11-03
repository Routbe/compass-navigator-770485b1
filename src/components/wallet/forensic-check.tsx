import React from 'react';
import { createRoot } from 'react-dom/client';
import RoutCard3D from './RoutCard3D';
import { drawCardFaces } from './card-faces';
export async function mountCheck() {
 const element = document.createElement('div');
 element.style.cssText = 'position:fixed;inset:0;background:#eeeeee;z-index:99999';
 document.body.append(element);
 const faces = await drawCardFaces({ hexBackgroundColor:'#2b2d31',hexForegroundColor:'#f4f4f5',displayName:'Optical inspection',handle:'inspection',subheader:'ROUT',sovereignId:'RT-TEST-ONLY-X',serial:'inspection-only',space:'root',url:'https://rout.be',qrValue:'https://rout.be',title:'ROUT',issuerName:'ROUT' } as any, {sdfText:true});
 const tilt = {current:{x:0,y:0,at:performance.now()}};
 const zoom = {current:0};
 const state = { flipped:false, finish:'metal' as 'metal'|'glass' };
 const root = createRoot(element);
 const render = () => root.render(<RoutCard3D faces={faces} finish={state.finish} flipped={state.flipped} tilt={tilt} zoom={zoom} live={{current:{seed:[0.5,0.5,0.5,0.5],expiresAt:0,windowMs:30000}}} onFlip={()=>{state.flipped=!state.flipped;render()}} onReady={()=>element.setAttribute('data-scene-ready','true')} text={{displayName:'Optical inspection',handle:'inspection',subheader:'ROUT',fg:'#f4f4f5',sovereignId:'RT-TEST-ONLY-X',code:null}} />);
 render();
 return {flip:()=>{state.flipped=!state.flipped;render()},tilt:(x:number,y:number)=>{tilt.current={x,y,at:performance.now()}},zoom:()=>{zoom.current=1},glass:()=>{state.finish='glass';render()}};
}
