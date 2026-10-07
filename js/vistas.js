/* vistas.js - Pantallas: materiales, precios y resultado */
'use strict';

function opts(list,sel,newLabel){
  return list.map(x=>`<option value="${esc(x)}" ${x===sel?'selected':''}>${esc(x)}</option>`).join('')+
    `<option value="__new__">${newLabel}</option>`;
}
function catOpts(sel){return opts(S.categories,sel,'+ Nueva categoría…')}
function unitOpts(sel){return opts(S.units,sel,'+ Otra unidad…')}

function viewMateriales(){
  const q=Q();
  if(!draft.category)draft.category=S.categories[0]||'';
  const rows=q.items.map(it=>`
    <div class="mrow">
      <label class="nm">Material<input data-item="${it.id}" data-f="name" value="${esc(it.name)}"></label>
      <label>Categoría<select data-item="${it.id}" data-f="category">${catOpts(it.category)}</select></label>
      <label>Se compra por<select data-item="${it.id}" data-f="unit">${unitOpts(it.unit)}</select></label>
      <label>Cantidad<input type="number" min="0" step="any" inputmode="decimal" data-item="${it.id}" data-f="qty" value="${it.qty}"></label>
      <button class="btn danger small" data-act="delitem" data-id="${it.id}" aria-label="Quitar ${esc(it.name)}">Quitar</button>
    </div>`).join('');
  return `
  <details class="card" ${q.items.length===0?'open':''}>
    <summary>Datos de la cotización</summary>
    <div class="grid2">
      <label>Nombre de la cotización<input data-q="name" value="${esc(q.name)}"></label>
      <label>Cliente o proyecto<input data-q="client" value="${esc(q.client)}" placeholder="Opcional"></label>
      <label>Fecha<input type="date" data-q="date" value="${esc(q.date)}"></label>
      <label>Símbolo de moneda<input data-q="currency" value="${esc(q.currency)}" maxlength="4"></label>
      <label>IVA (%)<input type="number" step="any" inputmode="decimal" data-q="iva" value="${q.iva}"></label>
      <label class="check"><input type="checkbox" data-q="incl" ${q.incl?'checked':''}> Los precios de los proveedores ya incluyen IVA</label>
      <label class="full">Notas para el PDF (opcional)<textarea data-q="notes" rows="2">${esc(q.notes)}</textarea></label>
    </div>
    <div class="row-actions">
      <button class="btn" data-act="dup">Duplicar esta cotización</button>
      <button class="btn danger" data-act="delq">Eliminar esta cotización</button>
    </div>
  </details>

  <section class="card">
    <h2>Agregar material</h2>
    <div class="mrow add">
      <label class="nm">Material<input id="dName" data-draft="name" value="${esc(draft.name)}" placeholder="Ej. Tubo PVC 1/2 pulgada" autocomplete="off"></label>
      <label>Categoría<select data-draft="category">${catOpts(draft.category)}</select></label>
      <label>Se compra por<select data-draft="unit">${unitOpts(draft.unit)}</select></label>
      <label>Cantidad<input type="number" min="0" step="any" inputmode="decimal" data-draft="qty" value="${draft.qty}"></label>
      <button class="btn primary" data-act="additem">Agregar</button>
    </div>
  </section>

  <section class="card">
    <h2>Materiales (${q.items.length})</h2>
    ${q.items.length?rows:`<div class="empty muted">Todavía no hay materiales.<br>Agrega el primero arriba, o mira cómo funciona con un ejemplo.<div class="row-actions" style="justify-content:center"><button class="btn" data-act="example">Cargar ejemplo</button></div></div>`}
  </section>
  ${q.items.length?`<button class="btn primary" style="width:100%" data-act="step" data-step="2">Siguiente: poner precios</button>`:''}`;
}

function selSup(q){
  if(!q.suppliers.some(s=>s.id===ui.supId))ui.supId=q.suppliers[0]?q.suppliers[0].id:null;
  return q.suppliers.find(s=>s.id===ui.supId)||null;
}
function viewPrecios(){
  const q=Q();
  if(!q.items.length){
    return `<div class="card empty"><h2>Primero agrega materiales</h2><p class="muted">Necesitas la lista de lo que vas a cotizar.</p><button class="btn primary" data-act="step" data-step="1">Ir a materiales</button></div>`;
  }
  const sup=selSup(q);
  const chips=q.suppliers.map(s=>{
    const n=q.items.filter(it=>priceOf(it,s.id)!==null).length;
    return `<button class="chip" data-act="picksup" data-id="${s.id}" aria-pressed="${s.id===ui.supId}">${esc(s.name)}<small id="chip-${s.id}">${n} de ${q.items.length} precios</small></button>`;
  }).join('');
  let body='';
  if(sup){
    const n=q.items.filter(it=>priceOf(it,sup.id)!==null).length;
    const groups={};
    q.items.forEach(it=>{const k=it.category||'Sin categoría';(groups[k]=groups[k]||[]).push(it)});
    const order=S.categories.filter(c=>groups[c]).concat(Object.keys(groups).filter(c=>!S.categories.includes(c)));
    const rows=order.map(c=>`<div class="catname">${esc(c)}</div>`+groups[c].map(it=>{
      const p=priceOf(it,sup.id);
      return `<div class="prow">
        <div class="pname"><b>${esc(it.name)}</b><small>${it.qty} ${esc(it.unit)} · precio por ${esc(it.unit)}</small></div>
        <div class="pin"><span class="cur">${esc(q.currency)}</span>
          <input class="price-input" type="number" min="0" step="any" inputmode="decimal" placeholder="0.00" data-price="${it.id}" value="${p===null?'':p}" aria-label="Precio de ${esc(it.name)} en ${esc(sup.name)}">
          <span class="lt" id="lt-${it.id}">${p===null?'':fmt(p*it.qty)}</span></div>
      </div>`}).join('')).join('');
    body=`
    <section class="card">
      <div class="grid2" style="margin-top:0">
        <label>Nombre del proveedor<input data-sup="${sup.id}" data-f="name" value="${esc(sup.name)}"></label>
        <label>Nota (entrega, condiciones…)<input data-sup="${sup.id}" data-f="note" value="${esc(sup.note||'')}" placeholder="Opcional"></label>
      </div>
      <div class="progress"><i id="prog" style="width:${Math.round(n/q.items.length*100)}%"></i></div>
      <div class="small muted" id="progtxt">${n} de ${q.items.length} precios puestos</div>
      ${rows}
      <div class="row-actions"><button class="btn danger" data-act="delsup" data-id="${sup.id}">Quitar este proveedor</button></div>
    </section>
    <button class="btn primary" style="width:100%" data-act="step" data-step="3">Ver resultado</button>`;
  }else{
    body=`<div class="card empty"><h2>Agrega tu primer proveedor</h2><p class="muted">Escribe el nombre de una ferretería o tienda donde vas a cotizar.</p></div>`;
  }
  return `
  <section class="card">
    <h2>Proveedores</h2>
    ${q.suppliers.length?`<div class="chips">${chips}</div>`:''}
    <div class="addsup">
      <input id="supName" placeholder="Nombre del proveedor (ej. Antillón)" autocomplete="off" aria-label="Nombre del nuevo proveedor">
      <button class="btn primary" data-act="addsup">Agregar</button>
    </div>
  </section>${body}`;
}

function viewResultado(){
  const q=Q();
  const exRows=q.extras.map(e=>`
    <div class="exrow">
      <label class="nm">Descripción<input data-ex="${e.id}" data-f="desc" value="${esc(e.desc)}"></label>
      <label>Monto (sin IVA)<input type="number" min="0" step="any" inputmode="decimal" data-ex="${e.id}" data-f="amount" value="${e.amount}"></label>
      <label class="check" style="padding-top:0"><input type="checkbox" data-ex="${e.id}" data-f="iva" ${e.iva?'checked':''}> Lleva IVA</label>
      <button class="btn danger small" data-act="delextra" data-id="${e.id}">Quitar</button>
    </div>`).join('');
  return `
  <section class="card">
    <h2>Mano de obra y otros costos</h2>
    <p class="muted small" style="margin-top:0">Agrega lo que no es material: mano de obra, transporte, herramienta, etc.</p>
    ${exRows}
    <div class="row-actions"><button class="btn" data-act="addextra">+ Agregar mano de obra o costo</button></div>
  </section>
  <div id="resBody"></div>`;
}

function renderResBody(){
  const el=$('#resBody');if(!el)return;
  const q=Q();
  if(!q.items.length||!q.suppliers.length){
    el.innerHTML=`<div class="card empty"><h2>Todavía falta información</h2><p class="muted">Para ver el resultado necesitas al menos un material y un proveedor con precios.</p><button class="btn primary" data-act="step" data-step="${q.items.length?2:1}">Ir al paso ${q.items.length?2:1}</button></div>`;
    return;
  }
  const c=compute(q);
  const ivaTxt=q.incl?'con IVA':'sin IVA';
  const tcls=c.stats.map(s=>s.complete?tier(s.gross,c.complete.map(x=>x.gross)):'n');
  const sorted=c.stats.map((s,i)=>({s,cl:tcls[i]})).sort((a,b)=>(b.s.complete-a.s.complete)||(a.s.gross-b.s.gross));
  const saving=c.best&&c.cMissing===0?c.best.gross-c.cGross:0;

  let h='';
  if(c.fallback)h+=`<div class="warn">Ningún proveedor tiene precio en todos los materiales, así que se usa la compra combinada. Completa los precios que faltan para comparar proveedores completos.</div>`;
  if(c.missing>0)h+=`<div class="warn">Hay ${c.missing} material(es) sin precio en esta opción. No se están sumando al total.</div>`;

  h+=`<section class="card"><h2>¿Qué opción quieres cotizar?</h2>
   <div class="pick">
     <button class="pickcard" data-act="basis" data-b="best" aria-pressed="${q.basis==='best'}">
       <div class="muted small">Mejor proveedor único</div>
       <div class="big">${c.best?fmt(c.best.gross):'—'}</div>
       <div>${c.best?esc(c.best.name):'Ninguno tiene todos los precios'} <span class="muted small">(${ivaTxt})</span></div>
     </button>
     <button class="pickcard" data-act="basis" data-b="combined" aria-pressed="${q.basis==='combined'}">
       <div class="muted small">Compra combinada</div>
       <div class="big">${fmt(c.cGross)}</div>
       <div>Lo más barato de cada material ${saving>0.005?`<span class="small">· ahorras ${fmt(saving)} frente al mejor único</span>`:''} <span class="muted small">(${ivaTxt})</span></div>
     </button>
   </div>
   <label style="margin-top:12px">O elegir un proveedor específico
     <select data-basis-sel>
       <option value="">—</option>
       ${q.suppliers.map(s=>`<option value="${s.id}" ${q.basis===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
     </select></label>
  </section>`;

  h+=`<section class="card"><h2>Comparación de proveedores</h2>
   <div class="legend"><span class="c-g">Verde: el más barato</span><span class="c-y">Amarillo</span><span class="c-o">Naranja: intermedio</span><span class="c-r">Rojo: el más caro</span><span class="c-n">Gris: incompleto</span></div>
   <div class="scroll"><table>
    <thead><tr><th>Proveedor</th><th>Total materiales (${ivaTxt})</th><th>Diferencia</th><th class="l">Estado</th></tr></thead>
    <tbody>${sorted.map(({s,cl})=>{
      const diff=c.best&&s.complete&&c.best.gross>0?((s.gross-c.best.gross)/c.best.gross*100):null;
      return `<tr><td>${esc(s.name)}</td><td class="c-${cl}">${fmt(s.gross)}</td><td>${diff===null?'—':(diff<0.05?'Mejor precio':'+'+diff.toFixed(1)+'%')}</td><td class="l">${s.complete?'Completo':'Faltan '+s.missing+' precio(s)'}</td></tr>`}).join('')}
    </tbody></table></div></section>`;

  const th=q.suppliers.map(s=>`<th>${esc(s.name)}</th>`).join('');
  const mrows=q.items.map(it=>{
    const vals=q.suppliers.map(s=>priceOf(it,s.id)).filter(v=>v!==null);
    return `<tr><td>${esc(it.name)}<br><small class="muted">${it.qty} ${esc(it.unit)}</small></td>${q.suppliers.map(s=>{
      const p=priceOf(it,s.id);
      return p===null?`<td class="c-n">—</td>`:`<td class="c-${tier(p,vals)}">${fmt(p)}</td>`}).join('')}</tr>`}).join('');
  const mfoot=c.stats.map((s,i)=>`<td class="c-${tcls[i]}">${fmt(s.gross)}${s.complete?'':'<br><small>incompleto</small>'}</td>`).join('');
  h+=`<section class="card"><h2>Precios por material</h2>
   <p class="muted small" style="margin-top:0">Precio por unidad de cada proveedor. Cada fila se compara por separado.</p>
   <div class="scroll"><table class="matrix"><thead><tr><th>Material</th>${th}</tr></thead><tbody>${mrows}</tbody><tfoot><tr><td>Total</td>${mfoot}</tr></tfoot></table></div></section>`;

  const cats=Object.keys(c.cat);
  h+=`<section class="card"><h2>Resumen por categoría</h2><p class="muted small" style="margin-top:0">${esc(c.label)}</p>
   <div class="scroll"><table><thead><tr><th>Categoría</th><th>Materiales</th><th>Subtotal sin IVA</th></tr></thead><tbody>
   ${cats.map(k=>`<tr><td>${esc(k)}</td><td>${c.cat[k].n}</td><td>${fmt(c.cat[k].net)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Sin datos todavía</td></tr>'}
   </tbody></table></div></section>`;

  h+=`<section class="card"><h2>Total de la cotización</h2>
   <div class="total-line"><span>Materiales (sin IVA)</span><span>${fmt(c.matNet)}</span></div>
   <div class="total-line"><span>Mano de obra y otros costos</span><span>${fmt(c.exNet)}</span></div>
   <div class="total-line"><span>Subtotal sin IVA</span><span>${fmt(c.subtotal)}</span></div>
   <div class="total-line"><span>IVA (${+q.iva||0}%)</span><span>${fmt(c.ivaAmt)}</span></div>
   <div class="total-line grand"><span>TOTAL</span><span>${fmt(c.total)}</span></div>
   <div class="row-actions">
     <button class="btn primary" data-act="pdf">Descargar PDF</button>
     <button class="btn" data-act="xlsx">Descargar Excel</button>
     <button class="btn" data-act="copy">Copiar resumen</button>
   </div></section>`;
  el.innerHTML=h;
}
