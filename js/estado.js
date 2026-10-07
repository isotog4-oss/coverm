/* estado.js - Datos de la app: cotizaciones, guardado en el navegador */
'use strict';

function blankQuote(n){
  return {id:uid(),name:'Cotización '+n,client:'',date:today(),iva:12,incl:true,currency:'Q',notes:'',
          suppliers:[],items:[],extras:[],basis:'best'};
}
function defaults(){
  const q=blankQuote(1);
  return {company:'',categories:DEF_CATS.slice(),units:DEF_UNITS.slice(),quotes:[q],current:q.id};
}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const s=JSON.parse(raw);
      if(s&&Array.isArray(s.quotes)&&s.quotes.length){
        s.categories=s.categories||DEF_CATS.slice();
        s.units=s.units||DEF_UNITS.slice();
        if(!s.quotes.some(q=>q.id===s.current))s.current=s.quotes[0].id;
        return s;
      }
    }
  }catch(e){}
  return defaults();
}
let S=load();
const ui={step:1,supId:null};
const draft={name:'',category:'',unit:'unidad',qty:1};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function Q(){return S.quotes.find(q=>q.id===S.current)||S.quotes[0]}

let toastT;
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
