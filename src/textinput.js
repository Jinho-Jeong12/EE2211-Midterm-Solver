'use strict';
/* =====================================================================
   textinput.js — "행렬 대신 식/문장으로 입력" OR-option
   - training data:  {x = −9} → {y = −6}    {x1 = 1, x2 = 0} → {class1}
   - linear system:  w1 + w2 = 4
   - trained model:  y = −1.4375 + 0.5625x
   Injected into existing tools after they are registered.
   ===================================================================== */
const TI = (() => {
  const ARROW = /→|->|=>|⟶/;

  function cleanSide(s) {
    return String(s).trim().replace(/^[{(\[]\s*/, '').replace(/\s*[})\]]$/, '').trim();
  }
  function numOrNull(t) {
    try { return EX.constVal(String(t).trim().replace(/−/g, '-')); } catch (e) { return null; }
  }
  // parse one side → { names: [..] | null, vals: [number|string] }
  function parseSide(raw, where) {
    const s = cleanSide(raw).replace(/−/g, '-');
    if (!s) uerr(`${where}: 비어 있어`);
    const re = /([A-Za-z_Ͱ-Ͽ][\wͰ-Ͽ]*)\s*=\s*(\[[^\]]*\]|[^,=]+)/g;
    const asg = [...s.matchAll(re)];
    if (asg.length) {
      const names = [], vals = [];
      for (const m of asg) {
        const v = m[2].trim();
        if (/^\[/.test(v)) {
          const parts = v.replace(/[\[\]]/g, '').split(/[,\s]+/).filter(Boolean);
          parts.forEach((p, i) => { names.push(parts.length > 1 ? `${m[1]}${i + 1}` : m[1]); vals.push(numOrNull(p) ?? p); });
        } else {
          const n = numOrNull(v);
          names.push(m[1]);
          vals.push(n ?? v.replace(/\s+/g, ''));
        }
      }
      return { names, vals };
    }
    const toks = s.split(/[,\s]+/).filter(Boolean);
    const nums = toks.map(numOrNull);
    if (nums.every(x => x !== null)) return { names: null, vals: nums };
    return { names: null, vals: [s.replace(/\s+/g, '')] }; // a text label such as "class 1"
  }

  function orderByNames(rows, where) {
    const withNames = rows.filter(r => r.names);
    if (!withNames.length) return { names: null, rows: rows.map(r => r.vals) };
    if (withNames.length !== rows.length) uerr(`${where}: 어떤 줄은 “x1 = …”처럼 이름을 쓰고 어떤 줄은 안 썼어. 통일해줘.`);
    const names = [...new Set(rows.flatMap(r => r.names))].sort(EX.natSort);
    return {
      names,
      rows: rows.map((r, i) => names.map(n => {
        const k = r.names.indexOf(n);
        if (k < 0) uerr(`${where} ${i + 1}번째 줄에 ${n} 값이 없어`);
        return r.vals[k];
      })),
    };
  }

  function lines(text) {
    return String(text).split(/\n|;/).map(l => l.trim()).filter(l => l && !/^#/.test(l));
  }

  /* training pairs */
  function parsePairs(text, kind) {
    const L = lines(text);
    if (!L.length) uerr('데이터 문장이 비어 있어');
    const lefts = [], rights = [];
    L.forEach((line, i) => {
      const parts = line.split(ARROW);
      if (parts.length < 2 && kind !== 'none') uerr(`${i + 1}번째 줄 “${line}”에 → 가 없어. 예: {x = −9} → {y = −6}`);
      lefts.push(parseSide(parts[0], `${i + 1}번째 줄 왼쪽(x)`));
      if (parts.length >= 2) rights.push(parseSide(parts[1], `${i + 1}번째 줄 오른쪽(y)`));
    });
    const Lx = orderByNames(lefts, '왼쪽 x');
    Lx.rows.forEach((r, i) => { if (r.some(v => typeof v !== 'number')) uerr(`${i + 1}번째 줄 x 값이 숫자가 아니야`); });
    const d = Lx.rows[0].length;
    if (Lx.rows.some(r => r.length !== d)) uerr('줄마다 x 개수가 달라');
    const out = { X: Lx.rows, names: Lx.names || (d === 1 ? ['x'] : Array.from({ length: d }, (_, i) => `x${i + 1}`)) };
    if (kind === 'none') return out;
    const Ry = orderByNames(rights, '오른쪽 y');
    const allNum = Ry.rows.every(r => r.every(v => typeof v === 'number'));
    const h = Ry.rows[0].length;
    if (kind === 'auto') kind = !allNum ? 'labels' : h > 1 ? 'Y' : 'y';
    out.kind = kind;
    if (kind === 'labels') {
      if (Ry.rows.some(r => r.length !== 1)) uerr('분류 라벨은 줄마다 하나씩');
      out.labels = Ry.rows.map(r => String(r[0]));
    } else {
      if (!allNum) uerr('y 값이 숫자가 아니야 (class 라벨이면 Classification 도구를 써)');
      if (kind === 'y') {
        if (h !== 1) uerr('y가 여러 개야 → “Multiple-output regression” 도구를 써');
        out.y = Ry.rows.map(r => r[0]);
      } else {
        if (Ry.rows.some(r => r.length !== h)) uerr('줄마다 y 개수가 달라');
        out.Y = Ry.rows;
      }
    }
    return out;
  }

  /* X_new lines: "x = −1" / "x1 = 6, x2 = 8" / "6, 8" */
  function parseXnew(text, names) {
    const L = lines(text);
    if (!L.length) return null;
    const rows = L.map((l, i) => parseSide(l.split(ARROW)[0], `X_new ${i + 1}번째 줄`));
    const d = names.length;
    return rows.map((r, i) => {
      let v;
      if (r.names) {
        v = names.map(n => {
          const k = r.names.indexOf(n);
          if (k < 0) uerr(`X_new ${i + 1}번째 줄에 ${n} 값이 없어 (필요: ${names.join(', ')})`);
          return r.vals[k];
        });
      } else v = r.vals;
      if (v.length !== d) uerr(`X_new ${i + 1}번째 줄은 값이 ${d}개 (${names.join(', ')}) 있어야 해`);
      if (v.some(x => typeof x !== 'number')) uerr(`X_new ${i + 1}번째 줄이 숫자가 아니야`);
      return v;
    });
  }

  /* linear equations → X, y */
  function linearTerms(expr, where) {
    const P = EX.toPoly(EX.parse(expr));
    if (!P) uerr(`${where}: 일차식(linear)이 아니야`);
    let c = 0;
    const coef = {};
    for (const [, t] of P) {
      const ks = Object.keys(t.m);
      if (!ks.length) { c += t.c; continue; }
      if (ks.length > 1 || t.m[ks[0]] !== 1) uerr(`${where}: ${ks.join('·')} 같은 곱/제곱 항이 있어 — 일차식만 돼`);
      coef[ks[0]] = (coef[ks[0]] || 0) + t.c;
    }
    return { c, coef };
  }
  function parseSystem(text) {
    const L = lines(text).map(l => l.replace(/\(\d+\)\s*$/, '').replace(/−/g, '-'));
    if (!L.length) uerr('방정식이 비어 있어');
    const eqs = L.map((l, i) => {
      const parts = l.split(/==?/);
      if (parts.length !== 2) uerr(`${i + 1}번째 식 “${l}”에 = 가 하나 있어야 해`);
      const a = linearTerms(parts[0], `${i + 1}번째 식 왼쪽`), b = linearTerms(parts[1], `${i + 1}번째 식 오른쪽`);
      const coef = { ...a.coef };
      for (const k in b.coef) coef[k] = (coef[k] || 0) - b.coef[k];
      return { coef, rhs: b.c - a.c };
    });
    const names = [...new Set(eqs.flatMap(e => Object.keys(e.coef)))].sort(EX.natSort);
    if (!names.length) uerr('미지수가 없어');
    return { names, X: eqs.map(e => names.map(n => e.coef[n] || 0)), y: eqs.map(e => e.rhs) };
  }

  /* model equation → w (with w0) */
  function parseModel(text) {
    let s = String(text).trim().replace(/−/g, '-').replace(/ŷ|y_hat|yhat/g, 'y');
    if (s.includes('=')) s = s.slice(s.lastIndexOf('=') + 1);
    const { c, coef } = linearTerms(s, '모델 식');
    const names = Object.keys(coef).sort(EX.natSort);
    if (!names.length) uerr('모델 식에 변수(x)가 없어');
    return { names, w: [c, ...names.map(n => coef[n])] };
  }

  return { parsePairs, parseXnew, parseSystem, parseModel };
})();

/* ---------------- fill-in-the-blank form editor ---------------- */
class FormEditor {
  constructor(spec, raw, onCols) {
    this.spec = spec;
    this.onCols = onCols;
    this.bias = false;
    this.el = h('div', { class: 'formed' });
    this.err = '';
    if (raw && typeof raw === 'object' && raw.L) this.raw = raw;
    else this.raw = this.fromText(typeof raw === 'string' ? raw : spec.defText || '') || this.blank();
    this.render();
  }
  get f() { return this.spec.form; }
  get kind() { return this.spec.kind || 'y'; }
  get d() { return this.f === 'model' ? this.raw.L[0].length - 1 : this.raw.L[0].length; }
  get hOut() { return this.raw.R && this.raw.R[0] ? this.raw.R[0].length : 0; }
  names(d) {
    if (this.f === 'eqs') return Array.from({ length: d }, (_, i) => `w${i + 1}`);
    return d === 1 ? ['x'] : Array.from({ length: d }, (_, i) => `x${i + 1}`);
  }
  blank() {
    const z = (m, n) => Array.from({ length: m }, () => Array(n).fill('0'));
    if (this.f === 'pairs') return { L: z(2, 1), R: this.kind === 'none' ? [[], []] : z(2, 1) };
    if (this.f === 'xnew') return { L: z(1, 1) };
    if (this.f === 'eqs') return { L: z(2, 2), R: z(2, 1) };
    return { L: z(1, 2) };
  }
  fromText(txt) {
    if (!String(txt).trim()) return null;
    const S = v => (typeof v === 'number' ? String(+v.toPrecision(12)) : String(v));
    if (this.f === 'pairs') {
      const P = TI.parsePairs(txt, this.kind);
      const R = P.labels ? P.labels.map(l => [l]) : P.y ? P.y.map(v => [S(v)]) : P.Y ? P.Y.map(r => r.map(S)) : P.X.map(() => []);
      return { L: P.X.map(r => r.map(S)), R };
    }
    if (this.f === 'xnew') {
      const lines = String(txt).split(/\n|;/).map(l => l.trim()).filter(Boolean);
      const n = Math.max(1, ...lines.map(l => l.split(/→|->/)[0].split(',').length));
      const X = TI.parseXnew(txt, this.names(n));
      return X ? { L: X.map(r => r.map(S)) } : null;
    }
    if (this.f === 'eqs') { const E = TI.parseSystem(txt); return { L: E.X.map(r => r.map(S)), R: E.y.map(v => [S(v)]) }; }
    const M = TI.parseModel(txt);
    return { L: [M.w.map(S)] };
  }
  resizeL(n) {
    const off = this.f === 'model' ? 1 : 0;
    n = Math.max(1, n) + off;
    this.raw.L = this.raw.L.map(r => { const q = r.slice(0, n); while (q.length < n) q.push('0'); return q; });
  }
  setCols(d) { if (d !== this.d) { this.resizeL(d); this.render(); } }
  setBias(b) { if (!!b !== this.bias) { this.bias = !!b; this.render(); } }
  sync() {}
  addRow() { this.raw.L.push(this.raw.L[this.raw.L.length - 1].map(() => '0')); if (this.raw.R) this.raw.R.push(this.raw.R[0].map(() => '0')); this.render(); }
  delRow() { if (this.raw.L.length > 1) { this.raw.L.pop(); if (this.raw.R) this.raw.R.pop(); this.render(); } }
  addCol(k) { this.resizeL(this.d + k); this.render(); if (this.onCols) this.onCols(this.d); }
  addOut(k) { const h2 = Math.max(1, this.hOut + k); this.raw.R = this.raw.R.map(r => { const q = r.slice(0, h2); while (q.length < h2) q.push('0'); return q; }); this.render(); }
  render() {
    const f = this.f, L = this.raw.L, R = this.raw.R, d = this.d, nm = this.names(d);
    const T = (t, c) => h('span', { class: 'ft' + (c ? ' ' + c : '') }, t);
    const labelsRight = f === 'pairs' && (this.kind === 'labels' || this.kind === 'auto');
    const cell = (side, i, j) => {
      const inp = h('input', { class: 'cell fcell' + (side === 'R' && labelsRight ? ' wide' : ''), value: this.raw[side][i][j], spellcheck: 'false', autocomplete: 'off', 'data-s': side, 'data-i': i, 'data-j': j });
      inp.addEventListener('input', () => { this.raw[side][i][j] = inp.value; });
      inp.addEventListener('focus', () => inp.select());
      inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (f === 'model') return;
        if (i + 1 >= this.raw.L.length) this.addRow();
        const nx = this.el.querySelector(`input.fcell[data-s="${side}"][data-i="${i + 1}"][data-j="${j}"]`);
        if (nx) nx.focus();
      });
      return inp;
    };
    const btn = (label, title, fn) => h('button', { class: 'mini', type: 'button', title, onclick: e => { e.preventDefault(); fn(); } }, label);
    const tools = [];
    let info = '';
    if (f === 'pairs') {
      tools.push(btn('+샘플', '샘플(줄) 추가', () => this.addRow()), btn('−샘플', '샘플 삭제', () => this.delRow()), btn('+x', 'feature 추가 (x1, x2, …)', () => this.addCol(1)), btn('−x', 'feature 삭제', () => d > 1 && this.addCol(-1)));
      if (this.kind === 'Y' || this.kind === 'auto') tools.push(btn('+y', '출력 개수 추가 (y = [□, □])', () => this.addOut(1)), btn('−y', '출력 개수 줄이기', () => this.addOut(-1)));
      info = `샘플 ${L.length}개 · feature ${d}개`;
    } else if (f === 'xnew') {
      tools.push(btn('+행', '새 샘플 추가', () => this.addRow()), btn('−행', '삭제', () => this.delRow()));
      info = `새 샘플 ${L.length}개 · feature ${d}개 (학습 데이터와 같게 자동)`;
    } else if (f === 'eqs') {
      tools.push(btn('+식', '방정식 추가', () => this.addRow()), btn('−식', '방정식 삭제', () => this.delRow()), btn('+미지수', '미지수 추가 (w3, …)', () => this.addCol(1)), btn('−미지수', '미지수 삭제', () => d > 1 && this.addCol(-1)));
      info = `식 ${L.length}개 · 미지수 ${d}개`;
    } else {
      tools.push(btn('+항', 'feature 항 추가 (+ □ x2)', () => this.addCol(1)), btn('−항', '항 삭제', () => d > 1 && this.addCol(-1)));
      info = `feature ${d}개`;
    }
    tools.push(btn('텍스트로 붙여넣기', '문제 문장을 복사해서 붙여넣으면 빈칸이 채워져', () => this.togglePaste()));
    const rows = [];
    if (f === 'model') {
      const r = [T('y ='), cell('L', 0, 0)];
      for (let j = 1; j <= d; j++) r.push(T('+'), cell('L', 0, j), T(nm[j - 1], 'fv'));
      rows.push(h('div', { class: 'frow' }, ...r));
    } else {
      L.forEach((row, i) => {
        const r = [h('span', { class: 'fix' }, String(i + 1))];
        if (f === 'pairs' || f === 'xnew') {
          if (f === 'pairs') r.push(T('{'));
          if (this.bias) r.push(h('span', { class: 'fbias', title: 'bias 1 — 자동, 수정 불가' }, '1'), T(','));
          row.forEach((_, j) => { r.push(T(nm[j] + ' =', 'fv'), cell('L', i, j)); if (j < d - 1) r.push(T(',')); });
          if (f === 'pairs') {
            r.push(T('}'));
            if (this.kind !== 'none') {
              r.push(T('→', 'farrow'), T('{'));
              const hh = this.hOut;
              if (hh > 1) { r.push(T('y = [', 'fv')); for (let k = 0; k < hh; k++) { r.push(cell('R', i, k)); if (k < hh - 1) r.push(T(',')); } r.push(T(']')); }
              else r.push(T('y =', 'fv'), cell('R', i, 0));
              r.push(T('}'));
            }
          }
        } else {
          row.forEach((_, j) => { r.push(cell('L', i, j), T(nm[j], 'fv')); if (j < d - 1) r.push(T('+')); });
          r.push(T('='), cell('R', i, 0));
        }
        rows.push(h('div', { class: 'frow' }, ...r));
      });
    }
    this.pasteBox = h('div', { class: 'pastebox hidden' },
      h('textarea', { rows: 4, placeholder: this.spec.pasteHint || '' }),
      h('div', null, h('button', { class: 'mini primary', type: 'button', onclick: e => { e.preventDefault(); this.applyPaste(); } }, '빈칸 채우기'), h('button', { class: 'mini', type: 'button', onclick: e => { e.preventDefault(); this.togglePaste(); } }, '취소')));
    this.el.replaceChildren(...[
      h('div', { class: 'medhead' }, h('span', { class: 'medlabel', html: this.spec.label || '' }), h('span', { class: 'dims' }, info)),
      this.spec.hint ? h('div', { class: 'medhint', html: this.spec.hint }) : null,
      this.bias ? h('div', { class: 'biasnote' }, '회색 1 = bias — 자동으로 붙어서 안 써도 돼 (수정 불가)') : null,
      h('div', { class: 'medtools' }, ...tools),
      this.pasteBox,
      this.err ? h('div', { class: 'note err' }, this.err) : null,
      h('div', { class: 'frows' }, ...rows),
    ].filter(Boolean));
  }
  togglePaste() {
    this.pasteBox.classList.toggle('hidden');
    if (!this.pasteBox.classList.contains('hidden')) this.pasteBox.querySelector('textarea').focus();
  }
  applyPaste() {
    const txt = this.pasteBox.querySelector('textarea').value;
    try {
      const r = this.fromText(txt);
      if (!r) return;
      this.raw = r; this.err = '';
    } catch (e) { this.err = '붙여넣기 실패: ' + e.message; }
    this.render();
    if (this.onCols) this.onCols(this.d);
  }
  value() {
    const f = this.f, nm = this.names(this.d);
    const lab = (this.spec.sym || '').trim();
    const num = (s, where) => {
      try { return parseCell(s); } catch (e) { uerr(`${lab ? lab + ': ' : ''}${where} 칸 “${s}”이 숫자가 아니야 (비어 있으면 0이라도 넣어줘)`); }
    };
    if (f === 'model') return { w: this.raw.L[0].map((s, j) => num(s, j ? `${nm[j - 1]} 계수` : '상수항')), names: nm };
    const X = this.raw.L.map((r, i) => r.map((s, j) => num(s, `${i + 1}번째 줄 ${f === 'eqs' ? nm[j] + ' 계수' : nm[j]}`)));
    if (f === 'xnew') return { X, names: nm };
    if (f === 'eqs') return { X, y: this.raw.R.map((r, i) => num(r[0], `${i + 1}번째 식 오른쪽`)), names: nm };
    const R = (this.raw.R || []).map((r, i) => r.map(s => { const t = String(s).trim().replace(/\s+/g, ''); if (!t) uerr(`${i + 1}번째 샘플의 y 칸이 비어 있어`); return t; }));
    return { X, R, names: nm };
  }
}

/* ---------------- injection into tools ---------------- */
(() => {
  const L5 = '{x = −9} → {y = −6}\n{x = −7} → {y = −6}\n{x = −5} → {y = −4}\n{x = 1} → {y = −1}\n{x = 5} → {y = 1}\n{x = 9} → {y = 4}';
  const DATA = {
    lrtrain: ['y', L5, 'x = −1'],
    lrloss: ['y', L5, null],
    normaleq: ['y', L5, null],
    lamcompare: ['y', L5, null],
    ridgeJ: ['y', L5, null],
    lrmulti: ['Y', '{x = 3} → {y = [0, 5]}\n{x = 4} → {y = [1.5, 4]}\n{x = 10} → {y = [−3, 8]}\n{x = 6} → {y = [−4, 10]}\n{x = 7} → {y = [1, 6]}', 'x = 2'],
    bintrain: ['labels', '{x = −9} → {y = −1}\n{x = −7} → {y = −1}\n{x = −5} → {y = −1}\n{x = 1} → {y = +1}\n{x = 5} → {y = +1}\n{x = 9} → {y = +1}', 'x = −2'],
    multitrain: ['labels', '{x1 = 1, x2 = 1} → {class 1}\n{x1 = −1, x2 = 1} → {class 2}\n{x1 = 1, x2 = 3} → {class 1}\n{x1 = 1, x2 = 0} → {class 3}', 'x1 = 6, x2 = 8\nx1 = 0, x2 = −1'],
    ridgeauto: ['y', L5, 'x = −1'],
    ridgeprimal: ['y', L5, 'x = −1'],
    ridgedual: ['y', '{x1 = 1, x2 = 0, x3 = 1} → {y = 1}\n{x1 = 2, x2 = −1, x3 = 1} → {y = 2}\n{x1 = 1, x2 = 1, x3 = 5} → {y = 3}', 'x1 = −1, x2 = 2, x3 = 8\nx1 = 1, x2 = 5, x3 = −1'],
    polyexpand: ['none', '{x1 = 0, x2 = 0}\n{x1 = 1, x2 = 1}\n{x1 = 1, x2 = 0}\n{x1 = 0, x2 = 1}', null],
    polytrain: ['y', '{x = −10} → {y = 5}\n{x = −8} → {y = 5}\n{x = −3} → {y = 4}\n{x = −1} → {y = 3}\n{x = 2} → {y = 2}\n{x = 8} → {y = 2}', 'x = 9'],
    polybin: ['labels', '{x1 = 0, x2 = 0} → {y = −1}\n{x1 = 1, x2 = 1} → {y = −1}\n{x1 = 1, x2 = 0} → {y = +1}\n{x1 = 0, x2 = 1} → {y = +1}', 'x1 = 0.1, x2 = 0.1\nx1 = 0.9, x2 = 0.9\nx1 = 0.1, x2 = 0.9\nx1 = 0.9, x2 = 0.1'],
    polymulti: ['labels', '{x = −1} → {class 1}\n{x = 0} → {class 1}\n{x = 0.5} → {class 2}\n{x = 0.3} → {class 3}\n{x = 0.8} → {class 2}', 'x = −0.1\nx = 0.4'],
    smart: ['auto', '{x1 = 1, x2 = 1} → {class 1}\n{x1 = −1, x2 = 1} → {class 2}\n{x1 = 1, x2 = 3} → {class 1}\n{x1 = 1, x2 = 0} → {class 3}', 'x1 = 6, x2 = 8\nx1 = 0, x2 = −1'],
  };
  const HIDE_IN_TEXT = ['X', 'y', 'Y', 'labels', 'useY', 'tt', 'Xnew'];
  const PASTE_PAIRS = '문제 문장을 그대로 붙여넣어:\n{x = −9} → {y = −6}\n{x = −7} → {y = −6}\n(feature 여러 개: {x1 = 1, x2 = 0} → {class 1})';

  function hideWhen(t, keys, mode) {
    for (const s of t.inputs) {
      if (!keys.includes(s.k)) continue;
      const old = s.showIf;
      s.showIf = r => r.inmode !== mode && (!old || old(r));
    }
  }
  const rightHint = kind => kind === 'labels' ? 'y 칸에는 라벨: −1 / +1, 0 / 1, class1 다 돼' : kind === 'Y' ? '출력이 여러 개면 +y 버튼 → y = [□, □]' : kind === 'none' ? 'x만 채우면 돼' : kind === 'auto' ? 'y 칸: 숫자면 회귀, class1 같은 글자면 분류로 자동 판별' : 'y 칸에는 숫자';

  for (const [id, [kind, defPairs, defNew]] of Object.entries(DATA)) {
    const t = TOOL_BY_ID[id];
    if (!t || t.inputs.some(s => s.k === 'inmode')) continue;
    hideWhen(t, HIDE_IN_TEXT, 'pairs');
    const hasPred = t.inputs.some(s => s.k === 'Xnew');
    const hasBias = t.inputs.some(s => s.k === 'bias');
    t.inputs.unshift(
      { k: 'inmode', type: 'select', label: '입력 방식', def: 'matrix', options: [['matrix', '행렬로 입력 (X, y 칸)'], ['pairs', '문제 형식 그대로 입력  { x = □ } → { y = □ }']], wide: true },
      { k: 'pairs', type: 'form', form: 'pairs', kind, defText: defPairs, sym: '학습 데이터', biasAware: hasBias, pasteHint: PASTE_PAIRS, wide: true, showIf: r => r.inmode === 'pairs',
        label: '학습 데이터 (TRAIN) — 한 줄 = 샘플 하나', hint: '빈칸에 숫자만 채워. Enter = 다음 줄 (마지막 줄이면 새 줄 추가). ' + rightHint(kind) },
    );
    if (hasPred) {
      const i = t.inputs.findIndex(s => s.k === 'Xnew');
      t.inputs.splice(i + 1, 0, { k: 'xnewText', type: 'form', form: 'xnew', colsFrom: 'pairs', defText: defNew || '', sym: 'X_new', biasAware: hasBias, pasteHint: '예:\nx = −1\nx1 = 6, x2 = 8', wide: true, showIf: r => r.inmode === 'pairs' && r.doPred, label: 'X_new (PREDICT) — 예측할 새 샘플' });
    }
    const orig = t.solve;
    t.solve = (v, R) => {
      if (v.inmode === 'pairs') {
        const P = v.pairs;
        v.X = P.X;
        const Rv = P.R;
        let k = kind;
        const allNum = Rv.every(r => r.every(s => numOk(s)));
        if (k === 'auto') k = !allNum ? 'labels' : Rv[0].length > 1 ? 'Y' : 'y';
        if (k === 'y') { if (!allNum) uerr('y 칸에 숫자가 아닌 값이 있어 — class 라벨이면 Classification 도구를 써'); v.y = Rv.map(r => EX.constVal(r[0])); }
        if (k === 'Y') { if (!allNum) uerr('y 칸에 숫자가 아닌 값이 있어'); v.Y = Rv.map(r => r.map(s => EX.constVal(s))); }
        if (k === 'labels') { v.labels = Rv.map(r => r[0].replace(/^\+/, '')).join(', '); v.useY = false; }
        if (id === 'smart') v.tt = k === 'labels' ? 'labels' : k === 'Y' ? 'Y' : 'y';
        if (hasPred) {
          v.Xnew = v.doPred && v.xnewText ? v.xnewText.X : null;
          if (!v.Xnew) v.doPred = false;
        }
        R.note(`문제 형식에서 읽은 값: 샘플 ${P.X.length}개, feature 순서 = <b>${P.names.join(', ')}</b> (X의 열 순서)`, 'info', 'given');
        v.inmode = 'matrix';
      }
      return orig(v, R);
    };
    if (GUIDE[id]) GUIDE[id].push(['행렬 대신 문제에 적힌 모양 그대로 넣고 싶으면', '<b>입력 방식 = 문제 형식 그대로</b> → <code>{ x = □ } → { y = □ }</code> 빈칸에 숫자만 채우기 (문장 복사는 “텍스트로 붙여넣기”)']);
  }
  function numOk(s) { try { EX.constVal(s); return true; } catch (e) { return false; } }

  /* Solve Xw = y, Solution type: equations */
  for (const id of ['solve', 'soltype']) {
    const t = TOOL_BY_ID[id];
    if (!t || t.inputs.some(s => s.k === 'inmode')) continue;
    hideWhen(t, ['X', 'y', 'form'], 'eq');
    t.inputs.unshift(
      { k: 'inmode', type: 'select', label: '입력 방식', def: 'matrix', options: [['matrix', '행렬로 입력 (X, y 칸)'], ['eq', '방정식 형식으로 입력  □ w1 + □ w2 = □']], wide: true },
      { k: 'eqs', type: 'form', form: 'eqs', defText: id === 'solve' ? 'w1 + w2 = 1\nw1 - w2 = 0\nw1 = 2' : 'w1 + 2w2 + 3w3 = 2\n3w1 + 6w2 + 9w3 = 1', sym: '방정식', pasteHint: '예:\nw1 + w2 = 4\nw1 − 2w2 = 1', wide: true, showIf: r => r.inmode === 'eq',
        label: '방정식 — 한 줄 = 식 하나', hint: '□에 계수를 넣어. 식에 없는 미지수는 0, 빼기는 음수로 (w1 − 2w2 → 1, −2)' },
    );
    const orig = t.solve;
    t.solve = (v, R) => {
      if (v.inmode === 'eq') {
        const S = v.eqs;
        v.X = S.X; v.y = S.y; v.form = 'Xw';
        R.note(`방정식에서 읽음: 미지수 순서 = <b>${S.names.join(', ')}</b> → X의 열 순서, y = 오른쪽 값`, 'info', 'given');
        v.inmode = 'matrix';
      }
      return orig(v, R);
    };
    if (GUIDE[id]) GUIDE[id].push(['방정식 모양 그대로 넣고 싶으면', '<b>입력 방식 = 방정식 형식</b> → <code>□ w1 + □ w2 = □</code> 빈칸에 계수 채우기']);
  }

  /* Predict: model equation */
  {
    const t = TOOL_BY_ID.lrpredict;
    if (t && !t.inputs.some(s => s.k === 'inmode')) {
      hideWhen(t, ['w', 'Xnew', 'bias'], 'eq');
      t.inputs.unshift(
        { k: 'inmode', type: 'select', label: '입력 방식', def: 'vector', options: [['vector', 'ŵ 벡터 + X_new 행렬'], ['eq', '모델 식 형식으로  y = □ + □ x']], wide: true },
        { k: 'model', type: 'form', form: 'model', defText: 'y = -1.4375 + 0.5625x', sym: '모델 식', pasteHint: '예: y = −1.4375 + 0.5625x', wide: true, showIf: r => r.inmode === 'eq', label: '학습된 모델 (TRAIN 결과)', hint: '첫 □ = 상수항 w₀, 나머지 = 각 x의 계수. feature가 더 있으면 +항' },
        { k: 'xnewText', type: 'form', form: 'xnew', colsFrom: 'model', defText: 'x = -1\nx = 2', sym: 'X_new', pasteHint: '예:\nx = −1\nx = 2', wide: true, showIf: r => r.inmode === 'eq', label: 'X_new (PREDICT) — 예측할 새 샘플' },
      );
      const orig = t.solve;
      t.solve = (v, R) => {
        if (v.inmode === 'eq') {
          const M = v.model;
          v.w = M.w; v.bias = true;
          v.Xnew = v.xnewText.X;
          R.note(`모델 식에서 읽음: w₀ = ${fmtNum(M.w[0])} (상수항), 변수 순서 = <b>${M.names.join(', ')}</b>`, 'info', 'given');
          v.inmode = 'vector';
        }
        return orig(v, R);
      };
      if (GUIDE.lrpredict) GUIDE.lrpredict.push(['“the fitted line is y = −1.4375 + 0.5625x, predict …”', '<b>입력 방식 = 모델 식 형식</b> → <code>y = □ + □ x</code>에 −1.4375, 0.5625, X_new에 −1']);
      if (GUIDE.ridgepredict) GUIDE.ridgepredict.push(['모델을 식으로 받았을 때', '<b>입력 방식 = 모델 식 형식</b>']);
    }
  }
})();
