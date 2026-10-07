/* acciones.js - Botones, formularios, ejemplo y copiar resumen */
'use strict';

function render(){
  const sel=$('#qsel');
  sel.innerHTML=S.quotes.map(q=>`<option value="${q.id}" ${q.id===S.current?'selected':''}>${esc(q.name||'Sin nombre')}</option>`).join('');
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-current',String(+t.dataset.step===ui.step)));
  $('#view').innerHTML=ui.step===1?viewMateriales():ui.step===2?viewPrecios():viewResultado();
  if(ui.step===3)renderResBody();
}
function setStep(n){ui.step=n;render();window.scrollTo(0,0)}

/* ================= Acciones ================= */
function addItem(){
  const q=Q();
  const name=draft.name.trim();
  if(!name){toast('Escribe el nombre del material');const e=$('#dName');if(e)e.focus();return}
  if(!(draft.qty>0)){toast('La cantidad debe ser mayor que 0');return}
  q.items.push({id:uid(),name,category:draft.category||S.categories[0]||'',unit:draft.unit||'unidad',qty:draft.qty,prices:{}});
  draft.name='';draft.qty=1;
  save();render();
  const e=$('#dName');if(e)e.focus();
}
function dupQuote(){
  const q=Q();
  const c=JSON.parse(JSON.stringify(q));
  const map={};
  c.id=uid();c.name=q.name+' (copia)';
  c.suppliers.forEach(s=>{const n=uid();map[s.id]=n;s.id=n});
  c.items.forEach(it=>{it.id=uid();const p={};Object.keys(it.prices).forEach(k=>{if(map[k])p[map[k]]=it.prices[k]});it.prices=p});
  c.extras.forEach(e=>e.id=uid());
  if(map[c.basis])c.basis=map[c.basis];
  S.quotes.push(c);S.current=c.id;ui.supId=null;save();render();toast('Cotización duplicada');
}
function addSupplier(){
  const inp=$('#supName');const name=(inp&&inp.value||'').trim();
  if(!name){toast('Escribe el nombre del proveedor');if(inp)inp.focus();return}
  const s={id:uid(),name,note:''};
  Q().suppliers.push(s);ui.supId=s.id;save();render();
  const f=document.querySelector('.price-input');if(f)f.focus();
}
function resolveNew(kind,list,fallback,render_){
  const label=kind==='cat'?'Nombre de la nueva categoría':'Nombre de la unidad (ej. varilla, cubeta)';
  const v=(prompt(label)||'').trim();
  if(v){if(!list.includes(v))list.push(v);return v}
  return fallback;
}

const actions={
  step:b=>setStep(+b.dataset.step),
  menu:()=>{$('#coName').value=S.company||'';$('#menu').showModal()},
  closemenu:()=>$('#menu').close(),
  newq:()=>{const q=blankQuote(S.quotes.length+1);S.quotes.push(q);S.current=q.id;ui.supId=null;ui.step=1;save();render();window.scrollTo(0,0)},
  dup:dupQuote,
  delq:()=>{
    if(!confirm('¿Eliminar la cotización "'+Q().name+'"? No se puede deshacer.'))return;
    S.quotes=S.quotes.filter(q=>q.id!==S.current);
    if(!S.quotes.length)S.quotes.push(blankQuote(1));
    S.current=S.quotes[0].id;ui.supId=null;save();render();
  },
  additem:addItem,
  delitem:b=>{Q().items=Q().items.filter(i=>i.id!==b.dataset.id);save();render()},
  addsup:addSupplier,
  picksup:b=>{ui.supId=b.dataset.id;render()},
  delsup:b=>{
    const q=Q();const s=q.suppliers.find(x=>x.id===b.dataset.id);
    if(!s||!confirm('¿Quitar a "'+s.name+'" y todos sus precios?'))return;
    q.suppliers=q.suppliers.filter(x=>x.id!==s.id);
    q.items.forEach(it=>delete it.prices[s.id]);
    if(q.basis===s.id)q.basis='best';
    ui.supId=null;save();render();
  },
  addextra:()=>{Q().extras.push({id:uid(),desc:Q().extras.length?'Otro costo':'Mano de obra',amount:0,iva:true});save();render()},
  delextra:b=>{Q().extras=Q().extras.filter(e=>e.id!==b.dataset.id);save();render()},
  basis:b=>{Q().basis=b.dataset.b;save();renderResBody()},
  pdf:()=>makePDF(),
  copy:copySummary,
  example:loadExample,
  export:()=>{
    const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='respaldo-cotizador-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  },
  import:()=>$('#importFile').click(),
  wipe:()=>{
    if(!confirm('Esto borra TODAS las cotizaciones de este navegador. ¿Seguro?'))return;
    S=defaults();ui.supId=null;ui.step=1;save();$('#menu').close();render();
  }
};
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const f=actions[b.dataset.act];if(f)f(b);
});

/* ================= Entradas de datos ================= */
document.addEventListener('input',e=>{
  const t=e.target,d=t.dataset,q=Q();
  if(t.id==='qsel'){S.current=t.value;ui.supId=null;save();render();return}
  if(d.co!==undefined){S.company=t.value;save();return}
  if(d.q){
    const f=d.q;
    q[f]=t.type==='checkbox'?t.checked:(f==='iva'?(num(t.value)||0):t.value);
    save();
    if(f==='name'){const o=$('#qsel').selectedOptions[0];if(o)o.textContent=t.value||'Sin nombre'}
    return;
  }
  if(d.draft){
    const f=d.draft;
    if(t.value==='__new__'){
      const list=f==='category'?S.categories:S.units;
      const prev=draft[f];
      draft[f]=resolveNew(f==='category'?'cat':'unit',list,prev);save();render();return;
    }
    draft[f]=f==='qty'?(num(t.value)||0):t.value;return;
  }
  if(d.item){
    const it=q.items.find(i=>i.id===d.item);if(!it)return;
    const f=d.f;
    if(t.value==='__new__'){
      const list=f==='category'?S.categories:S.units;
      it[f]=resolveNew(f==='category'?'cat':'unit',list,it[f]);save();render();return;
    }
    it[f]=f==='qty'?(num(t.value)||0):t.value;save();return;
  }
  if(d.sup){
    const s=q.suppliers.find(x=>x.id===d.sup);if(!s)return;
    s[d.f]=t.value;save();
    if(d.f==='name'){const c=$('#chip-'+s.id);if(c&&c.parentNode){c.parentNode.firstChild.textContent=t.value||'Sin nombre'}}
    return;
  }
  if(d.price){
    const it=q.items.find(i=>i.id===d.price);if(!it)return;
    const v=num(t.value);
    if(v===null||v<0)delete it.prices[ui.supId];else it.prices[ui.supId]=v;
    save();
    const lt=$('#lt-'+it.id);if(lt)lt.textContent=v===null?'':fmt(v*it.qty);
    const n=q.items.filter(i=>priceOf(i,ui.supId)!==null).length;
    const p=$('#prog');if(p)p.style.width=Math.round(n/q.items.length*100)+'%';
    const pt=$('#progtxt');if(pt)pt.textContent=n+' de '+q.items.length+' precios puestos';
    const ch=$('#chip-'+ui.supId);if(ch)ch.textContent=n+' de '+q.items.length+' precios';
    return;
  }
  if(d.ex){
    const ex=q.extras.find(x=>x.id===d.ex);if(!ex)return;
    const f=d.f;
    ex[f]=f==='amount'?(num(t.value)||0):(f==='iva'?t.checked:t.value);
    save();renderResBody();return;
  }
  if(t.hasAttribute('data-basis-sel')){
    q.basis=t.value||'best';save();renderResBody();return;
  }
});
$('#qsel').addEventListener('input',e=>{S.current=e.target.value;ui.supId=null;save();render()});

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const t=e.target;
  if(t.classList&&t.classList.contains('price-input')){
    e.preventDefault();
    const all=[...document.querySelectorAll('.price-input')];
    const nx=all[all.indexOf(t)+1];
    if(nx)nx.focus();else t.blur();
  }else if(t.dataset&&t.dataset.draft&&t.tagName==='INPUT'){e.preventDefault();addItem()}
  else if(t.id==='supName'){e.preventDefault();addSupplier()}
});

$('#importFile').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const s=JSON.parse(r.result);
      if(!s||!Array.isArray(s.quotes)||!s.quotes.length)throw 0;
      s.categories=s.categories||DEF_CATS.slice();s.units=s.units||DEF_UNITS.slice();
      if(!s.quotes.some(q=>q.id===s.current))s.current=s.quotes[0].id;
      S=s;ui.supId=null;ui.step=1;save();$('#menu').close();render();toast('Respaldo restaurado');
    }catch(err){toast('Ese archivo no es un respaldo válido')}
  };
  r.readAsText(f);e.target.value='';
});

/* ================= Ejemplo ================= */
function loadExample(){
  const q=blankQuote(S.quotes.length+1);
  q.name='Ejemplo: instalación eléctrica';q.client='Cliente de ejemplo';
  const sup=['Antillón','Semaco','Walmart','Ferretería La Esquina'].map(n=>({id:uid(),name:n,note:''}));
  q.suppliers=sup;
  const rows=[
    ['Tubo PVC 1/2" x 3 m','Tubería PVC','tubo',20,[14.5,13.75,15.9,14]],
    ['Cable THHN #12','Eléctrico','metro',150,[5.2,4.85,5.6,5]],
    ['Caja rectangular metálica','Eléctrico','unidad',30,[8.5,9.25,null,8]],
    ['Breaker 20A','Eléctrico','unidad',8,[62,58,66,60]],
    ['Pegamento PVC 1/4 galón','Tubería PVC','unidad',2,[48,52,45,50]],
    ['Cinta aislante','Eléctrico','rollo',10,[9,8.5,7.95,9.5]]
  ];
  rows.forEach(r=>{
    if(!S.categories.includes(r[1]))S.categories.push(r[1]);
    if(!S.units.includes(r[2]))S.units.push(r[2]);
    const it={id:uid(),name:r[0],category:r[1],unit:r[2],qty:r[3],prices:{}};
    r[4].forEach((p,i)=>{if(p!==null)it.prices[sup[i].id]=p});
    q.items.push(it);
  });
  q.extras=[{id:uid(),desc:'Mano de obra',amount:1500,iva:true}];
  S.quotes.push(q);S.current=q.id;ui.supId=null;ui.step=3;
  save();
  if($('#menu').open)$('#menu').close();
  render();window.scrollTo(0,0);
  toast('Ejemplo cargado. Walmart queda en gris porque le falta un precio.');
}

/* ================= Copiar resumen ================= */
function copySummary(){
  const q=Q(),c=compute(q);
  const L=[];
  L.push('COTIZACIÓN: '+q.name);
  if(q.client)L.push('Cliente: '+q.client);
  L.push('Fecha: '+fdate(q.date));
  L.push('Opción: '+c.label);
  L.push('');
  Object.keys(c.cat).forEach(k=>L.push(k+': '+fmt(c.cat[k].net)));
  L.push('');
  L.push('Materiales (sin IVA): '+fmt(c.matNet));
  q.extras.forEach(e=>L.push(e.desc+': '+fmt(+e.amount||0)));
  L.push('IVA ('+(+q.iva||0)+'%): '+fmt(c.ivaAmt));
  L.push('TOTAL: '+fmt(c.total));
  const text=L.join('\n');
  const done=()=>toast('Resumen copiado');
  const fb=()=>{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('No se pudo copiar')}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done,fb);else fb();
}
