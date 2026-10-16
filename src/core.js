'use strict';
/* =====================================================================
   core.js — number formatting + linear algebra (no dependencies)
   ===================================================================== */

class UserError extends Error {}
function uerr(msg) { throw new UserError(msg); }

/* ---------- number formatting ---------- */
const Fmt = { dec: 6, frac: false }; // never below 5 decimal places

function fracOf(x, maxDen = 1000) {
  if (!isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (Math.abs(ax - Math.round(ax)) < 1e-10) return [sign * Math.round(ax), 1];
  let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = ax;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(ax - h1 / k1) < 1e-9 * Math.max(1, ax)) return [sign * h1, k1];
    const r = b - a;
    if (r < 1e-15) break;
    b = 1 / r;
  }
  return null;
}

function fmtNum(x, o = {}) {
  if (typeof x !== 'number') return String(x);
  if (Number.isNaN(x)) return 'NaN';
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '−∞';
  const d = o.dec ?? Fmt.dec;
  if (Math.abs(x) < 1e-12) x = 0;
  if (Fmt.frac && !o.noFrac) {
    const f = fracOf(x, 1000);
    if (f) return f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`;
  }
  if (x !== 0 && Math.abs(x) < Math.pow(10, -d) * 0.5) {
    return x.toExponential(Math.max(5, d - 1)).replace(/\.?0+e/, 'e');
  }
  if (Math.abs(x) >= 1e12) return x.toExponential(d);
  let s = x.toFixed(d);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}

/* decimal plus fraction hint, e.g. "0.6667 (= 2/3)" */
function fmtExact(x) {
  const s = fmtNum(x);
  if (typeof x !== 'number' || Fmt.frac) return s;
  const f = fracOf(x, 1000);
  if (f && f[1] !== 1 && f[1] <= 1000) return `${s}  (= ${f[0]}/${f[1]})`;
  return s;
}

/* ---------- linear algebra ---------- */
const LA = {
  shape: A => [A.length, A.length ? A[0].length : 0],
  dims: A => `${A.length} × ${A.length ? A[0].length : 0}`,
  zeros: (m, n) => Array.from({ length: m }, () => Array(n).fill(0)),
  ones: (m, n) => Array.from({ length: m }, () => Array(n).fill(1)),
  eye: n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))),
  clone: A => A.map(r => r.slice()),
  T: A => (A.length ? A[0].map((_, j) => A.map(r => r[j])) : []),
  col: v => v.map(x => [x]),
  flat: A => A.map(r => r[0]),
  isVec: A => A[0].length === 1,

  add(A, B, na = 'A', nb = 'B') {
    if (A.length !== B.length || A[0].length !== B[0].length)
      uerr(`${na} + ${nb} cannot be computed: ${na} is ${LA.dims(A)} but ${nb} is ${LA.dims(B)} (they must have the same size).`);
    return A.map((r, i) => r.map((x, j) => x + B[i][j]));
  },
  sub(A, B, na = 'A', nb = 'B') {
    if (A.length !== B.length || A[0].length !== B[0].length)
      uerr(`${na} − ${nb} cannot be computed: ${na} is ${LA.dims(A)} but ${nb} is ${LA.dims(B)} (they must have the same size).`);
    return A.map((r, i) => r.map((x, j) => x - B[i][j]));
  },
  scale: (A, k) => A.map(r => r.map(x => x * k)),
  mul(A, B, na = 'A', nb = 'B') {
    const [m, n] = LA.shape(A), [p, q] = LA.shape(B);
    if (n !== p)
      uerr(`${na}${nb} cannot be computed because ${na} has ${n} column${n === 1 ? '' : 's'} (${na} is ${m} × ${n}) but ${nb} has ${p} row${p === 1 ? '' : 's'} (${nb} is ${p} × ${q}). Inner dimensions must match.`);
    const C = LA.zeros(m, q);
    for (let i = 0; i < m; i++)
      for (let k = 0; k < n; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        for (let j = 0; j < q; j++) C[i][j] += a * B[k][j];
      }
    return C;
  },
  hstack: (A, B) => A.map((r, i) => r.concat(B[i])),
  vstack: (A, B) => A.concat(B),
  maxAbs: A => A.reduce((mx, r) => r.reduce((m2, x) => Math.max(m2, Math.abs(x)), mx), 0),
  trace: A => A.reduce((s, r, i) => s + r[i], 0),
  dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
  norm: a => Math.sqrt(a.reduce((s, x) => s + x * x, 0)),
  fro: A => Math.sqrt(A.reduce((s, r) => s + r.reduce((t, x) => t + x * x, 0), 0)),
  clean(A, tol = 1e-11) {
    const s = Math.max(1, LA.maxAbs(A));
    return A.map(r => r.map(x => (Math.abs(x) < tol * s ? 0 : x)));
  },
  isIdentity(A, tol = 1e-8) {
    if (A.length !== A[0].length) return false;
    return A.every((r, i) => r.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < tol));
  },
  approxEq(A, B, tol = 1e-8) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    const s = Math.max(1, LA.maxAbs(B));
    return A.every((r, i) => r.every((x, j) => Math.abs(x - B[i][j]) < tol * s));
  },

  /* One-sided Jacobi SVD. Returns {U (m×k), S (k), V (n×k)} with A = U diag(S) Vᵀ */
  svd(A0) {
    let A = LA.clone(A0);
    let [m, n] = LA.shape(A);
    let trans = false;
    if (m < n) { A = LA.T(A); [m, n] = [n, m]; trans = true; }
    const U = A, V = LA.eye(n);
    for (let sweep = 0; sweep < 80; sweep++) {
      let rotated = false;
      for (let p = 0; p < n - 1; p++)
        for (let q = p + 1; q < n; q++) {
          let alpha = 0, beta = 0, gamma = 0;
          for (let i = 0; i < m; i++) {
            alpha += U[i][p] * U[i][p];
            beta += U[i][q] * U[i][q];
            gamma += U[i][p] * U[i][q];
          }
          if (gamma === 0 || Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta)) continue;
          rotated = true;
          const zeta = (beta - alpha) / (2 * gamma);
          const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const c = 1 / Math.sqrt(1 + t * t), s = c * t;
          for (let i = 0; i < m; i++) {
            const up = U[i][p], uq = U[i][q];
            U[i][p] = c * up - s * uq;
            U[i][q] = s * up + c * uq;
          }
          for (let i = 0; i < n; i++) {
            const vp = V[i][p], vq = V[i][q];
            V[i][p] = c * vp - s * vq;
            V[i][q] = s * vp + c * vq;
          }
        }
      if (!rotated) break;
    }
    const S = [];
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < m; i++) s += U[i][j] * U[i][j];
      s = Math.sqrt(s);
      S.push(s);
      if (s > 0) for (let i = 0; i < m; i++) U[i][j] /= s;
    }
    // sort descending
    const idx = S.map((_, i) => i).sort((a, b) => S[b] - S[a]);
    const Ss = idx.map(i => S[i]);
    const Us = U.map(r => idx.map(i => r[i]));
    const Vs = V.map(r => idx.map(i => r[i]));
    return trans ? { U: Vs, S: Ss, V: Us } : { U: Us, S: Ss, V: Vs };
  },
  svTol(A, S) {
    const [m, n] = LA.shape(A);
    return Math.max(m, n) * (S[0] || 0) * 1e-14;
  },
  rank(A) {
    if (!A.length || !A[0].length) return 0;
    if (LA.maxAbs(A) === 0) return 0;
    const { S } = LA.svd(A);
    const tol = LA.svTol(A, S);
    return S.filter(s => s > tol).length;
  },
  pinv(A) {
    const { U, S, V } = LA.svd(A);
    const tol = LA.svTol(A, S);
    const [m, n] = LA.shape(A);
    const P = LA.zeros(n, m);
    for (let k = 0; k < S.length; k++) {
      if (S[k] <= tol) continue;
      const inv = 1 / S[k];
      for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++) P[i][j] += V[i][k] * inv * U[j][k];
    }
    return P;
  },

  /* determinant by LU with partial pivoting */
  det(A) {
    const n = A.length;
    if (n !== A[0].length) return null;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (LA.rank(A) < n) return 0;
    const M = LA.clone(A);
    let d = 1;
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (M[p][k] === 0) return 0;
      if (p !== k) { [M[p], M[k]] = [M[k], M[p]]; d = -d; }
      d *= M[k][k];
      for (let i = k + 1; i < n; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j < n; j++) M[i][j] -= f * M[k][j];
      }
    }
    return d;
  },
  isInvertible(A) {
    return A.length === A[0].length && LA.rank(A) === A.length;
  },
  /* Gauss-Jordan inverse; null if not square or singular */
  inv(A) {
    const n = A.length;
    if (!n || n !== A[0].length) return null;
    if (LA.rank(A) < n) return null;
    const M = A.map((r, i) => r.concat(LA.eye(n)[i]));
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (M[p][k] === 0) return null;
      [M[p], M[k]] = [M[k], M[p]];
      const piv = M[k][k];
      for (let j = 0; j < 2 * n; j++) M[k][j] /= piv;
      for (let i = 0; i < n; i++) {
        if (i === k) continue;
        const f = M[i][k];
        if (f === 0) continue;
        for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j];
      }
    }
    return M.map(r => r.slice(n));
  },

  /* row reduction with human-readable steps (for display) */
  rrefSteps(A0, { full = false } = {}) {
    const A = LA.clone(A0);
    const [m, n] = LA.shape(A);
    const tol = 1e-10 * Math.max(1, LA.maxAbs(A));
    const steps = [];
    const pivots = [];
    let r = 0;
    for (let c = 0; c < n && r < m; c++) {
      let p = -1;
      for (let i = r; i < m; i++) if (Math.abs(A[i][c]) > tol && (p < 0 || Math.abs(A[i][c]) > Math.abs(A[p][c]))) p = i;
      // prefer a row with a "nice" pivot (keeps textbook look): take first nonzero if it is ±1
      for (let i = r; i < m; i++) if (Math.abs(Math.abs(A[i][c]) - 1) < 1e-12) { p = i; break; }
      if (p < 0) continue;
      if (p !== r) {
        [A[p], A[r]] = [A[r], A[p]];
        steps.push({ op: `R${r + 1} ↔ R${p + 1}`, M: LA.clone(A) });
      }
      if (full && Math.abs(A[r][c] - 1) > 1e-12) {
        const pv = A[r][c];
        for (let j = 0; j < n; j++) A[r][j] /= pv;
        steps.push({ op: `R${r + 1} ← R${r + 1} / ${fmtNum(pv)}`, M: LA.clone(A) });
      }
      for (let i = full ? 0 : r + 1; i < m; i++) {
        if (i === r) continue;
        const f = A[i][c] / A[r][c];
        if (Math.abs(f) < 1e-14) continue;
        for (let j = 0; j < n; j++) {
          A[i][j] -= f * A[r][j];
          if (Math.abs(A[i][j]) < tol) A[i][j] = 0;
        }
        const fs = fmtNum(Math.abs(f));
        steps.push({ op: `R${i + 1} ← R${i + 1} ${f > 0 ? '−' : '+'} ${fs === '1' ? '' : fs}R${r + 1}`, M: LA.clone(A) });
      }
      pivots.push([r, c]);
      r++;
    }
    return { R: LA.clean(A), steps, pivots, rank: pivots.length };
  },

  minorMat(A, i, j) {
    return A.filter((_, r) => r !== i).map(row => row.filter((_, c) => c !== j));
  },
  minor(A, i, j) { return LA.det(LA.minorMat(A, i, j)); },
  minors(A) { return A.map((r, i) => r.map((_, j) => (A.length === 1 ? 1 : LA.minor(A, i, j)))); },
  cofactors(A) { return LA.minors(A).map((r, i) => r.map((x, j) => ((i + j) % 2 ? -x : x) + 0)); },
  adj(A) { return LA.T(LA.cofactors(A)); },

  /* symmetric eigen-decomposition (cyclic Jacobi) */
  eigSym(A0) {
    const n = A0.length;
    const A = LA.clone(A0), V = LA.eye(n);
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-22) break;
      for (let p = 0; p < n - 1; p++)
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = V[k][p], vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
          }
        }
    }
    return { values: A.map((r, i) => r[i]), vectors: V };
  },
  matPow(A, k) {
    let R = LA.eye(A.length), B = A;
    while (k > 0) { if (k & 1) R = LA.mul(R, B); B = LA.mul(B, B); k >>= 1; }
    return R;
  },
};

/* numbers helpers */
const NUM = {
  sum: a => a.reduce((s, x) => s + x, 0),
  mean: a => NUM.sum(a) / a.length,
  sorted: a => a.slice().sort((x, y) => x - y),
  median(a) {
    const s = NUM.sorted(a), n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  },
  comb(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  },
  gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
  erf(x) {
    // high accuracy erf (series / continued fraction)
    const ax = Math.abs(x);
    if (ax < 3) {
      let sum = x, term = x, x2 = x * x;
      for (let n = 1; n < 200; n++) {
        term *= -x2 / n;
        const add = term / (2 * n + 1);
        sum += add;
        if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
      }
      return (2 / Math.sqrt(Math.PI)) * sum;
    }
    // erfc continued fraction (Lentz)
    const z = ax;
    let f = z, C = z, D = 0;
    for (let n = 1; n < 300; n++) {
      const an = n / 2;
      D = z + an * D; D = D === 0 ? 1e-300 : 1 / D;
      C = z + an / C; if (C === 0) C = 1e-300;
      const delta = C * D;
      f *= delta;
      if (Math.abs(delta - 1) < 1e-16) break;
    }
    const erfc = Math.exp(-z * z) / Math.sqrt(Math.PI) / f;
    return x > 0 ? 1 - erfc : erfc - 1;
  },
  normCdf: (x, mu = 0, s = 1) => 0.5 * (1 + NUM.erf((x - mu) / (s * Math.SQRT2))),
  normPdf: (x, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)),
  normInv(p, mu = 0, s = 1) {
    let lo = -40, hi = 40;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (NUM.normCdf(mid) < p) lo = mid; else hi = mid; }
    return mu + s * (lo + hi) / 2;
  },
};

if (typeof module !== 'undefined') module.exports = { UserError, uerr, Fmt, fracOf, fmtNum, fmtExact, LA, NUM };
