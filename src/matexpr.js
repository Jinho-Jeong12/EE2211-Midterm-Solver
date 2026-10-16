'use strict';
/* =====================================================================
   matexpr.js — matrix expression calculator
   for example inv(X' X) X' y     A^T*B + 2I     det(A)     X^-1     A@B
   ===================================================================== */

const MX = (() => {
  const S = v => ({ k: 's', v });
  const M = v => ({ k: 'm', v });
  const isS = a => a.k === 's';

  function tokenize(src) {
    const s = String(src).replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/ᵀ/g, "'").replace(/⁻¹/g, '^-1').replace(/†/g, '^+');
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (s.slice(i, i + 2) === '.T' && !/[A-Za-z0-9_]/.test(s[i + 2] || '')) { out.push({ t: 'op', v: "'" }); i += 2; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
        out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        out.push({ t: 'id', v: m[0] }); i += m[0].length; continue;
      }
      if (s.slice(i, i + 2) === '.T') { out.push({ t: 'op', v: "'" }); i += 2; continue; }
      if ("+-*/@^(),'".includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
      throw new UserError(`Unexpected character "${c}"`);
    }
    return out;
  }

  const FN = {
    inv(a) {
      need(a, 'inv');
      if (a.v.length !== a.v[0].length) uerr(`inv(): matrix is ${LA.dims(a.v)} — only square matrices have an ordinary inverse. Use pinv() for X†.`);
      const r = LA.inv(a.v);
      if (!r) uerr(`inv(): matrix is singular (det = 0, rank ${LA.rank(a.v)} < ${a.v.length}) — the inverse does not exist.`);
      return M(r);
    },
    pinv: a => (need(a, 'pinv'), M(LA.pinv(a.v))),
    T: a => (need(a, 'T'), M(LA.T(a.v))),
    transpose: a => (need(a, 'transpose'), M(LA.T(a.v))),
    det(a) {
      need(a, 'det');
      if (a.v.length !== a.v[0].length) uerr(`det(): matrix is ${LA.dims(a.v)} — determinant only exists for square matrices.`);
      return S(LA.det(a.v));
    },
    rank: a => (need(a, 'rank'), S(LA.rank(a.v))),
    adj: a => (need(a, 'adj'), sq(a, 'adj'), M(LA.adj(a.v))),
    cof: a => (need(a, 'cof'), sq(a, 'cof'), M(LA.cofactors(a.v))),
    minors: a => (need(a, 'minors'), sq(a, 'minors'), M(LA.minors(a.v))),
    trace: a => (need(a, 'trace'), sq(a, 'trace'), S(LA.trace(a.v))),
    norm: a => (need(a, 'norm'), S(LA.fro(a.v))),
    rref: a => (need(a, 'rref'), M(LA.rrefSteps(a.v, { full: true }).R)),
    I: n => M(LA.eye(intArg(n, 'I'))),
    eye: n => M(LA.eye(intArg(n, 'eye'))),
    zeros: (m, n) => M(LA.zeros(intArg(m, 'zeros'), intArg(n || m, 'zeros'))),
    ones: (m, n) => M(LA.ones(intArg(m, 'ones'), intArg(n || m, 'ones'))),
    sum: a => (isS(a) ? a : S(a.v.flat().reduce((s, x) => s + x, 0))),
    mean: a => (isS(a) ? a : S(a.v.flat().reduce((s, x) => s + x, 0) / a.v.flat().length)),
    sqrt: a => (isS(a) ? S(Math.sqrt(a.v)) : M(a.v.map(r => r.map(Math.sqrt)))),
    abs: a => (isS(a) ? S(Math.abs(a.v)) : M(a.v.map(r => r.map(Math.abs)))),
    sign: a => (isS(a) ? S(a.v >= 0 ? 1 : -1) : M(a.v.map(r => r.map(x => (x >= 0 ? 1 : -1))))),
    exp: a => (isS(a) ? S(Math.exp(a.v)) : M(a.v.map(r => r.map(Math.exp)))),
    dot(a, b) {
      need(a, 'dot'); need(b, 'dot');
      const x = a.v.flat(), y = b.v.flat();
      if (x.length !== y.length) uerr(`dot(): vectors have different lengths (${x.length} and ${y.length}).`);
      return S(LA.dot(x, y));
    },
    diag(a) {
      if (isS(a)) uerr('diag() needs a vector or matrix');
      const v = a.v;
      if (v[0].length === 1 || v.length === 1) { const d = v.flat(); return M(d.map((x, i) => d.map((_, j) => (i === j ? x : 0)))); }
      return M(v.map((r, i) => [r[i]]));
    },
  };
  function need(a, f) { if (!a || isS(a)) uerr(`${f}() needs a matrix argument`); }
  function sq(a, f) { if (a.v.length !== a.v[0].length) uerr(`${f}(): needs a square matrix, got ${LA.dims(a.v)}`); }
  function intArg(a, f) {
    if (!a || !isS(a) || !Number.isInteger(a.v) || a.v < 1) uerr(`${f}(n) needs a positive integer`);
    return a.v;
  }

  function evaluate(src, env) {
    const toks = tokenize(src);
    let p = 0;
    const isOp = v => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    const startsPrim = () => toks[p] && (toks[p].t === 'num' || toks[p].t === 'id' || isOp('('));

    const isId = a => a.k === 'id';
    const realize = (idm, n) => M(LA.scale(LA.eye(n), idm.c));
    function add(a, b, neg) {
      if (isId(a) && isId(b)) return { k: 'id', c: neg ? a.c - b.c : a.c + b.c };
      if (isId(a)) { if (isS(b)) uerr('Cannot add scalar and I'); sq(b, 'I +'); a = realize(a, b.v.length); }
      if (isId(b)) { if (isS(a)) uerr('Cannot add scalar and I'); sq(a, '+ I'); b = realize(b, a.v.length); }
      if (isS(a) && isS(b)) return S(neg ? a.v - b.v : a.v + b.v);
      if (isS(a) || isS(b)) {
        // scalar + matrix: elementwise (numpy broadcasting) — warn by name
        const [m, s] = isS(a) ? [b, a] : [a, b];
        return M(m.v.map(r => r.map(x => (isS(a) ? (neg ? s.v - x : s.v + x) : neg ? x - s.v : x + s.v))));
      }
      return M(neg ? LA.sub(a.v, b.v, 'left', 'right') : LA.add(a.v, b.v, 'left', 'right'));
    }
    function mul(a, b) {
      if (isId(a) && isS(b)) return { k: 'id', c: a.c * b.v };
      if (isId(b) && isS(a)) return { k: 'id', c: b.c * a.v };
      if (isId(a) && isId(b)) return { k: 'id', c: a.c * b.c };
      if (isId(a)) return M(LA.scale(b.v, a.c));
      if (isId(b)) return M(LA.scale(a.v, b.c));
      if (isS(a) && isS(b)) return S(a.v * b.v);
      if (isS(a)) return M(LA.scale(b.v, a.v));
      if (isS(b)) return M(LA.scale(a.v, b.v));
      const [m, n] = LA.shape(a.v), [q, r] = LA.shape(b.v);
      if (n !== q) {
        uerr(`Matrix product cannot be computed: left operand is ${m} × ${n} and right operand is ${q} × ${r}. The left has ${n} columns but the right has ${q} rows.`);
      }
      const C = LA.mul(a.v, b.v);
      return C.length === 1 && C[0].length === 1 ? M(C) : M(C);
    }
    function expr() {
      let a = term();
      while (isOp('+') || isOp('-')) { const neg = toks[p++].v === '-'; a = add(a, term(), neg); }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        if (isOp('*') || isOp('@')) { p++; a = mul(a, unary()); }
        else if (isOp('/')) {
          p++;
          const b = unary();
          if (!isS(b)) uerr('Division by a matrix is not defined. Multiply by inv(B) instead.');
          a = isS(a) ? S(a.v / b.v) : M(LA.scale(a.v, 1 / b.v));
        } else if (startsPrim()) a = mul(a, power());
        else break;
      }
      return a;
    }
    function unary() {
      if (isOp('-')) { p++; const a = unary(); return isId(a) ? { k: 'id', c: -a.c } : isS(a) ? S(-a.v) : M(LA.scale(a.v, -1)); }
      if (isOp('+')) { p++; return unary(); }
      return power();
    }
    function power() {
      let a = postfix();
      if (isOp('^')) {
        p++;
        if (toks[p] && toks[p].t === 'id' && toks[p].v === 'T') { p++; need(a, '^T'); return M(LA.T(a.v)); }
        if (isOp('+')) { p++; need(a, '^+'); return M(LA.pinv(a.v)); }
        const e = unary();
        if (!isS(e)) uerr('Exponent must be a number (or T for transpose)');
        if (isS(a)) return S(Math.pow(a.v, e.v));
        if (e.v === -1) return FN.inv(a);
        if (Number.isInteger(e.v) && e.v >= 0) { sq(a, 'power'); return M(LA.matPow(a.v, e.v)); }
        if (Number.isInteger(e.v) && e.v < -1) { const iv = FN.inv(a); return M(LA.matPow(iv.v, -e.v)); }
        uerr('Matrix power must be an integer');
      }
      return a;
    }
    function postfix() {
      let a = primary();
      while (isOp("'")) { p++; need(a, "transpose '"); a = M(LA.T(a.v)); }
      return a;
    }
    function primary() {
      const t = toks[p];
      if (!t) uerr('Unexpected end of expression');
      if (t.t === 'num') { p++; return S(t.v); }
      if (t.t === 'id') {
        p++;
        if (isOp('(') && FN[t.v] && !(t.v in env)) {
          p++;
          const args = [];
          if (!isOp(')')) { args.push(expr()); while (isOp(',')) { p++; args.push(expr()); } }
          if (!isOp(')')) uerr('Missing ")"');
          p++;
          return FN[t.v](...args);
        }
        if (t.v in env) { const v = env[t.v]; return Array.isArray(v) ? M(v) : S(v); }
        if (t.v === 'pi') return S(Math.PI);
        if (t.v === 'e') return S(Math.E);
        if (/^I\d+$/.test(t.v)) return M(LA.eye(+t.v.slice(1)));
        if (t.v === 'I') return { k: 'id', c: 1 };
        uerr(`Unknown name "${t.v}". Defined: ${Object.keys(env).join(', ') || '(none)'}`);
      }
      if (isOp('(')) { p++; const e = expr(); if (!isOp(')')) uerr('Missing ")"'); p++; return e; }
      uerr(`Unexpected "${t.v}"`);
    }
    const r = expr();
    if (r.k === 'id') uerr('The size of I is unknown here — write I(n), for example I(3).');
    if (p < toks.length) uerr(`Unexpected "${toks[p].v}"`);
    return r;
  }
  return { evaluate, FN };
})();

if (typeof module !== 'undefined') module.exports = { MX };
