/* CodeQuest · motor de la app. Sin dependencias. Contenido en /content, formato en CONTENT_SPEC.md */
(() => {
'use strict';
const CQ = window.CQ;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad = n => String(n).padStart(2, '0');
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayAdd = n => { const d = new Date(); d.setDate(d.getDate() + n); return dayStr(d); };
const PAL = ['#58cc02', '#1cb0f6', '#ce82ff', '#ff9600', '#ff4b4b', '#00cd9c', '#e5a800', '#2b70c9'];
const TITLES = ['Novato', 'Aprendiz', 'Programador', 'Desarrollador', 'Ingeniero', 'Arquitecto', 'Maestro', 'Leyenda'];
const MAXH = 5, REGEN = 15 * 60e3, VERSION = '1.0.0';

/* ---------- estado ---------- */
const KEY = 'codequest.v1';
const DEF = { lang: null, xp: 0, streak: 0, best: 0, last: null, hearts: MAXH, heartsAt: 0, done: {}, srs: {}, hist: {}, goal: 30,
  sound: true, theme: 'auto', ach: {}, perfect: 0, practices: 0, answered: 0, right: 0, seen: false, offered: {} };
let S;
try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { S = { ...DEF }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };

function refreshHearts() {
  if (S.hearts >= MAXH) { S.hearts = MAXH; S.heartsAt = 0; return; }
  const now = Date.now(); if (!S.heartsAt) S.heartsAt = now;
  const g = Math.floor((now - S.heartsAt) / REGEN);
  if (g > 0) { S.hearts = Math.min(MAXH, S.hearts + g); S.heartsAt = S.hearts >= MAXH ? 0 : S.heartsAt + g * REGEN; }
}
function loseHeart() { refreshHearts(); if (S.hearts >= MAXH) S.heartsAt = Date.now(); S.hearts = Math.max(0, S.hearts - 1); save(); }
function gainHeart() { refreshHearts(); S.hearts = Math.min(MAXH, S.hearts + 1); if (S.hearts >= MAXH) S.heartsAt = 0; save(); }
const nextHeartIn = () => S.hearts >= MAXH ? 0 : Math.max(0, REGEN - (Date.now() - S.heartsAt));
const fmtMs = ms => `${Math.floor(ms / 60000)}:${pad(Math.floor(ms / 1000) % 60)}`;
const streakNow = () => (S.last === dayStr() || S.last === dayAdd(-1)) ? S.streak : 0;
function bumpStreak() { const t = dayStr(); if (S.last === t) return; S.streak = S.last === dayAdd(-1) ? S.streak + 1 : 1; S.last = t; S.best = Math.max(S.best, S.streak); }
function addXP(n) { S.xp += n; const t = dayStr(); S.hist[t] = (S.hist[t] || 0) + n; }
const level = () => Math.floor(Math.sqrt(S.xp / 40)) + 1;
const levelXp = n => 40 * (n - 1) * (n - 1);

/* ---------- currículo ---------- */
const ORDER = ['python', 'javascript', 'html', 'sql', 'java', 'c'];
const LANGS = [...ORDER.filter(id => CQ.content[id]), ...Object.keys(CQ.content).filter(id => !ORDER.includes(id))];
const FLAT = {}, EX = {};
function flat(lang) {
  if (FLAT[lang]) return FLAT[lang];
  const a = [];
  CQ.content[lang].units.forEach((u, ui) => u.lessons.forEach((l, li) => a.push({ u, l, ui, li, key: `${lang}.${u.id}.${l.id}`, idx: a.length, lang })));
  return (FLAT[lang] = a);
}
LANGS.forEach(lang => flat(lang).forEach(f => f.l.ex.forEach((x, i) => { x._id = `${f.key}.${i}`; EX[x._id] = { ex: x, lang, f }; })));
const isDone = key => !!S.done[key];
const langProgress = lang => { const fl = flat(lang); return { d: fl.filter(f => isDone(f.key)).length, n: fl.length }; };
const totalDone = () => Object.keys(S.done).length;

/* ---------- formato de texto / código ---------- */
const KW = new Set(`def class return if elif else for while in not and or import from as try except finally with lambda pass break continue None True False is yield raise global nonlocal assert del
function const let var new this await async typeof null undefined true false of switch case default do void static public private protected final abstract interface extends implements super
int long float double char boolean byte short String struct sizeof enum typedef unsigned signed include define namespace using
SELECT FROM WHERE GROUP BY ORDER HAVING JOIN INNER LEFT RIGHT OUTER ON AS AND OR NOT NULL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE PRIMARY KEY LIMIT OFFSET DISTINCT COUNT SUM AVG MIN MAX LIKE IN IS ASC DESC UNIQUE DEFAULT ALTER DROP INDEX FOREIGN REFERENCES BETWEEN UNION CASE WHEN THEN END`.split(/\s+/));
const COM = { python: /#[^\n]*/.source, sql: /--[^\n]*|\/\*[\s\S]*?\*\//.source, html: /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//.source, c: /\/\/[^\n]*|\/\*[\s\S]*?\*\//.source };
const REST = tag => '|(' + /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/.source + ')|(' + /\b\d+(?:\.\d+)?\b/.source + ')|(' +
  (tag ? /<\/?[A-Za-z][\w-]*/.source : '(?!)') + ')|(' + /\b[A-Za-z_]\w*\b/.source + ')';
const HLRE = {};
function hl(code, lang) {
  const key = COM[lang] ? lang : 'c';
  const re = HLRE[key] || (HLRE[key] = new RegExp('(' + COM[key] + ')' + REST(key === 'html'), 'g'));
  re.lastIndex = 0;
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const t = m[0];
    const c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : m[4] ? 'k' : (KW.has(t) || (lang === 'sql' && KW.has(t.toUpperCase()))) ? 'k' : null;
    out += c ? `<span class="h-${c}">${esc(t)}</span>` : esc(t);
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}
const codeBlock = (code, lang) => `<pre class="code">${hl(String(code).replace(/\n$/, ''), lang)}</pre>`;
const inl = s => esc(s).replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function md(src, lang) {
  return String(src).split(/```[\w+-]*\n?/).map((part, i) => {
    if (i % 2) return codeBlock(part, lang);
    return part.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
      const lines = p.split('\n');
      if (lines.every(l => /^\s*[-*•]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inl(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inl).join('<br>')}</p>`;
    }).join('');
  }).join('');
}

/* ---------- mascota, sonido, confeti ---------- */
function bit(size = 96, mood = 'happy') {
  const mouth = mood === 'sad' ? 'M41 68 q9 -8 18 0' : 'M41 63 q9 9 18 0';
  return `<svg class="bit" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><line x1="50" y1="14" x2="50" y2="26" stroke="#46a302" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="12" r="7" fill="#ffc800"/><rect x="12" y="24" width="76" height="68" rx="22" fill="#58cc02"/><rect x="12" y="74" width="76" height="18" rx="12" fill="#46a302" opacity=".4"/><rect x="22" y="35" width="56" height="42" rx="14" fill="#1f2f37"/><circle cx="38" cy="50" r="6" fill="#fff"/><circle cx="62" cy="50" r="6" fill="#fff"/><circle cx="39.5" cy="51" r="3" fill="#1f2f37"/><circle cx="63.5" cy="51" r="3" fill="#1f2f37"/><path d="${mouth}" fill="none" stroke="#58cc02" stroke-width="4" stroke-linecap="round"/></svg>`;
}
let ac;
function beep(freqs, dur = 0.11) {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * dur;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
    });
  } catch (e) { /* sin audio */ }
}
const SND = { ok: [660, 880], bad: [233, 175], win: [523, 659, 784, 1047] };
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
  const w = (c.width = innerWidth), h = (c.height = innerHeight), g = c.getContext('2d');
  const cols = PAL, P = Array.from({ length: 130 }, () => ({ x: Math.random() * w, y: -20 - Math.random() * h * .5, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function tick(t) {
    g.clearRect(0, 0, w, h);
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += .04; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); g.restore(); });
    if (t - t0 < 2600) requestAnimationFrame(tick); else c.remove();
  })(t0);
}

/* ---------- utilidades UI ---------- */
function toast(msg, ms = 2600) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function sheet(html) {
  const b = document.createElement('div'); b.className = 'sheet-bg'; b.innerHTML = `<div class="sheet">${html}</div>`;
  document.body.appendChild(b);
  const close = () => b.remove();
  b.onclick = e => { if (e.target === b) close(); };
  return { el: b.firstElementChild, close };
}
function overlay(id) {
  let el = $('#' + id);
  if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
  el.className = 'overlay'; return el;
}
const killOverlay = id => { const el = $('#' + id); if (el) el.remove(); };

/* ---------- repaso espaciado ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function updSRS(id, ok) {
  const e = S.srs[id] || { b: 0, d: 0 };
  e.b = ok ? Math.min(5, e.b + 1) : 0;
  e.d = Date.now() + BOX_DAYS[e.b] * 864e5;
  S.srs[id] = e;
}
function pickReviews(lang, exceptKey, n) {
  const now = Date.now();
  const c = Object.keys(S.srs).filter(id => EX[id] && EX[id].lang === lang && EX[id].f.key !== exceptKey && S.srs[id].d <= now && EX[id].ex.k !== 'run');
  return shuffle(c).slice(0, n).map(id => EX[id].ex);
}

/* ---------- ejecución de código (JS y Python) ---------- */
const workerFrom = fn => new Worker(URL.createObjectURL(new Blob([`(${fn.toString()})()`], { type: 'text/javascript' })));
const jsWorkerFn = () => {
  onmessage = e => {
    const { code, tests } = e.data, out = [];
    for (const [ex, xp] of tests) {
      try { const f = new Function(code + '\n;return JSON.stringify(' + ex + ');'); out.push({ e: ex, x: xp, g: String(f()) }); }
      catch (err) { out.push({ e: ex, x: xp, err: String(err) }); }
    }
    postMessage({ res: out });
  };
};
const pyWorkerFn = () => {
  let py = null;
  onmessage = async e => {
    const d = e.data;
    if (d.init) {
      try {
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
        py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
        await py.runPythonAsync(d.init); postMessage({ ready: true });
      } catch (err) { postMessage({ fatal: String((err && err.message) || err) }); }
      return;
    }
    try { py.globals.set('__in__', d.input); postMessage({ out: await py.runPythonAsync('__run_tests(__in__)') }); }
    catch (err) { postMessage({ error: String((err && err.message) || err) }); }
  };
};
const PY_HARNESS = `import json, sys, io
def __run_tests(s):
    d = json.loads(s)
    g = {'__name__': '__main__'}
    old = sys.stdout
    sys.stdout = io.StringIO()
    try:
        try:
            exec(d['code'], g)
        except BaseException as ex:
            return json.dumps({'error': type(ex).__name__ + ': ' + str(ex)})
        res = []
        for e, x in d['tests']:
            try:
                res.append({'e': e, 'x': x, 'g': json.dumps(eval(e, g))})
            except BaseException as ex:
                res.append({'e': e, 'x': x, 'err': type(ex).__name__ + ': ' + str(ex)})
        return json.dumps({'res': res})
    finally:
        sys.stdout = old
`;
function runJS(code, tests) {
  return new Promise(resolve => {
    let w; try { w = workerFrom(jsWorkerFn); } catch (err) { return resolve({ error: 'No se pudo iniciar el motor: ' + err.message }); }
    const t = setTimeout(() => { w.terminate(); resolve({ error: 'Tu código tardó demasiado (¿bucle infinito?).' }); }, 3000);
    w.onmessage = e => { clearTimeout(t); w.terminate(); resolve(e.data); };
    w.onerror = e => { clearTimeout(t); w.terminate(); resolve({ error: String(e.message || 'Error') }); };
    w.postMessage({ code, tests });
  });
}
let pyW = null, pyP = null;
function getPy() {
  if (pyP) return pyP;
  pyP = new Promise((resolve, reject) => {
    let w, ready = false;
    const fail = m => { try { w && w.terminate(); } catch (e) { /* ya cerrado */ } pyW = null; pyP = null; reject(new Error(m)); };
    try { w = workerFrom(pyWorkerFn); } catch (e) { return fail(e.message); }
    pyW = w;
    const to = setTimeout(() => { if (!ready) fail('timeout'); }, 60000);
    w.onmessage = e => { if (e.data.ready) { ready = true; clearTimeout(to); resolve(w); } else if (e.data.fatal) { clearTimeout(to); fail(e.data.fatal); } };
    w.onerror = () => { clearTimeout(to); fail('worker'); };
    w.postMessage({ init: PY_HARNESS });
  });
  return pyP;
}
async function runPy(code, tests) {
  let w; try { w = await getPy(); } catch (e) { return { noengine: true }; }
  return new Promise(resolve => {
    const t = setTimeout(() => { w.terminate(); pyW = null; pyP = null; resolve({ error: 'Tu código tardó demasiado (¿bucle infinito?).' }); }, 8000);
    w.onmessage = e => { clearTimeout(t); if (e.data.out) resolve(JSON.parse(e.data.out)); else resolve({ error: e.data.error || 'Error' }); };
    w.onerror = () => { clearTimeout(t); resolve({ error: 'Error del motor de Python.' }); };
    w.postMessage({ input: JSON.stringify({ code, tests }) });
  });
}
function runCode(lang, code, tests) {
  const k = CQ.content[lang].runner;
  if (k === 'js') return runJS(code, tests);
  if (k === 'python') return runPy(code, tests);
  return Promise.resolve({ noengine: true });
}
const sameJSON = (g, x) => { try { return JSON.stringify(JSON.parse(g)) === JSON.stringify(JSON.parse(x)); } catch (e) { return g === x; } };

/* ---------- normalización de respuestas ---------- */
const normFill = (s, ci) => { s = String(s).replace(/\s+/g, ' ').trim().replace(/\s*([^\w\s])\s*/g, '$1'); return ci ? s.toLowerCase() : s; };
const normOut = s => String(s).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n').trim();

/* ---------- vistas principales ---------- */
let view = 'path';
function renderTop() {
  refreshHearts();
  const L = S.lang && CQ.content[S.lang];
  $('#top').innerHTML = `<button class="chip lang" id="tl">${L ? L.emoji : '🌐'}<span>${L ? esc(L.name) : 'Elegir'}</span><i>▾</i></button><span class="sp"></span>
    <span class="chip" title="Racha">🔥<b>${streakNow()}</b></span><button class="chip" id="th" title="Vidas">❤️<b>${S.hearts}</b></button><span class="chip" title="XP">⚡<b>${S.xp}</b></span>`;
  $('#tl').onclick = () => openPicker();
  $('#th').onclick = () => {
    refreshHearts();
    const s = sheet(`<h3>❤️ Vidas: ${S.hearts}/${MAXH}</h3><p>Pierdes una vida al fallar en una lección. Recuperas una cada 15 minutos${S.hearts < MAXH ? ` (la próxima en ${fmtMs(nextHeartIn())})` : ''}, o al terminar una sesión de práctica.</p><button class="btn blue big" id="sp">Practicar</button>`);
    $('#sp', s.el).onclick = () => { s.close(); startPractice(); };
  };
}
function renderNav() {
  const tabs = [['path', '🏠', 'Aprender'], ['practice', '💪', 'Práctica'], ['profile', '👤', 'Perfil']];
  $('#nav').innerHTML = tabs.map(([id, ic, tx]) => `<button data-v="${id}" class="${view === id ? 'on' : ''}"><span>${ic}</span>${tx}</button>`).join('');
  $$('#nav button').forEach(b => b.onclick = () => { view = b.dataset.v; render(); scrollTo(0, 0); });
}
function render() {
  renderTop(); renderNav();
  const m = $('#main');
  if (!S.lang || !CQ.content[S.lang]) { m.innerHTML = ''; return; }
  if (view === 'path') viewPath(m); else if (view === 'practice') viewPractice(m); else viewProfile(m);
}

function viewPath(m) {
  const L = CQ.content[S.lang], fl = flat(S.lang);
  const cur = fl.findIndex(f => !isDone(f.key));
  let html = '';
  if (!fl.some(f => isDone(f.key))) html += `<div class="card place"><div><b>¿Ya sabes programar?</b><p>Haz una prueba rápida y salta lo que ya dominas.</p></div><button class="btn blue" id="plc">Prueba de nivel</button></div>`;
  L.units.forEach((u, ui) => {
    const col = PAL[ui % PAL.length], ls = fl.filter(f => f.ui === ui), nd = ls.filter(f => isDone(f.key)).length;
    html += `<section class="unit" style="--c:${col}"><div class="ubanner"><div><small>UNIDAD ${ui + 1}</small><h3>${esc(u.title)}</h3><p>${esc(u.desc)}</p></div><div class="ucount">${nd}/${ls.length}</div></div><div class="nodes">`;
    ls.forEach((f, k) => {
      const st = isDone(f.key) ? 'done' : f.idx === cur ? 'cur' : 'lock';
      const off = [0, 36, 58, 36, 0, -36, -58, -36][f.idx % 8];
      const icon = st === 'lock' ? '🔒' : f.li === u.lessons.length - 1 ? '🏆' : st === 'done' ? '✓' : '★';
      const s = (S.done[f.key] || {}).s || 0;
      html += `<div class="nwrap" style="transform:translateX(${off}px)"><button class="node ${st}" data-i="${f.idx}" aria-label="${esc(f.l.title)}">${icon}</button>${st === 'cur' ? '<span class="start">EMPEZAR</span>' : ''}${st === 'done' ? `<span class="stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span>` : ''}</div><div class="nlabel">${esc(f.l.title)}</div>`;
    });
    html += '</div></section>';
  });
  html += `<div class="card center" style="margin-top:12px">${bit(64)}<b>${cur === -1 ? '¡Completaste este curso!' : 'Más contenido en camino'}</b><p class="muted">${cur === -1 ? 'Repasa en Práctica o elige otro lenguaje.' : 'Cada unidad te acerca a nivel experto.'}</p></div>`;
  m.innerHTML = html;
  $$('.node', m).forEach(b => b.onclick = () => openLessonSheet(+b.dataset.i));
  const p = $('#plc'); if (p) p.onclick = () => startPlacement();
  const c = $('.node.cur', m); if (c && !m.dataset.scrolled) { m.dataset.scrolled = 1; setTimeout(() => c.scrollIntoView({ block: 'center' }), 50); }
}
function openLessonSheet(idx) {
  const fl = flat(S.lang), f = fl[idx], st = isDone(f.key) ? 'done' : (idx === 0 || isDone(fl[idx - 1].key)) ? 'open' : 'lock';
  const s = sheet(`<h3>${esc(f.l.title)}</h3><p>Unidad ${f.ui + 1} · Lección ${f.li + 1} · ${f.l.ex.length} ejercicios</p>${st === 'lock'
    ? '<p>🔒 Completa la lección anterior para desbloquearla.</p><button class="btn big" disabled>Bloqueada</button>'
    : `<button class="btn primary big" id="go">${st === 'done' ? 'Repasar' : 'Empezar'} · +${st === 'done' ? 10 : 20} XP</button><button class="linkbtn" id="gd">📖 Leer la guía</button>`}`);
  const g = $('#go', s.el); if (g) g.onclick = () => { s.close(); startLesson(S.lang, idx); };
  const d = $('#gd', s.el); if (d) d.onclick = () => { s.close(); const t = sheet(`<h3>📖 ${esc(f.l.title)}</h3><div class="intro">${md(f.l.intro, S.lang)}</div><button class="btn blue big" id="ok">Listo</button>`); $('#ok', t.el).onclick = t.close; };
}

function viewPractice(m) {
  const lang = S.lang, fl = flat(lang), now = Date.now();
  const ids = Object.keys(S.srs).filter(id => EX[id] && EX[id].lang === lang && EX[id].ex.k !== 'run');
  const due = ids.filter(id => S.srs[id].d <= now).length;
  const mastered = ids.filter(id => S.srs[id].b >= 3).length;
  let html = `<div class="h-title">💪 Práctica inteligente</div><div class="card hero">${bit(70)}<div><b>Repasa lo que ya viste</b><p class="muted">Las preguntas que fallas vuelven pronto; las que dominas, cada vez más espaciadas. Así se queda para siempre.</p></div></div>
  <div class="grid2"><div class="stat"><span>⏰</span><div><b>${due}</b><small>por repasar</small></div></div><div class="stat"><span>🧠</span><div><b>${mastered}/${ids.length}</b><small>dominadas</small></div></div></div>
  <button class="btn primary big" id="sp" style="margin-top:14px" ${ids.length ? '' : 'disabled'}>${ids.length ? 'Empezar práctica · +1 ❤️' : 'Completa una lección primero'}</button>
  <div class="sec"><h3>Dominio por unidad</h3><div class="mastery">`;
  CQ.content[lang].units.forEach((u, ui) => {
    const all = fl.filter(f => f.ui === ui).flatMap(f => f.l.ex).filter(x => x.k !== 'run');
    const ok = all.filter(x => S.srs[x._id] && S.srs[x._id].b >= 3).length;
    const p = all.length ? Math.round(ok / all.length * 100) : 0;
    html += `<div class="mrow"><span style="width:7.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ui + 1}. ${esc(u.title)}</span><div class="bar"><i style="width:${p}%;background:${PAL[ui % PAL.length]}"></i></div><em>${p}%</em></div>`;
  });
  m.innerHTML = html + '</div></div>';
  $('#sp').onclick = startPractice;
}

const ACH = [
  ['first', '🌱', 'Primer paso', 'Completa tu primera lección', () => totalDone() >= 1],
  ['l10', '📚', 'Constante', 'Completa 10 lecciones', () => totalDone() >= 10],
  ['l30', '🎓', 'Estudiante', 'Completa 30 lecciones', () => totalDone() >= 30],
  ['s3', '🔥', 'En racha', 'Racha de 3 días', () => S.best >= 3],
  ['s7', '🔥', 'Semana perfecta', 'Racha de 7 días', () => S.best >= 7],
  ['s30', '🌋', 'Imparable', 'Racha de 30 días', () => S.best >= 30],
  ['x100', '⚡', 'Chispa', '100 XP', () => S.xp >= 100],
  ['x1000', '💥', 'Energía', '1 000 XP', () => S.xp >= 1000],
  ['perf', '💯', 'Impecable', 'Una lección sin errores', () => S.perfect >= 1],
  ['unit', '🏆', 'Unidad completa', 'Termina una unidad', () => LANGS.some(l => CQ.content[l].units.some(u => u.lessons.every(x => isDone(`${l}.${u.id}.${x.id}`))))],
  ['poly', '🌍', 'Políglota', 'Avanza en 2 lenguajes', () => LANGS.filter(l => langProgress(l).d > 0).length >= 2],
  ['prac', '🧠', 'Memoria de elefante', '3 sesiones de práctica', () => S.practices >= 3],
];
function checkAch() {
  ACH.forEach(([id, ic, nm, , f]) => { if (!S.ach[id] && f()) { S.ach[id] = Date.now(); setTimeout(() => toast(`${ic} Logro: ${nm}`), 600); } });
  save();
}
function viewProfile(m) {
  const lv = level(), a = levelXp(lv), b = levelXp(lv + 1), p = Math.round((S.xp - a) / (b - a) * 100);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return [dayStr(d), ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()]]; });
  const mx = Math.max(S.goal, ...days.map(([d]) => S.hist[d] || 0));
  const today = S.hist[dayStr()] || 0;
  m.innerHTML = `<div class="hero">${bit(84)}<div style="flex:1"><div class="h-title" style="margin:0">Nivel ${lv} · ${TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 2))]}</div><div class="bar" style="margin:6px 0"><i style="width:${p}%"></i></div><small class="muted">${S.xp - a} / ${b - a} XP para el nivel ${lv + 1}</small></div></div>
  <div class="grid2"><div class="stat"><span>🔥</span><div><b>${streakNow()}</b><small>racha (mejor ${S.best})</small></div></div><div class="stat"><span>⚡</span><div><b>${S.xp}</b><small>XP total</small></div></div>
  <div class="stat"><span>📗</span><div><b>${totalDone()}</b><small>lecciones</small></div></div><div class="stat"><span>🎯</span><div><b>${S.answered ? Math.round(S.right / S.answered * 100) : 0}%</b><small>precisión</small></div></div></div>
  <div class="sec"><h3>Meta diaria · ${today}/${S.goal} XP</h3><div class="bar"><i style="width:${Math.min(100, today / S.goal * 100)}%;background:var(--blue)"></i></div>
  <div class="goals">${[10, 20, 30, 50, 100].map(g => `<button class="pill ${S.goal === g ? 'on' : ''}" data-g="${g}">${g} XP</button>`).join('')}</div>
  <div class="week">${days.map(([d, l], i) => `<div class="${i === 6 ? 't' : ''}"><i style="height:${Math.max(4, (S.hist[d] || 0) / mx * 70)}px"></i>${l}</div>`).join('')}</div></div>
  <div class="sec"><h3>Mis cursos</h3>${LANGS.map(l => { const { d, n } = langProgress(l), L = CQ.content[l]; return `<div class="mrow" style="padding:6px 0"><span style="font-size:1.4rem">${L.emoji}</span><span style="width:6.5em">${esc(L.name)}</span><div class="bar"><i style="width:${d / n * 100}%;background:${L.color}"></i></div><em>${d}/${n}</em></div>`; }).join('')}</div>
  <div class="sec"><h3>Logros · ${Object.keys(S.ach).length}/${ACH.length}</h3><div class="ach">${ACH.map(([id, ic, nm, ds]) => `<div class="${S.ach[id] ? '' : 'off'}"><span>${ic}</span><b>${nm}</b>${ds}</div>`).join('')}</div></div>
  <div class="sec"><h3>Ajustes</h3>
  <div class="row"><span>Sonidos</span><button class="pill ${S.sound ? 'on' : ''}" id="snd">${S.sound ? 'Activados' : 'Apagados'}</button></div>
  <div class="row"><span>Tema</span><select id="thm"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></div>
  <div class="row"><span>Copia de seguridad</span><span><button class="linkbtn" id="exp">Exportar</button><button class="linkbtn" id="imp">Importar</button></span></div>
  <div class="row"><span>Borrar todo mi progreso</span><button class="linkbtn" style="color:var(--red)" id="rst">Borrar</button></div>
  <p class="muted" style="margin-top:10px;font-size:.8rem">CodeQuest v${VERSION} · Tu progreso se guarda en este dispositivo.</p></div>`;
  $$('[data-g]', m).forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); render(); });
  $('#snd').onclick = () => { S.sound = !S.sound; save(); render(); };
  const t = $('#thm'); t.value = S.theme; t.onchange = () => { S.theme = t.value; save(); applyTheme(); };
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'codequest-progreso.json'; a.click(); };
  $('#imp').onclick = () => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json';
    i.onchange = () => i.files[0].text().then(tx => { try { const o = JSON.parse(tx); if (typeof o !== 'object' || !o.done) throw 0; S = { ...DEF, ...o }; save(); applyTheme(); render(); toast('Progreso importado ✅'); } catch (e) { toast('Archivo no válido'); } });
    i.click();
  };
  $('#rst').onclick = () => {
    const s = sheet('<h3>¿Borrar todo?</h3><p>Se perderán tu XP, racha y progreso. No se puede deshacer.</p><button class="btn danger big" id="y">Sí, borrar</button><button class="btn big" id="n">Cancelar</button>');
    $('#n', s.el).onclick = s.close; $('#y', s.el).onclick = () => { S = { ...DEF, seen: true }; save(); s.close(); openPicker(true); };
  };
}
function applyTheme() { if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = S.theme; }

/* ---------- bienvenida y selector de curso ---------- */
function openWelcome() {
  const el = overlay('welcome');
  el.innerHTML = `<div class="ls-body center" style="justify-content:center">${bit(130)}<h1>CodeQuest</h1><p class="muted" style="max-width:320px">Aprende a programar jugando. Lecciones cortas, quizzes y repaso inteligente: de cero a experto.</p>
  <div class="card" style="text-align:left;margin-top:8px;width:100%;max-width:340px">🧩 Niveles y lecciones de 5 minutos<br>🔥 Rachas, XP y logros<br>🧠 Repaso espaciado que sí se queda<br>📱 Funciona en el móvil y sin conexión</div></div>
  <div class="ls-foot"><button class="btn primary big" id="go">Comenzar</button></div>`;
  $('#go').onclick = () => { S.seen = true; save(); killOverlay('welcome'); openPicker(true); };
}
function openPicker(first) {
  const el = overlay('picker');
  const soon = CQ.roadmap.filter(r => !CQ.content[r.id]);
  el.innerHTML = `<div class="ls-top">${first || !S.lang ? '' : '<button class="x" id="pb">✕</button>'}<h2 style="font-size:1.3rem;flex:1">¿Qué quieres aprender?</h2></div><div class="ls-body">
  ${LANGS.map(id => { const L = CQ.content[id], { d, n } = langProgress(id); return `<button class="lang-card ${id === S.lang ? 'cur' : ''}" data-l="${id}"><span class="em" style="--c:${L.color}">${L.emoji}</span><span style="flex:1"><b>${esc(L.name)}</b><small>${L.units.length} unidades · ${n} lecciones</small><div class="bar"><i style="width:${d / n * 100}%;background:${L.color}"></i></div></span></button>`; }).join('')}
  <div class="h-title" style="margin-top:20px">Próximamente</div>
  ${soon.map(r => `<button class="lang-card soon" data-s="${r.id}"><span class="em" style="--c:${r.color}">${r.emoji}</span><span style="flex:1"><b>${esc(r.name)}</b><small>${r.units.length} unidades planeadas</small></span></button>`).join('')}</div>`;
  const pb = $('#pb', el); if (pb) pb.onclick = () => killOverlay('picker');
  $$('[data-l]', el).forEach(b => b.onclick = () => chooseLang(b.dataset.l));
  $$('[data-s]', el).forEach(b => b.onclick = () => {
    const r = soon.find(x => x.id === b.dataset.s);
    const s = sheet(`<h3>${r.emoji} ${esc(r.name)} · próximamente</h3><p>Ruta planeada:</p><div class="intro"><ul>${r.units.map(u => `<li>${esc(u)}</li>`).join('')}</ul></div><button class="btn blue big" id="ok">Entendido</button>`);
    $('#ok', s.el).onclick = s.close;
  });
}
function chooseLang(id) {
  S.lang = id; save(); killOverlay('picker'); view = 'path'; $('#main').dataset.scrolled = ''; render();
  if (!langProgress(id).d && !S.offered[id]) {
    S.offered[id] = 1; save();
    const s = sheet(`<h3>${CQ.content[id].emoji} ${esc(CQ.content[id].name)}</h3><p>¿Cómo quieres empezar?</p><button class="btn primary big" id="a">Desde cero</button><button class="btn blue big" id="b">Ya sé algo · prueba de nivel</button>`);
    $('#a', s.el).onclick = s.close; $('#b', s.el).onclick = () => { s.close(); startPlacement(); };
  }
}

/* ---------- sesiones: lección, práctica, prueba de nivel ---------- */
let ses = null, cur = null;
function startLesson(lang, idx) {
  refreshHearts(); if (S.hearts <= 0) return noHearts();
  const f = flat(lang)[idx], q = f.l.ex.map(x => ({ x }));
  pickReviews(lang, f.key, 2).forEach((x, i) => q.splice(Math.min(q.length, 3 + i * 2), 0, { x, rev: true }));
  ses = { mode: 'lesson', lang, f, queue: q, i: 0, mistakes: 0, right: 0, start: Date.now(), phase: f.l.intro ? 'intro' : 'q', xp: 0 };
  renderLesson();
}
function startPractice() {
  const lang = S.lang, now = Date.now();
  const ids = Object.keys(S.srs).filter(id => EX[id] && EX[id].lang === lang && EX[id].ex.k !== 'run');
  if (!ids.length) return toast('Completa una lección para desbloquear la práctica');
  const due = ids.filter(id => S.srs[id].d <= now).sort((a, b) => S.srs[a].b - S.srs[b].b);
  let pick = due.slice(0, 10);
  if (pick.length < 10) pick = pick.concat(shuffle(ids.filter(id => !pick.includes(id))).slice(0, 10 - pick.length));
  ses = { mode: 'practice', lang, f: null, queue: shuffle(pick).map(id => ({ x: EX[id].ex })), i: 0, mistakes: 0, right: 0, start: Date.now(), phase: 'q', xp: 0 };
  renderLesson();
}
function placementQs(lang, ui) {
  const pool = flat(lang).filter(f => f.ui === ui).flatMap(f => f.l.ex).filter(x => x.k !== 'run');
  return shuffle(pool).slice(0, 3).map(x => ({ x }));
}
function startPlacement() {
  const lang = S.lang, max = Math.min(5, CQ.content[lang].units.length);
  ses = { mode: 'placement', lang, f: null, queue: placementQs(lang, 0), i: 0, mistakes: 0, right: 0, start: Date.now(), phase: 'q', xp: 0, stage: 0, stageRight: 0, passed: 0, max };
  renderLesson();
}
function renderLesson() {
  const el = overlay('lesson');
  let pct = ses.i / ses.queue.length * 100;
  if (ses.mode === 'placement') pct = (ses.stage + (ses.i % 3) / 3) / ses.max * 100;
  el.innerHTML = `<div class="ls-top"><button class="x" aria-label="Salir">✕</button><div class="bar"><i style="width:${pct}%"></i></div>${ses.mode === 'lesson' ? `<div class="hrt">❤️ ${S.hearts}</div>` : ''}</div><div class="ls-body" id="lsb"></div><div class="ls-foot" id="lsf"></div>`;
  $('.x', el).onclick = confirmExit;
  if (ses.phase === 'intro') renderIntro(); else renderQuestion();
}
function renderIntro() {
  $('#lsb').innerHTML = `<div class="intro"><div class="intro-hd">${bit(56)}<span class="tag">Aprende</span></div><h2>${esc(ses.f.l.title)}</h2>${md(ses.f.l.intro, ses.lang)}</div>`;
  $('#lsf').innerHTML = '<button class="btn primary big" id="ig">Entendido</button>';
  $('#ig').onclick = () => { ses.phase = 'q'; renderLesson(); };
}
function confirmExit() {
  const s = sheet(`<h3>¿Seguro que quieres salir?</h3><p>${ses.mode === 'placement' ? 'Perderás el avance de la prueba.' : 'Perderás el progreso de esta lección.'}</p><button class="btn primary big" id="k">Seguir aprendiendo</button><button class="linkbtn" id="q" style="color:var(--red)">Salir</button>`);
  $('#k', s.el).onclick = s.close; $('#q', s.el).onclick = () => { s.close(); closeLesson(); };
}
function closeLesson() { killOverlay('lesson'); ses = null; cur = null; render(); }

/* --- ejercicios --- */
const R = {};
function renderQuestion() {
  const it = ses.queue[ses.i], x = it.x, info = EX[x._id], lang = info ? info.lang : ses.lang;
  $('#lsb').innerHTML = `${it.rev ? '<span class="tag">🔁 Repaso</span>' : ''}${it.retry ? '<span class="tag">↻ Otra vez</span>' : ''}<h2 class="q">${inl(x.q)}</h2><div id="ex"></div>`;
  $('#lsb').scrollTop = 0;
  $('#lsf').className = 'ls-foot';
  $('#lsf').innerHTML = '<button class="btn primary big" id="chk" disabled>Comprobar</button>';
  $('#chk').onclick = onCheck;
  cur = { x, it, lang, locked: false, attempts: 0, update() { const b = $('#chk'); if (b) b.disabled = cur.locked || cur.get() == null; } };
  R[x.k](cur, $('#ex'));
  cur.update();
}
async function onCheck() {
  if (!cur || cur.locked) return;
  const btn = $('#chk'); btn.disabled = true;
  const res = await cur.check();
  if (res.retry) { btn.disabled = false; return; }
  cur.locked = true; if (cur.lock) cur.lock(res.ok);
  feedback(res);
}
const PRAISE = ['¡Correcto!', '¡Genial!', '¡Bien hecho!', '¡Excelente!', '¡Así se hace!'];
function feedback(res) {
  const { x, it } = cur, ok = res.ok, foot = $('#lsf');
  if (res.skip) {
    foot.className = 'ls-foot';
    foot.innerHTML = '<div class="fb-t">Ejercicio omitido</div><div class="fb-e">No cuenta en tu contra. Vuelve a intentarlo con conexión.</div><button class="btn blue big" id="nxt">Continuar</button>';
    ses.queue.splice(ses.i, 1); ses.i--; $('#nxt').onclick = next; return;
  }
  beep(ok ? SND.ok : SND.bad); if (!ok && navigator.vibrate) navigator.vibrate(70);
  if (!it.retry) { updSRS(x._id, ok); S.answered++; if (ok) S.right++; }
  if (ok) { ses.right++; addXP(2); ses.xp += 2; }
  else {
    ses.mistakes++;
    if (ses.mode === 'lesson') loseHeart();
    if (ses.mode !== 'placement' && !it.retry) ses.queue.push({ x, retry: true });
  }
  if (ses.mode === 'placement' && ok) ses.stageRight++;
  save(); renderTop();
  foot.className = 'ls-foot ' + (ok ? 'fbok' : 'fbbad');
  foot.innerHTML = `<div class="fb-t">${ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : 'Respuesta correcta'}</div>${!ok && res.show ? `<div class="fb-a">${res.show}</div>` : ''}<div class="fb-e">${inl(x.e || '')}</div><button class="btn big ${ok ? 'primary' : 'danger'}" id="nxt">Continuar</button>`;
  $('#nxt').onclick = next;
  const hb = $('.hrt'); if (hb) hb.textContent = '❤️ ' + S.hearts;
}
function next() {
  if (ses.mode === 'lesson' && S.hearts <= 0) return noHearts(true);
  ses.i++;
  if (ses.mode === 'placement') {
    if (ses.i % 3 === 0) {
      if (ses.stageRight >= 2) { ses.passed++; flat(ses.lang).filter(f => f.ui === ses.stage && !isDone(f.key)).forEach(f => { S.done[f.key] = { n: 1, s: 2, p: 1 }; }); addXP(15); save(); }
      if (ses.stageRight < 2 || ++ses.stage >= ses.max) return finishPlacement();
      ses.stageRight = 0; ses.queue.push(...placementQs(ses.lang, ses.stage));
    }
    return renderLesson();
  }
  if (ses.i >= ses.queue.length) return ses.mode === 'practice' ? finishPractice() : finishLesson();
  renderLesson();
}
function noHearts(fromLesson) {
  killOverlay('lesson'); ses = null; cur = null;
  const el = overlay('lesson');
  el.innerHTML = `<div class="ls-body center" style="justify-content:center">${bit(110, 'sad')}<h1>¡Te quedaste sin vidas!</h1><p class="muted">Practica para ganar una vida o espera ${fmtMs(nextHeartIn())} para la próxima.</p></div>
  <div class="ls-foot"><button class="btn primary big" id="p" style="margin-bottom:8px">Practicar · +1 ❤️</button><button class="btn big" id="x">Salir</button></div>`;
  $('#p').onclick = () => { killOverlay('lesson'); startPractice(); };
  $('#x').onclick = closeLesson; render();
}

/* --- finales --- */
function resultScreen({ title, sub, stars, extra, xp, goalLine }) {
  const secs = Math.round((Date.now() - ses.start) / 1000), total = ses.right + ses.mistakes;
  const acc = total ? Math.round(ses.right / total * 100) : 100, el = overlay('lesson');
  el.innerHTML = `<div class="ls-body center">${bit(120)}<h1>${title}</h1>${stars ? `<div class="bigstars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` : ''}<p class="muted">${sub || ''}</p>${extra || ''}
  <div class="stats3"><div><small>XP</small><b style="color:var(--orange)">+${xp}</b></div><div><small>PRECISIÓN</small><b style="color:var(--green)">${acc}%</b></div><div><small>TIEMPO</small><b style="color:var(--blue)">${Math.floor(secs / 60)}:${pad(secs % 60)}</b></div></div>${goalLine || ''}</div>
  <div class="ls-foot"><button class="btn primary big" id="done">Continuar</button></div>`;
  $('#done').onclick = closeLesson;
  beep(SND.win, .13); confetti();
}
const goalBar = () => { const t = S.hist[dayStr()] || 0; return `<div style="width:100%;text-align:left"><b>Meta diaria · ${Math.min(t, S.goal)}/${S.goal} XP ${t >= S.goal ? '🎉' : ''}</b><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, t / S.goal * 100)}%;background:var(--blue)"></i></div></div>`; };
function finishLesson() {
  const f = ses.f, wasUnit = f.u.lessons.every(l => isDone(`${ses.lang}.${f.u.id}.${l.id}`));
  const stars = ses.mistakes === 0 ? 3 : ses.mistakes <= 2 ? 2 : 1, prev = S.done[f.key];
  S.done[f.key] = { n: (prev ? prev.n : 0) + 1, s: Math.max(prev ? prev.s : 0, stars) };
  const bonus = ses.mistakes === 0 ? 15 : 10; addXP(bonus); ses.xp += bonus;
  if (!ses.mistakes) S.perfect++;
  bumpStreak(); save();
  const nowUnit = !wasUnit && f.u.lessons.every(l => isDone(`${ses.lang}.${f.u.id}.${l.id}`));
  resultScreen({ title: '¡Lección completada!', sub: esc(f.l.title), stars, xp: ses.xp, goalLine: goalBar(),
    extra: nowUnit ? `<div class="banner">🏆 ¡Unidad ${f.ui + 1} completada!</div>` : (streakNow() > 0 ? `<div class="banner">🔥 Racha de ${streakNow()} día${streakNow() > 1 ? 's' : ''}</div>` : '') });
  checkAch(); renderTop();
}
function finishPractice() {
  S.practices++; gainHeart(); addXP(5); ses.xp += 5; bumpStreak(); save();
  resultScreen({ title: '¡Práctica terminada!', sub: 'Ganaste una vida ❤️', xp: ses.xp, goalLine: goalBar() });
  checkAch(); renderTop();
}
function finishPlacement() {
  const n = ses.passed, ui = Math.min(n, CQ.content[ses.lang].units.length - 1);
  bumpStreak(); save();
  resultScreen({ title: n ? '¡Buen nivel!' : 'Empecemos desde el principio', sub: n ? `Saltaste ${n} unidad${n > 1 ? 'es' : ''}. Empiezas en la unidad ${ui + 1}: ${esc(CQ.content[ses.lang].units[ui].title)}.` : 'No pasa nada: así construyes bases sólidas.', xp: ses.xp + n * 15 });
  checkAch(); renderTop();
}

/* --- renderizadores de ejercicios --- */
R.mc = (c, el) => {
  const x = c.x, tf = x.o.length === 2 && x.o[0] === 'Verdadero';
  const order = tf ? x.o.map((_, i) => i) : shuffle(x.o.map((_, i) => i)); let sel = null;
  el.innerHTML = (x.code ? codeBlock(x.code, c.lang) : '') + `<div class="opts">${order.map((oi, n) => `<button class="opt" data-n="${n}"><span class="k">${n + 1}</span><span>${inl(x.o[oi])}</span></button>`).join('')}</div>`;
  const bs = $$('.opt', el);
  bs.forEach((b, n) => b.onclick = () => { if (c.locked) return; sel = n; bs.forEach(o => o.classList.remove('sel')); b.classList.add('sel'); c.update(); });
  c.get = () => sel;
  c.check = async () => ({ ok: order[sel] === x.a, show: inl(x.o[x.a]) });
  c.lock = () => { bs.forEach((b, n) => { b.disabled = true; if (order[n] === x.a) b.classList.add('right'); else if (n === sel) b.classList.add('wrong'); b.classList.remove('sel'); }); };
};
R.fill = (c, el) => {
  const x = c.x, i = x.code.indexOf('___'), ci = c.lang === 'sql' || c.lang === 'html', w = Math.max(...x.a.map(a => a.length)) + 2;
  el.innerHTML = `<pre class="code">${hl(x.code.slice(0, i), c.lang)}<input class="blank" style="width:${w}ch" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false">${hl(x.code.slice(i + 3), c.lang)}</pre>`;
  const inp = $('input', el); inp.oninput = c.update; setTimeout(() => inp.focus(), 60);
  c.get = () => inp.value.trim() || null;
  c.check = async () => ({ ok: x.a.some(a => normFill(a, ci) === normFill(inp.value, ci)), show: `<code>${esc(x.a[0])}</code>` });
  c.lock = ok => { inp.disabled = true; inp.classList.add(ok ? 'right' : 'wrong'); };
};
R.out = (c, el) => {
  const x = c.x, rows = Math.min(5, Math.max(1, x.a[0].split('\n').length));
  el.innerHTML = codeBlock(x.code, c.lang) + `<textarea class="ans" rows="${rows}" placeholder="Escribe lo que imprime…" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>`;
  const ta = $('textarea', el); ta.oninput = c.update;
  ta.onkeydown = e => { if (e.key === 'Enter' && rows === 1) { e.preventDefault(); const b = $('#chk'); if (b && !b.disabled) b.click(); } };
  c.get = () => ta.value.trim() || null;
  c.check = async () => ({ ok: x.a.some(a => normOut(a) === normOut(ta.value)), show: `<code>${esc(x.a[0]).replace(/\n/g, '<br>')}</code>` });
  c.lock = ok => { ta.readOnly = true; ta.classList.add(ok ? 'right' : 'wrong'); };
};
R.order = (c, el) => {
  const toks = c.x.t; let bank = shuffle(toks.map((_, i) => i)), ans = [];
  if (toks.length > 1 && bank.every((v, i) => toks[v] === toks[i])) bank.reverse();
  const draw = () => {
    el.innerHTML = `<div class="answer">${ans.map(i => `<button class="chipt" data-a="${i}">${esc(toks[i])}</button>`).join('')}</div><div class="bank">${bank.map(i => `<button class="chipt" data-b="${i}">${esc(toks[i])}</button>`).join('')}</div>`;
    if (!c.locked) {
      $$('[data-a]', el).forEach(b => b.onclick = () => { const i = +b.dataset.a; ans = ans.filter(v => v !== i); bank.push(i); draw(); });
      $$('[data-b]', el).forEach(b => b.onclick = () => { const i = +b.dataset.b; bank = bank.filter(v => v !== i); ans.push(i); draw(); });
    }
    c.update();
  };
  c.get = () => ans.length === toks.length ? ans : null;
  c.check = async () => ({ ok: ans.every((v, k) => toks[v] === toks[k]), show: `<code>${esc(toks.join(' '))}</code>` });
  c.lock = () => { draw(); };
  draw();
};
R.pair = (c, el) => {
  const P = c.x.pairs; let L = shuffle(P.map((_, i) => i)), Rr = shuffle(P.map((_, i) => i)), sl = null, sr = null, done = new Set(), wrong = 0;
  const draw = () => {
    el.innerHTML = `<div class="pairs"><div style="display:flex;flex-direction:column;gap:10px">${L.map(i => `<button data-l="${i}" class="${done.has(i) ? 'done' : ''} ${sl === i ? 'sel' : ''}">${inl(P[i][0])}</button>`).join('')}</div><div style="display:flex;flex-direction:column;gap:10px">${Rr.map(i => `<button data-r="${i}" class="${done.has(i) ? 'done' : ''} ${sr === i ? 'sel' : ''}">${inl(P[i][1])}</button>`).join('')}</div></div>`;
    $$('[data-l]', el).forEach(b => b.onclick = () => { sl = +b.dataset.l; tryMatch(); });
    $$('[data-r]', el).forEach(b => b.onclick = () => { sr = +b.dataset.r; tryMatch(); });
  };
  const tryMatch = () => {
    if (sl !== null && sr !== null) {
      if (sl === sr) { done.add(sl); beep([784], .08); } else {
        wrong++; beep([200], .1); const a = sl, b = sr; sl = sr = null; draw();
        $$(`[data-l="${a}"],[data-r="${b}"]`, el).forEach(e => e.classList.add('shake')); return;
      }
      sl = sr = null;
    }
    draw(); c.update();
    if (done.size === P.length) setTimeout(() => { if (!c.locked) onCheck(); }, 350);
  };
  c.get = () => done.size === P.length ? true : null;
  c.check = async () => ({ ok: wrong <= 2, show: '' });
  draw();
};
R.run = (c, el) => {
  const x = c.x, lang = c.lang, ta0 = x.starter, indent = lang === 'python' ? '    ' : '  ';
  const keys = lang === 'python' ? ['⇥', '(', ')', '[', ']', '{', '}', '"', "'", ':', '=', '_', ',', '.'] : ['⇥', '(', ')', '[', ']', '{', '}', '"', "'", '`', ';', '=', '>', ',', '.'];
  el.innerHTML = `<textarea class="editor" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(ta0)}</textarea><div class="keys">${keys.map(k => `<button type="button">${esc(k)}</button>`).join('')}</div><div class="results" id="res"></div><button class="linkbtn" id="gu" hidden>Ver solución</button>`;
  const ta = $('textarea', el), resEl = $('#res', el), gu = $('#gu', el); let giveUp = false;
  const ins = t => { const s = ta.selectionStart, e = ta.selectionEnd; ta.setRangeText(t, s, e, 'end'); ta.focus(); c.update(); };
  $$('.keys button', el).forEach(b => b.onclick = () => ins(b.textContent === '⇥' ? indent : b.textContent));
  ta.oninput = c.update;
  ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); ins(indent); } };
  gu.onclick = () => { giveUp = true; onCheck(); };
  c.get = () => ta.value.trim() !== ta0.trim() ? ta.value : null;
  c.check = async () => {
    if (giveUp) return { ok: false, show: codeBlock(x.sol, lang) };
    c.attempts++;
    resEl.innerHTML = `<div class="runmsg">${CQ.content[lang].runner === 'python' && !pyP ? 'Cargando Python (solo la primera vez, ~10 MB)…' : 'Ejecutando…'}</div>`;
    const r = await runCode(lang, ta.value, x.tests);
    if (r.noengine) {
      resEl.innerHTML = '<pre class="err">No se pudo cargar el motor de ejecución (¿sin conexión?).</pre><button class="linkbtn" id="sk">Omitir este ejercicio</button>';
      $('#sk', el).onclick = () => { c.locked = true; feedback({ skip: true }); };
      return { retry: true };
    }
    if (r.error) { resEl.innerHTML = `<pre class="err">${esc(r.error)}</pre>`; }
    else {
      const rows = r.res.map(t => ({ ...t, pass: !t.err && sameJSON(t.g, t.x) }));
      resEl.innerHTML = rows.map(t => `<div class="t ${t.pass ? 'ok' : 'no'}"><span>${t.pass ? '✓' : '✗'}</span><span>${esc(t.e)} ${t.pass ? '→ ' + esc(t.g) : t.err ? '→ ' + esc(t.err) : '→ ' + esc(t.g) + ' (esperado ' + esc(t.x) + ')'}</span></div>`).join('');
      if (rows.every(t => t.pass)) return { ok: true };
    }
    if (c.attempts >= 3) return { ok: false, show: codeBlock(x.sol, lang) };
    gu.hidden = false; resEl.insertAdjacentHTML('beforeend', `<div class="runmsg">Inténtalo de nuevo (${c.attempts}/3).</div>`);
    return { retry: true };
  };
  c.lock = () => { ta.readOnly = true; gu.hidden = true; };
};

/* ---------- teclado global ---------- */
document.addEventListener('keydown', e => {
  if (!ses || !$('#lesson')) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    const t = e.target; if (t.tagName === 'TEXTAREA' && (t.classList.contains('editor') || t.rows > 1)) return;
    if (t.tagName === 'BUTTON' && !t.classList.contains('opt')) return;
    const b = $('#nxt') || ($('#chk') && !$('#chk').disabled ? $('#chk') : null) || $('#ig');
    if (b) { e.preventDefault(); b.click(); }
  } else if (/^[1-4]$/.test(e.key) && cur && cur.x && cur.x.k === 'mc' && !cur.locked && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
    const o = $$('.opt')[+e.key - 1]; if (o) o.click();
  }
});

/* ---------- arranque ---------- */
function boot() {
  applyTheme();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* sin SW */ });
  if (!S.lang || !CQ.content[S.lang]) { render(); if (!S.seen) openWelcome(); else openPicker(true); }
  else render();
  setInterval(() => { if (!$('#lesson') && S.hearts < MAXH) renderTop(); }, 30000);
  window.CodeQuest = { get S() { return S; }, CQ, EX, flat, startLesson, startPractice, startPlacement, render, renderLesson, get ses() { return ses; }, get cur() { return cur; } };
}
boot();
})();
