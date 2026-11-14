#!/usr/bin/env node
/* Validador de contenido. Uso: node validate.js [archivo.js ...]  (sin args: todos los de content/)
   - Revisa la estructura de cada ejercicio.
   - EJECUTA el código: verifica `out` y `run.sol` en python (python3) y javascript (node). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
const dir = path.join(__dirname, 'content');
let files = process.argv.slice(2);
if (!files.length) files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'helpers.js').map(f => path.join(dir, f));

const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'helpers.js'), 'utf8'), ctx);
let errors = 0, warns = 0, nEx = 0, nLes = 0, checked = 0;
const err = (w, m) => { errors++; console.log('✗ ' + w + ': ' + m); };
const warn = (w, m) => { warns++; console.log('! ' + w + ': ' + m); };
const norm = s => String(s).replace(/\r/g, '').split('\n').map(l => l.trim()).join('\n').trim();

function runPy(code) {
  const r = spawnSync('python3', ['-I', '-c', code], { encoding: 'utf8', timeout: 8000 });
  return { out: r.stdout, err: r.stderr, ok: r.status === 0 };
}
function runJs(code) {
  const r = spawnSync('node', ['-e', code], { encoding: 'utf8', timeout: 8000 });
  return { out: r.stdout, err: r.stderr, ok: r.status === 0 };
}
const exec = (runner, code) => runner === 'python' ? runPy(code) : runner === 'js' ? runJs(code) : null;

for (const f of files) {
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); } catch (e) { err(f, 'no carga: ' + e.message); }
}
for (const [id, L] of Object.entries(ctx.CQ.content)) {
  for (const key of ['id', 'name', 'emoji', 'color', 'tagline', 'units']) if (!L[key]) err(id, 'falta ' + key);
  const uids = new Set();
  (L.units || []).forEach((u, ui) => {
    if (!u.id || uids.has(u.id)) err(id, 'unidad id repetido/ausente ' + u.id); uids.add(u.id);
    if (!u.title || !u.desc) err(id + '.' + u.id, 'falta title/desc');
    const lids = new Set();
    (u.lessons || []).forEach(l => {
      nLes++;
      const W = `${id}.${u.id}.${l.id}`;
      if (!l.id || lids.has(l.id)) err(W, 'lección id repetido'); lids.add(l.id);
      if (!l.title || !l.intro) err(W, 'falta title/intro');
      if (!l.ex || l.ex.length < 5 || l.ex.length > 8) warn(W, 'se esperan 5-8 ejercicios, hay ' + (l.ex || []).length);
      (l.ex || []).forEach((x, i) => {
        nEx++;
        const w = `${W}#${i + 1}(${x.k})`;
        if (!x.q || !x.e) err(w, 'falta q o e (explicación)');
        switch (x.k) {
          case 'mc':
            if (!Array.isArray(x.o) || x.o.length < 2 || x.o.length > 4) err(w, 'o debe tener 2-4 opciones');
            else if (!Number.isInteger(x.a) || x.a < 0 || x.a >= x.o.length) err(w, 'a fuera de rango');
            else if (new Set(x.o).size !== x.o.length) err(w, 'opciones repetidas');
            break;
          case 'fill':
            if (!x.code || !x.code.includes('___')) err(w, 'code debe contener ___');
            if (!x.a.length || x.a.some(a => typeof a !== 'string' || !a.length)) err(w, 'a inválido');
            break;
          case 'order':
            if (!Array.isArray(x.t) || x.t.length < 3 || x.t.length > 10) err(w, 't debe tener 3-10 fichas');
            else if (x.t.some(t => /^\s|\s$/.test(t) || !t.length)) err(w, 'fichas con espacios al borde o vacías');
            break;
          case 'out': {
            if (!x.code || !x.a.length) { err(w, 'falta code o a'); break; }
            const r = exec(L.runner, x.code);
            if (r) { checked++; if (!r.ok) err(w, 'el código falla: ' + r.err.split('\n').slice(-2)[0]); else if (!x.a.map(norm).includes(norm(r.out))) err(w, `salida real ${JSON.stringify(norm(r.out))} no coincide con a=${JSON.stringify(x.a)}`); }
            else if (L.runner !== null && L.runner !== undefined) warn(w, 'runner desconocido');
            break;
          }
          case 'pair':
            if (!Array.isArray(x.pairs) || x.pairs.length < 3 || x.pairs.length > 5) err(w, 'pairs debe tener 3-5 pares');
            else if (new Set(x.pairs.map(p => p[0])).size !== x.pairs.length || new Set(x.pairs.map(p => p[1])).size !== x.pairs.length) err(w, 'pares con lados repetidos');
            break;
          case 'run': {
            if (L.runner !== 'python' && L.runner !== 'js') { err(w, 'run solo en python/js'); break; }
            if (!x.starter || !x.sol || !Array.isArray(x.tests) || !x.tests.length) { err(w, 'run necesita starter, sol y tests'); break; }
            const t = x.tests.map(([e, r]) => L.runner === 'python'
              ? `print(json.dumps(${e}))` : `console.log(JSON.stringify(${e}))`);
            const code = L.runner === 'python' ? 'import json\n' + x.sol + '\n' + t.join('\n') : x.sol + '\n' + t.join('\n');
            const r = exec(L.runner, code); checked++;
            if (!r.ok) { err(w, 'la solución falla: ' + r.err.split('\n').slice(-2)[0]); break; }
            const got = r.out.trim().split('\n');
            x.tests.forEach(([e, exp], j) => { if (got[j] !== exp) err(w, `test ${e}: obtuve ${got[j]} esperaba ${exp}`); });
            break;
          }
          default: err(w, 'tipo desconocido ' + x.k);
        }
      });
    });
  });
}
console.log(`\n${Object.keys(ctx.CQ.content).length} lenguajes, ${nLes} lecciones, ${nEx} ejercicios, ${checked} ejecutados · ${errors} errores · ${warns} avisos`);
process.exit(errors ? 1 : 0);
