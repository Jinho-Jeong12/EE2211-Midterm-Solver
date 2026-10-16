'use strict';
/* =====================================================================
   tools_merged.js — solvers that take the SAME input are merged:
   one input → every related result on one page. The absorbed solvers
   stay registered (old links / glossary still work) but are hidden from
   the menu and redirect to the merged page (t.alias).
   Loaded after textinput.js (so its input modes are already applied)
   and before tools_glossary.js.
   ===================================================================== */

/* hide `ids`, send their links + search words to `host` */
function absorb(host, ids) {
  const H = TOOL_BY_ID[host];
  for (const id of ids) {
    const t = TOOL_BY_ID[id];
    if (!t) continue;
    t.alias = host;
    if (typeof GUIDE !== 'undefined' && GUIDE[id]) GUIDE[host] = (GUIDE[host] || []).concat(GUIDE[id].filter(g => !(GUIDE[host] || []).some(x => x[0] === g[0])));
    H.kw = (H.kw || '') + ' ' + t.name + ' ' + (t.short || '') + ' ' + (t.kw || '');
  }
}
/* run the host as before, then append each part (each one is a full sub-report) */
function withParts(host, parts) {
  const H = TOOL_BY_ID[host], orig = H.solve;
  H.solve = (v, R) => {
    orig(v, R); // may convert v (text input modes) before the parts read it
    const run = parts(v).filter(Boolean);
    if (run.length) R.raw(`<div class="partlist">이 페이지에서 한 번에 계산: <b>${[H.short || H.name, ...run.map(p => p[0])].map((s, i) => `${'①②③④⑤⑥⑦⑧⑨⑩⑪⑫'[i]} ${s}`).join(' · ')}</b></div>`);
    run.forEach(([title, fn], i) => R.part(`${'②③④⑤⑥⑦⑧⑨⑩⑪⑫'[i]} ${title}`, fn));
  };
}

/* ---------- 1. Matrix A → everything ---------- */
{
  const M = TOOL_BY_ID.report;
  M.name = 'Matrix A — everything at once (rank · determinant · inverse · minors · cofactor · adjugate · transpose · pseudoinverse)';
  M.short = 'Matrix A — everything';
  M.desc = '행렬 A 하나만 넣으면 관련된 모든 결과를 한 번에: 크기, rank (row echelon 단계), 역행렬 존재 여부 (left / right inverse), determinant (전개 과정), minors, cofactor, adjugate, inverse, transpose, pseudoinverse.';
  withParts('report', v => {
    const A = v.A, sq = A.length === A[0].length;
    const part = (title, id, extra = {}) => [title, r => TOOL_BY_ID[id].solve({ A, X: A, row: 1, ...extra }, r)];
    return [
      part('Rank (row echelon steps)', 'rank'),
      part('Invertible? left / right inverse', 'invcheck'),
      sq && part('Determinant det(A) (expansion)', 'det'),
      sq && part('Matrix of minors', 'minors'),
      sq && part('Cofactor matrix C', 'cofactor'),
      sq && part('Adjugate adj(A) = Cᵀ', 'adj'),
      sq && part('Inverse A⁻¹ = adj(A) / det(A)', 'inverse'),
      part('Transpose Aᵀ', 'transpose'),
      part('Pseudoinverse A† (left / right inverse)', 'pinv'),
    ];
  });
  absorb('report', ['transpose', 'minors', 'cofactor', 'adj', 'inverse', 'rank', 'invcheck', 'det', 'minor', 'cofactor1', 'pinv']);
}

/* ---------- 2. Linear system Xw = y → solution + solution type ---------- */
{
  const S = TOOL_BY_ID.solve;
  S.name = 'Solve Xw = y — everything at once (solution type · solution w · invertibility)';
  S.short = 'Solve Xw = y — everything';
  withParts('solve', v => {
    const X = v.form === 'wX' ? LA.T(v.X) : v.X, y = v.y; // wᵀX = yᵀ ⇔ Xᵀw = y
    return [
      ['Solution type: unique / infinitely many / none (rank test)', r => TOOL_BY_ID.soltype.solve({ X, y }, r)],
      ['Is the coefficient matrix invertible? left / right inverse', r => TOOL_BY_ID.invcheck.solve({ A: X }, r)],
    ];
  });
  absorb('solve', ['soltype']);
}

/* ---------- 3. Linear regression + ridge (same X, y, bias, X_new; λ = 0 → plain least squares) ---------- */
{
  const L = TOOL_BY_ID.lrtrain, ridge = TOOL_BY_ID.ridgeauto.solve, plain = L.solve;
  L.name = 'Linear regression / Ridge regression — Train ŵ + Predict + every error (λ = 0 → least squares)';
  L.short = 'Train + Predict (Linear / Ridge)';
  const at = L.inputs.findIndex(s => s.k === 'doPred');
  L.inputs.splice(at, 0,
    { k: 'lam', type: 'number', label: 'ridge λ (lambda) — <b>0 = 일반 linear regression</b>, 문제에 λ 가 있으면 그 값', def: '0' },
    { k: 'mode', type: 'select', label: 'Ridge form', def: 'auto', options: [['auto', 'Auto (m > d → primal, m < d → dual)'], ['primal', 'Force primal (XᵀX + λI)⁻¹Xᵀy'], ['dual', 'Force dual Xᵀ(XXᵀ + λI)⁻¹y']], showIf: r => +r.lam > 0 });
  L.solve = (v, R) => {
    if (!(v.lam >= 0)) uerr('λ must be ≥ 0');
    if (v.lam > 0) return ridge(v, R);
    plain(v, R);
  };
  withParts('lrtrain', v => [
    !(v.lam > 0) && ['Normal equation derivation (XᵀXw = Xᵀy)', r => TOOL_BY_ID.normaleq.solve({ X: v.X, y: v.y, bias: v.bias }, r)],
  ]);
  absorb('lrtrain', ['ridgeauto', 'ridgeprimal', 'ridgedual', 'normaleq']);
  absorb('lrloss', ['ridgeJ']);
  absorb('lrpredict', ['ridgepredict']);
  TOOL_BY_ID.lrloss.short = 'Loss / J(w) (Linear / Ridge)';
}

/* ---------- 4. Function f → everything ---------- */
tool({
  id: 'func', cat: 'calc', name: 'Function f — everything at once (value · derivative · gradient · Hessian · stationary points · min / max · linear / affine)', short: 'Function f — everything',
  kw: 'function analysis everything 함수 한번에 미분 derivative gradient hessian minimum maximum stationary linear affine evaluate',
  desc: '함수 f 하나만 넣으면 관련 결과를 한 번에. 변수 1 개면 미분 · f″ · min / max / argmin / argmax, 여러 개면 편미분 · gradient · Hessian · ∇f = 0. 점(point)을 주면 그 점에서의 값도.',
  inputs: [
    { k: 'f', type: 'expr', label: 'f', def: 'x^3 - 6x^2 + 9x + 1', hint: EXPR_HINT, wide: true },
    { k: 'pt', type: 'text', label: 'point (optional) — 값을 구할 점', def: 'x=2', ph: 'x=2   or   x1=1, x2=-1' },
    { k: 'dom', type: 'text', label: 'domain for min / max (1 variable, optional)', def: '[0, 5]', ph: '[a, b]  (a, b)  R  {1,2,3}' },
  ],
  solve(v, R) {
    const n = parseF(v.f), xs = EX.varList(n);
    const pt = String(v.pt || '').trim(), env = pt ? EX.parseAssign(pt) : {};
    R.given('f', exprBox(n)).given('variables', xs.join(', ') || '(none — constant)');
    if (pt) R.given('point', pt);
    const parts = [['Linear vs affine vs neither', r => TOOL_BY_ID.linaff.solve({ f: v.f }, r)]];
    if (pt) parts.push(['Value f(point)', r => TOOL_BY_ID.evalf.solve({ f: v.f, pt }, r)]);
    if (xs.length === 1) {
      const x = xs[0];
      parts.push([`Derivative df/d${x} and second derivative`, r => TOOL_BY_ID.deriv.solve({ f: v.f, x, at: x in env ? env[x] : null }, r)]);
      parts.push(['Minimum / maximum · argmin / argmax · stationary points', r => TOOL_BY_ID.minmax1d.solve({ f: v.f, dom: String(v.dom || '').trim() || 'R' }, r)]);
    } else if (xs.length > 1) {
      parts.push(['Partial derivatives and gradient ∇f', r => TOOL_BY_ID.grad.solve({ f: v.f, vars: '', pt }, r)]);
      parts.push(['Hessian and convexity', r => TOOL_BY_ID.hessian.solve({ f: v.f, pt }, r)]);
      parts.push(['Stationary points ∇f = 0 (minimise)', r => TOOL_BY_ID.stationary.solve({ f: v.f, vars: '' }, r)]);
    }
    R.raw(`<div class="partlist">이 페이지에서 한 번에 계산: <b>${parts.map((p, i) => `${'①②③④⑤⑥'[i]} ${p[0]}`).join(' · ')}</b></div>`);
    parts.forEach(([title, fn], i) => R.part(`${'①②③④⑤⑥'[i]} ${title}`, fn));
  },
});
TOOLS.splice(TOOLS.indexOf(TOOL_BY_ID.func), 1);
TOOLS.splice(TOOLS.findIndex(t => t.cat === 'calc'), 0, TOOL_BY_ID.func); // first in its menu group
absorb('func', ['evalf', 'linaff', 'deriv', 'partial', 'grad', 'hessian', 'minmax1d', 'stationary']);

/* ---------- 5. Numbers → statistics (+ correlation when a second list is given) ---------- */
{
  const D = TOOL_BY_ID.descstats;
  D.name = 'Statistics of a data set — everything at once (mean · median · mode · variance · standard deviation · quartiles · correlation r)';
  D.short = 'Statistics — everything';
  withParts('descstats', v => {
    if (!String(v.y || '').trim()) return [];
    return [['Pearson correlation coefficient r (x with y)', r => TOOL_BY_ID.pearson.solve({ x: parseList(v.x), y: parseList(v.y) }, r)]];
  });
  absorb('descstats', ['pearson']);
}
