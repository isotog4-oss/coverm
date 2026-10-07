/* calculos.js - Cálculos: totales, IVA, ranking, compra combinada y semáforo */
'use strict';

function tier(v,all){
  const d=[...new Set(all.map(x=>Math.round(x*100)))].sort((a,b)=>a-b);
  const k=Math.round(v*100);
  if(d.length<=1)return 'g';
  if(d.length===2)return k===d[0]?TWO.best:TWO.worst;
  if(d.length===3)return k===d[0]?'g':(k===d[2]?'r':'o');
  const t=(k-d[0])/(d[d.length-1]-d[0]);
  return t<=.15?'g':t<=.45?'y':t<=.75?'o':'r';
}
function priceOf(it,sid){const p=it.prices[sid];return(p===undefined||p===null||p==='')?null:+p}

function compute(q){
  const items=q.items,sups=q.suppliers,r=(+q.iva||0)/100;
  const stats=sups.map(s=>{
    let gross=0,priced=0;
    items.forEach(it=>{const p=priceOf(it,s.id);if(p!==null){gross+=p*it.qty;priced++}});
    return {id:s.id,name:s.name,note:s.note||'',gross,priced,missing:items.length-priced,complete:items.length>0&&priced===items.length};
  });
  const complete=stats.filter(s=>s.complete);
  const best=complete.length?complete.reduce((a,b)=>b.gross<a.gross?b:a):null;

  // Compra combinada: lo más barato de cada material
  let cGross=0,cMissing=0;
  const comb=items.map(it=>{
    let b=null;
    sups.forEach(s=>{const p=priceOf(it,s.id);if(p!==null&&(b===null||p<b.p))b={sid:s.id,p}});
    if(b)cGross+=b.p*it.qty;else cMissing++;
    return {it,sid:b?b.sid:null,p:b?b.p:null};
  });

  // Base elegida para la cotización final
  let type='combined',sid=null,label='Compra combinada (lo más barato de cada material)',fallback=false;
  if(q.basis==='best'){
    if(best){type='supplier';sid=best.id;label='Proveedor único: '+best.name}
    else if(sups.length){fallback=true}
  }else if(q.basis!=='combined'&&sups.some(s=>s.id===q.basis)){
    type='supplier';sid=q.basis;label='Proveedor único: '+sups.find(s=>s.id===sid).name;
  }
  let lines;
  if(type==='supplier'){
    lines=items.map(it=>({it,sid,p:priceOf(it,sid)}));
  }else lines=comb;
  let matGross=0,missing=0;
  lines.forEach(l=>{if(l.p!==null)matGross+=l.p*l.it.qty;else missing++});
  const matNet=q.incl?matGross/(1+r):matGross;
  const cat={};
  lines.forEach(l=>{
    if(l.p===null)return;
    const k=l.it.category||'Sin categoría';
    const g=l.p*l.it.qty;
    cat[k]=cat[k]||{n:0,net:0};
    cat[k].n++;cat[k].net+=q.incl?g/(1+r):g;
  });
  let exNet=0,exTax=0;
  q.extras.forEach(e=>{const a=+e.amount||0;exNet+=a;if(e.iva)exTax+=a});
  const subtotal=matNet+exNet;
  const ivaAmt=r*(matNet+exTax);
  const total=subtotal+ivaAmt;
  return {stats,complete,best,comb,cGross,cMissing,type,sid,label,fallback,lines,matGross,matNet,missing,cat,exNet,subtotal,ivaAmt,total,r};
}
