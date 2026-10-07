/* excel.js - Descarga de la cotización en Excel (.xlsx). Abre en Excel y en Google Sheets. */
'use strict';

// La librería de Excel pesa bastante, así que solo se descarga cuando alguien pulsa el botón.
const EXCELJS_URL='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
function loadExcelLib(){
  return new Promise((resolve,reject)=>{
    if(typeof ExcelJS!=='undefined')return resolve();
    const s=document.createElement('script');
    s.src=EXCELJS_URL;
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('no-lib'));
    document.head.appendChild(s);
  });
}

async function buildXLSX(){
  const q=Q();
  const c=compute(q);
  const sym=q.currency||'Q';
  const money='"'+sym+'" #,##0.00';
  const ivaTxt=q.incl?'con IVA':'sin IVA';
  const wb=new ExcelJS.Workbook();
  wb.creator=S.company||'Cotizador';

  const rgb=a=>'FF'+a.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  const fill=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
  const thin={style:'thin',color:{argb:'FFD8DCD5'}};
  const box={top:thin,left:thin,bottom:thin,right:thin};
  const head=row=>row.eachCell(cell=>{
    cell.font={bold:true,color:{argb:'FFFFFFFF'}};
    cell.fill=fill('FF1F3B5C');
    cell.alignment={vertical:'middle',wrapText:true};
    cell.border=box;
  });
  const bold=row=>row.eachCell(cell=>{cell.font={bold:true};cell.border=box});
  const paint=(cell,k)=>{cell.fill=fill(rgb(FILL[k]));cell.font={color:{argb:rgb(TXT[k])}}};
  const sheetName=n=>n.replace(/[\\\/\?\*\[\]:]/g,'').slice(0,31);

  /* ---------- Hoja 1: Resumen ---------- */
  let ws=wb.addWorksheet(sheetName('Resumen'));
  ws.columns=[{width:38},{width:20},{width:20},{width:14}];
  ws.addRow([S.company||'Cotización']).font={bold:true,size:16,color:{argb:'FF1F3B5C'}};
  ws.addRow([q.name||'']).font={bold:true,size:13};
  if(q.client)ws.addRow(['Cliente / proyecto: '+q.client]);
  ws.addRow(['Fecha: '+fdate(q.date)]);
  ws.addRow(['IVA: '+(+q.iva||0)+'%   -   Precios de proveedores ingresados '+ivaTxt]);
  ws.addRow(['Opción cotizada: '+c.label]);
  ws.addRow([]);
  head(ws.addRow(['Concepto','Monto']));
  const sumRows=[['Materiales (sin IVA)',c.matNet]];
  q.extras.forEach(e=>sumRows.push([e.desc||'Otro costo',+e.amount||0]));
  sumRows.push(['Subtotal sin IVA',c.subtotal],['IVA ('+(+q.iva||0)+'%)',c.ivaAmt]);
  sumRows.forEach(r=>{const row=ws.addRow(r);row.getCell(2).numFmt=money;row.eachCell(x=>x.border=box)});
  const tr=ws.addRow(['TOTAL',c.total]);tr.getCell(2).numFmt=money;bold(tr);
  ws.addRow([]);
  const cats=Object.keys(c.cat);
  if(cats.length){
    ws.addRow(['Resumen por categoría']).font={bold:true,size:12};
    head(ws.addRow(['Categoría','Materiales','Subtotal sin IVA']));
    cats.forEach(k=>{
      const row=ws.addRow([k,c.cat[k].n,c.cat[k].net]);
      row.getCell(3).numFmt=money;row.eachCell(x=>x.border=box);
    });
  }
  if(q.notes){ws.addRow([]);ws.addRow(['Notas: '+q.notes])}

  /* ---------- Hoja 2: Detalle de la cotización ---------- */
  ws=wb.addWorksheet(sheetName('Detalle'));
  ws.columns=[{width:34},{width:20},{width:10},{width:12},{width:24},{width:16},{width:16}];
  head(ws.addRow(['Material','Categoría','Cantidad','Unidad','Proveedor','Precio unitario','Subtotal']));
  c.lines.forEach(l=>{
    const r=ws.rowCount+1;
    const sup=l.sid?(q.suppliers.find(s=>s.id===l.sid)||{}).name:'';
    const row=ws.addRow([l.it.name,l.it.category||'',l.it.qty,l.it.unit,sup,
      l.p===null?'sin precio':l.p,
      l.p===null?'':{formula:'C'+r+'*F'+r,result:l.p*l.it.qty}]);
    row.getCell(6).numFmt=money;row.getCell(7).numFmt=money;
    row.eachCell(x=>x.border=box);
  });
  const last=ws.rowCount;
  const dt=ws.addRow(['Total materiales ('+ivaTxt+')','','','','','',{formula:'SUM(G2:G'+last+')',result:c.matGross}]);
  dt.getCell(7).numFmt=money;bold(dt);
  ws.views=[{state:'frozen',ySplit:1}];

  /* ---------- Hoja 3: Comparativa con semáforo ---------- */
  ws=wb.addWorksheet(sheetName('Comparativa'));
  ws.columns=[{width:34},{width:10},{width:12}].concat(q.suppliers.map(()=>({width:18})));
  head(ws.addRow(['Material','Cantidad','Unidad'].concat(q.suppliers.map(s=>s.name))));
  q.items.forEach(it=>{
    const vals=q.suppliers.map(s=>priceOf(it,s.id)).filter(v=>v!==null);
    const row=ws.addRow([it.name,it.qty,it.unit].concat(q.suppliers.map(s=>{const p=priceOf(it,s.id);return p===null?'-':p})));
    q.suppliers.forEach((s,i)=>{
      const cell=row.getCell(4+i);
      const p=priceOf(it,s.id);
      cell.border=box;
      if(p===null){paint(cell,'n');cell.alignment={horizontal:'center'}}
      else{cell.numFmt=money;paint(cell,tier(p,vals))}
    });
    row.getCell(1).border=box;row.getCell(2).border=box;row.getCell(3).border=box;
  });
  const lastC=ws.rowCount;
  const tcls=c.stats.map(s=>s.complete?tier(s.gross,c.complete.map(x=>x.gross)):'n');
  const totRow=ws.addRow(['TOTAL ('+ivaTxt+')','','']);
  c.stats.forEach((s,i)=>{
    const col=String.fromCharCode(68+i); // D, E, F...
    const cell=totRow.getCell(4+i);
    cell.value=(i<23)?{formula:'SUMPRODUCT($B$2:$B$'+lastC+','+col+'2:'+col+lastC+')',result:s.gross}:s.gross;
    cell.numFmt=money;paint(cell,tcls[i]);cell.font={bold:true,color:{argb:rgb(TXT[tcls[i]])}};cell.border=box;
  });
  totRow.getCell(1).font={bold:true};
  const stRow=ws.addRow(['Estado','','']);
  c.stats.forEach((s,i)=>{const cell=stRow.getCell(4+i);cell.value=s.complete?'Completo':'Faltan '+s.missing+' precio(s)';cell.alignment={horizontal:'center'}});
  ws.addRow([]);
  ws.addRow(['Verde = más barato, rojo = más caro, gris = sin precio o proveedor incompleto. Cada material se compara por separado.']).font={italic:true,color:{argb:'FF5B6672'}};
  ws.views=[{state:'frozen',xSplit:1,ySplit:1}];

  /* ---------- Hoja 4: Compra combinada ---------- */
  if(c.type==='combined'&&q.suppliers.length>=2){
    ws=wb.addWorksheet(sheetName('Compra combinada'));
    ws.columns=[{width:34},{width:10},{width:12},{width:26},{width:16},{width:16}];
    head(ws.addRow(['Material','Cantidad','Unidad','Proveedor más barato','Precio unitario','Subtotal']));
    c.comb.forEach(l=>{
      const r=ws.rowCount+1;
      const sup=l.sid?(q.suppliers.find(s=>s.id===l.sid)||{}).name:'';
      const row=ws.addRow([l.it.name,l.it.qty,l.it.unit,sup,
        l.p===null?'sin precio':l.p,
        l.p===null?'':{formula:'B'+r+'*E'+r,result:l.p*l.it.qty}]);
      row.getCell(5).numFmt=money;row.getCell(6).numFmt=money;row.eachCell(x=>x.border=box);
    });
    const lc=ws.rowCount;
    const ct=ws.addRow(['Total compra combinada ('+ivaTxt+')','','','','',{formula:'SUM(F2:F'+lc+')',result:c.cGross}]);
    ct.getCell(6).numFmt=money;bold(ct);
    ws.views=[{state:'frozen',ySplit:1}];
  }

  return wb.xlsx.writeBuffer();
}

async function makeXLSX(){
  const q=Q();
  if(!q.items.length||!q.suppliers.length){toast('Agrega materiales y proveedores primero');return}
  try{
    toast('Preparando el Excel…');
    await loadExcelLib();
  }catch(e){
    toast('No se pudo cargar el generador de Excel. Revisa tu internet e inténtalo otra vez.');return;
  }
  try{
    const buf=await buildXLSX();
    const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='Cotizacion-'+slug(q.name)+'-'+q.date+'.xlsx';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast('Excel listo');
  }catch(e){
    toast('No se pudo crear el Excel');
  }
}
