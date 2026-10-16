'use strict';
/* =====================================================================
   ui.js — components, report builder, tool registry, app shell
   ===================================================================== */

/* ---------- DOM helper ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    e.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return e;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- storage (safe) ---------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem('ee2211:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ee2211:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  clearAll() { try { Object.keys(localStorage).filter(k => k.startsWith('ee2211:')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ } },
};

/* ---------- text → matrix parsing ---------- */
function parseMatrixText(txt) {
  let s = String(txt).trim();
  if (!s) return null;
  s = s.replace(/np\.array\s*\(/g, '').replace(/array\s*\(/g, '');
  let rows;
  if (/\[\s*\[/.test(s)) {
    rows = [...s.matchAll(/\[([^\[\]]*)\]/g)].map(m => m[1]);
  } else {
    s = s.replace(/^[\[(]+|[\])]+\)?$/g, '');
    rows = s.split(/;|\n/);
  }
  rows = rows.map(r => r.trim()).filter(r => r.length);
  const M = rows.map(r => r.split(/[,\s\t]+/).map(c => c.trim()).filter(c => c.length));
  const n = Math.max(...M.map(r => r.length));
  return M.map(r => { while (r.length < n) r.push('0'); return r; });
}
function parseCell(s, allowNA) {
  const t = String(s).trim();
  if (allowNA && (t === '' || /^(na|nan|null|none|\?)$/i.test(t))) return NaN;
  if (t === '') throw new UserError('empty cell');
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return parseFloat(t);
  return EX.constVal(t);
}
function parseList(s, { allowEmpty = false } = {}) {
  const parts = String(s).replace(/[\[\]{}()]/g, ' ').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
  if (!parts.length && !allowEmpty) throw new UserError('empty list');
  return parts.map(p => parseCell(p));
}
function parseLabels(s) {
  return String(s).replace(/[\[\]{}]/g, ' ').split(/[,;\n]+|\s+/).map(x => x.trim()).filter(Boolean);
}

/* ---------- Matrix editor ---------- */
class MatEditor {
  constructor(spec, raw, onRows) {
    this.spec = spec;
    this.isVec = spec.type === 'vector';
    this.onRows = onRows;
    this.el = h('div', { class: 'mated' + (this.isVec ? ' vec' : '') });
    this.set(raw || this.defRaw());
  }
  defRaw() {
    const d = this.spec.def;
    if (d == null) return this.isVec ? [['0'], ['0']] : [['0', '0'], ['0', '0']];
    if (this.isVec) return d.map(x => [String(x)]);
    return d.map(r => r.map(String));
  }
  set(raw) {
    if (this.isVec) raw = raw.map(r => [Array.isArray(r) ? r[0] ?? '0' : String(r)]);
    this.raw = raw.map(r => r.slice());
    this.render();
  }
  rows() { return this.raw.length; }
  setBias(b) { if (this.isVec || !!b === !!this.biasShown) return; this.sync(); this.biasShown = !!b; this.render(); }
  sync() {
    this.el.querySelectorAll('input.cell:not(.lock)').forEach(inp => { this.raw[+inp.dataset.i][+inp.dataset.j] = inp.value; });
  }
  resize(m, n) {
    this.sync();
    m = Math.max(1, m); n = this.isVec ? 1 : Math.max(1, n);
    const R = [];
    for (let i = 0; i < m; i++) { R.push([]); for (let j = 0; j < n; j++) R[i].push(this.raw[i] && this.raw[i][j] != null ? this.raw[i][j] : '0'); }
    this.raw = R;
    this.render();
  }
  addRow(notify = true) { this.resize(this.raw.length + 1, this.raw[0].length); if (notify && this.onRows) this.onRows(this.raw.length); }
  delRow(notify = true) { if (this.raw.length > 1) this.resize(this.raw.length - 1, this.raw[0].length); if (notify && this.onRows) this.onRows(this.raw.length); }
  setRows(m) { if (m !== this.raw.length) this.resize(m, this.raw[0].length); }
  render() {
    const s = this.spec, m = this.raw.length, n = this.raw[0].length;
    const btn = (label, title, fn, cls) => h('button', { class: 'mini' + (cls ? ' ' + cls : ''), title, type: 'button', onclick: e => { e.preventDefault(); fn(); } }, label);
    const tools = h('div', { class: 'medtools' },
      btn('+행', 'Add row (행 추가)', () => this.addRow()),
      btn('−행', 'Remove row (행 삭제)', () => this.delRow()),
      !this.isVec && btn('+열', 'Add column (열 추가)', () => this.resize(m, n + 1)),
      !this.isVec && btn('−열', 'Remove column (열 삭제)', () => n > 1 && this.resize(m, n - 1)),
      !this.isVec && btn('ᵀ', 'Transpose (전치)', () => { this.sync(); this.raw = this.raw[0].map((_, j) => this.raw.map(r => r[j])); this.render(); if (this.onRows) this.onRows(this.raw.length); }),
      !this.isVec && btn('I', 'Identity of current row count (단위행렬)', () => { const k = this.raw.length; this.raw = LA.eye(k).map(r => r.map(String)); this.render(); }),
      btn('0', 'Clear to zeros (초기화)', () => { this.raw = this.raw.map(r => r.map(() => '0')); this.render(); }),
      btn('paste', 'Paste / type as text: "1 2; 3 4" or [[1,2],[3,4]] or rows on new lines', () => this.togglePaste()),
    );
    const grid = h('table', { class: 'grid' });
    for (let i = 0; i < m; i++) {
      const tr = h('tr', null, h('td', { class: 'rix' }, String(i + 1)));
      if (this.biasShown) tr.appendChild(h('td', null, h('input', { class: 'cell lock', value: '1', readonly: true, tabindex: '-1', title: 'bias 열 — 자동으로 들어가, 수정 불가 (add bias 해제하면 사라짐)' })));
      for (let j = 0; j < n; j++) {
        const inp = h('input', { class: 'cell', value: this.raw[i][j], 'data-i': i, 'data-j': j, spellcheck: 'false', autocomplete: 'off' });
        inp.addEventListener('input', () => { this.raw[i][j] = inp.value; });
        inp.addEventListener('keydown', e => this.cellKey(e, i, j));
        inp.addEventListener('paste', e => this.cellPaste(e, i, j));
        inp.addEventListener('focus', () => inp.select());
        tr.appendChild(h('td', null, inp));
      }
      grid.appendChild(tr);
    }
    if ((s.colLabels || this.biasShown) && !this.isVec) {
      const head = h('tr', null, h('td'));
      if (this.biasShown) head.appendChild(h('td', { class: 'clab lockl' }, '1 (bias)'));
      for (let j = 0; j < n; j++) head.appendChild(h('td', { class: 'clab' }, !s.colLabels ? '' : typeof s.colLabels === 'function' ? s.colLabels(j) : (s.colLabels[j] || '')));
      grid.insertBefore(head, grid.firstChild);
    }
    this.pasteBox = h('div', { class: 'pastebox hidden' },
      h('textarea', { rows: 3, placeholder: 'for example:\n1 2 3\n4 5 6\nor [[1,2,3],[4,5,6]]  or  [1 2 3; 4 5 6]' }),
      h('div', null,
        btn('Apply (적용)', 'Apply', () => this.applyPaste(), 'primary'),
        btn('Cancel', 'Cancel', () => this.togglePaste())));
    this.el.replaceChildren(...[
      h('div', { class: 'medhead' },
        h('span', { class: 'medlabel', html: s.label || s.k }),
        h('span', { class: 'dims' }, this.isVec ? `${m} × 1` : `${m} × ${n}`),
        this.biasShown ? h('span', { class: 'biasnote' }, `+ bias 1 열 → 실제 계산은 ${m} × ${n + 1} · 회색 1 열 수정 불가`) : null),
      s.hint ? h('div', { class: 'medhint', html: s.hint }) : null,
      tools, this.pasteBox, h('div', { class: 'gridwrap' + (this.isVec ? '' : ' brk') }, grid)].filter(Boolean));
  }
  togglePaste() {
    this.pasteBox.classList.toggle('hidden');
    if (!this.pasteBox.classList.contains('hidden')) {
      const ta = this.pasteBox.querySelector('textarea');
      this.sync();
      ta.value = this.raw.map(r => r.join(' ')).join('\n');
      ta.focus(); ta.select();
    }
  }
  applyPaste() {
    const M = parseMatrixText(this.pasteBox.querySelector('textarea').value);
    if (!M || !M.length) return;
    this.raw = this.isVec ? M.flat().map(x => [x]) : M;
    this.render();
    if (this.onRows) this.onRows(this.raw.length);
  }
  cellPaste(e, i, j) {
    const txt = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\s,;\[\]]/.test(txt.trim())) return; // single value → normal paste
    e.preventDefault();
    let M = parseMatrixText(txt);
    if (!M) return;
    if (this.isVec) M = M.flat().map(x => [x]);
    this.sync();
    if (i === 0 && j === 0) { // paste at top-left → replace the whole matrix
      this.raw = M;
      this.render();
      if (this.onRows) this.onRows(this.raw.length);
      return;
    }
    const needM = i + M.length, needN = this.isVec ? 1 : j + M[0].length;
    this.resize(Math.max(needM, this.raw.length), Math.max(needN, this.raw[0].length));
    M.forEach((r, a) => r.forEach((x, b) => { if (!this.isVec || b === 0) this.raw[i + a][this.isVec ? 0 : j + b] = x; }));
    this.render();
    if (this.onRows) this.onRows(this.raw.length);
  }
  cellKey(e, i, j) {
    const m = this.raw.length, n = this.raw[0].length;
    const focus = (a, b) => { const c = this.el.querySelector(`input.cell[data-i="${a}"][data-j="${b}"]`); if (c) c.focus(); };
    if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (i + 1 >= m) { this.addRow(); focus(i + 1, j); } else focus(i + 1, j);
    } else if (e.key === 'ArrowDown') { e.preventDefault(); focus(Math.min(m - 1, i + 1), j); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focus(Math.max(0, i - 1), j); }
    else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) { if (j + 1 < n) { e.preventDefault(); focus(i, j + 1); } }
    else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) { if (j > 0) { e.preventDefault(); focus(i, j - 1); } }
  }
  value() {
    this.sync();
    const name = (this.spec.sym || this.spec.k);
    const M = this.raw.map((r, i) => r.map((c, j) => {
      try { return parseCell(c, this.spec.allowNA); } catch (err) {
        throw new UserError(`${name}: cell (row ${i + 1}, col ${j + 1}) = "${c}" is not a number`);
      }
    }));
    return this.isVec ? M.map(r => r[0]) : M;
  }
}

/* ---------- report builder ---------- */
const SECTIONS = [
  ['raw', ''],
  ['detect', 'Detected task'],
  ['given', '1. WHAT IS GIVEN?'],
  ['find', '2. WHAT ARE WE FINDING?'],
  ['formula', '3. WHICH FORMULA APPLIES?'],
  ['work', '4. SUBSTITUTE THE VALUES / STEPS'],
  ['answer', '5. FINAL ANSWER'],
  ['check', '6. CHECK / VERIFICATION'],
  ['parts', ''],
];
function isMat(v) { return Array.isArray(v) && v.length && Array.isArray(v[0]); }
function pyNum(x) {
  if (Number.isNaN(x)) return 'np.nan';
  if (Number.isInteger(x)) return String(x);
  return String(+x.toPrecision(10));
}
function pyArr(v) {
  if (isMat(v)) return `np.array([${v.map(r => '[' + r.map(pyNum).join(', ') + ']').join(', ')}])`;
  if (Array.isArray(v)) return `np.array([${v.map(pyNum).join(', ')}])`;
  return pyNum(v);
}
function matText(v) {
  if (isMat(v)) return '[' + v.map(r => '[' + r.map(x => fmtNum(x)).join(', ') + ']').join(',\n ') + ']';
  if (Array.isArray(v)) return '[' + v.map(x => fmtNum(x)).join(', ') + ']ᵀ';
  if (typeof v === 'number') return fmtNum(v);
  return String(v);
}
function copyText(t, btn) {
  const done = () => { if (btn) { const o = btn.textContent; btn.textContent = '✓'; setTimeout(() => (btn.textContent = o), 900); } };
  try { navigator.clipboard.writeText(t).then(done, () => fallback()); } catch (e) { fallback(); }
  function fallback() { const ta = h('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* */ } ta.remove(); done(); }
}

function renderVal(v, o = {}) {
  if (v == null) return h('span', null, '—');
  if (v instanceof Node) return v;
  if (typeof v === 'object' && v.html != null) return h('span', { html: v.html });
  if (typeof v === 'object' && v.expr) return h('code', { class: 'expr' }, EX.str(v.expr));
  if (isMat(v) || (Array.isArray(v) && typeof v[0] === 'number')) {
    const M = isMat(v) ? v : v.map(x => [x]);
    const t = h('table', { class: 'mtab' });
    const hl = o.hl || (() => false);
    if (o.colLabels) t.appendChild(h('tr', { class: 'clabs' }, ...M[0].map((_, j) => h('td', null, o.colLabels[j] ?? ''))));
    M.forEach((r, i) => t.appendChild(h('tr', null, ...r.map((x, j) => h('td', { class: hl(i, j) ? 'hl' : null }, fmtNum(x))))));
    const wrap = h('span', { class: 'matwrap' },
      o.rowLabels ? h('table', { class: 'rlabs' }, ...(o.colLabels ? [h('tr', null, h('td', null, ''))] : []), ...o.rowLabels.map(l => h('tr', null, h('td', null, l)))) : null,
      h('span', { class: 'mat' }, t),
      o.dims !== false ? h('span', { class: 'mdims' }, `${M.length}×${M[0].length}`) : null,
      h('button', { class: 'copyb', title: 'Copy as numpy array', onclick: e => copyText(pyArr(v), e.target) }, 'copy'));
    return wrap;
  }
  if (Array.isArray(v)) return h('span', null, v.join(', '));
  if (typeof v === 'number') return h('span', { class: 'num' }, fmtNum(v));
  return h('span', { html: String(v) });
}

class Report {
  constructor() { this.parts = {}; SECTIONS.forEach(([k]) => (this.parts[k] = [])); this.codeStr = null; this.extra = []; }
  _push(sec, node) { this.parts[sec].push(node); return this; }
  detect(txt) { return this._push('detect', h('div', { class: 'detect', html: txt })); }
  given(label, val, o) { return this._push('given', this.row(label, val, o)); }
  find(txt) { return this._push('find', h('div', { class: 'find', html: txt })); }
  formula(txt, note) { return this._push('formula', h('div', { class: 'formula' }, h('span', { html: txt }), note ? h('span', { class: 'fnote', html: note }) : null)); }
  step(label, val, o) { return this._push('work', this.row(label, val, o)); }
  /* a merged page: run another solver into its own sub-report and show it as one titled block */
  part(title, fn) {
    const r = new Report();
    try { fn(r); } catch (err) {
      if (!(err instanceof UserError)) throw err;
      r.note('Cannot compute: ' + esc(err.message), 'err', 'answer');
    }
    return this._push('parts', h('section', { class: 'part' }, h('h2', { class: 'parth', html: title }), r.render(false, ['given', 'find'])));
  }
  raw(html) { return this._push('raw', h('div', { class: 'rawbox', html })); }
  text(html, sec = 'work') { return this._push(sec, h('div', { class: 'txt', html })); }
  note(html, kind = 'info', sec = 'work') { return this._push(sec, h('div', { class: 'note ' + kind, html })); }
  table(headers, rows, sec = 'work', o = {}) {
    const t = h('table', { class: 'rtable' + (o.cls ? ' ' + o.cls : '') },
      h('tr', null, ...headers.map(x => h('th', { html: x }))),
      ...rows.map(r => h('tr', { class: r.cls || null }, ...(r.cells || r).map(c => h('td', null, typeof c === 'number' ? fmtNum(c) : c instanceof Node ? c : h('span', { html: String(c) }))))));
    return this._push(sec, h('div', { class: 'tscroll' }, t));
  }
  answer(label, val, o = {}) {
    if (o.sub === undefined && typeof val === 'number' && !Fmt.frac && isFinite(val)) {
      const f = fracOf(val, 1000);
      if (f && f[1] !== 1) o = { ...o, sub: `= ${f[0]}/${f[1]}  (fraction)` };
    }
    const txt = o.copy ?? (typeof val === 'number' ? fmtNum(val) : isMat(val) || Array.isArray(val) ? matText(val) : String(val).replace(/<[^>]+>/g, ''));
    return this._push('answer', h('div', { class: 'ans' },
      h('div', { class: 'anslabel', html: label }),
      h('div', { class: 'ansval' }, renderVal(val, o)),
      o.sub ? h('div', { class: 'anssub', html: o.sub }) : null,
      h('button', { class: 'copyb vis', title: 'Copy answer', onclick: e => copyText(txt, e.target) }, 'copy')));
  }
  check(label, val, o) { return this._push('check', this.row(label, val, o)); }
  /* "question wording → value" table. rows: { q: wording(s), ko: 뜻, f: formula, v: number | html, star } */
  terms(rows, title = '문제에서 이렇게 물으면 → 이 값을 쓰세요 (question wording → value)') {
    const exact = x => (typeof exactForm === 'function' ? exactForm(x) : (f => (f && f[1] !== 1 ? `${f[0]}/${f[1]}` : ''))(fracOf(x, 1000)));
    return this._push('answer', h('div', { class: 'terms' }, h('div', { class: 'termshead', html: title }),
      ...rows.filter(Boolean).map(r => {
        const isNum = typeof r.v === 'number';
        const txt = isNum ? fmtNum(r.v) : String(r.v);
        const ex = isNum && isFinite(r.v) && !Number.isInteger(r.v) ? exact(r.v) : '';
        return h('div', { class: 'term' + (r.star ? ' star' : '') },
          h('div', { class: 'tq' }, h('div', { class: 'tqw', html: r.q }), r.ko ? h('div', { class: 'tko', html: r.ko }) : null, r.f ? h('div', { class: 'tf', html: r.f }) : null),
          h('div', { class: 'tv' }, h('span', { class: 'tvn', html: isNum ? esc(txt) : txt }), ex ? h('span', { class: 'tvf' }, '= ' + ex) : null,
            h('button', { class: 'copyb vis', onclick: e => copyText(isNum ? txt : txt.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ''), e.target) }, 'copy')));
      })));
  }
  code(py) { this.codeStr = py; return this; }
  row(label, val, o = {}) {
    return h('div', { class: 'rrow' + (o.cls ? ' ' + o.cls : '') },
      h('span', { class: 'rlabel', html: label + (val !== undefined ? ' =' : '') }),
      val !== undefined ? renderVal(val, o) : null,
      o.note ? h('span', { class: 'rnote', html: o.note }) : null);
  }
  render(codeOpen, skip = []) {
    const out = h('div', { class: 'report' });
    for (const [k, title] of SECTIONS) {
      if (!this.parts[k].length || skip.includes(k)) continue;
      out.appendChild(h('section', { class: 'rsec sec-' + k }, title ? h('h3', null, title) : null, ...this.parts[k]));
    }
    if (this.codeStr) {
      const pre = h('pre', { class: 'code' }, this.codeStr);
      out.appendChild(h('details', { class: 'codebox', open: codeOpen || null },
        h('summary', null, 'Python code (numpy)',
          h('button', { class: 'copyb vis', onclick: e => { e.preventDefault(); copyText(this.codeStr, e.target); } }, 'copy code')),
        pre));
    }
    return out;
  }
}

/* ---------- registry ---------- */
const CATS = [
  ['slides', '', 'Concepts — Slide Finder · Glossary (개념 · 용어 사전)'],
  ['basic', '', 'Calculator · Solve · 연립방정식'],
  ['smart', '', 'Smart Solve (자동 판별)'],
  ['matrix', '', 'Matrix & Vector 연산'],
  ['detfam', '', 'Determinant · Minor · Cofactor · Adjugate · Inverse'],
  ['diag', '', 'Rank · Invertibility · Independence'],
  ['system', '', 'Linear System Xw = y · Pseudoinverse'],
  ['calc', '', 'Functions · Derivative · Gradient · Minimum / Maximum'],
  ['linreg', '', 'Linear Regression (Train · Predict · Loss · J(w))'],
  ['class', '', 'Classification (Binary · One-hot · Multi-class)'],
  ['ridge', '', 'Ridge Regression (Primal · Dual)'],
  ['poly', '', 'Polynomial Regression / Classification'],
  ['stats', '', 'Statistics · Correlation r · Normalization'],
  ['prob', '', 'Probability — Probability Mass Function (PMF) · Probability Density Function (PDF) · Bayes · Gaussian'],
  ['data', '', 'Data Types — Nominal / Ordinal / Interval / Ratio (NOIR) · Machine Learning (ML) Concepts'],
  ['code', '', 'Python Code Generator'],
];
const TOOLS = [];
const TOOL_BY_ID = {};
function tool(def) { TOOLS.push(def); TOOL_BY_ID[def.id] = def; }

/* ---------- App ---------- */
const App = {
  cur: null, editors: {}, inputs: {},
  init() {
    const s = Store.get('settings', {});
    Fmt.dec = Math.max(5, s.dec ?? 6); Fmt.frac = !!s.frac;
    document.documentElement.dataset.theme = s.theme || '';
    this.buildShell();
    this.buildTree();
    window.addEventListener('hashchange', () => this.route());
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); this.search.focus(); this.search.select(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this.solve(); }
    });
    this.route();
  },
  saveSettings() { Store.set('settings', { dec: Fmt.dec, frac: Fmt.frac, theme: document.documentElement.dataset.theme }); },
  buildShell() {
    const decSel = h('select', { title: 'Decimal places (소수점 자리)', onchange: e => { Fmt.dec = +e.target.value; this.saveSettings(); this.solve(true); } },
      ...[5, 6, 8, 10].map(d => h('option', { value: d, selected: d === Fmt.dec || null }, `${d} decimal places`)));
    const fracChk = h('input', { type: 'checkbox', checked: Fmt.frac || null, onchange: e => { Fmt.frac = e.target.checked; this.saveSettings(); this.solve(true); } });
    this.search = h('input', { class: 'search', type: 'search', placeholder: 'Search solver…  (for example: rank, inverse, ridge, probability mass function, bayes, 역행렬)  [ / ]' });
    this.search.addEventListener('input', () => this.filterTree(this.search.value));
    this.search.addEventListener('keydown', e => {
      if (e.key === 'Enter') { // prefer a real solver over the glossary / slide finder, which match almost every word
        const vis = [...this.tree.querySelectorAll('.tlink:not(.hidden)')];
        const q = this.search.value.trim().toLowerCase(), named = a => (TOOL_BY_ID[a.dataset.id].name + ' ' + (TOOL_BY_ID[a.dataset.id].short || '')).toLowerCase().includes(q);
        const first = vis.find(named) || vis.find(a => TOOL_BY_ID[a.dataset.id].cat !== 'slides') || vis[0];
        if (first) { location.hash = first.dataset.id; this.search.blur(); }
      }
      if (e.key === 'Escape') { this.search.value = ''; this.filterTree(''); }
    });
    this.tree = h('nav', { class: 'tree' });
    this.main = h('main', { class: 'main' });
    const side = h('aside', { class: 'side' },
      h('div', { class: 'brand' }, h('a', { href: '#' }, 'EE2211 Solver'), h('span', { class: 'sub' }, 'Lecture 1–6 · Midterm')),
      this.search,
      h('div', { class: 'treebtns' },
        h('button', { class: 'mini', onclick: () => this.expandAll(true) }, 'expand all'),
        h('button', { class: 'mini', onclick: () => this.expandAll(false) }, 'collapse all')),
      this.tree);
    const top = h('header', { class: 'top' },
      h('button', { class: 'mini menu', onclick: () => document.body.classList.toggle('sideopen') }, 'menu'),
      h('a', { href: '#', class: 'homelink' }, 'Home'),
      h('a', { href: '#smart', class: 'quick' }, '한 번에 다 (Smart Solve)'),
      h('a', { href: '#slides', class: 'quick' }, 'Slide Finder 슬라이드'),
      h('a', { href: '#glossary', class: 'quick' }, 'Glossary 용어'),
      h('a', { href: '#calc', class: 'quick' }, 'Calculator'),
      h('a', { href: '#eqsolve', class: 'quick' }, 'Solve'),
      h('a', { href: '#eqsystem', class: 'quick' }, '연립방정식'),
      h('span', { class: 'spacer' }),
      h('label', { class: 'set' }, 'Precision ', decSel),
      h('label', { class: 'set' }, fracChk, ' fractions'),
      h('button', { class: 'mini', title: 'Toggle dark mode', onclick: () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; this.saveSettings(); } }, 'dark'),
      h('button', { class: 'mini', title: 'Clear all saved inputs', onclick: () => { if (confirm('Clear all saved inputs?')) { Store.clearAll(); location.reload(); } } }, 'reset'));
    document.body.replaceChildren(side, h('div', { class: 'right' }, top, this.main));
  },
  buildTree() {
    const open = Store.get('open', {});
    this.tree.replaceChildren();
    for (const [cid, icon, name] of CATS) {
      const list = TOOLS.filter(t => t.cat === cid && !t.alias);
      if (!list.length) continue;
      const det = h('details', { class: 'tcat', 'data-cat': cid, open: open[cid] || null });
      det.addEventListener('toggle', () => { const o = Store.get('open', {}); o[cid] = det.open; Store.set('open', o); });
      det.appendChild(h('summary', null, icon ? h('span', { class: 'ticon' }, icon) : null, h('span', null, name), h('span', { class: 'tcount' }, String(list.length))));
      let curSub = null, subBox = det;
      for (const t of list) {
        if (t.sub && t.sub !== curSub) {
          curSub = t.sub;
          subBox = h('details', { class: 'tsub', open: true }, h('summary', null, t.sub));
          det.appendChild(subBox);
        } else if (!t.sub && curSub) { curSub = null; subBox = det; }
        subBox.appendChild(h('a', { class: 'tlink', href: '#' + t.id, 'data-id': t.id }, t.name));
      }
      this.tree.appendChild(det);
    }
  },
  expandAll(v) { this.tree.querySelectorAll('details').forEach(d => (d.open = v)); },
  filterTree(q) {
    q = q.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const links = [...this.tree.querySelectorAll('.tlink')];
    const hayOf = (t, withCat) => (t.name + ' ' + (t.short || '') + ' ' + (t.kw || '') + (withCat ? ' ' + (t.desc || '') + ' ' + CATS.find(c => c[0] === t.cat)[2] + ' ' + (typeof GUIDE !== 'undefined' && GUIDE[t.id] ? GUIDE[t.id].flat().join(' ').replace(/<[^>]+>/g, '') : '') : '')).toLowerCase();
    const match = withCat => links.filter(a => terms.every(w => hayOf(TOOL_BY_ID[a.dataset.id], withCat).includes(w)));
    let hits = terms.length ? match(false) : links;
    if (!hits.length) hits = match(true);
    links.forEach(a => a.classList.toggle('hidden', !hits.includes(a)));
    this.tree.querySelectorAll('details').forEach(d => {
      const any = d.querySelector('.tlink:not(.hidden)');
      d.classList.toggle('hidden', !any);
      if (terms.length) d.open = !!any;
    });
  },
  route() {
    const id = decodeURIComponent(location.hash.slice(1));
    document.body.classList.remove('sideopen');
    this.tree.querySelectorAll('.tlink').forEach(a => a.classList.toggle('active', a.dataset.id === id));
    if (id && TOOL_BY_ID[id] && TOOL_BY_ID[id].alias) { location.replace('#' + TOOL_BY_ID[id].alias); return; }
    if (id && TOOL_BY_ID[id]) this.openTool(TOOL_BY_ID[id]);
    else this.home();
  },
  home() {
    this.cur = null;
    const cards = CATS.map(([cid, icon, name]) => {
      const list = TOOLS.filter(t => t.cat === cid && !t.hideHome && !t.alias);
      if (!list.length) return null;
      return h('div', { class: 'card' }, h('h4', null, name),
        h('div', { class: 'chips' }, ...list.map(t => h('a', { class: 'chip', href: '#' + t.id }, t.short || t.name))));
    });
    this.main.replaceChildren(
      h('div', { class: 'hero' },
        h('h1', null, 'EE2211 Solver'),
        h('p', null, 'Lecture 1–6 전 범위 계산기. 왼쪽 트리(토글)에서 고르거나, 검색창에 입력하세요 — ', h('kbd', null, '/'), ' 로 검색, ', h('kbd', null, 'Control (Ctrl) / Command (⌘) + Enter'), ' 로 Solve.'),
        h('p', { class: 'muted' }, '모든 결과: 1 Given → 2 Finding → 3 Formula → 4 Steps → 5 Final Answer → 6 Check, + Python 코드. 행렬 칸에 엑셀/텍스트를 그대로 붙여넣기(paste) 가능.')),
      h('div', { class: 'cards' }, ...cards));
  },
  openTool(t) {
    this.cur = t;
    this.editors = {}; this.inputs = {};
    const saved = Store.get('tool:' + t.id, null);
    const form = h('div', { class: 'form' });
    const groups = {};
    for (const spec of t.inputs || []) {
      const raw = saved && saved[spec.k] !== undefined ? saved[spec.k] : undefined;
      const node = this.makeInput(spec, raw);
      const gid = spec.group || '_' + spec.k;
      if (!groups[gid]) { groups[gid] = h('div', { class: 'igroup' + (spec.wide ? ' wide' : '') }); form.appendChild(groups[gid]); }
      groups[gid].appendChild(node);
    }
    this.resultBox = h('div', { class: 'result' });
    const cat = CATS.find(c => c[0] === t.cat);
    this.main.replaceChildren(
      h('div', { class: 'thead' },
        h('div', { class: 'crumb' }, cat[2] + (t.sub ? ' › ' + t.sub : '')),
        h('h2', null, t.name),
        t.desc ? h('p', { class: 'desc', html: t.desc }) : null,
        typeof guideBox === 'function' ? guideBox(t.id) : null),
      form,
      h('div', { class: 'actions' },
        h('button', { class: 'solve', onclick: () => this.solve() }, t.solveLabel || 'Solve'),
        h('button', { class: 'mini', onclick: () => { Store.set('tool:' + t.id, null); this.openTool(t); } }, 'Load example (예제)'),
        h('span', { class: 'muted small' }, 'Control (Ctrl) / Command (⌘) + Enter')),
      this.resultBox);
    for (const spec of t.inputs || []) if (spec.colsFrom && this.editors[spec.colsFrom] && this.editors[spec.k]) this.editors[spec.k].setCols(this.editors[spec.colsFrom].d);
    this.applyShowIf();
    this.solve(true);
    this.main.scrollTop = 0;
    window.scrollTo(0, 0);
  },
  makeInput(spec, raw) {
    const wrap = h('div', { class: 'inp inp-' + spec.type, 'data-k': spec.k });
    if (spec.type === 'form') {
      const ed = new FormEditor(spec, raw, d => this.linkCols(spec.k, d));
      this.editors[spec.k] = ed;
      wrap.appendChild(ed.el);
      return wrap;
    }
    if (spec.type === 'matrix' || spec.type === 'vector') {
      const ed = new MatEditor(spec, raw, rows => this.linkRows(spec.k, rows));
      this.editors[spec.k] = ed;
      wrap.appendChild(ed.el);
      return wrap;
    }
    const label = h('label', { class: 'ilabel', html: spec.label || spec.k });
    let ctl;
    const def = raw !== undefined ? raw : spec.def;
    if (spec.type === 'select') {
      ctl = h('select', null, ...spec.options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(def) || null }, l)));
      ctl.addEventListener('change', () => this.applyShowIf());
    } else if (spec.type === 'check') {
      ctl = h('input', { type: 'checkbox', checked: def ? true : null });
      ctl.addEventListener('change', () => this.applyShowIf());
      wrap.appendChild(h('label', { class: 'chk' }, ctl, h('span', { html: spec.label })));
      if (spec.hint) wrap.appendChild(h('div', { class: 'ihint', html: spec.hint }));
      this.inputs[spec.k] = { spec, ctl };
      return wrap;
    } else if (spec.type === 'textarea' || spec.type === 'exprs') {
      ctl = h('textarea', { rows: spec.rows || 4, spellcheck: 'false', placeholder: spec.ph || '' });
      ctl.value = def ?? '';
    } else {
      ctl = h('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', placeholder: spec.ph || '', class: spec.type === 'expr' || spec.type === 'exprs' ? 'mono' : null });
      ctl.value = def ?? '';
      ctl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.solve(); } });
    }
    if (this.cur && this.cur.live) {
      ctl.addEventListener('input', () => { clearTimeout(this.liveT); this.liveT = setTimeout(() => this.solve(true), 250); });
    }
    this.inputs[spec.k] = { spec, ctl };
    wrap.append(label, ctl);
    if (spec.hint) wrap.appendChild(h('div', { class: 'ihint', html: spec.hint }));
    return wrap;
  },
  linkCols(k, d) {
    for (const spec of this.cur.inputs) if (spec.colsFrom === k && this.editors[spec.k]) this.editors[spec.k].setCols(d);
  },
  linkRows(k, rows) {
    const t = this.cur;
    for (const spec of t.inputs) {
      if (spec.link === k && this.editors[spec.k]) this.editors[spec.k].setRows(rows);
      const srcSpec = t.inputs.find(s => s.k === k);
      if (srcSpec && srcSpec.link === spec.k && this.editors[spec.k]) this.editors[spec.k].setRows(rows);
    }
  },
  rawValues() {
    const out = {};
    for (const [k, ed] of Object.entries(this.editors)) { ed.sync(); out[k] = ed.raw; }
    for (const [k, { spec, ctl }] of Object.entries(this.inputs)) out[k] = spec.type === 'check' ? ctl.checked : ctl.value;
    return out;
  },
  applyShowIf() {
    if (!this.cur) return;
    const raw = this.rawValues();
    const bias = this.inputs.bias ? !!this.inputs.bias.ctl.checked : false;
    for (const spec of this.cur.inputs || []) if (spec.biasAware && this.editors[spec.k]) this.editors[spec.k].setBias(bias);
    for (const spec of this.cur.inputs || []) {
      if (!spec.showIf) continue;
      const node = this.main.querySelector(`.inp[data-k="${spec.k}"]`);
      if (node) node.classList.toggle('hidden', !spec.showIf(raw));
    }
  },
  values() {
    const raw = this.rawValues();
    const v = {};
    for (const spec of this.cur.inputs || []) {
      if (spec.showIf && !spec.showIf(raw)) { v[spec.k] = undefined; continue; }
      const lab = (spec.sym || (spec.label || spec.k).replace(/<[^>]+>/g, ''));
      if (spec.type === 'matrix' || spec.type === 'vector' || spec.type === 'form') { v[spec.k] = this.editors[spec.k].value(); continue; }
      const r = raw[spec.k];
      try {
        switch (spec.type) {
          case 'number': v[spec.k] = String(r).trim() === '' ? (spec.optional ? null : uerr('empty')) : EX.constVal(r); break;
          case 'int': { const x = EX.constVal(r); if (!Number.isInteger(x)) uerr('must be an integer'); v[spec.k] = x; break; }
          case 'list': v[spec.k] = String(r).trim() === '' && spec.optional ? null : parseList(r); break;
          case 'labels': v[spec.k] = parseLabels(r); break;
          case 'check': v[spec.k] = !!r; break;
          default: v[spec.k] = r;
        }
      } catch (err) {
        throw new UserError(`${lab}: ${err.message}`);
      }
    }
    return { v, raw };
  },
  solve(quiet) {
    const t = this.cur;
    if (!t) return;
    let R = new Report();
    try {
      const { v, raw } = this.values();
      Store.set('tool:' + t.id, raw);
      t.solve(v, R);
      this.resultBox.replaceChildren(R.render(t.codeOpen));
    } catch (err) {
      if (err instanceof UserError) {
        this.resultBox.replaceChildren(h('div', { class: 'note err big' }, h('b', null, 'Cannot compute: '), h('span', { html: esc(err.message) })));
      } else {
        console.error(err);
        this.resultBox.replaceChildren(h('div', { class: 'note err big' }, h('b', null, 'Error: '), String(err && err.message || err)));
      }
    }
    if (!quiet) this.resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
};

/* ---------- shared helpers for tools ---------- */
const sup = { '-1': '⁻¹', T: 'ᵀ' };
function yesno(b) { return b ? '<b class="yes">YES</b>' : '<b class="no">NO</b>'; }
function sysType(m, d) {
  if (m === d) return { key: 'square', name: 'Square / even-determined (m = d)', short: 'even-determined' };
  if (m > d) return { key: 'tall', name: 'Tall / over-determined (m > d)', short: 'over-determined' };
  return { key: 'wide', name: 'Wide / under-determined (m < d)', short: 'under-determined' };
}
function addBias(X) { return X.map(r => [1].concat(r)); }
function firstColOnes(X) { return X.every(r => Math.abs(r[0] - 1) < 1e-12); }
/* prepare design matrix with bias handling (never double-add) */
function designMatrix(Xraw, bias, R, name = 'X') {
  if (!bias) return { X: Xraw, added: false };
  if (firstColOnes(Xraw) && Xraw[0].length > 1) {
    R && R.note(`The first column of ${name} is already all 1s, so the bias column was <b>not</b> added again (w₀ = bias).`, 'warn');
    return { X: Xraw, added: false, already: true };
  }
  return { X: addBias(Xraw), added: true };
}
function wLabels(n, bias, prefix = 'w') {
  return Array.from({ length: n }, (_, i) => (bias ? `${prefix}${sub(i)}` : `${prefix}${sub(i + 1)}`));
}
function sub(i) { return String(i).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join(''); }
function equationString(w, bias, names) {
  // y = w0 + w1 x1 + ...
  const terms = [];
  w.forEach((c, i) => {
    const v = bias ? (i === 0 ? '' : names[i - 1]) : names[i];
    const mag = fmtNum(Math.abs(c));
    const body = v ? (mag === '1' ? v : `${mag}${v}`) : mag;
    terms.push({ neg: c < 0, body });
  });
  let s = '';
  terms.forEach((t, i) => { s += i === 0 ? (t.neg ? '−' : '') + t.body : (t.neg ? ' − ' : ' + ') + t.body; });
  return 'ŷ = ' + s;
}

if (typeof module !== 'undefined') module.exports = {};
