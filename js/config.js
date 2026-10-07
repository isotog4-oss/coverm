/* config.js - Configuración y utilidades (colores del semáforo con 2 precios, categorías y unidades por defecto, formato de dinero) */
'use strict';

const KEY='cotizador_materiales_v1';
// Cuando solo hay 2 precios distintos: el menor sale 'o' (naranja) y el mayor 'r' (rojo).
// Si prefieres que el menor salga verde, cambia 'o' por 'g'.
const TWO={best:'o',worst:'r'};
const DEF_CATS=['Eléctrico','Tubería PVC','Plomería','Albañilería','Herrería','Pintura','Ferretería general','Otros'];
const DEF_UNITS=['unidad','metro','pie','tubo','rollo','caja','bolsa','saco','galón','libra','quintal','kg','par','juego','plancha','m²','m³','lote'];

/* ================= Utilidades ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const pad=x=>String(x).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:null};
const slug=s=>String(s||'cotizacion').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'cotizacion';
function fmt(x,sym){
  const s=(sym!=null?sym:(Q()&&Q().currency)||'Q');
  const v=(Math.round((x||0)*100)/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return s+' '+v;
}
function fdate(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');return m?m[3]+'/'+m[2]+'/'+m[1]:(iso||'')}
