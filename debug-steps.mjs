import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('acorn');

const f = 'public/OS-CAMPO/assets/index-BkEAc5_S.js';
let s = fs.readFileSync(f, 'utf8');
const gueStart = s.indexOf('function Gue(){');
const gueEnd = s.indexOf('function Kue(');
let g = s.slice(gueStart, gueEnd);

function rep(cur, o, n, expect, tag) {
  const c = cur.split(o).length - 1;
  if (c !== expect) throw new Error(`${tag}: esperado ${expect}, achado ${c}`);
  return cur.split(o).join(n);
}

const steps = [
  ['A', '[osFiltroFrota,setOsFiltroFrota]=(0,I.useState)(`todos`),osChamadoPorOS=',
    '[osFiltroFrota,setOsFiltroFrota]=(0,I.useState)(`todos`),[osFiltroFrente,setOsFiltroFrente]=(0,I.useState)(`todos`),[osFiltroFrotaId,setOsFiltroFrotaId]=(0,I.useState)(`todos`),osChamadoPorOS=',
    1],
  ['B', 'osFrotaTipo=e=>{let t=e.os?osChamadoPorOS.get(e.os):null;if(!t)return`proprio`;let id=String(t.equipamentoId??``).replace(/\\D/g,``);return/^9[123]/.test(id)?`terceiro`:`proprio`},$x=',
    'PLACEHOLDER_B,$x=', 1],
  ['C', 'oe.filter(e=>e.tipo===`baixa`&&(osFiltroFrota===`todos`||osFrotaTipo(e)===osFiltroFrota))',
    'oe.filter(e=>e.tipo===`baixa`&&(osFiltroFrota===`todos`||osFrotaTipo(e)===osFiltroFrota)&&(osFiltroFrente===`todos`||osOrigem(e).equipe===osFiltroFrente)&&(osFiltroFrotaId===`todos`||osOrigem(e).frota===osFiltroFrotaId))', 3],
  ['C-deps', '[oe,N,osFiltroFrota])', '[oe,N,osFiltroFrota,osFiltroFrente,osFiltroFrotaId])', 4],
];

for (const [tag, o, n, ex] of steps) {
  if (tag === 'B') {
    const bAnchor = 'osFrotaTipo=e=>{let t=e.os?osChamadoPorOS.get(e.os):null;if(!t)return`proprio`;let id=String(t.equipamentoId??``).replace(/\\D/g,``);return/^9[123]/.test(id)?`terceiro`:`proprio`},$x=';
    g = rep(g, bAnchor, bAnchor.replace(',$x=', '') +
      'osCustos=(0,I.useMemo)(()=>{let a=0,b=0;for(const e of oe){if(e.tipo!==`baixa`)continue;const v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?b+=v:a+=v}const t=a+b;return{propria:a,terceiros:b,total:t,pctP:t?Math.round(a/t*100):0,pctT:t?Math.round(b/t*100):0}},[oe,N]),' +
      'osFrentes=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).equipe).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
      'osFrotasList=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).frota).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
      'osMatriz=(0,I.useMemo)(()=>{let m=new Map;for(const e of oe){if(e.tipo!==`baixa`)continue;if(osFiltroFrota!==`todos`&&osFrotaTipo(e)!==osFiltroFrota)continue;let q=osOrigem(e).equipe||`—`,r=m.get(q)||{nome:q,propria:0,terceiros:0,total:0},v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?r.terceiros+=v:r.propria+=v,r.total+=v,m.set(q,r)}return[...m.values()].sort((a,b)=>b.total-a.total)},[oe,N,osFiltroFrota]),' +
      ',osCustos=(0,I.useMemo)(()=>{let a=0,b=0;for(const e of oe){if(e.tipo!==`baixa`)continue;const v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?b+=v:a+=v}const t=a+b;return{propria:a,terceiros:b,total:t,pctP:t?Math.round(a/t*100):0,pctT:t?Math.round(b/t*100):0}},[oe,N]),' +
      'osFrentes=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).equipe).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
      'osFrotasList=(0,I.useMemo)(()=>[...new Set(oe.map(e=>osOrigem(e).frota).filter(e=>e&&e!==`—`))].sort(),[oe]),' +
      'osMatriz=(0,I.useMemo)(()=>{let m=new Map;for(const e of oe){if(e.tipo!==`baixa`)continue;if(osFiltroFrota!==`todos`&&osFrotaTipo(e)!==osFiltroFrota)continue;let q=osOrigem(e).equipe||`—`,r=m.get(q)||{nome:q,propria:0,terceiros:0,total:0},v=Math.abs(e.qtd)*(N.get(e.pecaId)?.valor??0);osFrotaTipo(e)===`terceiro`?r.terceiros+=v:r.propria+=v,r.total+=v,m.set(q,r)}return[...m.values()].sort((a,b)=>b.total-a.total)},[oe,N,osFiltroFrota]),' +
      '$x=', 1, 'B');
  } else {
    g = rep(g, o, n, ex, tag);
  }
  try {
    acorn.parse(g, { ecmaVersion: 'latest' });
    console.log(tag, 'OK');
  } catch (e) {
    console.log(tag, 'FALHA:', e.message, 'em', e.pos);
    console.log('ctx:', JSON.stringify(g.slice(e.pos - 100, e.pos + 60)));
    process.exit(1);
  }
}
