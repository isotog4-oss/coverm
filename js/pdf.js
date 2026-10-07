/* pdf.js - Generación del PDF */
'use strict';

const FILL={g:[203,235,210],y:[250,239,174],o:[255,214,168],r:[247,194,189],n:[236,236,234]};
const TXT={g:[20,83,45],y:[92,71,0],o:[122,54,0],r:[133,24,15],n:[102,102,102]};

function makePDF(){
  if(!(window.jspdf&&window.jspdf.jsPDF)){toast('No se pudo cargar el generador de PDF. Revisa tu internet e inténtalo otra vez.');return}
  const q=Q();
  if(!q.items.length||!q.suppliers.length){toast('Agrega materiales y proveedores primero');return}
  const c=compute(q);
  const sym=q.currency||'Q';
  const F=x=>fmt(x,sym);
  const ivaTxt=q.incl?'con IVA':'sin IVA';
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'pt',format:'letter'});
  const M=40;
  const PW=()=>doc.internal.pageSize.getWidth();
  const PH=()=>doc.internal.pageSize.getHeight();
  let y=M;

  const heading=(t,sub)=>{
    if(y>PH()-130){doc.addPage('letter','portrait');y=M}
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(31,59,92);
    doc.text(t,M,y);y+=6;
    if(sub){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(91,102,114);y+=8;doc.text(sub,M,y);y+=2}
    y+=6;
  };
  const table=o=>{
    doc.autoTable(Object.assign({
      startY:y,margin:{left:M,right:M,bottom:40},theme:'grid',
      styles:{font:'helvetica',fontSize:9,cellPadding:4,textColor:[28,39,51],lineColor:[216,220,213],lineWidth:.5},
      headStyles:{fillColor:[31,59,92],textColor:255,fontStyle:'bold'},
      footStyles:{fillColor:[238,240,236],textColor:[28,39,51],fontStyle:'bold'}
    },o));
    y=doc.lastAutoTable.finalY+20;
  };

  /* Portada / encabezado */
  doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(31,59,92);
  doc.text(S.company||'Cotización',M,y+8);
  doc.setFontSize(11);doc.setFont('helvetica','normal');doc.setTextColor(91,102,114);
  doc.text('COTIZACION',PW()-M,y+8,{align:'right'});
  y+=30;
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(28,39,51);
  doc.text(q.name||'Cotización',M,y);y+=18;
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(60,70,80);
  if(q.client){doc.text('Cliente / proyecto: '+q.client,M,y);y+=14}
  doc.text('Fecha: '+fdate(q.date),M,y);y+=14;
  doc.text('IVA: '+(+q.iva||0)+'%  -  Los precios de los proveedores se ingresaron '+ivaTxt+'.',M,y);y+=14;
  doc.text('Opción cotizada: '+c.label,M,y);y+=10;
  doc.setDrawColor(31,59,92);doc.setLineWidth(1);doc.line(M,y,PW()-M,y);y+=22;

  /* Resumen general */
  heading('Resumen general');
  const sumBody=[['Materiales (sin IVA)',F(c.matNet)]];
  q.extras.forEach(e=>sumBody.push([e.desc||'Otro costo',F(+e.amount||0)]));
  sumBody.push(['Subtotal sin IVA',F(c.subtotal)],['IVA ('+(+q.iva||0)+'%)',F(c.ivaAmt)]);
  table({body:sumBody,foot:[['TOTAL',F(c.total)]],showFoot:'lastPage',
    columnStyles:{1:{halign:'right'}},tableWidth:300});

  /* Resumen por categoría */
  const cats=Object.keys(c.cat);
  if(cats.length){
    heading('Resumen por categoría','Materiales de la opción cotizada, sin IVA.');
    const tot=cats.reduce((a,k)=>a+c.cat[k].net,0)||1;
    table({head:[['Categoría','Materiales','Subtotal sin IVA','%']],
      body:cats.map(k=>[k,c.cat[k].n,F(c.cat[k].net),(c.cat[k].net/tot*100).toFixed(1)+'%']),
      columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}}});
  }

  /* Ranking de proveedores */
  heading('Comparación de proveedores','Total de todos los materiales ('+ivaTxt+'). Verde = más barato, rojo = más caro, gris = incompleto.');
  const tcls=c.stats.map(s=>s.complete?tier(s.gross,c.complete.map(x=>x.gross)):'n');
  const rank=c.stats.map((s,i)=>({s,cl:tcls[i]})).sort((a,b)=>(b.s.complete-a.s.complete)||(a.s.gross-b.s.gross));
  table({head:[['#','Proveedor','Total','Diferencia','Estado']],
    body:rank.map((r,i)=>{
      const d=c.best&&r.s.complete&&c.best.gross>0?((r.s.gross-c.best.gross)/c.best.gross*100):null;
      return [r.s.complete?String(i+1):'-',r.s.name,F(r.s.gross),d===null?'-':(d<0.05?'Mejor precio':'+'+d.toFixed(1)+'%'),r.s.complete?'Completo':'Faltan '+r.s.missing+' precio(s)'];
    }),
    columnStyles:{0:{cellWidth:24},2:{halign:'right'},3:{halign:'right'}},
    didParseCell:d=>{
      if(d.section==='body'&&d.column.index===2){const k=rank[d.row.index].cl;d.cell.styles.fillColor=FILL[k];d.cell.styles.textColor=TXT[k]}
    }});

  /* Detalle de la cotización elegida */
  doc.addPage('letter','portrait');y=M;
  heading('Detalle de la cotización','Opción: '+c.label+'. Precios como los dio el proveedor ('+ivaTxt+').');
  table({head:[['Material','Categoría','Cant.','Unidad','Proveedor','P. unitario','Subtotal']],
    body:c.lines.map(l=>[l.it.name,l.it.category||'-',String(l.it.qty),l.it.unit,l.sid?(q.suppliers.find(s=>s.id===l.sid)||{}).name:'-',l.p===null?'sin precio':F(l.p),l.p===null?'-':F(l.p*l.it.qty)]),
    foot:[[{content:'Total materiales ('+ivaTxt+')',colSpan:6},F(c.matGross)]],
    columnStyles:{2:{halign:'right'},5:{halign:'right'},6:{halign:'right'}},
    styles:{font:'helvetica',fontSize:8.5,cellPadding:4,textColor:[28,39,51],lineColor:[216,220,213],lineWidth:.5}});
  if(q.notes){heading('Notas');doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(28,39,51);
    const tl=doc.splitTextToSize(q.notes,PW()-2*M);doc.text(tl,M,y);y+=tl.length*13+10}

  /* Detalle por proveedor */
  doc.addPage('letter','portrait');y=M;
  doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(28,39,51);
  doc.text('Detalle por proveedor',M,y);y+=22;
  q.suppliers.forEach(s=>{
    const st=c.stats.find(x=>x.id===s.id);
    heading(s.name+(st.complete?'':'  (incompleto: faltan '+st.missing+')'),s.note||'');
    table({head:[['Material','Cant.','Unidad','P. unitario','Subtotal']],
      body:q.items.map(it=>{const p=priceOf(it,s.id);return [it.name,String(it.qty),it.unit,p===null?'sin precio':F(p),p===null?'-':F(p*it.qty)]}),
      foot:[[{content:'Total ('+ivaTxt+')',colSpan:4},F(st.gross)]],
      columnStyles:{1:{halign:'right'},3:{halign:'right'},4:{halign:'right'}}});
  });

  /* Matriz comparativa con semáforo (horizontal) */
  const per=6;
  for(let i=0;i<q.suppliers.length;i+=per){
    const ch=q.suppliers.slice(i,i+per);
    doc.addPage('letter','landscape');y=M;
    heading('Comparativa de precios por material'+(q.suppliers.length>per?'  (proveedores '+(i+1)+' a '+(i+ch.length)+' de '+q.suppliers.length+')':''),'Precio por unidad ('+ivaTxt+'). Cada fila se compara por separado: verde = más barato, rojo = más caro.');
    const cls=[];
    const body=q.items.map(it=>{
      const vals=q.suppliers.map(s=>priceOf(it,s.id)).filter(v=>v!==null);
      cls.push(ch.map(s=>{const p=priceOf(it,s.id);return p===null?'n':tier(p,vals)}));
      return [it.name+'  ('+it.qty+' '+it.unit+')'].concat(ch.map(s=>{const p=priceOf(it,s.id);return p===null?'-':F(p)}));
    });
    cls.push(ch.map(s=>{const k=c.stats.findIndex(x=>x.id===s.id);return tcls[k]}));
    body.push(['TOTAL'].concat(ch.map(s=>{const st=c.stats.find(x=>x.id===s.id);return F(st.gross)+(st.complete?'':' (incompleto)')})));
    const cs={};ch.forEach((_,k)=>cs[k+1]={halign:'right'});
    table({head:[['Material'].concat(ch.map(s=>s.name))],body,columnStyles:cs,
      didParseCell:d=>{
        if(d.section==='body'){
          if(d.column.index>0){const k=cls[d.row.index][d.column.index-1];d.cell.styles.fillColor=FILL[k];d.cell.styles.textColor=TXT[k]}
          if(d.row.index===body.length-1)d.cell.styles.fontStyle='bold';
        }
      }});
  }

  /* Compra combinada (si hay 2 o más proveedores) */
  if(q.suppliers.length>=2){
    doc.addPage('letter','portrait');y=M;
    heading('Compra combinada','Comprar cada material con el proveedor que lo tiene más barato ('+ivaTxt+').');
    table({head:[['Material','Cant.','Unidad','Proveedor más barato','P. unitario','Subtotal']],
      body:c.comb.map(l=>[l.it.name,String(l.it.qty),l.it.unit,l.sid?(q.suppliers.find(s=>s.id===l.sid)||{}).name:'-',l.p===null?'sin precio':F(l.p),l.p===null?'-':F(l.p*l.it.qty)]),
      foot:[[{content:'Total compra combinada ('+ivaTxt+')',colSpan:5},F(c.cGross)]],
      columnStyles:{1:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}});
    if(c.best&&c.cMissing===0){
      const sv=c.best.gross-c.cGross;
      doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(28,39,51);
      doc.text(sv>0.005?'Ahorro frente al mejor proveedor único ('+c.best.name+'): '+F(sv):'La compra combinada cuesta lo mismo que el mejor proveedor único.',M,y);
    }
  }

  /* Pie de página */
  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){
    doc.setPage(p);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,128,136);
    doc.text((S.company?S.company+' - ':'')+(q.name||'')+'   |   Página '+p+' de '+n,PW()/2,PH()-18,{align:'center'});
  }
  doc.save('Cotizacion-'+slug(q.name)+'-'+q.date+'.pdf');
  toast('PDF listo');
}
