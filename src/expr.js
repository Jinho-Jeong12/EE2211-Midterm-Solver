'use strict';
/* =====================================================================
   expr.js — expression parser, evaluator, symbolic differentiation,
   simplification and polynomial canonical form.
   ===================================================================== */

const EX = (() => {
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log: Math.log,
    log10: Math.log10, log2: Math.log2, sqrt: Math.sqrt, abs: Math.abs, sign: Math.sign,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sigmoid: x => 1 / (1 + Math.exp(-x)), relu: x => Math.max(0, x),
    min: Math.min, max: Math.max,
    fact: n => { if (!Number.isInteger(n) || n < 0) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
    nCr: (n, k) => { if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); },
    nPr: (n, k) => { if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; },
  };
  const CONSTS = { pi: Math.PI, e: Math.E, π: Math.PI };

  function normalize(s) {
    return String(s)
      .replace(/\*\*/g, '^').replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
      .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!');
  }

  function tokenize(src) {
    const s = normalize(src);
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
        if (!m) throw new UserError(`Bad number near "${s.slice(i, i + 8)}"`);
        toks.push({ t: 'num', v: parseFloat(m[0]) });
        i += m[0].length;
        continue;
      }
      if (/[A-Za-z_Ͱ-Ͽ]/.test(c)) {
        const m = s.slice(i).match(/^[A-Za-z_Ͱ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*/);
        toks.push({ t: 'id', v: m[0] });
        i += m[0].length;
        continue;
      }
      const two = s.slice(i, i + 2);
      if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue; }
      if ('+-*/^(),<>!%='.includes(c)) {
        toks.push({ t: 'op', v: c === '=' ? '==' : c });
        i++;
        continue;
      }
      throw new UserError(`Unexpected character "${c}" in expression`);
    }
    return toks;
  }

  /* ---- AST constructors ---- */
  const N = v => ({ t: 'num', v });
  const V = n => ({ t: 'var', n });
  const B = (op, a, b) => ({ t: 'bin', op, a, b });
  const NEG = a => ({ t: 'neg', a });
  const CALL = (f, args) => ({ t: 'call', f, args });

  function parse(src) {
    if (src == null || String(src).trim() === '') throw new UserError('Empty expression');
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const isOp = v => toks[p] && toks[p].t === 'op' && toks[p].v === v;
    const eat = v => {
      if (!isOp(v)) throw new UserError(`Expected "${v}" in expression`);
      p++;
    };

    function orE() { let a = andE(); while (isOp('||')) { p++; a = { t: 'logic', op: '||', a, b: andE() }; } return a; }
    function andE() { let a = notE(); while (isOp('&&')) { p++; a = { t: 'logic', op: '&&', a, b: notE() }; } return a; }
    function notE() { if (isOp('!')) { p++; return { t: 'not', a: notE() }; } return cmpE(); }
    function cmpE() {
      let a = addE();
      while (peek() && peek().t === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(peek().v)) {
        const op = toks[p++].v;
        a = { t: 'cmp', op, a, b: addE() };
      }
      return a;
    }
    function addE() {
      let a = mulE();
      while (isOp('+') || isOp('-')) {
        const op = toks[p++].v;
        a = B(op, a, mulE());
      }
      return a;
    }
    function startsPrimary(tk) {
      return tk && (tk.t === 'num' || tk.t === 'id' || (tk.t === 'op' && tk.v === '('));
    }
    function mulE() {
      let a = unaryE();
      for (;;) {
        if (isOp('*') || isOp('/') || isOp('%')) {
          const op = toks[p++].v;
          a = B(op, a, unaryE());
        } else if (startsPrimary(peek())) {
          a = B('*', a, powE()); // implicit multiplication
        } else break;
      }
      return a;
    }
    function unaryE() {
      if (isOp('-')) { p++; return NEG(unaryE()); }
      if (isOp('+')) { p++; return unaryE(); }
      return powE();
    }
    function powE() {
      const base = primary();
      if (isOp('^')) {
        p++;
        const ex = unaryE(); // right-assoc, allows x^-1
        return B('^', base, ex);
      }
      return base;
    }
    function primary() {
      const tk = peek();
      if (!tk) throw new UserError('Unexpected end of expression');
      if (tk.t === 'num') { p++; return N(tk.v); }
      if (tk.t === 'id') {
        p++;
        if (FUNCS[tk.v] && isOp('(')) {
          p++;
          const args = [];
          if (!isOp(')')) {
            args.push(orE());
            while (isOp(',')) { p++; args.push(orE()); }
          }
          eat(')');
          return CALL(tk.v, args);
        }
        if (tk.v in CONSTS) return { t: 'const', n: tk.v, v: CONSTS[tk.v] };
        return V(tk.v);
      }
      if (isOp('(')) { p++; const e = orE(); eat(')'); return e; }
      throw new UserError(`Unexpected "${tk.v}" in expression`);
    }
    const e = orE();
    if (p < toks.length) throw new UserError(`Unexpected "${toks[p].v}" in expression`);
    return e;
  }

  /* ---- evaluation ---- */
  function evaluate(node, env = {}) {
    switch (node.t) {
      case 'num': return node.v;
      case 'const': return node.v;
      case 'var':
        if (!(node.n in env)) throw new UserError(`No value given for variable "${node.n}"`);
        return env[node.n];
      case 'neg': return -evaluate(node.a, env);
      case 'bin': {
        const a = evaluate(node.a, env), b = evaluate(node.b, env);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return ((a % b) + b) % b;
          case '^': return Math.pow(a, b);
        }
        break;
      }
      case 'call': return FUNCS[node.f](...node.args.map(x => evaluate(x, env)));
      case 'cmp': {
        const a = evaluate(node.a, env), b = evaluate(node.b, env);
        const eq = Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
        switch (node.op) {
          case '<': return a < b && !eq ? 1 : 0;
          case '>': return a > b && !eq ? 1 : 0;
          case '<=': return a < b || eq ? 1 : 0;
          case '>=': return a > b || eq ? 1 : 0;
          case '==': return eq ? 1 : 0;
          case '!=': return eq ? 0 : 1;
        }
        break;
      }
      case 'logic': {
        const a = evaluate(node.a, env);
        if (node.op === '&&') return a && evaluate(node.b, env) ? 1 : 0;
        return a || evaluate(node.b, env) ? 1 : 0;
      }
      case 'not': return evaluate(node.a, env) ? 0 : 1;
    }
    throw new UserError('Cannot evaluate expression');
  }

  function vars(node, set = new Set()) {
    if (!node) return set;
    if (node.t === 'var') set.add(node.n);
    for (const k of ['a', 'b']) if (node[k]) vars(node[k], set);
    if (node.args) node.args.forEach(a => vars(a, set));
    return set;
  }
  function natSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true });
  }
  function varList(node) { return [...vars(node)].sort(natSort); }

  /* ---- polynomial canonical form ---- */
  // monomial key: "x:2|y:1" ; const key ""
  function monoKey(m) { return Object.keys(m).sort(natSort).map(k => `${k}:${m[k]}`).join('|'); }
  function pConst(c) { const P = new Map(); if (c !== 0) P.set('', { m: {}, c }); return P; }
  function pVar(n) { const P = new Map(); P.set(`${n}:1`, { m: { [n]: 1 }, c: 1 }); return P; }
  function pAdd(P, Q, sgn = 1) {
    const R = new Map();
    for (const [k, t] of P) R.set(k, { m: t.m, c: t.c });
    for (const [k, t] of Q) {
      if (R.has(k)) R.get(k).c += sgn * t.c; else R.set(k, { m: t.m, c: sgn * t.c });
    }
    for (const [k, t] of R) if (Math.abs(t.c) < 1e-13) R.delete(k);
    return R;
  }
  function pMul(P, Q) {
    let R = new Map();
    for (const [, a] of P)
      for (const [, b] of Q) {
        const m = { ...a.m };
        for (const v in b.m) m[v] = (m[v] || 0) + b.m[v];
        const k = monoKey(m);
        if (R.has(k)) R.get(k).c += a.c * b.c; else R.set(k, { m, c: a.c * b.c });
      }
    for (const [k, t] of R) if (Math.abs(t.c) < 1e-13) R.delete(k);
    return R;
  }
  function pScale(P, s) { const R = new Map(); for (const [k, t] of P) if (t.c * s !== 0) R.set(k, { m: t.m, c: t.c * s }); return R; }
  function pIsConst(P) { return P.size === 0 || (P.size === 1 && P.has('')); }
  function pConstVal(P) { return P.has('') ? P.get('').c : 0; }

  function toPoly(node) {
    switch (node.t) {
      case 'num': return pConst(node.v);
      case 'const': return pConst(node.v);
      case 'var': return pVar(node.n);
      case 'neg': { const a = toPoly(node.a); return a && pScale(a, -1); }
      case 'bin': {
        const a = toPoly(node.a);
        if (!a) return null;
        if (node.op === '^') {
          const b = toPoly(node.b);
          if (!b || !pIsConst(b)) return null;
          const e = pConstVal(b);
          if (pIsConst(a)) return pConst(Math.pow(pConstVal(a), e));
          if (!Number.isInteger(e) || e < 0 || e > 30) return null;
          let R = pConst(1);
          for (let i = 0; i < e; i++) R = pMul(R, a);
          return R;
        }
        const b = toPoly(node.b);
        if (!b) return null;
        if (node.op === '+') return pAdd(a, b);
        if (node.op === '-') return pAdd(a, b, -1);
        if (node.op === '*') return pMul(a, b);
        if (node.op === '/') {
          if (!pIsConst(b) || pConstVal(b) === 0) return null;
          return pScale(a, 1 / pConstVal(b));
        }
        return null;
      }
      case 'call': {
        if (vars(node).size) return null;
        return pConst(evaluate(node));
      }
    }
    return null;
  }
  function polyDeg(P) {
    let d = 0;
    for (const [, t] of P) d = Math.max(d, Object.values(t.m).reduce((s, x) => s + x, 0));
    return d;
  }
  function fromPoly(P) {
    const terms = [...P.values()].filter(t => Math.abs(t.c) > 1e-13);
    if (!terms.length) return N(0);
    const deg = t => Object.values(t.m).reduce((s, x) => s + x, 0);
    const allV = [...new Set(terms.flatMap(t => Object.keys(t.m)))].sort(natSort);
    terms.sort((a, b) => {
      if (deg(b) !== deg(a)) return deg(b) - deg(a);
      for (const v of allV) { const d = (b.m[v] || 0) - (a.m[v] || 0); if (d) return d; }
      return 0;
    });
    let out = null;
    for (const t of terms) {
      const vs = Object.keys(t.m).sort(natSort);
      const ac = Math.abs(t.c);
      let term = vs.length && Math.abs(ac - 1) < 1e-13 ? null : N(ac);
      for (const v of vs) {
        const f = t.m[v] === 1 ? V(v) : B('^', V(v), N(t.m[v]));
        term = term ? B('*', term, f) : f;
      }
      if (!out) out = t.c < 0 ? NEG(term) : term;
      else out = B(t.c < 0 ? '-' : '+', out, term);
    }
    return out;
  }
  // coefficients of univariate polynomial (index = power)
  function polyCoeffs(P, x) {
    const deg = polyDeg(P);
    const c = Array(deg + 1).fill(0);
    for (const [, t] of P) {
      const ks = Object.keys(t.m);
      if (ks.some(k => k !== x)) return null;
      c[t.m[x] || 0] += t.c;
    }
    return c;
  }

  /* ---- structural simplification ---- */
  const isNum = (n, v) => n.t === 'num' && (v === undefined || Math.abs(n.v - v) < 1e-15);
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function simp(n) {
    switch (n.t) {
      case 'num': case 'var': case 'const': return n;
      case 'neg': {
        const a = simp(n.a);
        if (a.t === 'num') return N(-a.v);
        if (a.t === 'neg') return a.a;
        return NEG(a);
      }
      case 'call': {
        const args = n.args.map(simp);
        if (args.every(a => a.t === 'num') && ['sqrt', 'abs'].includes(n.f)) {
          const v = FUNCS[n.f](...args.map(a => a.v));
          if (Number.isInteger(v)) return N(v);
        }
        if (n.f === 'exp' && isNum(args[0], 0)) return N(1);
        if ((n.f === 'ln' || n.f === 'log') && isNum(args[0], 1)) return N(0);
        return CALL(n.f, args);
      }
      case 'bin': {
        let a = simp(n.a), b = simp(n.b);
        const op = n.op;
        if (a.t === 'num' && b.t === 'num' && op !== '/' ) {
          const v = evaluate(B(op, a, b));
          if (isFinite(v)) return N(v);
        }
        if (op === '/' && a.t === 'num' && b.t === 'num' && b.v !== 0) {
          return N(a.v / b.v);
        }
        if (op === '+') {
          if (isNum(a, 0)) return b;
          if (isNum(b, 0)) return a;
          if (b.t === 'neg') return simp(B('-', a, b.a));
          if (b.t === 'num' && b.v < 0) return B('-', a, N(-b.v));
          if (same(a, b)) return simp(B('*', N(2), a));
          return B('+', a, b);
        }
        if (op === '-') {
          if (isNum(b, 0)) return a;
          if (isNum(a, 0)) return simp(NEG(b));
          if (b.t === 'neg') return simp(B('+', a, b.a));
          if (b.t === 'num' && b.v < 0) return B('+', a, N(-b.v));
          if (same(a, b)) return N(0);
          return B('-', a, b);
        }
        if (op === '*') {
          if (isNum(a, 0) || isNum(b, 0)) return N(0);
          if (isNum(a, 1)) return b;
          if (isNum(b, 1)) return a;
          if (isNum(a, -1)) return simp(NEG(b));
          if (isNum(b, -1)) return simp(NEG(a));
          if (a.t === 'neg') return simp(NEG(B('*', a.a, b)));
          if (b.t === 'neg') return simp(NEG(B('*', a, b.a)));
          if (b.t === 'num' && a.t !== 'num') [a, b] = [b, a];
          if (a.t === 'call' && b.t !== 'call' && b.t !== 'num' && toPoly(b)) [a, b] = [b, a];
          if (a.t === 'num' && b.t === 'bin' && b.op === '*' && b.a.t === 'num') return simp(B('*', N(a.v * b.a.v), b.b));
          if (same(a, b)) return B('^', a, N(2));
          return B('*', a, b);
        }
        if (op === '/') {
          if (isNum(a, 0)) return N(0);
          if (isNum(b, 1)) return a;
          if (same(a, b)) return N(1);
          if (a.t === 'neg') return simp(NEG(B('/', a.a, b)));
          return B('/', a, b);
        }
        if (op === '^') {
          if (isNum(b, 0)) return N(1);
          if (isNum(b, 1)) return a;
          if (isNum(a, 1)) return N(1);
          if (a.t === 'bin' && a.op === '^' && a.b.t === 'num' && b.t === 'num') return B('^', a.a, N(a.b.v * b.v));
          return B('^', a, b);
        }
        return B(op, a, b);
      }
      default: return n;
    }
  }
  function canon(n) {
    const P = toPoly(n);
    if (P) return fromPoly(P);
    if (n.t === 'bin') return simp(B(n.op, canon(n.a), canon(n.b)));
    if (n.t === 'neg') return simp(NEG(canon(n.a)));
    if (n.t === 'call') return simp(CALL(n.f, n.args.map(canon)));
    return n;
  }
  function simplify(n) {
    return canon(simp(simp(n)));
  }

  /* ---- symbolic differentiation ---- */
  function hasVar(n, x) { return vars(n).has(x); }
  function d(n, x) {
    switch (n.t) {
      case 'num': case 'const': return N(0);
      case 'var': return N(n.n === x ? 1 : 0);
      case 'neg': return NEG(d(n.a, x));
      case 'bin': {
        const { a, b, op } = n;
        if (op === '+' || op === '-') return B(op, d(a, x), d(b, x));
        if (op === '*') return B('+', B('*', d(a, x), b), B('*', a, d(b, x)));
        if (op === '/') return B('/', B('-', B('*', d(a, x), b), B('*', a, d(b, x))), B('^', b, N(2)));
        if (op === '^') {
          if (!hasVar(b, x)) return B('*', B('*', b, B('^', a, B('-', b, N(1)))), d(a, x));
          if (!hasVar(a, x)) return B('*', B('*', n, CALL('ln', [a])), d(b, x));
          return B('*', n, B('+', B('*', d(b, x), CALL('ln', [a])), B('/', B('*', b, d(a, x)), a)));
        }
        if (op === '%') throw new UserError('Cannot differentiate the % (mod) operator');
        break;
      }
      case 'call': {
        const u = n.args[0], du = d(u, x);
        const C = (f, ...a) => CALL(f, a);
        switch (n.f) {
          case 'sin': return B('*', C('cos', u), du);
          case 'cos': return B('*', NEG(C('sin', u)), du);
          case 'tan': return B('/', du, B('^', C('cos', u), N(2)));
          case 'exp': return B('*', C('exp', u), du);
          case 'ln': case 'log': return B('/', du, u);
          case 'log10': return B('/', du, B('*', u, C('ln', N(10))));
          case 'log2': return B('/', du, B('*', u, C('ln', N(2))));
          case 'sqrt': return B('/', du, B('*', N(2), C('sqrt', u)));
          case 'abs': return B('*', C('sign', u), du);
          case 'asin': return B('/', du, C('sqrt', B('-', N(1), B('^', u, N(2)))));
          case 'acos': return NEG(B('/', du, C('sqrt', B('-', N(1), B('^', u, N(2))))));
          case 'atan': return B('/', du, B('+', N(1), B('^', u, N(2))));
          case 'sinh': return B('*', C('cosh', u), du);
          case 'cosh': return B('*', C('sinh', u), du);
          case 'tanh': return B('*', B('-', N(1), B('^', C('tanh', u), N(2))), du);
          case 'sigmoid': return B('*', B('*', C('sigmoid', u), B('-', N(1), C('sigmoid', u))), du);
          case 'relu': return B('*', { t: 'cmp', op: '>', a: u, b: N(0) }, du);
          case 'sign': case 'floor': case 'ceil': case 'round': return N(0);
        }
        throw new UserError(`Cannot differentiate ${n.f}()`);
      }
    }
    throw new UserError('Cannot differentiate this expression');
  }
  function diff(n, x) { return simplify(d(n, x)); }

  /* ---- printing ---- */
  const PREC = { '||': 1, '&&': 2, cmp: 3, '+': 4, '-': 4, '*': 5, '/': 5, '%': 5, neg: 6, '^': 7 };
  function str(n, py = false) {
    function num(v) {
      if (py) return String(+v.toPrecision(12));
      return fmtNum(v, { dec: Math.max(Fmt.dec, 4), noFrac: true });
    }
    function go(n, parentPrec, rightSide) {
      let s, prec;
      switch (n.t) {
        case 'num': s = num(n.v); prec = n.v < 0 ? PREC.neg : 9; break;
        case 'const': s = py ? (n.n === 'pi' || n.n === 'π' ? 'np.pi' : 'np.e') : n.n; prec = 9; break;
        case 'var': s = n.n; prec = 9; break;
        case 'neg': s = '-' + go(n.a, 5); prec = PREC.neg; break;
        case 'call': {
          const fname = py ? ({ ln: 'np.log', log: 'np.log', sigmoid: 'sigmoid', relu: 'relu' }[n.f] || 'np.' + n.f) : n.f;
          s = `${fname}(${n.args.map(a => go(a, 0)).join(', ')})`; prec = 9; break;
        }
        case 'cmp': s = `${go(n.a, PREC.cmp)} ${n.op} ${go(n.b, PREC.cmp + 1)}`; prec = PREC.cmp; break;
        case 'logic': s = `${go(n.a, PREC[n.op])} ${py ? (n.op === '&&' ? 'and' : 'or') : n.op} ${go(n.b, PREC[n.op] + 1)}`; prec = PREC[n.op]; break;
        case 'not': s = (py ? 'not ' : '!') + go(n.a, 8); prec = 8; break;
        case 'bin': {
          prec = PREC[n.op];
          const op = n.op;
          if (op === '^') {
            s = `${go(n.a, prec + 1)}${py ? '**' : '^'}${go(n.b, prec)}`;
          } else if (op === '*') {
            const L = go(n.a, prec), R = go(n.b, prec + 0.5);
            const implicit = !py && n.a.t === 'num' && (n.b.t === 'var' || (n.b.t === 'bin' && n.b.op === '^' && n.b.a.t === 'var') || n.b.t === 'call' || /^\(/.test(R));
            s = implicit ? `${L}${R}` : `${L}${py ? '*' : '·'}${R}`;
          } else {
            const R = go(n.b, prec + ((op === '-' || op === '/' || op === '%') ? 1 : 0));
            s = `${go(n.a, prec)} ${op} ${R}`;
            if (op === '/' && !py) s = `${go(n.a, prec)}/${R}`;
          }
          break;
        }
        default: s = '?'; prec = 9;
      }
      if (prec < parentPrec) s = `(${s})`;
      return s;
    }
    return go(n, 0);
  }

  /* compile to fast JS function of named variables */
  function compile(node, varNames) {
    return (...vals) => {
      const env = {};
      varNames.forEach((v, i) => (env[v] = vals[i]));
      return evaluate(node, env);
    };
  }

  /* evaluate constant string like "1/3", "-2^2", "sqrt(2)" */
  function constVal(s) {
    const n = parse(s);
    if (vars(n).size) throw new UserError(`"${s}" is not a number`);
    return evaluate(n);
  }

  /* parse assignments "x=1, y=2" or "x1=1; x2=-1" */
  function parseAssign(s) {
    const env = {};
    String(s).split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^([A-Za-z_Ͱ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*)\s*=\s*(.+)$/);
      if (!m) throw new UserError(`Could not read "${part}". Use the form  x=2, y=-1`);
      env[m[1]] = constVal(m[2]);
    });
    return env;
  }

  /* Durand–Kerner: all roots of polynomial with real coeffs c[0..n] (c[k] * x^k) */
  function polyRoots(c) {
    c = c.slice();
    while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-14) c.pop();
    const n = c.length - 1;
    if (n < 1) return [];
    if (n === 1) return [{ re: -c[0] / c[1], im: 0 }];
    const a = c.map(x => x / c[n]);
    let roots = Array.from({ length: n }, (_, k) => {
      const ang = (2 * Math.PI * k) / n + 0.4;
      const r = 1 + Math.max(...a.slice(0, n).map(Math.abs));
      return { re: r * 0.5 * Math.cos(ang), im: r * 0.5 * Math.sin(ang) };
    });
    const mul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
    const sub = (p, q) => ({ re: p.re - q.re, im: p.im - q.im });
    const div = (p, q) => { const d = q.re * q.re + q.im * q.im || 1e-300; return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d }; };
    const evalP = z => { let r = { re: 1, im: 0 }; for (let k = n - 1; k >= 0; k--) r = { re: r.re * z.re - r.im * z.im + a[k], im: r.re * z.im + r.im * z.re }; return r; };
    for (let it = 0; it < 2000; it++) {
      let delta = 0;
      roots = roots.map((z, i) => {
        let den = { re: 1, im: 0 };
        roots.forEach((w, j) => { if (i !== j) den = mul(den, sub(z, w)); });
        const nz = sub(z, div(evalP(z), den));
        delta = Math.max(delta, Math.hypot(nz.re - z.re, nz.im - z.im));
        return nz;
      });
      if (delta < 1e-14) break;
    }
    return roots;
  }
  function realRoots(c) {
    const out = [];
    const f = x => c.reduce((s, ck, k) => s + ck * Math.pow(x, k), 0);
    const df = x => c.reduce((s, ck, k) => (k ? s + k * ck * Math.pow(x, k - 1) : s), 0);
    for (const r of polyRoots(c)) {
      if (Math.abs(r.im) < 1e-6 * (1 + Math.abs(r.re))) {
        let x = r.re;
        for (let i = 0; i < 30; i++) { const dv = df(x); if (!dv) break; const nx = x - f(x) / dv; if (!isFinite(nx)) break; x = nx; }
        if (!out.some(y => Math.abs(y - x) < 1e-7 * (1 + Math.abs(x)))) out.push(Math.abs(x) < 1e-12 ? 0 : x);
      }
    }
    return out.sort((p, q) => p - q);
  }

  return {
    parse, evaluate, vars, varList, simplify, diff, str, compile, constVal, parseAssign,
    toPoly, fromPoly, polyCoeffs, polyDeg, realRoots, polyRoots, FUNCS, natSort,
    N, V, B, NEG, CALL,
  };
})();

if (typeof module !== 'undefined') module.exports = { EX };
