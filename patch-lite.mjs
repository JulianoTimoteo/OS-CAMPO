import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('acorn');

const f = 'public/OS-CAMPO/assets/index-BkEAc5_S.js';
const backup = f + '.bak';
if (!fs.existsSync(backup)) fs.copyFileSync(f, backup);

let s = fs.readFileSync(f, 'utf8');
const gueStart = s.indexOf('function Gue(){');
const gueEnd = s.indexOf('function Kue(');
if (gueStart === -1 || gueEnd === -1) throw new Error('Gue bounds not found');
let g = s.slice(gueStart, gueEnd);

function rep(cur, o, n, expect, tag) {
  const c = cur.split(o).length - 1;
  if (c !== expect) throw new Error(`${tag}: esperado ${expect}, achado ${c}`);
  return cur.split(o).join(n);
}

try {
  g = rep(g, '[osFiltroFrota,setOsFiltroFrota]=(0,I.useState)(`todos`),osChamadoPorOS=',
    '[osFiltroFrota,setOsFiltroFrota]=(0,I.useState)(`todos`),[osFiltroFrente,setOsFiltroFrente]=(0,I.useState)(`todos`),[osFiltroFrotaId,setOsFiltroFrotaId]=(0,I.useState)(`todos`),osChamadoPorOS=',
    1, 'A');

  const bAnchor = 'osFrotaTipo=e=>{let t=e.os?osChamadoPorOS.get(e.os):null;if(!t)return`proprio`;let id=String(t.equipamentoId??``).replace(/\\D/g,``);return/^9[123]/.test(id)?`terceiro`:`proprio`},$x=';
  g = rep(g, bAnchor, bAnchor.replace(',$x=', '') +
    'osCustos=(0,I.useMemo)(()=>{let a=0,b=0;for(const e of oe){if(e.tipo!==`baixa`)continue;const v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?b+=v:a+=v}const t=a+b;return{propria:a,terceiros:b,total:t,pctP:t?Math.round(a/t*100):0,pctT:t?Math.round(b/t*100):0}},[oe,N]),' +
    'osFrentes=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).equipe).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
    'osFrotasList=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).frota).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
    'osMatriz=(0,I.useMemo)(()=>{let m=new Map;for(const e of oe){if(e.tipo!==`baixa`)continue;if(osFiltroFrota!==`todos`&&osFrotaTipo(e)!==osFiltroFrota)continue;let q=osOrigem(e).equipe||`—`,r=m.get(q)||{nome:q,propria:0,terceiros:0,total:0},v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?r.terceiros+=v:r.propria+=v,r.total+=v,m.set(q,r)}return[...m.values()].sort((a,b)=>b.total-a.total)},[oe,N,osFiltroFrota]),' +
    '$x=', 1, 'B');

  g = rep(g, 'oe.filter(e=>e.tipo===`baixa`&&(osFiltroFrota===`todos`||osFrotaTipo(e)===osFiltroFrota))',
    'oe.filter(e=>e.tipo===`baixa`&&(osFiltroFrota===`todos`||osFrotaTipo(e)===osFiltroFrota)&&(osFiltroFrente===`todos`||osOrigem(e).equipe===osFiltroFrente)&&(osFiltroFrotaId===`todos`||osOrigem(e).frota===osFiltroFrotaId))',
    3, 'C');

  g = rep(g, '[oe,N,osFiltroFrota])', '[oe,N,osFiltroFrota,osFiltroFrente,osFiltroFrotaId])', 4, 'C-deps');

  g = rep(g, 'if(osFiltroFrota!==`todos`&&osFrotaTipo(t)!==osFiltroFrota)return!1;if(!e)return!0;',
    'if(osFiltroFrota!==`todos`&&osFrotaTipo(t)!==osFiltroFrota)return!1;if(osFiltroFrente!==`todos`&&osOrigem(t).equipe!==osFiltroFrente)return!1;if(osFiltroFrotaId!==`todos`&&osOrigem(t).frota!==osFiltroFrotaId)return!1;if(!e)return!0;',
    1, 'D');

  g = rep(g, '[r,fe,me,N,osFiltroFrota])', '[r,fe,me,N,osFiltroFrota,osFiltroFrente,osFiltroFrotaId])', 1, 'D-deps');

  g = rep(g, 'Terceiras`})]})]}),(0,L.jsxs)(Z,{variant:`outline`',
    'Terceiras`})]})]}),(0,L.jsxs)(V5,{value:osFiltroFrente,onValueChange:e=>setOsFiltroFrente(e),children:[(0,L.jsx)(U5,{className:`w-[150px]`,children:(0,L.jsx)(H5,{})}),(0,L.jsxs)(K5,{children:[(0,L.jsx)(q5,{value:`todos`,children:`Todas`}),osFrentes.map(e=>(0,L.jsx)(q5,{value:e,children:e}))]})]}),(0,L.jsxs)(V5,{value:osFiltroFrotaId,onValueChange:e=>setOsFiltroFrotaId(e),children:[(0,L.jsx)(U5,{className:`w-[150px]`,children:(0,L.jsx)(H5,{})}),(0,L.jsxs)(K5,{children:[(0,L.jsx)(q5,{value:`todos`,children:`Todas`}),osFrotasList.map(e=>(0,L.jsx)(q5,{value:e,children:e}))]})]}),(0,L.jsxs)(Z,{variant:`outline`',
    1, 'E');

  g = rep(g, 'se=(0,I.useMemo)(()=>{let e=new Map;return oe.filter(e=>e.tipo===`baixa`).forEach(',
    'se=(0,I.useMemo)(()=>{let e=new Map;return oe.filter(e=>e.tipo===`baixa`&&(osFiltroFrota===`todos`||osFrotaTipo(e)===osFiltroFrota)&&(osFiltroFrente===`todos`||osOrigem(e).equipe===osFiltroFrente)&&(osFiltroFrotaId===`todos`||osOrigem(e).frota===osFiltroFrotaId)).forEach(',
    1, 'F');

  g = rep(g, '},[oe,N]),ce=', '},[oe,N,osFiltroFrota,osFiltroFrente,osFiltroFrotaId]),ce=', 1, 'F-deps');

  g = rep(g, 'Período de baixas: ${T} a ${D}</div>', 'Período de baixas: ${T} a ${D} · Propriedade: ${osFiltroFrota===`terceiro`?`Terceiros`:osFiltroFrota===`proprio`?`Própria`:`Todas`}</div>', 1, 'G');

  acorn.parse(g, { ecmaVersion: 'latest' });
  console.log('A-G OK');

  s = s.slice(0, gueStart) + g + s.slice(gueEnd);

  const hOld = 'color:"border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"';
  if (s.split(hOld).length - 1 !== 1) throw new Error('H: expected 1 occurrence');
  s = s.split(hOld).join('color:"border-warning/30 bg-warning/15 text-warning"');

  acorn.parse(s, { ecmaVersion: 'latest' });
  console.log('H OK');

  fs.writeFileSync(f, s);
  console.log('PATCH OK:', f);
} catch (e) {
  fs.copyFileSync(backup, f);
  console.log('RESTORED FROM BACKUP:', e.message);
  process.exit(1);
}
