'use strict';
/* =====================================================================
   common.js — shared EE2211 solving engine used by many tools
   ===================================================================== */

/* Least squares / ridge solve with automatic formula selection.
   X: m×d design matrix,  Y: m×h target matrix (h = 1 for a vector y)
   o.lambda  (0 → no ridge)
   o.mode    'auto' | 'primal' | 'dual'
   o.Xn, o.yn  symbol names used in text (for example 'X' or 'P')
   returns { W, method, exact, form } and writes steps into R */
function lsqSolve(X, Y, R, o = {}) {
  const lam = o.lambda || 0;
  const Xn = o.Xn || 'X', yn = o.yn || (Y[0].length > 1 ? 'Y' : 'y');
  const [m, d] = LA.shape(X);
  const h = Y[0].length;
  const XT = LA.T(X);
  const st = sysType(m, d);
  const rk = LA.rank(X);
  const wn = o.wn || (h > 1 ? 'Ŵ' : 'ŵ');
  const ynDisp = yn;
  let W, method, form;

  R.step(`Size of ${Xn}`, undefined, { note: `m = ${m} rows (samples/equations), d = ${d} columns (parameters/unknowns) → <b>${st.name}</b>; rank(${Xn}) = ${rk}` });

  const wantDual = o.mode === 'dual' || (o.mode !== 'primal' && m < d);

  if (lam > 0) {
    if (!wantDual) {
      form = 'primal';
      R.formula(`${wn} = (${Xn}ᵀ${Xn} + λI)⁻¹ ${Xn}ᵀ${ynDisp}`, `Ridge <b>primal form</b>${o.mode === 'primal' ? ' (chosen by user)' : m > d ? ' — selected because m > d' : ' — m = d (primal and dual give the same answer)'}; I is d×d = ${d}×${d}`);
      const XtX = LA.mul(XT, X);
      const lI = LA.scale(LA.eye(d), lam);
      const A = LA.add(XtX, lI);
      const Ai = LA.inv(A);
      if (!Ai) uerr(`${Xn}ᵀ${Xn} + λI is singular — this should not happen for λ > 0.`);
      const XtY = LA.mul(XT, Y);
      R.step(`${Xn}ᵀ${Xn}`, XtX).step(`λI  (λ = ${fmtNum(lam)}, I is ${d}×${d})`, lI).step(`${Xn}ᵀ${Xn} + λI`, A)
        .step(`(${Xn}ᵀ${Xn} + λI)⁻¹`, Ai).step(`${Xn}ᵀ${ynDisp}`, XtY);
      W = LA.mul(Ai, XtY);
      method = `Ridge primal: (${Xn}ᵀ${Xn}+λI)⁻¹${Xn}ᵀ${ynDisp}`;
    } else {
      form = 'dual';
      R.formula(`${wn} = ${Xn}ᵀ(${Xn}${Xn}ᵀ + λI)⁻¹ ${ynDisp}`, `Ridge <b>dual form</b>${o.mode === 'dual' ? ' (chosen by user)' : ' — selected because m < d'}; I is m×m = ${m}×${m}`);
      const XXt = LA.mul(X, XT);
      const lI = LA.scale(LA.eye(m), lam);
      const A = LA.add(XXt, lI);
      const Ai = LA.inv(A);
      if (!Ai) uerr(`${Xn}${Xn}ᵀ + λI is singular.`);
      R.step(`${Xn}${Xn}ᵀ`, XXt).step(`λI  (λ = ${fmtNum(lam)}, I is ${m}×${m})`, lI).step(`${Xn}${Xn}ᵀ + λI`, A).step(`(${Xn}${Xn}ᵀ + λI)⁻¹`, Ai);
      const a = LA.mul(Ai, Y);
      R.step(`a = (${Xn}${Xn}ᵀ + λI)⁻¹${ynDisp}`, a);
      W = LA.mul(XT, a);
      method = `Ridge dual: ${Xn}ᵀ(${Xn}${Xn}ᵀ+λI)⁻¹${ynDisp}`;
    }
  } else if (m === d && o.mode !== 'primal' && o.mode !== 'dual') {
    const Xi = LA.inv(X);
    if (Xi) {
      form = 'inverse';
      R.formula(`${wn} = ${Xn}⁻¹${ynDisp}`, `${Xn} is square and invertible (det ≠ 0) → unique exact solution. (Same result as (${Xn}ᵀ${Xn})⁻¹${Xn}ᵀ${ynDisp}.)`);
      R.step(`det(${Xn})`, LA.det(X)).step(`${Xn}⁻¹`, Xi);
      W = LA.mul(Xi, Y);
      method = `${Xn}⁻¹${ynDisp}`;
    } else {
      form = 'pinv';
      R.note(`${Xn} is square but <b>singular</b> (det = 0, rank ${rk} < ${d}) → ${Xn}⁻¹ does not exist; also ${Xn}ᵀ${Xn} and ${Xn}${Xn}ᵀ are singular.`, 'err');
      W = pinvFallback(X, Y, R, Xn, ynDisp, wn);
      method = `${Xn}† ${ynDisp} (Moore–Penrose, fallback)`;
    }
  } else if (!wantDual) {
    const XtX = LA.mul(XT, X);
    const inv = LA.inv(XtX);
    R.formula(`${wn} = (${Xn}ᵀ${Xn})⁻¹${Xn}ᵀ${ynDisp}`, `least squares / left inverse ${Xn}† = (${Xn}ᵀ${Xn})⁻¹${Xn}ᵀ${o.mode === 'primal' ? ' (primal, chosen by user)' : ' — used because m > d'}`);
    R.step(`${Xn}ᵀ`, XT).step(`${Xn}ᵀ${Xn}`, XtX, { note: `det(${Xn}ᵀ${Xn}) = ${fmtNum(LA.det(XtX))}` });
    if (inv) {
      form = 'primal';
      const XtY = LA.mul(XT, Y);
      R.step(`(${Xn}ᵀ${Xn})⁻¹`, inv).step(`${Xn}ᵀ${ynDisp}`, XtY);
      W = LA.mul(inv, XtY);
      method = `(${Xn}ᵀ${Xn})⁻¹${Xn}ᵀ${ynDisp}`;
    } else {
      form = 'pinv';
      R.note(`${Xn}ᵀ${Xn} is <b>not invertible</b> (rank(${Xn}) = ${rk} < d = ${d}) → the left inverse (${Xn}ᵀ${Xn})⁻¹${Xn}ᵀ does not exist. The EE2211 formula cannot be applied. Options: add ridge (λ > 0), or use the Moore–Penrose pseudoinverse below.`, 'err');
      W = pinvFallback(X, Y, R, Xn, ynDisp, wn);
      method = `${Xn}† ${ynDisp} (fallback)`;
    }
  } else {
    const XXt = LA.mul(X, XT);
    const inv = LA.inv(XXt);
    R.formula(`${wn} = ${Xn}ᵀ(${Xn}${Xn}ᵀ)⁻¹${ynDisp}`, `right inverse ${Xn}† = ${Xn}ᵀ(${Xn}${Xn}ᵀ)⁻¹${o.mode === 'dual' ? ' (dual, chosen by user)' : ' — used because m < d'} → unique <b>constrained</b> (minimum-norm) solution`);
    R.step(`${Xn}ᵀ`, XT).step(`${Xn}${Xn}ᵀ`, XXt, { note: `det(${Xn}${Xn}ᵀ) = ${fmtNum(LA.det(XXt))}` });
    if (inv) {
      form = 'dual';
      R.step(`(${Xn}${Xn}ᵀ)⁻¹`, inv);
      W = LA.mul(XT, LA.mul(inv, Y));
      method = `${Xn}ᵀ(${Xn}${Xn}ᵀ)⁻¹${ynDisp}`;
    } else {
      form = 'pinv';
      R.note(`${Xn}${Xn}ᵀ is <b>not invertible</b> (rank(${Xn}) = ${rk} < m = ${m}) → the right inverse does not exist.`, 'err');
      W = pinvFallback(X, Y, R, Xn, ynDisp, wn);
      method = `${Xn}† ${ynDisp} (fallback)`;
    }
  }
  const E = LA.sub(LA.mul(X, W), Y);
  const sse = E.flat().reduce((s, x) => s + x * x, 0);
  const exact = sse < 1e-12 * Math.max(1, Y.flat().reduce((s, x) => s + x * x, 0));
  return { W, method, form, exact, sse, E, rank: rk, st };
}

function pinvFallback(X, Y, R, Xn, yn, wn) {
  const P = LA.pinv(X);
  R.step(`${Xn}† (Moore–Penrose pseudoinverse via Singular Value Decomposition (SVD), numpy.linalg.pinv)`, P, { note: 'Not an EE2211 closed-form; gives the minimum-norm least-squares answer.' });
  return LA.mul(P, Y);
}

/* consistency: rank(X) vs rank([X|y]) */
function consistency(X, y) {
  const rX = LA.rank(X);
  const rXy = LA.rank(LA.hstack(X, y.map ? (Array.isArray(y[0]) ? y : y.map(v => [v])) : y));
  const d = X[0].length;
  let kind;
  if (rX < rXy) kind = 'none';
  else if (rX === d) kind = 'unique';
  else kind = 'infinite';
  return { rX, rXy, kind };
}

/* ---------- polynomial features ---------- */
function combosWithRep(n, k, start = 0, pre = [], out = []) {
  if (k === 0) { out.push(pre.slice()); return out; }
  for (let i = start; i < n; i++) { pre.push(i); combosWithRep(n, k - 1, i, pre, out); pre.pop(); }
  return out;
}
function polyTerms(d, p, order = 'sklearn') {
  const terms = [[]];
  for (let deg = 1; deg <= p; deg++) {
    let c = combosWithRep(d, deg);
    if (order === 'lecture' && deg >= 2) {
      const pure = c.filter(t => t.every(i => i === t[0]));
      const mixed = c.filter(t => !t.every(i => i === t[0]));
      c = mixed.concat(pure);
    }
    terms.push(...c);
  }
  return terms;
}
function termLabel(t, names) {
  if (!t.length) return '1';
  const cnt = {};
  t.forEach(i => (cnt[i] = (cnt[i] || 0) + 1));
  return Object.keys(cnt).map(i => names[i] + (cnt[i] > 1 ? supNum(cnt[i]) : '')).join('·');
}
function supNum(n) { return String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join(''); }
function featNames(d) { return d === 1 ? ['x'] : Array.from({ length: d }, (_, i) => 'x' + (i + 1)); }
function polyExpand(X, p, order = 'sklearn') {
  const d = X[0].length;
  const terms = polyTerms(d, p, order);
  const names = featNames(d);
  const P = X.map(r => terms.map(t => t.reduce((s, i) => s * r[i], 1)));
  return { P, labels: terms.map(t => termLabel(t, names)), terms };
}

/* ---------- labels / one-hot ---------- */
function uniqSorted(labels) {
  const u = [...new Set(labels)];
  const allNum = u.every(x => !isNaN(parseFloat(x)) && isFinite(x));
  return allNum ? u.sort((a, b) => parseFloat(a) - parseFloat(b)) : u.sort((a, b) => EX.natSort(String(a), String(b)));
}
function oneHot(labels, classes) {
  classes = classes || uniqSorted(labels);
  return { Y: labels.map(l => classes.map(c => (String(c) === String(l) ? 1 : 0))), classes };
}

/* map binary labels → ±1  (EE2211: class1 → +1, class2 → −1; {0,1}: 1 → +1, 0 → −1) */
function binaryMap(labels, posLabel) {
  const u = uniqSorted(labels.map(String));
  if (u.length !== 2) uerr(`Binary classification needs exactly 2 distinct labels, got ${u.length}: {${u.join(', ')}}`);
  let pos = posLabel;
  if (pos == null || pos === '' || pos === 'auto') {
    if (u.includes('1') && u.includes('-1')) pos = '1';
    else if (u.includes('0') && u.includes('1')) pos = '1';
    else pos = u[0];
  }
  pos = String(pos);
  if (!u.includes(pos)) uerr(`"+1 label" ${pos} is not one of the labels {${u.join(', ')}}`);
  const neg = u.find(x => x !== pos);
  return { y: labels.map(l => (String(l) === pos ? 1 : -1)), pos, neg };
}

/* sign with EE2211 convention score ≥ 0 → +1 */
const sgn = s => (s >= 0 ? 1 : -1);

/* pretty equation for polynomial / general labels */
function modelEquation(w, labels, yname = 'ŷ') {
  let s = '';
  w.forEach((c, i) => {
    const lab = labels[i] === '1' ? '' : labels[i];
    const mag = fmtNum(Math.abs(c));
    if (Math.abs(c) < 1e-12 && w.length > 1) return;
    const body = lab ? (mag === '1' ? lab : mag + (/^[a-z]/i.test(lab) ? '' : '·') + lab) : mag;
    s += s === '' ? (c < 0 ? '−' : '') + body : (c < 0 ? ' − ' : ' + ') + body;
  });
  return `${yname} = ${s || '0'}`;
}

/* matrix text for python code */
function pyY(Y) { return Y[0].length === 1 ? pyArr(Y.map(r => r[0])) : pyArr(Y); }

/* symbol legend (every formula symbol is identified) */
const SYMBOLS = {
  X: 'X = training input (design) matrix, one row per sample', P: 'P = polynomial feature matrix built from X', y: 'y = actual target values', Y: 'Y = target matrix (one column per output / class)',
  w: 'w = model parameters', wh: 'ŵ = trained / estimated parameters', yh: 'ŷ = predicted output', Xn: 'X_new = new input(s) to predict',
  m: 'm = number of samples (rows)', d: 'd = number of parameters (columns)', C: 'C = number of classes', lam: 'λ = ridge regularization parameter', I: 'I = identity matrix',
};
function legend(R, keys) { R.note('<b>Symbols:</b> ' + keys.map(k => SYMBOLS[k]).join(' · '), 'info', 'given'); }
function overUnder(e) { return Math.abs(e) < 1e-12 ? 'exact' : e > 0 ? 'over-estimate (ŷ > y)' : 'under-estimate (ŷ < y)'; }

/* display name of a class label: 1 → 'Class 1', 'class1' → 'class1' */
function clsName(c) { return /^class/i.test(String(c)) ? String(c) : `Class ${c}`; }
