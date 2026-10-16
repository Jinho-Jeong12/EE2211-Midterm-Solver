'use strict';
/* =====================================================================
   tools_calc.js — functions, derivative, gradient, Jacobian, Hessian,
   min / max / argmin / argmax, stationary points, linear vs affine
   ===================================================================== */

const EXPR_HINT = 'Use x^2, 2x, x*y, sqrt(), exp(), ln(), sin()… (implicit multiplication like <code>3x1</code> is OK; write <code>x*y</code> between two variables)';

function parseF(s, label = 'f') {
  let src = String(s).trim();
  src = src.replace(/^[A-Za-z]\w*\s*\([^)]*\)\s*=\s*/, '').replace(/^[A-Za-z]\w*\s*=\s*/, '');
  try { return EX.parse(src); } catch (e) { throw new UserError(`${label}: ${e.message}`); }
}
function varsOf(node, given) {
  if (given && String(given).trim()) return String(given).split(/[,\s]+/).filter(Boolean);
  return EX.varList(node);
}
function exprBox(n) { return { html: `<code class="expr">${esc(EX.str(n))}</code>` }; }

/* ---------- domain parsing ---------- */
function parseDomain(s) {
  const t = String(s || '').trim().replace(/∞/g, 'inf').replace(/ℝ/g, 'R');
  if (!t || /^(r|all|real|reals|\(-inf,\s*\+?inf\))$/i.test(t)) return { kind: 'int', a: -Infinity, b: Infinity, ca: false, cb: false, txt: '(−∞, ∞)' };
  if (/^\{.*\}$/.test(t)) {
    const vals = t.slice(1, -1).split(/[,;\s]+/).filter(Boolean).map(EX.constVal);
    return { kind: 'set', vals, txt: `{${vals.map(v => fmtNum(v)).join(', ')}}` };
  }
  const m = t.match(/^([\[(])\s*([^,]+?)\s*,\s*([^\])]+?)\s*([\])])$/);
  if (!m) throw new UserError(`Domain "${s}" not understood. Use [a, b], (a, b], (-inf, inf), R, or a finite set {1, 2, 3}`);
  const val = z => (/^[-−]\s*inf/i.test(z) ? -Infinity : /^\+?inf/i.test(z) ? Infinity : EX.constVal(z));
  const a = val(m[2]), b = val(m[3]);
  if (!(a < b)) throw new UserError('Domain needs a < b');
  return { kind: 'int', a, b, ca: m[1] === '[' && isFinite(a), cb: m[4] === ']' && isFinite(b), txt: `${m[1] === '[' && isFinite(a) ? '[' : '('}${fmtNum(a)}, ${fmtNum(b)}${m[4] === ']' && isFinite(b) ? ']' : ')'}` };
}

/* ---------- 1-D analysis ---------- */
function analyze1D(fNode, x, dom) {
  const f = t => EX.evaluate(fNode, { [x]: t });
  let dNode = null, d2Node = null;
  try { dNode = EX.diff(fNode, x); d2Node = EX.diff(dNode, x); } catch (e) { /* numeric fallback */ }
  const numD = (g, t) => { const hh = 1e-5 * Math.max(1, Math.abs(t)); return (g(t + hh) - g(t - hh)) / (2 * hh); };
  const df = dNode ? t => EX.evaluate(dNode, { [x]: t }) : t => numD(f, t);
  const d2f = d2Node ? t => EX.evaluate(d2Node, { [x]: t }) : t => numD(df, t);
  const inDomOpen = t => t > dom.a && t < dom.b;
  const L = isFinite(dom.a) ? dom.a : -100, H = isFinite(dom.b) ? dom.b : 100;
  const span = H - L;
  let crit = [];
  let constant = false;
  const P = dNode && EX.toPoly(dNode);
  const coeffs = P && EX.polyCoeffs(P, x);
  if (coeffs) {
    if (coeffs.every(c => Math.abs(c) < 1e-14)) constant = true;
    else crit = EX.realRoots(coeffs);
  } else {
    const N = 6000;
    let prevT = L, prev = df(L);
    for (let k = 1; k <= N; k++) {
      const t = L + (span * k) / N, cur = df(t);
      if (isFinite(prev) && isFinite(cur) && (prev === 0 || prev * cur < 0)) {
        let a = prevT, b = t, fa = prev;
        if (prev === 0) crit.push(prevT);
        else {
          for (let i = 0; i < 80; i++) { const mid = (a + b) / 2, fm = df(mid); if (fa * fm <= 0) b = mid; else { a = mid; fa = fm; } }
          crit.push((a + b) / 2);
        }
      }
      prevT = t; prev = cur;
    }
  }
  crit = crit.filter(inDomOpen);
  // non-differentiable kinks / missed extrema via grid on f
  const kinks = [];
  if (!constant) {
    const N = 4000, ts = [], fs = [];
    for (let k = 0; k <= N; k++) { const t = L + (span * k) / N; ts.push(t); fs.push(f(t)); }
    for (let k = 1; k < N; k++) {
      const isMin = fs[k] <= fs[k - 1] && fs[k] <= fs[k + 1] && (fs[k] < fs[k - 1] || fs[k] < fs[k + 1]);
      const isMax = fs[k] >= fs[k - 1] && fs[k] >= fs[k + 1] && (fs[k] > fs[k - 1] || fs[k] > fs[k + 1]);
      if (!isMin && !isMax) continue;
      if (crit.some(c => Math.abs(c - ts[k]) < (2 * span) / N)) continue;
      // golden refine
      let a = ts[k - 1], b = ts[k + 1];
      const g = isMin ? f : t => -f(t);
      for (let i = 0; i < 100; i++) { const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618; if (g(m1) < g(m2)) b = m2; else a = m1; }
      const c = (a + b) / 2;
      if (inDomOpen(c) && !kinks.some(q => Math.abs(q - c) < 1e-6)) kinks.push(c);
    }
  }
  const pts = [];
  for (const c of crit) {
    const v2 = d2f(c);
    let type;
    if (v2 > 1e-9) type = 'local min';
    else if (v2 < -1e-9) type = 'local max';
    else {
      const hh = 1e-4 * Math.max(1, Math.abs(c));
      const s1 = df(c - hh), s2 = df(c + hh);
      type = s1 < 0 && s2 > 0 ? 'local min' : s1 > 0 && s2 < 0 ? 'local max' : 'stationary (inflection, not an extremum)';
    }
    pts.push({ x: c, fx: f(c), d2: v2, type, why: `f'(x) = 0, f''(x) = ${fmtNum(v2)}` });
  }
  for (const c of kinks) {
    const hh = 1e-6 * Math.max(1, Math.abs(c));
    const type = f(c) <= f(c - hh) && f(c) <= f(c + hh) ? 'local min' : 'local max';
    pts.push({ x: c, fx: f(c), type, why: "f' undefined / changes sign (corner)" });
  }
  pts.sort((p, q) => p.x - q.x);
  // candidates for global
  const cands = pts.filter(p => p.type.startsWith('local')).map(p => ({ ...p }));
  if (dom.ca) cands.push({ x: dom.a, fx: f(dom.a), type: 'endpoint' });
  if (dom.cb) cands.push({ x: dom.b, fx: f(dom.b), type: 'endpoint' });
  // boundary behaviour
  const ends = [];
  const probe = (t0, dir) => {
    if (isFinite(t0)) {
      const sc = Math.max(1, Math.abs(t0));
      const v3 = f(t0 + dir * 1e-3 * sc), v6 = f(t0 + dir * 1e-6 * sc), v9 = f(t0 + dir * 1e-9 * sc);
      if (!isFinite(v9)) return v9 > 0 || Number.isNaN(v9) ? (v6 > v3 ? Infinity : -Infinity) : v9;
      if (Math.abs(v9 - v6) > 100 * Math.max(1e-9, Math.abs(v6 - v3))) return v9 > v6 ? Infinity : -Infinity;
      return v9;
    }
    const vals = [1e2, 1e3, 1e4, 1e6].map(k => f(-dir * k));
    const last = vals[vals.length - 1];
    if (!isFinite(last)) return last > 0 || Number.isNaN(last) ? (vals[2] > vals[1] ? Infinity : -Infinity) : last;
    const growing = Math.abs(vals[3]) > Math.abs(vals[2]) * 1.5 && Math.abs(vals[2]) > Math.abs(vals[1]) * 1.2;
    return growing ? (vals[3] > 0 ? Infinity : -Infinity) : last;
  };
  if (!dom.ca) ends.push({ side: 'left', at: dom.a, lim: probe(dom.a, +1) });
  if (!dom.cb) ends.push({ side: 'right', at: dom.b, lim: probe(dom.b, -1) });
  return { f, df, d2f, dNode, d2Node, pts, cands, ends, constant };
}

tool({
  id: 'evalf', cat: 'calc', name: 'Evaluate f at a point', short: 'Evaluate f(x)',
  kw: 'evaluate function value plug in 대입 함수값',
  inputs: [
    { k: 'f', type: 'expr', label: 'f', def: 'x1 + x2 - x4^2', hint: EXPR_HINT, wide: true },
    { k: 'pt', type: 'text', label: 'point (x = …)', def: 'x1=1, x2=2, x4=3', ph: 'x=2  or  x1=1, x2=-1' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const env = EX.parseAssign(v.pt);
    R.given('f', exprBox(n)).given('point', Object.entries(env).map(([k, x]) => `${k} = ${fmtNum(x)}`).join(', '));
    const missing = EX.varList(n).filter(k => !(k in env));
    if (missing.length) uerr(`Give a value for: ${missing.join(', ')}`);
    R.answer('f(point)', EX.evaluate(n, env), { sub: fmtExact(EX.evaluate(n, env)) });
  },
});

tool({
  id: 'linaff', cat: 'calc', name: 'Linear vs Affine vs Neither', short: 'Linear / affine?',
  kw: 'linear affine function superposition homogeneity additivity offset bias 선형 아핀 true false',
  desc: 'Linear: f(x) = aᵀx (no constant). Affine: f(x) = aᵀx + b. Anything with x², x·y, sin… is neither.',
  inputs: [{ k: 'f', type: 'expr', label: 'f', def: '2.3 - 2x1 + 1.3x2 - x3', hint: EXPR_HINT, wide: true }],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = EX.varList(n);
    R.given('f', exprBox(n)).given('variables', xs.join(', ') || '(none)');
    R.formula('linear ⇔ f(αx + βy) = αf(x) + βf(y) ⇔ f(x) = aᵀx ;  affine ⇔ f(x) = aᵀx + b');
    let affine = true;
    const a = [];
    for (const x of xs) {
      const g = EX.diff(n, x);
      a.push(g);
      for (const z of xs) {
        const hz = EX.diff(g, z);
        if (!(hz.t === 'num' && hz.v === 0)) {
          // numeric double-check
          const env = {}; xs.forEach(k => (env[k] = Math.random() * 3 + 0.5));
          const val = EX.evaluate(hz, env);
          if (Math.abs(val) > 1e-9) affine = false;
        }
      }
    }
    const zero = {}; xs.forEach(k => (zero[k] = 0));
    let b = 0;
    try { b = EX.evaluate(n, zero); } catch (e) { affine = false; }
    if (affine) {
      const av = a.map(g => EX.evaluate(g, zero));
      R.step('a (coefficients = ∇f, constant)', av, { rowLabels: xs });
      R.step('b = f(0) (offset / bias)', b);
      const lin = Math.abs(b) < 1e-12;
      R.answer('Type', lin ? '<b class="yes">LINEAR</b> (and therefore also affine)' : '<b>AFFINE but NOT linear</b>', { sub: lin ? 'f(x) = aᵀx' : `f(x) = aᵀx + b with b = ${fmtNum(b)} ≠ 0 ⇒ f(0) ≠ 0, superposition fails` });
      if (!lin) R.check('superposition test', undefined, { note: `f(2·0) = ${fmtNum(b)} but 2·f(0) = ${fmtNum(2 * b)}` });
    } else {
      R.answer('Type', '<b class="no">NEITHER linear nor affine</b>', { sub: 'contains non-linear terms (powers, products of variables, functions) — second derivatives are not all zero' });
    }
    R.note('Note: a polynomial model f(x) = w₀ + w₁x₁ + w₁₂x₁x₂ + w₁₁x₁² … is NONLINEAR in x, but still LINEAR in the parameters w (that is why least squares still works).', 'info', 'check');
  },
});

tool({
  id: 'deriv', cat: 'calc', name: 'Derivative df/dx (and f″)', short: 'Derivative',
  kw: 'derivative differentiate 미분 slope f prime second derivative',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x)', def: 'x^3 - 6x^2 + 9x + 1', hint: EXPR_HINT, wide: true },
    { k: 'x', type: 'text', label: 'with respect to (w.r.t.) variable', def: '', ph: 'auto' },
    { k: 'at', type: 'number', label: 'evaluate at x = (optional)', def: '', optional: true },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = EX.varList(n);
    const x = (v.x || '').trim() || xs[0] || 'x';
    R.given('f', exprBox(n)).given('variable', x);
    const d1 = EX.diff(n, x), d2 = EX.diff(d1, x);
    R.find(`df/d${x}`);
    R.answer(`df/d${x}`, exprBox(d1));
    R.step(`d²f/d${x}²`, exprBox(d2));
    if (v.at != null) {
      if (xs.length > 1) uerr('Evaluation point needs values of all variables — use Partial derivative / Gradient tools.');
      const e = { [x]: v.at };
      R.answer(`f′(${fmtNum(v.at)})`, EX.evaluate(d1, e), { sub: `f(${fmtNum(v.at)}) = ${fmtNum(EX.evaluate(n, e))},  f″(${fmtNum(v.at)}) = ${fmtNum(EX.evaluate(d2, e))}` });
      const s = EX.evaluate(d1, e);
      R.note(s > 0 ? 'f′ > 0 → f is increasing here' : s < 0 ? 'f′ < 0 → f is decreasing here' : 'f′ = 0 → horizontal slope (possible max/min)', 'info', 'check');
    }
    R.code(`import sympy as sp\n${x} = sp.symbols('${x}')\nf = ${EX.str(n, true).replace(/np\./g, 'sp.')}\nprint(sp.diff(f, ${x}))`);
  },
});

tool({
  id: 'partial', cat: 'calc', name: 'Partial derivative ∂f/∂xᵢ', short: 'Partial ∂f/∂xᵢ',
  kw: 'partial derivative 편미분',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x₁,…,x_d)', def: 'x1^2 + 3x1*x2 - 2x2', hint: EXPR_HINT, wide: true },
    { k: 'x', type: 'text', label: 'variable', def: 'x1' },
    { k: 'pt', type: 'text', label: 'point (optional)', def: 'x1=1, x2=2', ph: 'x1=1, x2=2' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const x = v.x.trim();
    if (!x) uerr('Choose a variable');
    R.given('f', exprBox(n));
    const d = EX.diff(n, x);
    R.answer(`∂f/∂${x}`, exprBox(d), { sub: 'treat every other variable as a constant' });
    if (String(v.pt).trim()) {
      const env = EX.parseAssign(v.pt);
      R.answer(`∂f/∂${x} at point`, EX.evaluate(d, env));
    }
  },
});

tool({
  id: 'grad', cat: 'calc', name: 'Gradient ∇f (column vector)', short: 'Gradient ∇f',
  kw: 'gradient nabla 그래디언트 기울기 vector partial derivatives',
  desc: 'For scalar f of a d×1 vector x, ∇ₓf is a d×1 vector of partial derivatives.',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x)', def: '(w0 + w1 - 1)^2 + (w0 - w1)^2', hint: EXPR_HINT, wide: true },
    { k: 'vars', type: 'text', label: 'variable order (optional)', def: '', ph: 'auto, for example x1, x2' },
    { k: 'pt', type: 'text', label: 'evaluate at (optional)', def: 'w0=1, w1=2' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = varsOf(n, v.vars);
    R.given('f', exprBox(n)).given('x', `[${xs.join(', ')}]ᵀ (${xs.length}×1)`);
    R.formula(`∇f = [∂f/∂${xs.join(', ∂f/∂')}]ᵀ`, `${xs.length}×1 column vector`);
    const g = xs.map(x => EX.diff(n, x));
    R.table(['component', 'expression'], g.map((gi, i) => [`∂f/∂${xs[i]}`, `<code class="expr">${esc(EX.str(gi))}</code>`]), 'answer');
    if (String(v.pt).trim()) {
      const env = EX.parseAssign(v.pt);
      R.answer('∇f at point', g.map(gi => EX.evaluate(gi, env)), { rowLabels: xs });
      R.check('f at point', EX.evaluate(n, env));
    }
    R.note('Set ∇f = 0 to find stationary points → use “Stationary points / minimise f(x)”.', 'info', 'check');
  },
});

tool({
  id: 'jacobian', cat: 'calc', name: 'Jacobian of a vector function', short: 'Jacobian',
  kw: 'jacobian vector function matrix partial 야코비안 h x d',
  desc: 'One component per line. For f: ℝᵈ → ℝʰ the Jacobian is h×d: row i = ∇fᵢᵀ.',
  inputs: [
    { k: 'fs', type: 'exprs', label: 'f₁, f₂, … (one per line)', def: '-2x1\n3x1', rows: 4, wide: true },
    { k: 'vars', type: 'text', label: 'variables x (order)', def: '', ph: 'auto, for example x1, x2' },
    { k: 'pt', type: 'text', label: 'evaluate at (optional)', def: '' },
  ],
  solve(v, R) {
    const lines = String(v.fs).split(/\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) uerr('Enter at least one function');
    const nodes = lines.map((s, i) => parseF(s, `f${i + 1}`));
    let xs = String(v.vars).trim() ? varsOf(null, v.vars) : [...new Set(nodes.flatMap(nd => EX.varList(nd)))].sort(EX.natSort);
    R.given('f(x)', nodes.map((nd, i) => `f${sub(i + 1)} = ${esc(EX.str(nd))}`).join('<br>')).given('x', `[${xs.join(', ')}]ᵀ`);
    R.formula('J = ∂f/∂x = [∂fᵢ/∂xⱼ]', `${nodes.length}×${xs.length} (h×d)`);
    const J = nodes.map(nd => xs.map(x => EX.diff(nd, x)));
    R.table(['', ...xs.map(x => `∂/∂${x}`)], J.map((row, i) => [`f${sub(i + 1)}`, ...row.map(e => `<code class="expr">${esc(EX.str(e))}</code>`)]), 'answer');
    if (String(v.pt).trim()) {
      const env = EX.parseAssign(v.pt);
      R.answer('J at point', J.map(r => r.map(e => EX.evaluate(e, env))));
    } else {
      const allConst = J.every(r => r.every(e => e.t === 'num'));
      if (allConst) R.answer('J (constant)', J.map(r => r.map(e => e.v)));
    }
  },
});

tool({
  id: 'hessian', cat: 'calc', name: 'Hessian (2nd derivatives) & convexity', short: 'Hessian',
  kw: 'hessian second derivative convex concave eigenvalues',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x)', def: 'x1^2 + x1*x2 + 2x2^2 - 4x1', hint: EXPR_HINT, wide: true },
    { k: 'pt', type: 'text', label: 'evaluate at (optional)', def: '' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = EX.varList(n);
    R.given('f', exprBox(n));
    const Hn = xs.map(a => xs.map(b => EX.diff(EX.diff(n, a), b)));
    R.table(['', ...xs], Hn.map((r, i) => [xs[i], ...r.map(e => `<code class="expr">${esc(EX.str(e))}</code>`)]), 'answer');
    const env = String(v.pt).trim() ? EX.parseAssign(v.pt) : Object.fromEntries(xs.map(x => [x, 0]));
    const H = Hn.map(r => r.map(e => EX.evaluate(e, env)));
    const ev = LA.eigSym(H).values;
    R.answer('H (numeric' + (String(v.pt).trim() ? ' at point' : ' at 0') + ')', H);
    R.check('eigenvalues', ev.map(x => fmtNum(x)).join(', '), { note: ev.every(x => x > 1e-10) ? 'all > 0 → positive definite (convex, bowl)' : ev.every(x => x < -1e-10) ? 'all < 0 → negative definite (concave)' : 'mixed/zero → indefinite / semi-definite' });
  },
});

tool({
  id: 'minmax1d', cat: 'calc', name: 'Local / Global minimum & maximum · argmin / argmax (1 variable)', short: 'Minimum / Maximum / argmin / argmax',
  kw: 'minimum maximum min max argmin argmax local global extremum optimization domain interval 최솟값 최댓값 극값',
  desc: 'max / min = <b>function VALUE</b> (output). argmax / argmin = the <b>INPUT x</b> that gives it. Domain examples: <code>[0, 1]</code>, <code>(0, 1]</code>, <code>(-inf, inf)</code> or <code>R</code>, finite set <code>{1, 2, 3}</code>.',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x)', def: 'x^3 - 6x^2 + 9x + 1', hint: EXPR_HINT, wide: true },
    { k: 'dom', type: 'text', label: 'domain', def: '[0, 5]', ph: '[a, b]  (a, b)  R  {1,2,3}' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = EX.varList(n);
    if (xs.length > 1) uerr(`f has several variables (${xs.join(', ')}). Use “Stationary points (multivariable)”.`);
    const x = xs[0] || 'x';
    const dom = parseDomain(v.dom);
    R.given('f', exprBox(n)).given('domain', dom.txt);
    R.find('local & global minimum/maximum: location (argmin/argmax) and value (min/max)');
    if (dom.kind === 'set') {
      const f = t => EX.evaluate(n, { [x]: t });
      const vals = dom.vals.map(t => ({ x: t, fx: f(t) }));
      R.table([x, `f(${x})`], vals.map(p => [p.x, p.fx]));
      const mx = Math.max(...vals.map(p => p.fx)), mn = Math.min(...vals.map(p => p.fx));
      R.answer('max f', mx).answer('argmax', vals.filter(p => Math.abs(p.fx - mx) < 1e-12).map(p => fmtNum(p.x)).join(', '));
      R.answer('min f', mn).answer('argmin', vals.filter(p => Math.abs(p.fx - mn) < 1e-12).map(p => fmtNum(p.x)).join(', '));
      return;
    }
    const A = analyze1D(n, x, dom);
    R.formula(`f′(${x}) = 0 (stationary points) + check endpoints`, 'f″ > 0 ⇒ local min, f″ < 0 ⇒ local max');
    if (A.dNode) R.step(`f′(${x})`, exprBox(A.dNode));
    if (A.d2Node) R.step(`f″(${x})`, exprBox(A.d2Node));
    if (A.constant) {
      R.answer('Result', 'f is constant → every x is both a global min and max', { sub: `f = ${fmtNum(A.f(0))}` });
      return;
    }
    if (!isFinite(dom.a) || !isFinite(dom.b)) R.note('Unbounded domain: critical points are found exactly for polynomials; otherwise searched on [−100, 100].', 'info');
    R.table(['x (argument)', 'f(x) (value)', 'type', 'reason'],
      A.pts.map(p => [p.x, p.fx, p.type, p.why]).concat(A.cands.filter(c => c.type === 'endpoint').map(c => [c.x, c.fx, 'endpoint (closed)', 'include in global comparison'])));
    if (!A.pts.length) R.note('No stationary point inside the domain.', 'info');
    const locMin = A.pts.filter(p => p.type === 'local min'), locMax = A.pts.filter(p => p.type === 'local max');
    locMin.forEach(p => R.answer('Local minimum', `${x} = <b>${fmtNum(p.x)}</b>, f(x) = <b>${fmtNum(p.fx)}</b>`));
    locMax.forEach(p => R.answer('Local maximum', `${x} = <b>${fmtNum(p.x)}</b>, f(x) = <b>${fmtNum(p.fx)}</b>`));
    const tol = 1e-9;
    const cv = A.cands.map(c => c.fx);
    const cMax = cv.length ? Math.max(...cv) : -Infinity, cMin = cv.length ? Math.min(...cv) : Infinity;
    let gmax = null, gmin = null, supNote = '', infNote = '';
    const endMax = A.ends.filter(e => e.lim > cMax + tol), endMin = A.ends.filter(e => e.lim < cMin - tol);
    const topMax = endMax.length ? Math.max(...endMax.map(e => e.lim)) : null;
    const topMin = endMin.length ? Math.min(...endMin.map(e => e.lim)) : null;
    if (endMax.length) supNote = endMax.filter(e => e.lim === topMax).map(e => e.lim === Infinity ? `f → +∞ as ${x} → ${fmtNum(e.at)}${isFinite(e.at) ? (e.side === 'left' ? '⁺' : '⁻') : ''}` : `sup = ${fmtNum(e.lim)} approached at the open end ${x} → ${fmtNum(e.at)} (not attained)`).join('; ');
    else if (cv.length) gmax = A.cands.filter(c => Math.abs(c.fx - cMax) < 1e-9 * Math.max(1, Math.abs(cMax)));
    if (endMin.length) infNote = endMin.filter(e => e.lim === topMin).map(e => e.lim === -Infinity ? `f → −∞ as ${x} → ${fmtNum(e.at)}${isFinite(e.at) ? (e.side === 'left' ? '⁺' : '⁻') : ''}` : `inf = ${fmtNum(e.lim)} approached at the open end ${x} → ${fmtNum(e.at)} (not attained)`).join('; ');
    else if (cv.length) gmin = A.cands.filter(c => Math.abs(c.fx - cMin) < 1e-9 * Math.max(1, Math.abs(cMin)));
    if (gmax) R.answer('Global max:  max f(x)  (VALUE)', cMax, { sub: `argmax = ${x} = <b>${gmax.map(c => fmtNum(c.x)).join(', ')}</b> (INPUT)` });
    else R.answer('Global max', '<b class="no">none (not attained)</b>', { sub: supNote || 'no candidate' });
    if (gmin) R.answer('Global min:  min f(x)  (VALUE)', cMin, { sub: `argmin = ${x} = <b>${gmin.map(c => fmtNum(c.x)).join(', ')}</b> (INPUT)` });
    else R.answer('Global min', '<b class="no">none (not attained)</b>', { sub: infNote || 'no candidate' });
    R.code(`import numpy as np\nx = np.linspace(${isFinite(dom.a) ? pyNum(dom.a) : -10}, ${isFinite(dom.b) ? pyNum(dom.b) : 10}, 100001)\nf = ${EX.str(n, true).replace(new RegExp('\\b' + x + '\\b', 'g'), 'x')}\ni_max, i_min = np.argmax(f), np.argmin(f)\nprint('max f =', f[i_max], ' argmax x =', x[i_max])\nprint('min f =', f[i_min], ' argmin x =', x[i_min])`);
  },
});

tool({
  id: 'setmax', cat: 'calc', name: 'Maximum (max) / argmax over a finite set 𝒜', short: 'Maximum / argmax on a set',
  kw: 'max argmax min argmin set finite discrete 집합',
  desc: 'max returns the highest VALUE f(a); argmax returns the ELEMENT a that achieves it. for example f(a) = 3a on [0,1] → max = 3, argmax = 1.',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(a)', def: '3a', wide: true },
    { k: 'set', type: 'text', label: 'set 𝒜', def: '0, 0.5, 1' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const x = EX.varList(n)[0] || 'a';
    const vals = parseList(v.set);
    const pts = vals.map(t => ({ a: t, f: EX.evaluate(n, { [x]: t }) }));
    R.given('f', exprBox(n)).given('𝒜', `{${vals.map(t => fmtNum(t)).join(', ')}}`);
    R.table([x, 'f'], pts.map(p => [p.a, p.f]));
    const mx = Math.max(...pts.map(p => p.f)), mn = Math.min(...pts.map(p => p.f));
    R.answer('max f(a)  (value)', mx, { sub: 'argmax = ' + pts.filter(p => p.f === mx).map(p => fmtNum(p.a)).join(', ') + ' (element)' });
    R.answer('min f(a)  (value)', mn, { sub: 'argmin = ' + pts.filter(p => p.f === mn).map(p => fmtNum(p.a)).join(', ') + ' (element)' });
  },
});

/* ---------- multivariable stationary points ---------- */
function stationary(n, xs) {
  const g = xs.map(x => EX.diff(n, x));
  const Hn = xs.map((a, i) => xs.map(b => EX.diff(g[i], b)));
  const ev = (nodes, p) => { const env = {}; xs.forEach((x, i) => (env[x] = p[i])); return nodes.map(e => (Array.isArray(e) ? e.map(q => EX.evaluate(q, env)) : EX.evaluate(e, env))); };
  const starts = [xs.map(() => 0), xs.map(() => 1), xs.map(() => -1)];
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 20 - 10;
  for (let k = 0; k < 60; k++) starts.push(xs.map(rnd));
  const found = [];
  for (const s of starts) {
    let p = s.slice();
    let ok = false;
    for (let it = 0; it < 100; it++) {
      const gv = ev(g, p);
      const gn = Math.hypot(...gv);
      if (!isFinite(gn)) break;
      if (gn < 1e-11) { ok = true; break; }
      const H = ev(Hn, p);
      const Hi = LA.inv(H) || LA.pinv(H);
      const step = LA.mul(Hi, LA.col(gv)).map(r => r[0]);
      let t = 1, np2;
      for (let bt = 0; bt < 30; bt++) {
        np2 = p.map((q, i) => q - t * step[i]);
        const g2 = Math.hypot(...ev(g, np2));
        if (isFinite(g2) && g2 < gn) break;
        t /= 2;
      }
      p = np2;
    }
    if (!ok) { const gn = Math.hypot(...ev(g, p)); ok = gn < 1e-8; }
    if (ok && !found.some(q => Math.hypot(...q.map((a, i) => a - p[i])) < 1e-6)) found.push(p.map(a => (Math.abs(a) < 1e-12 ? 0 : a)));
  }
  return found.map(p => {
    const H = ev(Hn, p);
    const e = LA.eigSym(H).values;
    let type;
    if (e.every(x => x > 1e-9)) type = 'local MIN (H positive definite)';
    else if (e.every(x => x < -1e-9)) type = 'local MAX (H negative definite)';
    else if (e.some(x => x > 1e-9) && e.some(x => x < -1e-9)) type = 'SADDLE point';
    else type = 'inconclusive (H semi-definite)';
    const env = {}; xs.forEach((x, i) => (env[x] = p[i]));
    return { p, fx: EX.evaluate(n, env), H, e, type };
  }).sort((a, b) => a.fx - b.fx);
}

tool({
  id: 'stationary', cat: 'calc', name: 'Stationary points / minimise f(x) (∇f = 0, multivariable)', short: '∇f = 0',
  kw: 'stationary critical point minimize minimise objective J(w) argmin gradient zero optimization multivariable saddle 최적화',
  desc: 'Solves ∇f = 0 and classifies each point with the Hessian. Works for any J(w) you type, for example <code>(w0+w1-1)^2 + (w0-w1)^2 + 0.1(w0^2+w1^2)</code>.',
  inputs: [
    { k: 'f', type: 'expr', label: 'f(x) or J(w)', def: 'x1^2 + x1*x2 + 2x2^2 - 4x1', hint: EXPR_HINT, wide: true },
    { k: 'vars', type: 'text', label: 'variables (optional order)', def: '' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const xs = varsOf(n, v.vars);
    if (!xs.length) uerr('No variables found');
    R.given('f', exprBox(n)).given('variables', xs.join(', '));
    R.find('points where ∇f = 0, their type, and the minimum value vs. the minimising argument');
    R.formula('∇f = 0, then Hessian H: all eigenvalues > 0 ⇒ min, < 0 ⇒ max, mixed ⇒ saddle');
    xs.forEach(x => R.step(`∂f/∂${x}`, exprBox(EX.diff(n, x)), { note: '= 0' }));
    const pts = stationary(n, xs);
    if (!pts.length) { R.answer('Result', 'No stationary point found (f may be unbounded / linear).'); return; }
    R.table([...xs, 'f', 'Hessian eigenvalues', 'type'], pts.map(q => [...q.p, q.fx, q.e.map(z => fmtNum(z)).join(', '), q.type]));
    const mins = pts.filter(q => q.type.startsWith('local MIN'));
    const P = EX.toPoly(n);
    const quad = P && EX.polyDeg(P) <= 2;
    mins.forEach(q => R.answer('argmin (the INPUT)', q.p, { rowLabels: xs, sub: `min value f = <b>${fmtNum(q.fx)}</b> (the OUTPUT)${quad && mins.length === 1 ? ' — quadratic with Positive Definite (PD) Hessian ⇒ this is the GLOBAL minimum' : ''}` }));
    pts.filter(q => q.type.startsWith('local MAX')).forEach(q => R.answer('argmax (INPUT)', q.p, { rowLabels: xs, sub: `max value f = <b>${fmtNum(q.fx)}</b>` }));
    if (!mins.length && !pts.some(q => q.type.startsWith('local MAX'))) R.answer('Result', 'Stationary point(s) found but none is a min/max (see table).');
  },
});

tool({
  id: 'vecderiv', cat: 'calc', name: 'Vector–matrix derivative formulas (d(Ax)/dx …)', short: 'd(xᵀAx)/dx …',
  kw: 'vector matrix differentiation formula d(Ax)/dx d(b^T x)/dx x^T A x y^T A x gradient of J(w) normal equation',
  desc: 'd(Ax)/dx = A · d(bᵀx)/dx = b · d(xᵀAx)/dx = (A + Aᵀ)x · d(yᵀAx)/dx = Aᵀy · ∇J for J(w) = ‖Xw − y‖² + λ‖w‖².',
  inputs: [
    { k: 'which', type: 'select', label: 'formula', def: 'xAx', options: [['Ax', 'd(Ax)/dx = A'], ['bx', 'd(bᵀx)/dx = b'], ['xAx', 'd(xᵀAx)/dx = (A + Aᵀ)x'], ['yAx', 'd(yᵀAx)/dx = Aᵀy'], ['J', '∇J(w) = 2XᵀXw − 2Xᵀy + 2λw']] },
    { k: 'A', type: 'matrix', label: 'A (or X for ∇J)', def: [[1, 2], [3, 4]], group: 'm', showIf: r => r.which !== 'bx' },
    { k: 'b', type: 'vector', label: 'b', def: [1, 2], group: 'm', showIf: r => r.which === 'bx' },
    { k: 'x', type: 'vector', label: 'x (or w for ∇J)', def: [1, 1], group: 'm', showIf: r => ['xAx', 'J', 'bx', 'Ax'].includes(r.which) },
    { k: 'y', type: 'vector', label: 'y', def: [1, 0], group: 'm', showIf: r => ['yAx', 'J'].includes(r.which) },
    { k: 'lam', type: 'number', label: 'λ (for ∇J)', def: '0', showIf: r => r.which === 'J' },
  ],
  solve(v, R) {
    const { A, b, x, y } = v;
    switch (v.which) {
      case 'Ax': R.formula('d(Ax)/dx = A'); R.given('A', A); R.answer('d(Ax)/dx', A, { sub: `Jacobian, ${LA.dims(A)}` }); break;
      case 'bx': R.formula('d(bᵀx)/dx = b'); R.answer('d(bᵀx)/dx', b); break;
      case 'xAx': {
        R.formula('d(xᵀAx)/dx = (A + Aᵀ)x', 'if A is symmetric: 2Ax');
        const S2 = LA.add(A, LA.T(A));
        R.given('A', A).given('x', x).step('A + Aᵀ', S2);
        R.answer('(A + Aᵀ)x', LA.mul(S2, LA.col(x), 'A+Aᵀ', 'x').map(r => r[0]));
        R.check('xᵀAx', LA.mul([x], LA.mul(A, LA.col(x)))[0][0]);
        break;
      }
      case 'yAx': R.formula('d(yᵀAx)/dx = Aᵀy'); R.given('A', A).given('y', y); R.answer('Aᵀy', LA.mul(LA.T(A), LA.col(y), 'Aᵀ', 'y').map(r => r[0])); break;
      case 'J': {
        R.formula('J(w) = (Xw − y)ᵀ(Xw − y) + λwᵀw  ⇒  ∇J = 2XᵀXw − 2Xᵀy + 2λw', 'set ∇J = 0 ⇒ (XᵀX + λI)w = Xᵀy');
        const X = A, w = LA.col(x), Y = LA.col(y);
        const g = LA.add(LA.sub(LA.scale(LA.mul(LA.mul(LA.T(X), X), w), 2), LA.scale(LA.mul(LA.T(X), Y, 'Xᵀ', 'y'), 2)), LA.scale(w, 2 * v.lam));
        R.given('X', X).given('w', x).given('y', y).given('λ', v.lam);
        R.answer('∇J(w)', g.map(r => r[0]));
        const e = LA.sub(LA.mul(X, w), Y);
        R.check('J(w)', e.flat().reduce((s, t) => s + t * t, 0) + v.lam * x.reduce((s, t) => s + t * t, 0));
        break;
      }
    }
  },
});
