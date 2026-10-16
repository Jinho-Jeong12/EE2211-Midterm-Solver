'use strict';
/* =====================================================================
   tools_basic.js — keyboard calculator, solve(equation, x) and
   simultaneous equations. Every number is shown as a decimal AND as an
   exact form (fraction, k√m, kπ) whenever one exists.
   ===================================================================== */

/* ---------- exact rationals (BigInt) ---------- */
const Q = {
  MAXBITS: 4000n,
  gcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) [a, b] = [b, a % b]; return a; },
  mk(n, d = 1n) {
    if (d === 0n) return null;
    if (d < 0n) { n = -n; d = -d; }
    const g = Q.gcd(n, d) || 1n;
    n /= g; d /= g;
    const big = x => (x < 0n ? -x : x) > (1n << Q.MAXBITS);
    if (big(n) || big(d)) return null;
    return { n, d };
  },
  int: k => ({ n: BigInt(k), d: 1n }),
  fromNum(x) {
    if (typeof x !== 'number' || !isFinite(x)) return null;
    const m = String(x).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/);
    if (!m) return null;
    const frac = m[3] || '';
    const exp = (m[4] ? +m[4] : 0) - frac.length;
    if (Math.abs(exp) > 330) return null;
    let n = BigInt(m[2] + frac);
    if (m[1]) n = -n;
    return exp >= 0 ? Q.mk(n * 10n ** BigInt(exp)) : Q.mk(n, 10n ** BigInt(-exp));
  },
  add: (a, b) => Q.mk(a.n * b.d + b.n * a.d, a.d * b.d),
  sub: (a, b) => Q.mk(a.n * b.d - b.n * a.d, a.d * b.d),
  mul: (a, b) => Q.mk(a.n * b.n, a.d * b.d),
  div: (a, b) => (b.n === 0n ? null : Q.mk(a.n * b.d, a.d * b.n)),
  neg: a => ({ n: -a.n, d: a.d }),
  abs: a => ({ n: a.n < 0n ? -a.n : a.n, d: a.d }),
  isZero: a => a.n === 0n,
  isInt: a => a.d === 1n,
  sign: a => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0),
  eq: (a, b) => a.n === b.n && a.d === b.d,
  pow(a, k) {
    if (!Number.isInteger(k) || Math.abs(k) > 200) return null;
    if (k < 0) { if (a.n === 0n) return null; a = Q.mk(a.d, a.n); k = -k; }
    return Q.mk(a.n ** BigInt(k), a.d ** BigInt(k));
  },
  num(a) {
    const n = Number(a.n), d = Number(a.d);
    if (isFinite(n) && isFinite(d)) return n / d;
    const s = 10n ** 30n; // huge parts: scale before converting
    return Number((a.n * s) / a.d) / 1e30;
  },
  str: a => (a.d === 1n ? String(a.n) : `${a.n}/${a.d}`),
};

/* integer square root and square-free split of a BigInt n ≥ 0: n = k²·m */
function bigSqrt(n) {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x--;
  while ((x + 1n) * (x + 1n) <= n) x++;
  return x;
}
function sqFree(n) {
  let k = 1n, m = n;
  for (let p = 2n; p * p <= m && p < 100000n; p++) {
    while (m % (p * p) === 0n) { m /= p * p; k *= p; }
  }
  return { k, m };
}

/* √q for a rational q ≥ 0 → { r: rational, m: square-free integer } with √q = r·√m */
function qSqrt(q) {
  if (Q.sign(q) < 0) return null;
  const nd = q.n * q.d; // √(n/d) = √(n·d)/d
  const s = bigSqrt(nd);
  if (s * s === nd) return { r: Q.mk(s, q.d), m: 1n };
  const { k, m } = sqFree(nd);
  return { r: Q.mk(k, q.d), m };
}

/* ---------- exact evaluation (returns Q or null when not rational) ---------- */
function exactEval(node, env = {}) {
  switch (node.t) {
    case 'num': return Q.fromNum(node.v);
    case 'const': return null;
    case 'var': return env[node.n] ? env[node.n].q : null;
    case 'neg': { const a = exactEval(node.a, env); return a && Q.neg(a); }
    case 'bin': {
      const a = exactEval(node.a, env); if (!a) return null;
      const b = exactEval(node.b, env); if (!b) return null;
      switch (node.op) {
        case '+': return Q.add(a, b);
        case '-': return Q.sub(a, b);
        case '*': return Q.mul(a, b);
        case '/': return Q.div(a, b);
        case '^': {
          if (Q.isInt(b)) return Q.pow(a, Number(b.n));
          // rational power of a perfect power, e.g. 8^(1/3), (4/9)^(1/2)
          if (Q.sign(a) < 0 || b.d > 12n) return null;
          const root = (x, k) => { const r = BigInt(Math.round(Math.pow(Number(x), 1 / Number(k)))); for (const c of [r - 1n, r, r + 1n]) if (c >= 0n && c ** k === x) return c; return null; };
          const rn = root(a.n, b.d), rd = root(a.d, b.d);
          return rn != null && rd != null ? Q.pow(Q.mk(rn, rd), Number(b.n)) : null;
        }
      }
      return null;
    }
    case 'call': {
      const args = node.args.map(x => exactEval(x, env));
      if (args.some(x => !x)) return null;
      const [a, b] = args;
      const intArg = x => (Q.isInt(x) && x.n >= 0n && x.n < 5000n ? x.n : null);
      switch (node.f) {
        case 'abs': return Q.abs(a);
        case 'sqrt': { const s = qSqrt(a); return s && s.m === 1n ? s.r : null; }
        case 'floor': case 'ceil': case 'round': return Q.fromNum(EX.FUNCS[node.f](Q.num(a)));
        case 'fact': { const n = intArg(a); if (n == null) return null; let r = 1n; for (let i = 2n; i <= n; i++) r *= i; return Q.mk(r); }
        case 'nPr': case 'nCr': {
          const n = intArg(a), k = intArg(b);
          if (n == null || k == null) return null;
          if (k > n) return Q.int(0);
          let r = 1n; for (let i = 0n; i < k; i++) r *= n - i;
          if (node.f === 'nCr') { let f = 1n; for (let i = 2n; i <= k; i++) f *= i; r /= f; }
          return Q.mk(r);
        }
        case 'min': case 'max': return args.reduce((m, x) => ((node.f === 'min' ? Q.sign(Q.sub(x, m)) < 0 : Q.sign(Q.sub(x, m)) > 0) ? x : m));
      }
      return null;
    }
  }
  return null;
}

/* ---------- recognise an exact form for a float ---------- */
function ratApprox(x, maxDen, tol) {
  if (!isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1, ax = Math.abs(x);
  let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = ax;
  for (let i = 0; i < 60; i++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(ax - h1 / k1) <= tol * Math.max(1, ax)) return [sign * h1, k1];
    const r = b - a;
    if (r < 1e-15) break;
    b = 1 / r;
  }
  return null;
}
function fracStr(p, q) { return q === 1 ? String(p) : `${p}/${q}`; }
function coefTimes(p, q, sym) { // (p/q)·sym written nicely: 3π/4, −π, √2/2
  const s = p < 0 ? '−' : '', a = Math.abs(p);
  return `${s}${a === 1 ? '' : a}${sym}${q === 1 ? '' : '/' + q}`;
}
function surdStr(r, m) { // r·√m with r rational (Q), m BigInt square-free
  if (m === 1n) return Q.str(r).replace('-', '−');
  const s = Q.sign(r) < 0 ? '−' : '', a = Q.abs(r);
  return `${s}${a.n === 1n ? '' : a.n}√${m}${a.d === 1n ? '' : '/' + a.d}`;
}
/* exact form text for x (q = exact rational if known). Returns '' if x is a plain integer. */
function exactForm(x, q) {
  if (q) return Q.isInt(q) ? (Math.abs(x) >= 1e12 ? Q.str(q).replace('-', '−') : '') : Q.str(q).replace('-', '−');
  if (!isFinite(x)) return '';
  if (Math.abs(x - Math.round(x)) < 1e-12 * Math.max(1, Math.abs(x))) return '';
  const f = ratApprox(x, 100000, 1e-12);
  if (f) return fracStr(f[0], f[1]).replace('-', '−');
  const fp = ratApprox(x / Math.PI, 24, 1e-12);
  if (fp && Math.abs(fp[0]) <= 200) return coefTimes(fp[0], fp[1], 'π');
  const f2 = ratApprox(x * x, 10000, 1e-11);
  if (f2 && f2[0] < 1e7) {
    const s = qSqrt(Q.mk(BigInt(f2[0]), BigInt(f2[1])));
    if (s && s.m !== 1n) return surdStr(x < 0 ? Q.neg(s.r) : s.r, s.m);
  }
  const fe = ratApprox(x / Math.E, 24, 1e-12);
  if (fe && Math.abs(fe[0]) <= 200) return coefTimes(fe[0], fe[1], 'e');
  return '';
}
function pmStr(p, sg, body) { // p ± body, p rational (Q)
  const pt = Q.isZero(p) ? '' : Q.str(p).replace('-', '−');
  return pt ? `${pt} ${sg < 0 ? '−' : '+'} ${body}` : `${sg < 0 ? '−' : ''}${body}`;
}
function decStr(x) { return fmtNum(x, { noFrac: true }); }
/* "0.666667  =  2/3" style pair for answer boxes */
function bothSub(x, q) {
  const e = exactForm(x, q);
  return e ? `exact (분수/정확값) = <b class="mono">${esc(e)}</b>` : (Number.isInteger(x) ? 'exact integer' : 'no simple exact form — decimal only');
}

/* ---------- equation helpers ---------- */
function splitEq(s) {
  const t = String(s).replace(/==/g, '=');
  const parts = t.split(/(?<![<>!])=/);
  if (parts.length > 2) uerr(`"${s}" has more than one "=" sign`);
  if (parts.length === 2 && (!parts[0].trim() || !parts[1].trim())) uerr(`"${s}": one side of "=" is empty`);
  return parts.length === 2 ? [parts[0], parts[1]] : [t, '0'];
}
function parseEq(s, label) {
  const [l, r] = splitEq(s);
  let L, R;
  try { L = EX.parse(l); R = EX.parse(r); } catch (e) { uerr(`${label}: ${e.message}`); }
  return { L, R, g: EX.B('-', L, R) };
}
function subst(node, env) {
  if (!node || typeof node !== 'object') return node;
  if (node.t === 'var' && node.n in env) return EX.N(env[node.n]);
  const out = { ...node };
  if (node.a) out.a = subst(node.a, env);
  if (node.b) out.b = subst(node.b, env);
  if (node.args) out.args = node.args.map(x => subst(x, env));
  return out;
}
function knownEnv(s) { return String(s || '').trim() ? EX.parseAssign(s) : {}; }
function eqText(e) { return `${EX.str(e.L)} = ${EX.str(e.R)}`; }
function pyExpr(s) { return String(s).replace(/\^/g, '**').replace(/π/g, 'pi').replace(/\bln\(/g, 'log('); }

/* exact coefficients (low → high) of a univariate polynomial g(x) of degree ≤ deg, by exact interpolation */
function exactPolyCoeffs(g, x, deg) {
  const ys = [];
  for (let k = 0; k <= deg; k++) { const y = exactEval(g, { [x]: { q: Q.int(k) } }); if (!y) return null; ys.push(y); }
  // Newton divided differences on nodes 0..deg
  const a = ys.slice();
  for (let j = 1; j <= deg; j++)
    for (let i = deg; i >= j; i--) { a[i] = Q.div(Q.sub(a[i], a[i - 1]), Q.int(j)); if (!a[i]) return null; }
  let p = [a[deg]];
  for (let j = deg - 1; j >= 0; j--) { // p ← p·(x − j) + a_j
    const np = Array(p.length + 1).fill(null).map(() => Q.int(0));
    p.forEach((c, i) => { np[i + 1] = Q.add(np[i + 1], c); np[i] = Q.sub(np[i], Q.mul(c, Q.int(j))); });
    np[0] = Q.add(np[0], a[j]);
    p = np;
  }
  return p;
}
function trimQ(c) { c = c.slice(); while (c.length > 1 && Q.isZero(c[c.length - 1])) c.pop(); return c; }
function evalQPoly(c, r) { let s = Q.int(0); for (let i = c.length - 1; i >= 0; i--) s = Q.add(Q.mul(s, r), c[i]); return s; }
function deflateQ(c, r) { // divide by (x − r), c low→high, exact
  const n = c.length - 1, out = Array(n);
  let carry = Q.int(0);
  for (let i = n; i >= 1; i--) { carry = Q.add(Q.mul(carry, r), c[i]); out[i - 1] = carry; }
  return out;
}
function divisors(n) {
  n = n < 0n ? -n : n;
  if (n === 0n || n > 10n ** 12n) return null;
  const out = [];
  for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); }
  return out;
}
/* rational roots (with multiplicity) by the rational-root theorem; returns { roots:[{q,mult}], rest } */
function rationalRoots(c) {
  c = trimQ(c);
  const roots = [];
  // x = 0 roots
  let z = 0; while (c.length > 1 && Q.isZero(c[0])) { c = c.slice(1); z++; }
  if (z) roots.push({ q: Q.int(0), mult: z });
  if (c.length <= 2) return { roots, rest: c };
  let L = 1n; for (const x of c) L = (L / Q.gcd(L, x.d)) * x.d;
  const ints = c.map(x => (x.n * L) / x.d);
  const P = divisors(ints[0]), D = divisors(ints[ints.length - 1]);
  if (!P || !D || P.length * D.length > 40000) return { roots, rest: c };
  const cands = [];
  for (const p of P) for (const d of D) for (const s of [1n, -1n]) { const q = Q.mk(s * p, d); if (!cands.some(r => Q.eq(r, q))) cands.push(q); }
  for (const r of cands) {
    let mult = 0;
    while (c.length > 1 && Q.isZero(evalQPoly(c, r))) { c = deflateQ(c, r); mult++; }
    if (mult) roots.push({ q: r, mult });
    if (c.length <= 1) break;
  }
  return { roots, rest: c };
}

/* ---------- numeric 1-D root finding ---------- */
function numericRoots(f, lo, hi) {
  const xs = new Set();
  const N = 24000;
  const grid = [];
  for (let k = 0; k <= N; k++) grid.push(lo + ((hi - lo) * k) / N);
  const fine = Math.min(hi, 20), fstart = Math.max(lo, -20);
  if (fine > fstart) for (let k = 0; k <= 8000; k++) grid.push(fstart + ((fine - fstart) * k) / 8000);
  grid.sort((a, b) => a - b);
  const safe = t => { try { const v = f(t); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  const vals = grid.map(safe);
  const roots = [];
  const push = r => { if (!roots.some(q => Math.abs(q - r) < 1e-7 * Math.max(1, Math.abs(r)))) roots.push(Math.abs(r) < 1e-14 ? 0 : r); };
  const accept = r => { const v = safe(r); return isFinite(v) && Math.abs(v) < 1e-7 * Math.max(1, ...[r - 1e-3, r + 1e-3].map(t => Math.abs(safe(t)) || 0)); };
  for (let i = 0; i < grid.length; i++) {
    const a = grid[i], fa = vals[i];
    if (fa === 0) { push(a); continue; }
    if (i + 1 >= grid.length) break;
    const b = grid[i + 1], fb = vals[i + 1];
    if (!isFinite(fa) || !isFinite(fb)) continue;
    if (fa * fb < 0) {
      let x0 = a, x1 = b, f0 = fa;
      for (let k = 0; k < 200; k++) { const m = (x0 + x1) / 2, fm = safe(m); if (!isFinite(fm)) break; if (f0 * fm <= 0) x1 = m; else { x0 = m; f0 = fm; } if (x1 - x0 < 1e-15 * Math.max(1, Math.abs(m))) break; }
      const r = (x0 + x1) / 2;
      if (accept(r)) push(r); // reject poles (sign change through ∞)
    } else if (i > 0 && isFinite(vals[i - 1]) && Math.abs(fa) <= Math.abs(vals[i - 1]) && Math.abs(fa) <= Math.abs(fb) && Math.sign(vals[i - 1]) === Math.sign(fa) && Math.sign(fb) === Math.sign(fa)) {
      // touching root (double root): minimise |f| locally
      let x0 = grid[i - 1], x1 = b;
      const g = t => Math.abs(safe(t));
      for (let k = 0; k < 200; k++) { const m1 = x0 + (x1 - x0) * 0.382, m2 = x0 + (x1 - x0) * 0.618; if (g(m1) < g(m2)) x1 = m2; else x0 = m1; }
      const r = (x0 + x1) / 2;
      if (g(r) < 1e-10 * Math.max(1, Math.abs(fa))) push(r);
    }
  }
  // polish with Newton
  return roots.map(r => {
    let x = r;
    for (let k = 0; k < 20; k++) {
      const hh = 1e-7 * Math.max(1, Math.abs(x)), fx = safe(x), d = (safe(x + hh) - safe(x - hh)) / (2 * hh);
      if (!isFinite(fx) || !isFinite(d) || d === 0) break;
      const nx = x - fx / d;
      if (!isFinite(nx) || Math.abs(nx - x) > 1e-6 * Math.max(1, Math.abs(x))) break;
      if (Math.abs(safe(nx)) > Math.abs(fx)) break;
      x = nx;
    }
    return x;
  }).sort((p, q) => p - q);
}

/* ---------- small dense linear solve (float, partial pivoting) ---------- */
function gaussSolve(A, b) {
  const n = A.length, M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}

/* ---------- RREF over exact rationals or floats ---------- */
const FIELD_Q = { zero: () => Q.int(0), one: () => Q.int(1), add: Q.add, sub: Q.sub, mul: Q.mul, div: Q.div, isZero: Q.isZero, num: Q.num, str: q => Q.str(q).replace('-', '−') };
const FIELD_F = { zero: () => 0, one: () => 1, add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b, isZero: a => Math.abs(a) < 1e-10, num: a => a, str: a => decStr(a) };
function rref(M, F) {
  M = M.map(r => r.slice());
  const m = M.length, n = M[0].length - 1, piv = [];
  let row = 0;
  for (let c = 0; c < n && row < m; c++) {
    let p = -1, best = 0;
    for (let r = row; r < m; r++) if (!F.isZero(M[r][c])) { const a = Math.abs(F.num(M[r][c])); if (p < 0 || (F === FIELD_F && a > best)) { p = r; best = a; } if (F === FIELD_Q) break; }
    if (p < 0) continue;
    [M[row], M[p]] = [M[p], M[row]];
    const pv = M[row][c];
    M[row] = M[row].map(x => F.div(x, pv));
    for (let r = 0; r < m; r++) if (r !== row && !F.isZero(M[r][c])) { const f = M[r][c]; M[r] = M[r].map((x, k) => F.sub(x, F.mul(f, M[row][k]))); }
    if (F === FIELD_F) M = M.map(r => r.map(x => (Math.abs(x) < 1e-12 ? 0 : x)));
    piv.push(c); row++;
  }
  return { M, piv };
}
function augTable(M, names, F) {
  const head = names.map(v => `<th>${esc(v)}</th>`).join('') + '<th class="augbar">=</th>';
  const body = M.map(r => '<tr>' + r.map((x, j) => `<td${j === r.length - 1 ? ' class="augbar"' : ''}>${esc(F.str(x))}</td>`).join('') + '</tr>').join('');
  return `<div class="tscroll"><table class="rtable aug"><tr>${head}</tr>${body}</table></div>`;
}

/* ---------- result row widget (decimal + exact) ---------- */
function bothCell(x, q) {
  const e = exactForm(x, q);
  return `<span class="bdec">${esc(decStr(x))}</span>${e ? `<span class="bex">= ${esc(e)}</span>` : ''}`;
}

/* =====================================================================
   1) Calculator
   ===================================================================== */
tool({
  id: 'calc', cat: 'basic', name: 'Calculator 계산기 (소수 + 분수)', short: 'Calculator',
  kw: 'calculator 계산기 계산 arithmetic fraction 분수 decimal 소수 ans',
  live: true, solveLabel: 'Calculate',
  desc: '한 줄에 식 하나. 입력하면 바로 계산됩니다. 결과는 <b>소수</b>와 <b>분수/정확값</b>(2/3, √2/2, 3π/4 …)을 같이 보여줍니다. ' +
    '<code>a = 3/7</code> 처럼 변수 저장, <code>ans</code> = 바로 위 결과. 함수: sqrt, exp, ln, log10, sin/cos/tan (radian), abs, fact(5), nCr(5,2), nPr(5,2), pi, e.',
  inputs: [
    { k: 'lines', type: 'textarea', label: '계산식 (한 줄에 하나)', rows: 8, wide: true,
      def: '1/3 + 1/7\n(2/3)^2 - 0.25\nsqrt(8)/2\na = 3/4\nb = 5/6\na*b + ans\nnCr(10, 3) * 0.5^10',
      ph: '1/3 + 1/7\nsqrt(2)/2\na = 3/4\na^2 + ans' },
  ],
  solve(v, R) {
    const env = {};
    const rows = [];
    String(v.lines).split('\n').forEach((line0, i) => {
      const line = line0.replace(/#.*$/, '').trim().replace(/=\s*$/, '');
      if (!line) return;
      let name = null, src = line;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)\s*(.+)$/);
      if (m) {
        if (m[1] in { pi: 1, e: 1, ans: 1 } || EX.FUNCS[m[1]]) { rows.push({ line, err: `"${m[1]}" is a reserved name` }); return; }
        name = m[1]; src = m[2];
      }
      try {
        const n = EX.parse(src);
        const fenv = {}; for (const [k, o] of Object.entries(env)) fenv[k] = o.x;
        const x = EX.evaluate(n, fenv);
        if (typeof x !== 'number' || Number.isNaN(x)) uerr('result is not a real number (for example sqrt of a negative, 0/0, ln of ≤ 0)');
        if (!isFinite(x)) uerr('result is ±∞ (division by zero, or overflow)');
        const q = isFinite(x) ? exactEval(n, env) : null;
        const res = { x, q: q && Math.abs(Q.num(q) - x) <= 1e-9 * Math.max(1, Math.abs(x)) ? q : null };
        env.ans = res;
        if (name) env[name] = res;
        rows.push({ line, name, ...res });
      } catch (err) {
        rows.push({ line, err: err.message });
      }
    });
    if (!rows.length) uerr('Type a calculation, for example 1/3 + 1/7');
    const html = rows.map((r, i) =>
      `<div class="tape${r.err ? ' bad' : ''}">` +
      `<div class="tin"><span class="tno">${i + 1}</span><code>${esc(r.line)}</code></div>` +
      (r.err ? `<div class="tout err">${esc(r.err)}</div>` :
        `<div class="tout">${r.name ? `<span class="tname">${esc(r.name)} =</span>` : ''}${bothCell(r.x, r.q)}` +
        `<button class="copyb vis" onclick="copyText('${decStr(r.x)}', this)">copy</button></div>`) +
      '</div>').join('');
    R.text(`<div class="tapebox">${html}</div>`, 'answer');
  },
});

/* =====================================================================
   2) solve(equation, x)
   ===================================================================== */
tool({
  id: 'eqsolve', cat: 'basic', name: 'Solve equation for x  — like the Texas Instruments (TI-89) calculator solve(…, x)', short: 'Solve equation',
  kw: 'solve equation 방정식 근 root zero 해 풀기 ti89 texas instruments quadratic cubic 이차 삼차',
  live: true,
  desc: '① 식을 적고 ② 구하고 싶은 변수를 적으세요. 다항식은 정확한 근(분수, √)까지, 그 외(exp, ln, sin …)는 수치해를 찾습니다. ' +
    'Texas Instruments (TI-89) 계산기 형식 <code>solve(x^2-5x+6=0, x)</code> 를 그대로 붙여넣어도 됩니다.',
  inputs: [
    { k: 'eq', type: 'expr', label: '① 식 (equation)', def: '2x^2 - 3x - 2 = 0', ph: 'x^2 - 5x + 6 = 0', wide: true,
      hint: '"=" 가 없으면 <code>식 = 0</code> 으로 봅니다. ' + EXPR_HINT },
    { k: 'x', type: 'text', label: '② 구할 변수 (solve for)', def: 'x', ph: 'x' },
    { k: 'known', type: 'text', label: '다른 변수 값 (있으면)', def: '', ph: 'a=2, b=-1', optional: true },
    { k: 'range', type: 'text', label: '수치 탐색 범위 (비다항식만)', def: '-1000, 1000', ph: '-1000, 1000' },
  ],
  solve(v, R) {
    let src = String(v.eq).trim(), x = String(v.x || '').trim();
    const ti = src.match(/^solve\s*\(([\s\S]*),\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*$/i);
    if (ti) { src = ti[1]; x = ti[2]; }
    const e = parseEq(src, 'equation');
    const known = knownEnv(v.known);
    const g = subst(e.g, known);
    const left = EX.varList(g);
    if (!x) {
      if (left.length === 1) x = left[0];
      else if (left.includes('x')) x = 'x';
      else uerr(`② 구할 변수를 적어주세요 (식에 있는 변수: ${left.join(', ') || '없음'})`);
    }
    const others = left.filter(k => k !== x);
    if (others.length) uerr(`${others.join(', ')} 의 값이 필요합니다 → "다른 변수 값" 칸에 예: ${others.map(k => k + '=1').join(', ')}`);
    if (!left.includes(x)) {
      const val = EX.evaluate(g, {});
      R.given('equation', eqText(e));
      R.answer('Result', Math.abs(val) < 1e-12 ? '<b class="yes">항상 참 (identity) — every ' + esc(x) + ' works</b>' : `<b class="no">해 없음 — ${esc(x)} is not in the equation and the two sides differ by ${esc(decStr(val))}</b>`);
      return;
    }
    R.given('equation', `<code class="expr">${esc(eqText(e))}</code>`);
    if (Object.keys(known).length) R.given('known values', Object.entries(known).map(([k, a]) => `${k} = ${decStr(a)}`).join(', '));
    R.find(`all real ${esc(x)} with  ${esc(EX.str(e.L))} − (${esc(EX.str(e.R))}) = 0`);
    const f = t => EX.evaluate(g, { [x]: t });
    const sols = []; // {x, q?, ex?, mult?}
    const cplx = [];
    const P = EX.toPoly(g);
    const coeffs = P && EX.polyCoeffs(P, x);
    if (coeffs) {
      let c = coeffs.slice();
      const big = Math.max(...c.map(Math.abs), 1e-300);
      while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-13 * big) c.pop();
      const deg = c.length - 1;
      R.step('standard form', `<code class="expr">${esc(EX.str(EX.fromPoly(P)))} = 0</code>`, { note: `polynomial of degree ${deg}` });
      if (deg === 0) {
        R.answer('Result', Math.abs(c[0]) < 1e-12 ? `<b class="yes">항상 참 — every ${esc(x)} is a solution</b>` : `<b class="no">해 없음 (no solution): it reduces to ${esc(decStr(c[0]))} = 0</b>`);
        return;
      }
      let cq = exactPolyCoeffs(g, x, deg);
      if (cq && cq.some((q, i) => Math.abs(Q.num(q) - (c[i] || 0)) > 1e-9 * big)) cq = null;
      if (cq) cq = trimQ(cq);
      if (deg === 1) {
        R.formula('a·x + b = 0  ⇒  x = −b / a');
        const q = cq ? Q.div(Q.neg(cq[0]), cq[1]) : null;
        sols.push({ x: -c[0] / c[1], q });
        const qs = k => (cq ? Q.str(cq[k]).replace('-', '−') : decStr(c[k]));
        R.step('a, b', `${qs(1)}, ${qs(0)}`);
        R.step('x = −b/a', `−(${qs(0)}) / (${qs(1)})`);
      } else if (deg === 2) {
        R.formula('a·x² + b·x + c = 0  ⇒  x = (−b ± √(b² − 4ac)) / 2a');
        const [c0, c1, c2] = c, D = c1 * c1 - 4 * c2 * c0;
        R.step('a, b, c', `${decStr(c2)}, ${decStr(c1)}, ${decStr(c0)}`);
        R.step('discriminant D = b² − 4ac', D, { note: D > 1e-12 ? 'D > 0 → two real roots' : Math.abs(D) <= 1e-12 ? 'D = 0 → one repeated root' : 'D < 0 → no real roots (complex pair)' });
        if (cq) {
          const [a0, a1, a2] = cq;
          const Dq = Q.sub(Q.mul(a1, a1), Q.mul(Q.int(4), Q.mul(a2, a0)));
          const p = Q.div(Q.neg(a1), Q.mul(Q.int(2), a2));
          const s = qSqrt(Q.abs(Dq));
          const r = s && Q.abs(Q.div(s.r, Q.mul(Q.int(2), a2)));
          if (Q.isZero(Dq)) sols.push({ x: Q.num(p), q: p, mult: 2 });
          else if (Q.sign(Dq) > 0 && s.m === 1n) {
            [Q.sub(p, r), Q.add(p, r)].forEach(q => sols.push({ x: Q.num(q), q }));
          } else if (Q.sign(Dq) > 0) {
            [-1, 1].forEach(sg => sols.push({ x: Q.num(p) + sg * Q.num(r) * Math.sqrt(Number(s.m)), ex: pmStr(p, sg, surdStr(r, s.m)) }));
            R.step('exact roots', `${Q.isZero(p) ? '' : Q.str(p).replace('-', '−') + ' '}± ${surdStr(r, s.m)}`);
          } else {
            const im = s.m === 1n ? Q.str(r) : surdStr(r, s.m);
            [-1, 1].forEach(sg => cplx.push({ re: Q.num(p), im: sg * Q.num(r) * Math.sqrt(Number(s.m)), ex: pmStr(p, sg, im === '1' ? 'i' : `(${im})i`) }));
          }
        } else if (D >= -1e-12) {
          const sq = Math.sqrt(Math.max(0, D));
          if (sq === 0) sols.push({ x: -c1 / (2 * c2), mult: 2 });
          else [-1, 1].forEach(sg => sols.push({ x: (-c1 + sg * sq) / (2 * c2) }));
        } else {
          [-1, 1].forEach(sg => cplx.push({ re: -c1 / (2 * c2), im: (sg * Math.sqrt(-D)) / (2 * c2) }));
        }
      } else {
        R.formula('degree ≥ 3: rational-root theorem (exact) + numerical root finding for the rest');
        let restF = c;
        if (cq) {
          const rr = rationalRoots(cq);
          rr.roots.forEach(r => sols.push({ x: Q.num(r.q), q: r.q, mult: r.mult }));
          if (rr.roots.length) R.step('rational roots found', rr.roots.map(r => Q.str(r.q) + (r.mult > 1 ? ` (×${r.mult})` : '')).join(', '));
          restF = rr.rest.map(Q.num);
          if (rr.rest.length === 3) { // leftover quadratic → exact
            const [a0, a1, a2] = rr.rest;
            const Dq = Q.sub(Q.mul(a1, a1), Q.mul(Q.int(4), Q.mul(a2, a0)));
            const p = Q.div(Q.neg(a1), Q.mul(Q.int(2), a2));
            const s = qSqrt(Q.abs(Dq)), r = Q.abs(Q.div(s.r, Q.mul(Q.int(2), a2)));
            const root = Math.sqrt(Number(s.m));
            if (Q.sign(Dq) >= 0) [-1, 1].forEach(sg => sols.push({ x: Q.num(p) + sg * Q.num(r) * root, ex: s.m === 1n ? '' : pmStr(p, sg, surdStr(r, s.m)) }));
            else [-1, 1].forEach(sg => { const im = s.m === 1n ? Q.str(r) : surdStr(r, s.m); cplx.push({ re: Q.num(p), im: sg * Q.num(r) * root, ex: pmStr(p, sg, im === '1' ? 'i' : `(${im})i`) }); });
            restF = [];
          }
        }
        if (restF.length > 1) {
          for (const z of EX.polyRoots(restF)) {
            if (Math.abs(z.im) < 1e-7 * (1 + Math.abs(z.re))) {
              let t = z.re; // polish on the full polynomial
              const fp = s => c.reduce((a, ck, k) => a + ck * Math.pow(s, k), 0), dp = s => c.reduce((a, ck, k) => (k ? a + k * ck * Math.pow(s, k - 1) : a), 0);
              for (let i = 0; i < 30; i++) { const d = dp(t); if (!d) break; const nt = t - fp(t) / d; if (!isFinite(nt)) break; t = nt; }
              if (!sols.some(s => Math.abs(s.x - t) < 1e-7 * (1 + Math.abs(t)))) sols.push({ x: t });
            } else cplx.push({ re: z.re, im: z.im });
          }
        }
      }
    } else {
      R.formula('not a polynomial → numerical search: sign changes on a fine grid, then bisection + Newton');
      const m = String(v.range || '').split(/[,;\s]+/).filter(Boolean).map(EX.constVal);
      const lo = m.length === 2 ? Math.min(...m) : -1000, hi = m.length === 2 ? Math.max(...m) : 1000;
      R.step('search range', `[${decStr(lo)}, ${decStr(hi)}]`);
      numericRoots(f, lo, hi).forEach(t => sols.push({ x: t }));
    }
    sols.sort((a, b) => a.x - b.x);
    const exOf = s => (s.ex != null && s.ex !== '' ? s.ex : exactForm(s.x, s.q));
    if (!sols.length) {
      R.answer('Real solutions', `<b class="no">실수해 없음 (no real solution${coeffs ? '' : ' found in the range'})</b>`);
    } else {
      sols.forEach((s, i) => {
        const ex = exOf(s);
        R.answer(`${esc(x)}${sols.length > 1 ? sub(i + 1) : ''} =`, s.x, { sub: (ex ? `exact = <b class="mono">${esc(ex)}</b>` : Number.isInteger(+decStr(s.x)) && Math.abs(s.x - Math.round(s.x)) < 1e-12 ? 'exact integer' : 'decimal only') + (s.mult > 1 ? ` · repeated root (×${s.mult})` : '') });
      });
      R.answer('all solutions', `{ ${sols.map(s => decStr(s.x)).join(', ')} }`, { copy: sols.map(s => decStr(s.x)).join(', ') });
    }
    if (cplx.length) {
      R.text('<b>Complex roots (참고)</b>: ' + cplx.map(z => `<code>${esc(z.ex || `${decStr(z.re)} ${z.im < 0 ? '−' : '+'} ${decStr(Math.abs(z.im))}i`)}</code>`).join(', '), 'answer');
    }
    sols.forEach(s => {
      const l = EX.evaluate(subst(e.L, known), { [x]: s.x }), r = EX.evaluate(subst(e.R, known), { [x]: s.x });
      R.check(`${esc(x)} = ${decStr(s.x)}: Left-Hand Side (LHS) = ${decStr(l)}, Right-Hand Side (RHS) = ${decStr(r)}`, undefined, { note: Math.abs(l - r) < 1e-6 * Math.max(1, Math.abs(l), Math.abs(r)) ? '✓' : '✗ check' });
    });
    const knownPy = Object.entries(known).map(([k, a]) => `${k} = ${a}\n`).join('');
    const [ls, rs] = splitEq(src);
    R.code(`from sympy import *\n${x} = symbols('${x}')\n${knownPy}eq = Eq(${pyExpr(ls).trim()}, ${pyExpr(rs).trim()})\nsol = solve(eq, ${x})\nprint(sol)                      # exact\nprint([N(s, 10) for s in sol])  # decimal`);
  },
});

/* =====================================================================
   3) Simultaneous equations
   ===================================================================== */
tool({
  id: 'eqsystem', cat: 'basic', name: 'Simultaneous equations 연립방정식 (여러 변수)', short: '연립방정식',
  kw: 'simultaneous system equations 연립방정식 연립 linear nonlinear variables unknowns solve',
  live: true,
  desc: '한 줄에 방정식 하나. 변수는 자동으로 찾습니다. 선형이면 정확한 분수 해(가우스 소거, Reduced Row Echelon Form (RREF)) + 해 없음/무수히 많음 판별, ' +
    '비선형(x·y, x² …)이면 수치적으로 실수해를 찾습니다.',
  inputs: [
    { k: 'eqs', type: 'textarea', label: '방정식 (한 줄에 하나)', rows: 5, wide: true,
      def: '2x + 3y - z = 5\nx - y + 2z = 3\n3x + y + z = 10', ph: '2x + 3y = 7\nx - y = 1' },
    { k: 'vars', type: 'text', label: '구할 변수 (비우면 자동)', def: '', ph: 'x, y, z', optional: true },
    { k: 'known', type: 'text', label: '다른 변수 값 (있으면)', def: '', ph: 'a=2', optional: true },
  ],
  solve(v, R) {
    const lines = String(v.eqs).split(/\n|;/).map(s => s.replace(/#.*$/, '').trim()).filter(Boolean);
    if (!lines.length) uerr('Type at least one equation');
    const known = knownEnv(v.known);
    const eqs = lines.map((s, i) => { const e = parseEq(s, `equation ${i + 1}`); return { ...e, g: subst(e.g, known), src: s }; });
    const all = EX.natSort ? [...new Set(eqs.flatMap(e => EX.varList(e.g)))].sort(EX.natSort) : [...new Set(eqs.flatMap(e => EX.varList(e.g)))].sort();
    let xs = String(v.vars || '').trim() ? String(v.vars).split(/[,\s]+/).filter(Boolean) : all;
    const extra = all.filter(k => !xs.includes(k));
    if (extra.length) uerr(`${extra.join(', ')} 의 값이 필요합니다 → "다른 변수 값" 칸에 예: ${extra.map(k => k + '=1').join(', ')} (또는 "구할 변수"에 추가)`);
    if (!xs.length) uerr('No unknowns found');
    eqs.forEach((e, i) => R.given(`(${i + 1})`, `<code class="expr">${esc(eqText(e))}</code>`));
    R.given('unknowns', xs.join(', ') + `  (${eqs.length} equation${eqs.length > 1 ? 's' : ''}, ${xs.length} unknown${xs.length > 1 ? 's' : ''})`);
    R.find(`values of ${xs.join(', ')} that satisfy all equations`);
    const polys = eqs.map(e => EX.toPoly(e.g));
    const linear = polys.every(P => P && EX.polyDeg(P) <= 1);
    const checkAll = (sol, label) => eqs.forEach((e, i) => {
      const env = {}; xs.forEach((k, j) => (env[k] = sol[j]));
      const l = EX.evaluate(subst(e.L, known), env), r = EX.evaluate(subst(e.R, known), env);
      R.check(`${label}(${i + 1}) Left-Hand Side (LHS) = ${decStr(l)}, Right-Hand Side (RHS) = ${decStr(r)}`, undefined, { note: Math.abs(l - r) < 1e-6 * Math.max(1, Math.abs(l), Math.abs(r)) ? '✓' : '✗' });
    });

    if (linear) {
      // exact coefficients: c0 = g(0), a_j = g(e_j) − c0
      const zeroEnv = () => Object.fromEntries(xs.map(k => [k, { q: Q.int(0) }]));
      let exact = true;
      const rowsQ = eqs.map(e => {
        const c0 = exactEval(e.g, zeroEnv());
        if (!c0) { exact = false; return null; }
        const row = xs.map(k => { const env = zeroEnv(); env[k] = { q: Q.int(1) }; const y = exactEval(e.g, env); if (!y) { exact = false; return null; } return Q.sub(y, c0); });
        return exact ? row.concat([Q.neg(c0)]) : null;
      });
      const F = exact ? FIELD_Q : FIELD_F;
      const M = exact ? rowsQ : eqs.map(e => {
        const z = Object.fromEntries(xs.map(k => [k, 0])), c0 = EX.evaluate(e.g, z);
        return xs.map(k => EX.evaluate(e.g, { ...z, [k]: 1 }) - c0).concat([-c0]);
      });
      R.formula('linear system A·x = b  →  Gaussian elimination to Reduced Row Echelon Form (RREF) of [A | b]', exact ? 'exact fraction arithmetic' : 'floating point (π, e, √ in coefficients)');
      R.text('<b>Augmented matrix [A | b]</b>' + augTable(M, xs, F));
      const { M: Rm, piv } = rref(M, F);
      R.text('<b>Reduced Row Echelon Form (RREF)</b>' + augTable(Rm, xs, F));
      const n = xs.length;
      const incons = Rm.some(r => r.slice(0, n).every(F.isZero) && !F.isZero(r[n]));
      R.step('rank(A)', piv.length, { note: `rank([A|b]) = ${incons ? piv.length + 1 : piv.length}, unknowns = ${n}` });
      if (incons) {
        R.answer('Result', '<b class="no">해 없음 (no solution) — inconsistent</b>', { sub: 'a row of Reduced Row Echelon Form (RREF) reads 0 = (non-zero), that is, rank(A) < rank([A|b])' });
        return;
      }
      if (piv.length === n) {
        const sol = xs.map((_, j) => Rm[piv.indexOf(j)][n]);
        xs.forEach((k, j) => {
          const val = F.num(sol[j]);
          R.answer(`${esc(k)} =`, val, { sub: bothSub(val, exact ? sol[j] : null) });
        });
        R.answer('(' + xs.join(', ') + ')', `(${sol.map(s => decStr(F.num(s))).join(', ')})`, { copy: sol.map(s => decStr(F.num(s))).join(', ') });
        checkAll(sol.map(F.num), '');
      } else {
        const free = xs.filter((_, j) => !piv.includes(j));
        R.answer('Result', '<b>해가 무수히 많음 (infinitely many solutions)</b>', { sub: `free variable${free.length > 1 ? 's' : ''}: ${free.join(', ')} (아무 값이나 가능)` });
        piv.forEach((c, r) => {
          let s = F.str(Rm[r][n]);
          let first = F.isZero(Rm[r][n]);
          if (first) s = '';
          xs.forEach((k, j) => {
            if (j === c || piv.includes(j) || F.isZero(Rm[r][j])) return;
            const co = F.num(Rm[r][j]); // move to the right: −co·k
            const mag = F.str(exact ? Q.abs(Rm[r][j]) : Math.abs(co));
            const term = `${mag === '1' ? '' : mag}${k}`;
            s += first ? (co > 0 ? '−' : '') + term : (co > 0 ? ' − ' : ' + ') + term;
            first = false;
          });
          R.answer(`${esc(xs[c])} =`, `<span class="mono">${esc(s || '0')}</span>`);
        });
        free.forEach(k => R.answer(`${esc(k)} =`, `<span class="mono">${esc(k)}</span>`, { sub: 'free (any real number)' }));
      }
      const A = M.map(r => r.slice(0, n).map(F.num)), b = M.map(r => F.num(r[n]));
      R.code(`import numpy as np\nA = ${pyArr(A)}\nb = ${pyArr(b)}\n${eqs.length === n && piv.length === n ? 'x = np.linalg.solve(A, b)' : 'x = np.linalg.pinv(A) @ b   # one solution (min-norm / least squares)'}\nprint(x)\n\n# exact fractions:\nfrom sympy import symbols, Eq, solve, Rational\n${xs.join(', ')} = symbols('${xs.join(' ')}')\nprint(solve([${lines.map(s => { const [l, r] = splitEq(s); return `Eq(${pyExpr(l).trim()}, ${pyExpr(r).trim()})`; }).join(', ')}], [${xs.join(', ')}]))`);
      return;
    }

    // ---------- nonlinear: Levenberg–Marquardt from many starting points ----------
    R.formula('nonlinear system → Newton / Levenberg–Marquardt from many starting points', 'numerical: finds real solutions; exact forms recognised when simple');
    const n = xs.length, m = eqs.length;
    const G = p => { const env = {}; xs.forEach((k, j) => (env[k] = p[j])); return eqs.map(e => EX.evaluate(e.g, env)); };
    const safeG = p => { try { const r = G(p); return r.every(isFinite) ? r : null; } catch (e) { return null; } };
    const nrm = r => Math.sqrt(r.reduce((s, x) => s + x * x, 0));
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const found = [];
    const starts = [Array(n).fill(0), Array(n).fill(1), Array(n).fill(-1)];
    for (const sc of [1, 3, 10, 50]) for (let k = 0; k < 80; k++) starts.push(Array.from({ length: n }, () => (rnd() * 2 - 1) * sc));
    for (const p0 of starts) {
      let p = p0.slice(), r = safeG(p);
      if (!r) continue;
      let mu = 1e-3;
      for (let it = 0; it < 120; it++) {
        const J = Array.from({ length: m }, () => Array(n).fill(0));
        let ok = true;
        for (let j = 0; j < n; j++) {
          const hh = 1e-7 * Math.max(1, Math.abs(p[j]));
          const pp = p.slice(), pm = p.slice(); pp[j] += hh; pm[j] -= hh;
          const a = safeG(pp), b = safeG(pm);
          if (!a || !b) { ok = false; break; }
          for (let i = 0; i < m; i++) J[i][j] = (a[i] - b[i]) / (2 * hh);
        }
        if (!ok) break;
        const JtJ = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => J.reduce((s, row) => s + row[a] * row[b], 0)));
        const Jtr = Array.from({ length: n }, (_, a) => J.reduce((s, row, i) => s + row[a] * r[i], 0));
        let improved = false;
        for (let tries = 0; tries < 8; tries++) {
          const Ad = JtJ.map((row, a) => row.map((x, b) => (a === b ? x + mu * (1 + x) : x)));
          const d = gaussSolve(Ad, Jtr.map(x => -x));
          if (!d) { mu *= 10; continue; }
          const pn = p.map((x, j) => x + d[j]), rn = safeG(pn);
          if (rn && nrm(rn) < nrm(r)) { p = pn; r = rn; mu = Math.max(mu / 10, 1e-12); improved = true; break; }
          mu *= 10;
        }
        if (!improved || nrm(r) < 1e-14) break;
      }
      if (nrm(r) < 1e-9 && p.every(x => Math.abs(x) < 1e8)) {
        const clean = p.map(x => (Math.abs(x) < 1e-11 ? 0 : x));
        if (!found.some(q => q.every((x, j) => Math.abs(x - clean[j]) < 1e-6 * Math.max(1, Math.abs(x))))) found.push(clean);
      }
    }
    found.sort((a, b) => { for (let j = 0; j < n; j++) if (Math.abs(a[j] - b[j]) > 1e-9) return a[j] - b[j]; return 0; });
    if (!found.length) {
      R.answer('Result', '<b class="no">실수해를 찾지 못함 (no real solution found)</b>', { sub: 'the system may have no real solution, or only very large ones' });
      return;
    }
    if (m < n) R.note(`방정식(${m}) < 변수(${n}) → 보통 해가 무수히 많습니다. 아래는 그중 찾은 몇 개입니다.`, 'warn', 'answer');
    found.slice(0, 12).forEach((s, i) => {
      R.answer(`Solution ${i + 1}${found.length > 1 ? ` of ${Math.min(found.length, 12)}` : ''}`,
        `<span class="mono">${s.map((x, j) => `${esc(xs[j])} = ${bothCell(x, null)}`).join('<br>')}</span>`,
        { copy: s.map((x, j) => `${xs[j]} = ${decStr(x)}`).join(', ') });
    });
    found.slice(0, 12).forEach((s, i) => checkAll(s, `sol ${i + 1}: `));
    R.code(`from sympy import symbols, Eq, solve, N\n${xs.join(', ')} = symbols('${xs.join(' ')}')\nsols = solve([${lines.map(s => { const [l, r] = splitEq(s); return `Eq(${pyExpr(l).trim()}, ${pyExpr(r).trim()})`; }).join(', ')}], [${xs.join(', ')}], dict=True)\nfor s in sols:\n    print(s, {k: N(v, 10) for k, v in s.items()})`);
  },
});

if (typeof module !== 'undefined') module.exports = { Q, exactEval, exactForm, numericRoots, rref };
