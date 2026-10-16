'use strict';
/* =====================================================================
   tools_matrix.js — Matrix / vector operations, determinant family,
   rank & invertibility diagnostics, linear systems Xw = y
   ===================================================================== */

const A33 = [[1, 2, 3], [0, 4, 5], [1, 0, 6]];

/* ---------------- MATRIX & VECTOR ---------------- */
tool({
  id: 'matcalc', cat: 'matrix', name: 'Matrix Expression Calculator (자유 수식)', short: 'Matrix Calculator',
  kw: 'calculator expression formula 수식 계산기 inv transpose multiply add subtract',
  desc: `Type any expression using A, B, C, x, y. Examples: <code>A*B</code>, <code>A@B</code>, <code>A'</code> or <code>A^T</code> or <code>A.T</code>, <code>inv(A)</code> or <code>A^-1</code>, <code>pinv(X)</code>, <code>det(A)</code>, <code>rank(A)</code>, <code>adj(A)</code>, <code>A^T A + 2I</code>, <code>inv(A'A)A'y</code>, <code>dot(x,y)</code>, <code>trace(A)</code>, <code>I(3)</code>.`,
  inputs: [
    { k: 'expr', type: 'expr', label: 'Expression', def: "inv(A'A) A' y", wide: true },
    { k: 'A', type: 'matrix', label: 'A', def: [[1, -9], [1, -7], [1, -5], [1, 1], [1, 5], [1, 9]], group: 'm' },
    { k: 'B', type: 'matrix', label: 'B', def: [[1, 2], [3, 4]], group: 'm' },
    { k: 'C', type: 'matrix', label: 'C', def: [[1, 0], [0, 1]], group: 'm' },
    { k: 'x', type: 'vector', label: 'x (column vector)', def: [1, 2], group: 'm' },
    { k: 'y', type: 'vector', label: 'y (column vector)', def: [-6, -6, -4, -1, 1, 4], group: 'm' },
  ],
  solve(v, R) {
    const env = { A: v.A, B: v.B, C: v.C, x: LA.col(v.x), y: LA.col(v.y) };
    R.given('A', v.A).given('B', v.B).given('C', v.C).given('x', v.x).given('y', v.y);
    R.find(`Value of <code>${esc(v.expr)}</code>`);
    const r = MX.evaluate(v.expr, env);
    if (r.k === 's') R.answer(esc(v.expr), r.v, { sub: fmtExact(r.v) });
    else if (r.v.length === 1 && r.v[0].length === 1) R.answer(esc(v.expr) + '  (1×1 → scalar)', r.v[0][0]);
    else R.answer(esc(v.expr) + ` &nbsp; <span class="muted">(${LA.dims(r.v)})</span>`, r.v);
    R.code(`import numpy as np
from numpy.linalg import inv, pinv, det, matrix_rank
A = ${pyArr(v.A)}
B = ${pyArr(v.B)}
C = ${pyArr(v.C)}
x = ${pyArr(v.x)}.reshape(-1, 1)
y = ${pyArr(v.y)}.reshape(-1, 1)
# expression: ${v.expr}
# numpy syntax: A @ B (matrix product), A.T (transpose), inv(A), pinv(A), det(A), matrix_rank(A), np.identity(n)
# e.g. inv(A.T @ A) @ A.T @ y`);
  },
});

tool({
  id: 'matops', cat: 'matrix', name: 'Matrix ± × (A+B, A−B, AB, BA, kA, AᵀB…)', short: 'A±B, AB',
  kw: 'add subtract multiply product matrix-matrix 더하기 빼기 곱 행렬곱 scalar',
  desc: 'Two matrices → chosen operation. Dimensions are checked first and the reason is shown if impossible.',
  inputs: [
    { k: 'op', type: 'select', label: 'Operation', def: 'AB', options: [['AB', 'AB (matrix product)'], ['BA', 'BA'], ['A+B', 'A + B'], ['A-B', 'A − B'], ['kA', 'k·A (scalar × matrix)'], ['AtB', 'AᵀB'], ['ABt', 'ABᵀ'], ['AtA', 'AᵀA and AAᵀ'], ['had', 'A ∘ B (element-wise, numpy A*B)']] },
    { k: 'k', type: 'number', label: 'k (scalar)', def: '2', showIf: r => r.op === 'kA' },
    { k: 'A', type: 'matrix', label: 'A', def: [[1, 4], [0, 4], [3, -2]], group: 'm' },
    { k: 'B', type: 'matrix', label: 'B', def: [[1, 4, 3], [0, 4, 2]], group: 'm', showIf: r => !['kA', 'AtA'].includes(r.op) },
  ],
  solve(v, R) {
    const { A, B, op } = v;
    R.given('A', A, { note: `A is ${LA.dims(A)}` });
    if (B) R.given('B', B, { note: `B is ${LA.dims(B)}` });
    let res, name, rule, code;
    const [m, n] = LA.shape(A), [p, q] = B ? LA.shape(B) : [0, 0];
    switch (op) {
      case 'AB': name = 'AB'; rule = `(${m}×${n})(${p}×${q}) → needs n = p: ${n} ${n === p ? '=' : '≠'} ${p}`; res = LA.mul(A, B, 'A', 'B'); code = 'A @ B'; break;
      case 'BA': name = 'BA'; rule = `(${p}×${q})(${m}×${n}) → needs q = m: ${q} ${q === m ? '=' : '≠'} ${m}`; res = LA.mul(B, A, 'B', 'A'); code = 'B @ A'; break;
      case 'A+B': name = 'A + B'; rule = 'same size required'; res = LA.add(A, B); code = 'A + B'; break;
      case 'A-B': name = 'A − B'; rule = 'same size required'; res = LA.sub(A, B); code = 'A - B'; break;
      case 'kA': name = `${fmtNum(v.k)}·A`; rule = 'every entry multiplied by k'; res = LA.scale(A, v.k); code = `${pyNum(v.k)} * A`; break;
      case 'AtB': name = 'AᵀB'; rule = `Aᵀ is ${n}×${m}; needs m = p: ${m} ${m === p ? '=' : '≠'} ${p}`; res = LA.mul(LA.T(A), B, 'Aᵀ', 'B'); code = 'A.T @ B'; break;
      case 'ABt': name = 'ABᵀ'; rule = `Bᵀ is ${q}×${p}; needs n = q: ${n} ${n === q ? '=' : '≠'} ${q}`; res = LA.mul(A, LA.T(B), 'A', 'Bᵀ'); code = 'A @ B.T'; break;
      case 'AtA': {
        R.formula('AᵀA is d×d (n×n) ;  AAᵀ is m×m', 'They are different matrices — do not confuse them.');
        R.answer(`AᵀA &nbsp;<span class="muted">(${n}×${n})</span>`, LA.mul(LA.T(A), A));
        R.answer(`AAᵀ &nbsp;<span class="muted">(${m}×${m})</span>`, LA.mul(A, LA.T(A)));
        R.code(`import numpy as np\nA = ${pyArr(A)}\nprint(A.T @ A)\nprint(A @ A.T)`);
        return;
      }
      case 'had': name = 'A ∘ B'; rule = 'element-wise, same size'; if (m !== p || n !== q) uerr(`A ∘ B needs the same size: A is ${m}×${n}, B is ${p}×${q}`); res = A.map((r, i) => r.map((x, j) => x * B[i][j])); code = 'A * B   # element-wise (NOT matrix product)'; break;
    }
    R.find(name);
    R.formula(name, 'Dimension check: ' + rule);
    if (op === 'AB' || op === 'BA') R.step('Each entry', undefined, { note: '(row i of left) · (column j of right) = Σₖ leftᵢₖ rightₖⱼ' });
    R.answer(`${name} &nbsp;<span class="muted">(${LA.dims(res)})</span>`, res);
    R.code(`import numpy as np\nA = ${pyArr(A)}\n${B ? `B = ${pyArr(B)}\n` : ''}print(${code})`);
  },
});

tool({
  id: 'transpose', cat: 'matrix', name: 'Transpose Xᵀ', short: 'Transpose',
  kw: 'transpose 전치 T',
  inputs: [{ k: 'A', type: 'matrix', label: 'X', def: [[1, 4, 3], [0, 4, 2], [1, 8, 5]] }],
  solve(v, R) {
    R.given('X', v.A, { note: `X is ${LA.dims(v.A)}` });
    R.formula('(Xᵀ)ᵢⱼ = Xⱼᵢ', 'rows become columns');
    R.answer(`Xᵀ &nbsp;<span class="muted">(${LA.dims(LA.T(v.A))})</span>`, LA.T(v.A));
    R.code(`import numpy as np\nX = ${pyArr(v.A)}\nprint(X.T)`);
  },
});

tool({
  id: 'matvec', cat: 'matrix', name: 'Matrix–Vector product Wx', short: 'Wx',
  kw: 'matrix vector product multiply 행렬 벡터 곱',
  inputs: [
    { k: 'W', type: 'matrix', label: 'W', def: [[1, 4, 3], [0, 4, 2]], group: 'm' },
    { k: 'x', type: 'vector', label: 'x', def: [1, 2, 3], group: 'm' },
  ],
  solve(v, R) {
    const { W, x } = v;
    R.given('W', W, { note: LA.dims(W) }).given('x', x, { note: `${x.length}×1` });
    R.find('Wx');
    R.formula('(Wx)ᵢ = Σⱼ wᵢⱼ xⱼ', `(${W.length}×${W[0].length})(${x.length}×1) → ${W.length}×1`);
    const res = LA.mul(W, LA.col(x), 'W', 'x');
    W.forEach((r, i) => R.step(`row ${i + 1}`, undefined, { note: r.map((w, j) => `(${fmtNum(w)})(${fmtNum(x[j])})`).join(' + ') + ' = ' + fmtNum(res[i][0]) }));
    R.answer('Wx', res);
    R.code(`import numpy as np\nW = ${pyArr(W)}\nx = ${pyArr(x)}\nprint(W @ x)`);
  },
});

tool({
  id: 'vecmat', cat: 'matrix', name: 'Vector–Matrix product xᵀW', short: 'xᵀW',
  kw: 'vector matrix product row 곱',
  inputs: [
    { k: 'x', type: 'vector', label: 'x', def: [1, 2], group: 'm' },
    { k: 'W', type: 'matrix', label: 'W', def: [[1, 4, 3], [0, 4, 2]], group: 'm' },
  ],
  solve(v, R) {
    const { W, x } = v;
    R.given('x', x).given('W', W);
    R.formula('(xᵀW)ⱼ = Σᵢ xᵢ wᵢⱼ', `(1×${x.length})(${W.length}×${W[0].length}) → 1×${W[0].length}`);
    const res = LA.mul([x], W, 'xᵀ', 'W');
    R.answer('xᵀW', res);
    R.code(`import numpy as np\nx = ${pyArr(x)}\nW = ${pyArr(W)}\nprint(x @ W)   # = x^T W`);
  },
});

tool({
  id: 'vecops', cat: 'matrix', name: 'Vector ops: x±y, a·x, dot product xᵀy, norm, angle', short: 'Vectors / dot',
  kw: 'vector add subtract scalar dot inner product norm length euclidean angle cos 내적 벡터 길이',
  inputs: [
    { k: 'x', type: 'vector', label: 'x', def: [2, 3], group: 'm' },
    { k: 'y', type: 'vector', label: 'y', def: [1, 0], group: 'm', link: 'x' },
    { k: 'a', type: 'number', label: 'scalar a', def: '2' },
  ],
  solve(v, R) {
    const { x, y, a } = v;
    if (x.length !== y.length) uerr(`x has ${x.length} entries but y has ${y.length} — they must have the same length.`);
    R.given('x', x).given('y', y).given('a', a);
    const dot = LA.dot(x, y), nx = LA.norm(x), ny = LA.norm(y);
    R.formula('x·y = xᵀy = Σ xᵢyᵢ = ‖x‖‖y‖cos θ ;  ‖x‖ = √(x·x)');
    R.step('x + y', x.map((t, i) => t + y[i])).step('x − y', x.map((t, i) => t - y[i])).step(`a·x`, x.map(t => a * t)).step('xᵀ (row)', [x]);
    R.step('xᵀy', undefined, { note: x.map((t, i) => `(${fmtNum(t)})(${fmtNum(y[i])})`).join(' + ') + ' = ' + fmtNum(dot) });
    R.answer('Dot / inner product xᵀy', dot, { sub: `(1×${x.length})(${y.length}×1) → scalar` });
    R.answer('‖x‖ (Euclidean length)', nx, { sub: `√(${x.map(t => fmtNum(t) + '²').join(' + ')})` });
    R.answer('‖y‖', ny);
    if (nx > 0 && ny > 0) {
      const c = dot / (nx * ny);
      R.check('cos θ = xᵀy / (‖x‖‖y‖)', c, { note: `θ = ${fmtNum(Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI)}°` });
      R.check('projection length ‖x‖cos θ (onto y)', dot / ny);
    }
    R.code(`import numpy as np\nx = ${pyArr(x)}\ny = ${pyArr(y)}\nprint(x + y, x - y, ${pyNum(a)} * x)\nprint(x @ y)            # dot product x^T y\nprint(np.linalg.norm(x))  # Euclidean length`);
  },
});

tool({
  id: 'identity', cat: 'matrix', name: 'Identity matrix Iₙ', short: 'Iₙ',
  kw: 'identity eye 단위행렬',
  inputs: [{ k: 'n', type: 'int', label: 'n', def: '3' }],
  solve(v, R) {
    if (v.n < 1 || v.n > 30) uerr('n must be 1..30');
    R.answer(`I${sub(v.n)}`, LA.eye(v.n));
    R.code(`import numpy as np\nprint(np.identity(${v.n}))`);
  },
});

tool({
  id: 'sets', cat: 'matrix', name: 'Set operations ∩ ∪ (L4)', short: 'Sets ∩ ∪',
  kw: 'set intersection union 집합 교집합 합집합 difference',
  inputs: [
    { k: 'a', type: 'text', label: 'S₁', def: '1, 3, 5, 8' },
    { k: 'b', type: 'text', label: 'S₂', def: '1, 8, 4' },
  ],
  solve(v, R) {
    const A = uniqSorted(parseLabels(v.a)), B = uniqSorted(parseLabels(v.b));
    const I = A.filter(x => B.includes(x)), U = uniqSorted([...A, ...B]);
    R.given('S₁', `{${A.join(', ')}}`).given('S₂', `{${B.join(', ')}}`);
    R.answer('S₁ ∩ S₂', `{${I.join(', ')}}`);
    R.answer('S₁ ∪ S₂', `{${U.join(', ')}}`);
    R.check('S₁ − S₂', `{${A.filter(x => !B.includes(x)).join(', ')}}`);
    R.check('|S₁|, |S₂|', `${A.length}, ${B.length}`);
  },
});

/* ---------------- DETERMINANT FAMILY ---------------- */
function detSteps(A, R, label = 'det(A)', rowSel = 0) {
  const n = A.length;
  const f = x => (x < 0 ? `(${fmtNum(x)})` : fmtNum(x));
  if (n === 1) { R.step(label, A[0][0]); return A[0][0]; }
  if (n === 2) {
    const [[a, b], [c, d]] = A;
    const v = a * d - b * c;
    R.formula('det = ad − bc');
    R.step(label, undefined, { note: `${f(a)}·${f(d)} − ${f(b)}·${f(c)} = ${fmtNum(a * d)} − ${f(b * c)} = <b>${fmtNum(v)}</b>` });
    return v;
  }
  // cofactor expansion along the row with most zeros (row 1 if tie)
  let row = rowSel, best = 0;
  if (rowSel == null || rowSel < 0 || rowSel >= n) { row = 0; best = -1; A.forEach((r, i) => { const z = r.filter(x => x === 0).length; if (z > best) { best = z; row = i; } }); }
  if (n === 3 && row === 0) {
    const [[a, b, c], [d, e, f2], [g, hh, i]] = A;
    R.formula('det(A) = a(ei − fh) − b(di − fg) + c(dh − eg)', 'cofactor expansion along row 1: Σⱼ (−1)^(1+j) a₁ⱼ M₁ⱼ');
  } else {
    R.formula(`det(A) = Σⱼ (−1)^(i+j) aᵢⱼ Mᵢⱼ`, `cofactor expansion along row ${row + 1}${best > 0 ? ' (the row with most zeros)' : ''}`);
  }
  let total = 0;
  const rows = [];
  for (let j = 0; j < n; j++) {
    const a = A[row][j];
    const Mm = LA.minorMat(A, row, j);
    const M = LA.det(Mm);
    const s = (row + j) % 2 ? -1 : 1;
    total += s * a * M;
    rows.push([`a${sub(row + 1)}${sub(j + 1)} = ${fmtNum(a)}`, renderVal(Mm, { dims: false }), fmtNum(M), s > 0 ? '+' : '−', fmtNum(s * a * M)]);
  }
  R.table(['element', 'minor matrix (delete row & col)', 'Mᵢⱼ = det', 'sign (−1)^(i+j)', 'sign·aᵢⱼ·Mᵢⱼ'], rows);
  if (n === 3 && row === 0) {
    const [[a, b, c], [d, e, f2], [g, hh, i]] = A;
    R.step(label, undefined, { note: `${f(a)}(${f(e)}·${f(i)} − ${f(f2)}·${f(hh)}) − ${f(b)}(${f(d)}·${f(i)} − ${f(f2)}·${f(g)}) + ${f(c)}(${f(d)}·${f(hh)} − ${f(e)}·${f(g)}) = <b>${fmtNum(total)}</b>` });
  } else R.step(label, undefined, { note: rows.map(r => r[4]).join(' + ').replace(/\+ -/g, '− ') + ` = <b>${fmtNum(total)}</b>` });
  return Math.abs(total) < 1e-11 * Math.max(1, LA.maxAbs(A)) ** n ? 0 : total;
}
function needSquare(A, what) {
  if (A.length !== A[0].length) uerr(`${what} only exists for a SQUARE matrix. This matrix is ${LA.dims(A)} (non-square) → it has no ${what}.`);
}

tool({
  id: 'det', cat: 'detfam', name: 'Determinant det(A) (with expansion)', short: 'Determinant',
  kw: 'determinant det 행렬식 ad-bc cofactor expansion',
  inputs: [{ k: 'A', type: 'matrix', label: 'A (square)', def: A33 },
    { k: 'row', type: 'int', label: 'expand along row (1 = lecture default, 0 = row with most zeros)', def: '1' }],
  solve(v, R) {
    const A = v.A;
    needSquare(A, 'determinant');
    R.given('A', A, { note: LA.dims(A) });
    R.find('det(A) (a scalar)');
    const d = detSteps(A, R, 'det(A)', v.row - 1);
    R.answer('det(A)', d, { sub: d === 0 ? '→ det = 0 ⇒ A is <b>singular (NOT invertible)</b>' : '→ det ≠ 0 ⇒ A is <b>invertible</b>' });
    R.check('numpy determinant via Lower–Upper (LU) decomposition', LA.det(A));
    R.code(`import numpy as np\nA = ${pyArr(A)}\nprint(np.linalg.det(A))`);
  },
});

tool({
  id: 'minor', cat: 'detfam', name: 'Minor Mᵢⱼ of one element', short: 'Minor Mᵢⱼ',
  kw: 'minor 소행렬식 delete row column',
  inputs: [
    { k: 'A', type: 'matrix', label: 'A (square)', def: A33 },
    { k: 'i', type: 'int', label: 'row i (1-based)', def: '1', group: 'ij' },
    { k: 'j', type: 'int', label: 'column j (1-based)', def: '2', group: 'ij' },
  ],
  solve(v, R) {
    const { A, i, j } = v;
    needSquare(A, 'minor');
    if (i < 1 || i > A.length || j < 1 || j > A.length) uerr(`i and j must be between 1 and ${A.length}`);
    R.given('A', A, { hl: (r, c) => r === i - 1 || c === j - 1 }).given('element', `a${sub(i)}${sub(j)} = ${fmtNum(A[i - 1][j - 1])}`);
    R.find(`M${sub(i)}${sub(j)} = det of A with row ${i} and column ${j} deleted`);
    const S = LA.minorMat(A, i - 1, j - 1);
    R.step(`A with row ${i} & col ${j} deleted`, S);
    const M = S.length ? detSteps(S, R, `M${sub(i)}${sub(j)}`) : 1;
    R.answer(`M${sub(i)}${sub(j)}`, M);
    R.check(`cofactor C${sub(i)}${sub(j)} = (−1)^(${i}+${j}) M${sub(i)}${sub(j)}`, ((i + j) % 2 ? -1 : 1) * M);
    R.code(`import numpy as np\nA = ${pyArr(A)}\nsub = np.delete(np.delete(A, ${i - 1}, axis=0), ${j - 1}, axis=1)\nprint(sub, np.linalg.det(sub))`);
  },
});

tool({
  id: 'minors', cat: 'detfam', name: 'Matrix of all minors', short: 'All minors',
  kw: 'minors matrix 소행렬식',
  inputs: [{ k: 'A', type: 'matrix', label: 'A (square)', def: A33 }],
  solve(v, R) {
    needSquare(v.A, 'matrix of minors');
    R.given('A', v.A);
    R.formula('Mᵢⱼ = det(A with row i and column j removed)');
    if (v.A.length <= 4) {
      const rows = [];
      v.A.forEach((r, i) => r.forEach((_, j) => { const S = LA.minorMat(v.A, i, j); rows.push([`M${sub(i + 1)}${sub(j + 1)}`, renderVal(S, { dims: false }), fmtNum(LA.det(S))]); }));
      R.table(['minor', 'sub-matrix', 'value'], rows);
    }
    R.answer('Matrix of minors M', LA.minors(v.A));
    R.code(`import numpy as np\nA = ${pyArr(v.A)}\nn = A.shape[0]\nM = np.array([[np.linalg.det(np.delete(np.delete(A, i, 0), j, 1)) for j in range(n)] for i in range(n)])\nprint(M)`);
  },
});

tool({
  id: 'cofactor1', cat: 'detfam', name: 'Cofactor Cᵢⱼ of one element', short: 'Cofactor Cᵢⱼ',
  kw: 'cofactor sign 여인수',
  inputs: [
    { k: 'A', type: 'matrix', label: 'A (square)', def: A33 },
    { k: 'i', type: 'int', label: 'row i', def: '1', group: 'ij' },
    { k: 'j', type: 'int', label: 'column j', def: '2', group: 'ij' },
  ],
  solve(v, R) {
    const { A, i, j } = v;
    needSquare(A, 'cofactor');
    if (i < 1 || i > A.length || j < 1 || j > A.length) uerr(`i, j must be 1..${A.length}`);
    R.given('A', A, { hl: (r, c) => r === i - 1 || c === j - 1 });
    R.formula(`C${sub(i)}${sub(j)} = (−1)^(i+j) · M${sub(i)}${sub(j)}`);
    const S = LA.minorMat(A, i - 1, j - 1);
    R.step(`sub-matrix (delete row ${i}, col ${j})`, S);
    const M = S.length ? LA.det(S) : 1;
    R.step(`M${sub(i)}${sub(j)}`, M).step(`(−1)^(${i}+${j})`, (i + j) % 2 ? -1 : 1);
    R.answer(`C${sub(i)}${sub(j)}`, ((i + j) % 2 ? -1 : 1) * M);
  },
});

tool({
  id: 'cofactor', cat: 'detfam', name: 'Cofactor Matrix C', short: 'Cofactor matrix',
  kw: 'cofactor matrix 여인수 행렬 sign pattern',
  inputs: [{ k: 'A', type: 'matrix', label: 'A (square)', def: A33 }],
  solve(v, R) {
    const A = v.A;
    needSquare(A, 'cofactor matrix');
    R.given('A', A);
    R.formula('Cᵢⱼ = (−1)^(i+j) Mᵢⱼ', 'sign pattern [+ − +; − + −; + − +]');
    if (A.length <= 4) {
      const rows = [];
      A.forEach((r, i) => r.forEach((_, j) => {
        const S = LA.minorMat(A, i, j); const M = S.length ? LA.det(S) : 1; const s = (i + j) % 2 ? -1 : 1;
        rows.push([`a${sub(i + 1)}${sub(j + 1)}`, renderVal(S, { dims: false }), fmtNum(M), s > 0 ? '+' : '−', fmtNum(s * M)]);
      }));
      R.table(['entry', 'minor sub-matrix', 'Mᵢⱼ', 'sign', 'Cᵢⱼ'], rows);
    }
    R.answer('Cofactor matrix C', LA.cofactors(A));
    R.code(`import numpy as np\nA = ${pyArr(A)}\nn = A.shape[0]\nC = np.array([[(-1)**(i+j) * np.linalg.det(np.delete(np.delete(A, i, 0), j, 1)) for j in range(n)] for i in range(n)])\nprint(C)`);
  },
});

tool({
  id: 'adj', cat: 'detfam', name: 'Adjugate / Adjoint adj(A) = Cᵀ', short: 'Adjugate',
  kw: 'adjugate adjoint adj 수반행렬 cofactor transpose',
  inputs: [{ k: 'A', type: 'matrix', label: 'A (square)', def: A33 }],
  solve(v, R) {
    const A = v.A;
    needSquare(A, 'adjugate');
    R.given('A', A);
    R.formula('adj(A) = Cᵀ  (transpose of the cofactor matrix)', 'for 2×2: adj [a b; c d] = [d −b; −c a]');
    const C = LA.cofactors(A);
    R.step('Cofactor matrix C', C).step('Cᵀ', LA.T(C));
    R.answer('adj(A)', LA.T(C));
    R.check('A · adj(A) = det(A)·I', LA.mul(A, LA.T(C)), { note: `det(A) = ${fmtNum(LA.det(A))}` });
    R.code(`import numpy as np\nA = ${pyArr(A)}\nn = A.shape[0]\nC = np.array([[(-1)**(i+j) * np.linalg.det(np.delete(np.delete(A, i, 0), j, 1)) for j in range(n)] for i in range(n)])\nadj = C.T\nprint(adj)`);
  },
});

tool({
  id: 'inverse', cat: 'detfam', name: 'Inverse A⁻¹ = adj(A)/det(A)', short: 'Inverse A⁻¹',
  kw: 'inverse inv 역행렬 invertible singular nonsingular',
  inputs: [{ k: 'A', type: 'matrix', label: 'A', def: [[1, 1], [1, -2]] }],
  solve(v, R) {
    const A = v.A;
    const [m, n] = LA.shape(A);
    R.given('A', A, { note: LA.dims(A) });
    R.find('A⁻¹ (ordinary inverse — NOT Aᵀ and NOT A†)');
    const rk = LA.rank(A);
    R.table(['check', 'result'], [
      ['Is A square?', m === n ? yesno(true) : yesno(false) + ` (${m}×${n})`],
      ['rank(A)', `${rk}${m === n ? (rk === n ? ' = n (full rank)' : ` < n = ${n}`) : ''}`],
      ['det(A) ≠ 0?', m === n ? `det = ${fmtNum(LA.det(A))} → ${yesno(rk === n)}` : 'no determinant (non-square)'],
    ]);
    if (m !== n) {
      R.answer('A⁻¹', '<b class="no">A⁻¹ does not exist</b>', { sub: `A is ${m}×${n}, not square. Use the pseudoinverse: ${m > n ? 'left inverse (AᵀA)⁻¹Aᵀ' : 'right inverse Aᵀ(AAᵀ)⁻¹'} → see “Pseudoinverse X†”.` });
      return;
    }
    if (rk < n) {
      R.answer('A⁻¹', '<b class="no">A⁻¹ does not exist</b>', { sub: `det(A) = 0 (rank ${rk} < ${n}) → A is singular.` });
      return;
    }
    R.formula('A⁻¹ = (1/det(A)) · adj(A)', n === 2 ? 'for 2×2: (1/(ad−bc)) [d −b; −c a]' : 'adj(A) = Cᵀ');
    const d = detSteps(A, R);
    const adj = LA.adj(A);
    if (n > 2) R.step('Cofactor matrix C', LA.cofactors(A));
    R.step('adj(A) = Cᵀ', adj);
    const inv = LA.scale(adj, 1 / d);
    R.step(`1/det(A) = 1/${fmtNum(d)}`, 1 / d);
    R.answer('A⁻¹', inv, { sub: Fmt.frac ? '' : 'tip: tick “fractions” (top bar) to see exact fractions' });
    R.check('A·A⁻¹', LA.clean(LA.mul(A, inv)), { note: LA.isIdentity(LA.mul(A, inv)) ? '= I ✓' : '≠ I ?' });
    R.code(`import numpy as np\nfrom numpy.linalg import inv\nA = ${pyArr(A)}\nprint(inv(A))\nprint(A @ inv(A))  # should be identity`);
  },
});

/* ---------------- DIAGNOSTICS ---------------- */
tool({
  id: 'rank', cat: 'diag', name: 'Rank (row-echelon steps)', short: 'Rank',
  kw: 'rank echelon 계수 full rank row reduction linearly independent rows columns matrix_rank',
  inputs: [{ k: 'A', type: 'matrix', label: 'A', def: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }],
  solve(v, R) {
    const A = v.A;
    const [m, n] = LA.shape(A);
    R.given('A', A, { note: LA.dims(A) });
    R.find('rank(A) = max number of linearly independent rows (= columns)');
    R.formula('Row-reduce to echelon form; rank = number of non-zero rows (pivots)');
    const { R: E, steps } = LA.rrefSteps(A);
    if (m * n <= 64) steps.forEach(s => R.step(s.op, s.M, { dims: false }));
    R.step('Row echelon form', E);
    const rk = LA.rank(A);
    R.answer('rank(A)', rk, { sub: rk === Math.min(m, n) ? `full rank (= min(m, d) = ${Math.min(m, n)})` : `rank-deficient (max possible ${Math.min(m, n)})` });
    R.check('rank(Aᵀ)', rk).check('rank(AᵀA)', LA.rank(LA.mul(LA.T(A), A))).check('rank(AAᵀ)', LA.rank(LA.mul(A, LA.T(A))));
    R.note(`rank = ${n} ⇒ columns independent ⇒ AᵀA (${n}×${n}) invertible: ${yesno(rk === n)} &nbsp;|&nbsp; rank = ${m} ⇒ rows independent ⇒ AAᵀ (${m}×${m}) invertible: ${yesno(rk === m)}`, 'info', 'check');
    R.code(`import numpy as np\nfrom numpy.linalg import matrix_rank\nA = ${pyArr(A)}\nprint(matrix_rank(A))`);
  },
});

function invReport(A, R) {
  const [m, n] = LA.shape(A);
  const rk = LA.rank(A);
  const sq = m === n;
  const rows = [
    ['dimensions', `${m} × ${n} → ${sq ? 'square' : m > n ? 'tall (m > d)' : 'wide (m < d)'}`],
    ['rank(A)', `${rk}`],
    ['square?', yesno(sq)],
    ['det(A)', sq ? fmtNum(LA.det(A)) : '— (no determinant: not square)'],
    ['invertible (A⁻¹ exists)?', yesno(sq && rk === n) + (sq ? (rk === n ? ' det ≠ 0, full rank' : ' det = 0') : ' only square matrices')],
    ['left-invertible? (AᵀA invertible ⇔ rank = number of columns)', yesno(rk === n) + ` rank ${rk} ${rk === n ? '=' : '≠'} ${n} columns`],
    ['right-invertible? (AAᵀ invertible ⇔ rank = #rows)', yesno(rk === m) + ` rank ${rk} ${rk === m ? '=' : '≠'} ${m} rows`],
    ['columns linearly independent?', yesno(rk === n)],
    ['rows linearly independent?', yesno(rk === m)],
  ];
  R.table(['property', 'result'], rows);
  return { m, n, rk, sq };
}

tool({
  id: 'invcheck', cat: 'diag', name: 'Invertibility checker (+ left/right inverse)', short: 'Invertible?',
  kw: 'invertible singular left inverse right inverse 역행렬 존재 determinant full rank True / False (T/F) true false',
  desc: 'Answers all the True / False (T/F) style questions: invertible? left-invertible? right-invertible? has determinant?',
  inputs: [{ k: 'A', type: 'matrix', label: 'A', def: [[1, 2, 3], [4, 5, 6]] }],
  solve(v, R) {
    const A = v.A;
    R.given('A', A, { note: LA.dims(A) });
    R.find('Is A invertible? Does a left / right inverse exist? Why?');
    const { m, n, rk, sq } = invReport(A, R);
    let verdict;
    if (sq) verdict = rk === n ? 'A is <b>INVERTIBLE</b> (square, det ≠ 0, full rank)' : 'A is <b>NOT invertible</b> (singular: det = 0, rank < n)';
    else verdict = `A is <b>NOT invertible</b> (not square, no determinant).<br>Left-invertible (AᵀA invertible): ${yesno(rk === n)}${rk === n ? ' → A† = (AᵀA)⁻¹Aᵀ' : ''}<br>Right-invertible (AAᵀ invertible): ${yesno(rk === m)}${rk === m ? ' → A† = Aᵀ(AAᵀ)⁻¹' : ''}`;
    R.answer('Verdict', verdict);
    if (sq && rk === n) R.check('A⁻¹', LA.inv(A));
    if (!sq && rk === n) R.check('left inverse (AᵀA)⁻¹Aᵀ', LA.mul(LA.inv(LA.mul(LA.T(A), A)), LA.T(A)));
    if (!sq && rk === m) R.check('right inverse Aᵀ(AAᵀ)⁻¹', LA.mul(LA.T(A), LA.inv(LA.mul(A, LA.T(A)))));
    R.code(`import numpy as np\nfrom numpy.linalg import matrix_rank, det, inv\nA = ${pyArr(A)}\nm, n = A.shape\nr = matrix_rank(A)\nprint('rank', r, 'square', m == n)\nif m == n: print('det', det(A))\nprint('left-invertible (A^T A invertible):', r == n)\nprint('right-invertible (A A^T invertible):', r == m)`);
  },
});

tool({
  id: 'report', cat: 'diag', name: 'Full matrix report (everything at once)', short: 'Matrix report',
  kw: 'all everything report summary 전부 한번에 matrix analysis',
  desc: 'Dimensions, rank, det, Aᵀ, AᵀA, AAᵀ, inverse, pseudoinverse, cofactor, adjugate — one click.',
  inputs: [{ k: 'A', type: 'matrix', label: 'A', def: [[1, 2], [2, 4], [1, -1]] }],
  solve(v, R) {
    const A = v.A;
    R.given('A', A);
    const { m, n, rk, sq } = invReport(A, R);
    R.step('Aᵀ', LA.T(A)).step('AᵀA', LA.mul(LA.T(A), A), { note: `det = ${fmtNum(LA.det(LA.mul(LA.T(A), A)))}` }).step('AAᵀ', LA.mul(A, LA.T(A)), { note: `det = ${fmtNum(LA.det(LA.mul(A, LA.T(A))))}` });
    if (sq) {
      R.step('det(A)', LA.det(A)).step('Minors', LA.minors(A)).step('Cofactor matrix C', LA.cofactors(A)).step('adj(A) = Cᵀ', LA.adj(A));
      R.answer('A⁻¹', rk === n ? LA.inv(A) : '<b class="no">does not exist (singular)</b>');
    }
    if (rk === n && !sq) R.answer('Left inverse (AᵀA)⁻¹Aᵀ', LA.mul(LA.inv(LA.mul(LA.T(A), A)), LA.T(A)));
    if (rk === m && !sq) R.answer('Right inverse Aᵀ(AAᵀ)⁻¹', LA.mul(LA.T(A), LA.inv(LA.mul(A, LA.T(A)))));
    if (rk === n) R.check('(AᵀA)⁻¹', LA.inv(LA.mul(LA.T(A), A)));
    if (rk === m) R.check('(AAᵀ)⁻¹', LA.inv(LA.mul(A, LA.T(A))));
    R.check('Moore–Penrose pinv(A)', LA.pinv(A));
    R.check('trace (if square)', sq ? LA.trace(A) : '—');
  },
});

tool({
  id: 'linindep', cat: 'diag', name: 'Linear independence of vectors', short: 'Linearly independent?',
  kw: 'linear independence dependent 선형독립 종속 vectors beta combination',
  desc: 'Enter vectors x₁…x_k as the <b>columns</b> of V (or choose rows). Dependent ⇔ β₁x₁+…+βₖxₖ = 0 for some β not all zero.',
  inputs: [
    { k: 'as', type: 'select', label: 'Vectors are the…', def: 'cols', options: [['cols', 'columns of V'], ['rows', 'rows of V']] },
    { k: 'V', type: 'matrix', label: 'V', def: [[1, 4], [2, 5], [3, 6]] },
  ],
  solve(v, R) {
    const V = v.as === 'rows' ? LA.T(v.V) : v.V;
    const k = V[0].length;
    R.given(`vectors (as columns)`, V, { note: `${k} vectors of length ${V.length}` });
    R.formula('independent ⇔ rank = number of vectors');
    const rk = LA.rank(V);
    R.step('rank', rk);
    if (rk === k) {
      R.answer('Result', `<b class="yes">Linearly INDEPENDENT</b> (rank ${rk} = ${k})`, { sub: 'only β₁ = … = βₖ = 0 gives Σβᵢxᵢ = 0' });
    } else {
      const { R: E, pivots } = LA.rrefSteps(V, { full: true });
      const pc = pivots.map(p => p[1]);
      const free = [...Array(k).keys()].find(j => !pc.includes(j));
      const beta = Array(k).fill(0);
      beta[free] = 1;
      pivots.forEach(([r, c]) => (beta[c] = -E[r][free]));
      R.step('Reduced Row Echelon Form (RREF)', E);
      R.answer('Result', `<b class="no">Linearly DEPENDENT</b> (rank ${rk} < ${k})`, { sub: 'Example non-zero β with Σ βᵢ xᵢ = 0: β = [' + beta.map(b => fmtNum(b)).join(', ') + ']' });
      R.check('V β', LA.clean(LA.mul(V, LA.col(beta))));
    }
    if (V.length === k) R.note(`Square case: det = ${fmtNum(LA.det(V))} → ${rk === k ? 'invertible' : 'singular'}`, 'info', 'check');
    R.code(`import numpy as np\nV = ${pyArr(V)}   # vectors as columns\nprint(np.linalg.matrix_rank(V) == V.shape[1])`);
  },
});

/* ---------------- LINEAR SYSTEM ---------------- */
tool({
  id: 'solve', cat: 'system', name: 'Solve Xw = y (auto: X⁻¹ / left / right inverse)', short: 'Solve Xw = y',
  kw: 'solve linear system equations Xw=y 연립방정식 even over under determined least squares exact approximate constrained w^T X = y^T',
  desc: 'No bias column is added here (a system of linear equations has no bias term). For regression with bias use “Linear Regression”.',
  inputs: [
    { k: 'form', type: 'select', label: 'System written as', def: 'Xw', options: [['Xw', 'Xw = y'], ['wX', 'wᵀX = yᵀ  (Tutorial 4 Q5/Q6 style)']] },
    { k: 'X', type: 'matrix', label: 'X', def: [[1, 1], [1, -1], [1, 0]], group: 'xy' },
    { k: 'y', type: 'vector', label: 'y', def: [1, 0, 2], group: 'xy', link: 'X' },
  ],
  solve(v, R) {
    let X = v.X, y = v.y;
    const tr = v.form === 'wX';
    R.given('X', X, { note: LA.dims(X) }).given('y', y);
    if (tr) {
      R.note(`wᵀX = yᵀ ⇔ Xᵀw = y. Number of equations = number of entries of y = ${y.length}; unknowns = rows of X = ${X.length}.`, 'info', 'given');
      X = LA.T(X);
      if (X.length !== y.length) uerr(`wᵀX = yᵀ needs X to have ${y.length} columns (length of y), but X has ${X.length}.`);
    } else if (X.length !== y.length) uerr(`X has ${X.length} rows but y has ${y.length} entries — one y per equation (row).`);
    const An = tr ? 'Xᵀ' : 'X';
    R.find('ŵ, and whether the solution is exact / approximate / constrained / none');
    const [m, d] = LA.shape(X);
    const st = sysType(m, d);
    const c = consistency(X, y);
    R.detect(`${st.name}: ${m} equations, ${d} unknowns. rank(${An}) = ${c.rX}, rank([${An}, y]) = ${c.rXy} → ${c.kind === 'none' ? '<b>inconsistent</b>: no exact solution' : c.kind === 'unique' ? '<b>consistent</b>, unique solution' : '<b>consistent</b>, infinitely many solutions'}`);
    const Y = LA.col(y);
    if (c.kind === 'none' && m <= d) {
      R.step(`rank(${An}) = ${c.rX} < rank([${An}, y]) = ${c.rXy}`, undefined, { note: 'the equations contradict each other (for example parallel lines)' });
      R.step(`${An}ᵀ${An} invertible?`, undefined, { note: yesno(LA.isInvertible(LA.mul(LA.T(X), X))) });
      R.step(`${An}${An}ᵀ invertible?`, undefined, { note: yesno(LA.isInvertible(LA.mul(X, LA.T(X)))) });
      R.answer('ŵ', '<b class="no">No solution</b>', { sub: `${st.short} system is inconsistent. ${m === d ? `det(${An}) = 0 → ${An} not invertible.` : `Both ${An}${An}ᵀ and ${An}ᵀ${An} are not invertible.`}` });
      const w = LA.mul(LA.pinv(X), Y);
      R.check('(extra, not EE2211) least-squares min-norm pinv(X)y', w.map(r => r[0]));
      R.code(`import numpy as np\nX = ${pyArr(X)}\ny = ${pyArr(y)}\nprint(np.linalg.matrix_rank(X), np.linalg.matrix_rank(np.column_stack([X, y])))  # different -> no solution`);
      return;
    }
    const res = lsqSolve(X, Y, R, { Xn: An, yn: 'y' });
    const w = res.W.map(r => r[0]);
    let kind;
    if (res.form === 'inverse') kind = 'EXACT unique solution';
    else if (res.form === 'primal') kind = res.exact ? 'EXACT solution (rank(X) = rank([X,y]), so the least-squares answer fits every equation)' : 'APPROXIMATE (least-squares) solution — no exact solution exists';
    else if (res.form === 'dual') kind = 'CONSTRAINED exact solution (one of infinitely many; minimum-norm)';
    else kind = res.exact ? 'exact (pinv fallback)' : 'approximate (pinv fallback)';
    R.answer('ŵ', w, { rowLabels: wLabels(d, false), sub: kind });
    const Xw = LA.mul(X, res.W).map(r => r[0]);
    R.check(`${An}ŵ`, Xw, { note: 'compare with y = [' + y.map(t => fmtNum(t)).join(', ') + ']' });
    R.check('residual e = Xŵ − y', Xw.map((t, i) => t - y[i]), { note: `‖e‖² = ${fmtNum(res.sse)}` });
    const XX = tr ? 'X.T' : 'X';
    R.code(`import numpy as np
from numpy.linalg import inv
X = ${pyArr(v.X)}
y = ${pyArr(y)}
A = ${XX}          # coefficient matrix of the system A w = y
m, d = A.shape
if m == d:
    w = inv(A) @ y                    # even-determined
elif m > d:
    w = inv(A.T @ A) @ A.T @ y        # over-determined: left inverse (least squares)
else:
    w = A.T @ inv(A @ A.T) @ y        # under-determined: right inverse (constrained)
print(w)`);
  },
});

tool({
  id: 'soltype', cat: 'system', name: 'Solution type: unique / infinite / none (rank test)', short: 'Solution type',
  kw: 'consistency consistent rank augmented unique infinitely many no solution 해의 개수',
  inputs: [
    { k: 'X', type: 'matrix', label: 'X', def: [[1, 2, 3], [3, 6, 9]], group: 'xy' },
    { k: 'y', type: 'vector', label: 'y', def: [2, 1], group: 'xy', link: 'X' },
  ],
  solve(v, R) {
    const { X, y } = v;
    if (X.length !== y.length) uerr(`X has ${X.length} rows but y has ${y.length} entries.`);
    const [m, d] = LA.shape(X);
    R.given('X', X).given('y', y);
    R.formula('rank(X) < rank([X, y]) → no solution;  rank(X) = rank([X, y]) = d → unique;  rank(X) = rank([X, y]) < d → infinitely many');
    const c = consistency(X, y);
    R.step('[X, y] (augmented)', LA.hstack(X, LA.col(y)));
    R.step('rank(X)', c.rX).step('rank([X, y])', c.rXy).step('d (unknowns)', d).step('system type', sysType(m, d).name);
    R.answer('Solution type', c.kind === 'none' ? '<b class="no">NO exact solution</b>' : c.kind === 'unique' ? '<b class="yes">UNIQUE solution</b>' : '<b>INFINITELY MANY solutions</b>',
      { sub: c.kind === 'none' && m > d && c.rX === d ? 'over-determined → EE2211 gives the least-squares approximation (XᵀX)⁻¹Xᵀy' : c.kind === 'infinite' && c.rX === m ? 'EE2211 gives the constrained solution Xᵀ(XXᵀ)⁻¹y' : '' });
    R.code(`import numpy as np\nX = ${pyArr(X)}\ny = ${pyArr(y)}\nprint(np.linalg.matrix_rank(X), np.linalg.matrix_rank(np.column_stack([X, y])))`);
  },
});

tool({
  id: 'pinv', cat: 'system', name: 'Pseudoinverse X† (left / right inverse)', short: 'X† pseudoinverse',
  kw: 'pseudoinverse pinv dagger left inverse right inverse 유사역행렬 tall wide',
  inputs: [{ k: 'X', type: 'matrix', label: 'X', def: [[1, 1], [1, -1], [1, 0]] }],
  solve(v, R) {
    const X = v.X;
    const [m, d] = LA.shape(X);
    const rk = LA.rank(X);
    R.given('X', X, { note: `${m}×${d}, rank ${rk}` });
    R.find('X† (NOT X⁻¹, NOT Xᵀ)');
    const XT = LA.T(X);
    if (m === d && rk === d) {
      R.formula('X square & invertible ⇒ X† = X⁻¹');
      R.answer('X† = X⁻¹', LA.inv(X));
      return;
    }
    if (m >= d) {
      R.detect(`X is ${m === d ? 'square (singular)' : 'tall (m > d)'} → try LEFT inverse`);
      R.formula('X† = (XᵀX)⁻¹Xᵀ', 'requires XᵀX invertible (rank X = d)');
      const XtX = LA.mul(XT, X);
      R.step('Xᵀ', XT).step('XᵀX', XtX, { note: `det = ${fmtNum(LA.det(XtX))}` });
      const inv = LA.inv(XtX);
      if (inv) {
        const P = LA.mul(inv, XT);
        R.step('(XᵀX)⁻¹', inv);
        R.answer('X† (left inverse)', P);
        R.check('X†X', LA.clean(LA.mul(P, X)), { note: '= I ✓ (left inverse)' });
        R.code(`import numpy as np\nfrom numpy.linalg import inv\nX = ${pyArr(X)}\nXdag = inv(X.T @ X) @ X.T\nprint(Xdag)\nprint(Xdag @ X)`);
        return;
      }
      R.note(`XᵀX is NOT invertible (rank ${rk} < d = ${d}) → (XᵀX)⁻¹Xᵀ does not exist.`, 'err');
    } else {
      R.detect('X is wide (m < d) → RIGHT inverse');
      R.formula('X† = Xᵀ(XXᵀ)⁻¹', 'requires XXᵀ invertible (rank X = m)');
      const XXt = LA.mul(X, XT);
      R.step('Xᵀ', XT).step('XXᵀ', XXt, { note: `det = ${fmtNum(LA.det(XXt))}` });
      const inv = LA.inv(XXt);
      if (inv) {
        const P = LA.mul(XT, inv);
        R.step('(XXᵀ)⁻¹', inv);
        R.answer('X† (right inverse)', P);
        R.check('XX†', LA.clean(LA.mul(X, P)), { note: '= I ✓ (right inverse)' });
        R.code(`import numpy as np\nfrom numpy.linalg import inv\nX = ${pyArr(X)}\nXdag = X.T @ inv(X @ X.T)\nprint(Xdag)\nprint(X @ Xdag)`);
        return;
      }
      R.note(`XXᵀ is NOT invertible (rank ${rk} < m = ${m}) → Xᵀ(XXᵀ)⁻¹ does not exist.`, 'err');
    }
    R.answer('EE2211 X†', '<b class="no">does not exist</b> (required inverse is singular)');
    R.check('Moore–Penrose pseudoinverse pinv(X) via Singular Value Decomposition (SVD), numpy', LA.pinv(X));
    R.code(`import numpy as np\nX = ${pyArr(X)}\nprint(np.linalg.pinv(X))`);
  },
});
