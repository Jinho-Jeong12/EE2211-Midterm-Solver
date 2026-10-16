'use strict';
/* =====================================================================
   tools_prob.js — statistics, correlation, normalization,
   probability (PMF/PDF/Bayes/Gaussian/counting), data types, concepts
   ===================================================================== */

function frac(x) { const f = fracOf(x, 100000); return f && f[1] !== 1 ? ` = ${f[0]}/${f[1]}` : ''; }

/* ---------------- STATISTICS ---------------- */
function quartilesLecture(s) {
  const n = s.length;
  const lower = s.slice(0, Math.floor(n / 2)), upper = s.slice(Math.ceil(n / 2));
  return [lower.length ? NUM.median(lower) : s[0], upper.length ? NUM.median(upper) : s[n - 1]];
}
function percentileLinear(s, q) { // numpy default
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

tool({
  id: 'descstats', cat: 'stats', name: 'Descriptive statistics of a sample set (mean, median, mode, variance (var), standard deviation (std), quartiles…)', short: 'Mean / Variance / Standard deviation / …',
  kw: 'mean median mode variance standard deviation std var quartile boxplot five number summary range iqr sample population statistics 평균 분산 표준편차 중앙값 최빈값 사분위',
  desc: 'Everything at once. Population (÷n, numpy default <code>np.var</code>/<code>np.std</code>) and sample (÷(n−1), pandas <code>.describe()</code>, <code>ddof=1</code>) are both shown.',
  inputs: [{ k: 'x', type: 'textarea', label: 'samples x (comma / space / newline separated)', def: '1, 3, 4, 6, 6, 7, 8', rows: 3, wide: true },
    { k: 'y', type: 'textarea', label: 'second set y (optional → also correlation r, covariance)', def: '', rows: 2, wide: true }],
  solve(v, R) {
    const x = parseList(v.x);
    if (String(v.y || '').trim()) {
      const y = parseList(v.y);
      if (y.length !== x.length) uerr(`x has ${x.length} values but y has ${y.length}`);
      const mx = NUM.mean(x), my = NUM.mean(y);
      const dx = x.map(t => t - mx), dy = y.map(t => t - my);
      const sxy = LA.dot(dx, dy), r = sxy / Math.sqrt(LA.dot(dx, dx) * LA.dot(dy, dy));
      R.answer('Pearson r (x, y)', r, { sub: `covariance ÷n = ${fmtNum(sxy / x.length)}, ÷(n−1) = ${fmtNum(sxy / (x.length - 1))}; mean y = ${fmtNum(my)}; Least Squares (LS) line ŷ = ${fmtNum(my - (sxy / LA.dot(dx, dx)) * mx)} + ${fmtNum(sxy / LA.dot(dx, dx))}x  (full table: “Correlation r” tool)` });
    }
    const n = x.length;
    const s = NUM.sorted(x);
    const mean = NUM.mean(x);
    const ss = x.reduce((a, t) => a + (t - mean) ** 2, 0);
    const freq = {};
    x.forEach(t => (freq[t] = (freq[t] || 0) + 1));
    const mf = Math.max(...Object.values(freq));
    const modes = Object.keys(freq).filter(k => freq[k] === mf).map(Number).sort((a, b) => a - b);
    const [q1, q3] = quartilesLecture(s);
    R.given('data', x.map(t => fmtNum(t)).join(', ')).given('sorted', s.map(t => fmtNum(t)).join(', ')).given('n', n);
    R.table(['statistic', 'value', 'formula / note'], [
      ['sum Σx', NUM.sum(x), ''],
      ['<b>mean</b> x̄ (μ)', `<b>${fmtNum(mean)}</b>${frac(mean)}`, `Σx / n = ${fmtNum(NUM.sum(x))}/${n}`],
      ['<b>median</b>', `<b>${fmtNum(NUM.median(x))}</b>`, n % 2 ? 'middle value of sorted data' : 'average of the two middle values'],
      ['<b>mode</b>', `<b>${modes.map(t => fmtNum(t)).join(', ')}</b>`, mf === 1 ? 'all values appear once (no unique mode)' : `appears ${mf} times`],
      ['min / max', `${fmtNum(s[0])} / ${fmtNum(s[n - 1])}`, `range = ${fmtNum(s[n - 1] - s[0])}`],
      ['Σ(x − x̄)²', ss, ''],
      ['<b>population variance</b> σ² (÷n)', `<b>${fmtNum(ss / n)}</b>${frac(ss / n)}`, 'E[(X−μ)²], np.var(x)'],
      ['<b>population standard deviation (std)</b> σ', `<b>${fmtNum(Math.sqrt(ss / n))}</b>`, 'np.std(x)'],
      ['sample variance s² (÷(n−1))', n > 1 ? `${fmtNum(ss / (n - 1))}${frac(ss / (n - 1))}` : '—', 'np.var(x, ddof=1), pandas'],
      ['sample standard deviation (std) s', n > 1 ? fmtNum(Math.sqrt(ss / (n - 1))) : '—', 'np.std(x, ddof=1), pandas describe()'],
      ['first quartile (Q1) / third quartile (Q3) (lecture: median of lower / upper half)', `${fmtNum(q1)} / ${fmtNum(q3)}`, `Interquartile Range (IQR) = ${fmtNum(q3 - q1)}`],
      ['Q1 / Q3 (numpy percentile, linear)', `${fmtNum(percentileLinear(s, 0.25))} / ${fmtNum(percentileLinear(s, 0.75))}`, 'np.percentile(x, [25, 75]), pandas'],
    ], 'answer');
    const pv = ss / n, sv = n > 1 ? ss / (n - 1) : NaN;
    R.terms([
      { star: true, q: 'Mean · average · arithmetic mean · sample mean x̄ · μ · expected value of the data', ko: '평균 = 합 / 개수', f: `${fmtNum(NUM.sum(x))} / ${n}`, v: mean },
      { q: 'Median · middle value', ko: '정렬했을 때 가운데 값 (짝수 개면 가운데 두 값의 평균)', v: NUM.median(x) },
      { q: 'Mode · most frequent value', ko: '가장 많이 나온 값', v: modes.map(t => fmtNum(t)).join(', ') + (mf === 1 ? ' (all once)' : '') },
      { q: 'Range', ko: '최댓값 − 최솟값', f: `${fmtNum(s[n - 1])} − ${fmtNum(s[0])}`, v: s[n - 1] - s[0] },
      { star: true, q: 'Variance (population, ÷n) · σ² · Var(X) · E[(X − μ)²]', ko: '<b>Lecture 3 정의</b> (÷n). numpy <code>np.var(x)</code> 기본값', f: `Σ(x − x̄)² / n = ${fmtNum(ss)} / ${n}`, v: pv },
      { star: true, q: 'Standard deviation (population, ÷n) · σ', ko: '분산의 제곱근 (Lecture 3 정의). numpy <code>np.std(x)</code>', f: '√σ²', v: Math.sqrt(pv) },
      { q: 'Sample variance (÷(n − 1)) · unbiased variance · s²', ko: 'n − 1 로 나눔. pandas <code>.var()</code> / <code>describe()</code> 기본값, <code>ddof=1</code>', f: `${fmtNum(ss)} / ${n - 1}`, v: sv },
      { q: 'Sample standard deviation (÷(n − 1)) · s', ko: 'pandas <code>.std()</code> / <code>describe()</code> 의 std', f: '√s²', v: Math.sqrt(sv) },
      { q: 'First quartile (Q1) · 25th percentile', ko: '아래쪽 절반의 중앙값 (lecture 방식)', v: q1 },
      { q: 'Third quartile (Q3) · 75th percentile', ko: '위쪽 절반의 중앙값 (lecture 방식)', v: q3 },
      { q: 'Interquartile Range (IQR)', ko: 'Q3 − Q1', v: q3 - q1 },
      { q: 'Sum of squared deviations Σ(x − x̄)²', ko: '평균과의 차이 제곱의 합', v: ss },
      { q: 'Sum Σx · count n', ko: '합 · 개수', v: `${fmtNum(NUM.sum(x))} · n = ${n}` },
    ]);
    R.table(['value', 'frequency', 'relative'], Object.keys(freq).map(Number).sort((a, b) => a - b).map(k => [k, freq[k], freq[k] / n]), 'work');
    R.check('Boxplot five-number summary', `minimum ${fmtNum(s[0])}, first quartile (Q1) ${fmtNum(q1)}, median ${fmtNum(NUM.median(x))}, third quartile (Q3) ${fmtNum(q3)}, maximum ${fmtNum(s[n - 1])}`, { note: '50% of data lies between Q1 and Q3' });
    const sd = Math.sqrt(ss / n);
    R.check('z-scores (x − μ)/σ', x.map(t => (sd ? (t - mean) / sd : 0)));
    R.check('min-max scaled (x − min)/(max − min)', x.map(t => (s[n - 1] - s[0] ? (t - s[0]) / (s[n - 1] - s[0]) : 0)));
    R.code(`import numpy as np\nimport pandas as pd\nx = ${pyArr(x)}\nprint(x.mean(), np.median(x))\nprint(np.var(x), np.std(x))              # population (ddof=0)\nprint(np.var(x, ddof=1), np.std(x, ddof=1))  # sample (ddof=1)\nprint(pd.Series(x).describe())\nprint(pd.Series(x).mode())`);
  },
});

tool({
  id: 'pearson', cat: 'stats', name: 'Pearson correlation coefficient r (two sets)', short: 'Correlation r',
  kw: 'pearson correlation coefficient r covariance linear relationship strong weak 상관계수 공분산',
  desc: 'r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √(Σ(xᵢ − x̄)² Σ(yᵢ − ȳ)²). Correlation ≠ causation.',
  inputs: [
    { k: 'x', type: 'vector', label: 'x', def: [36, 28, 35, 39, 30, 30, 31, 38, 36, 38, 29, 26], group: 'm' },
    { k: 'y', type: 'vector', label: 'y', def: [31, 29, 34, 35, 29, 30, 30, 38, 34, 33, 29, 26], group: 'm', link: 'x' },
  ],
  solve(v, R) {
    const { x, y } = v;
    if (x.length !== y.length) uerr('x and y must have the same length');
    const n = x.length, mx = NUM.mean(x), my = NUM.mean(y);
    const dx = x.map(t => t - mx), dy = y.map(t => t - my);
    const sxy = LA.dot(dx, dy), sxx = LA.dot(dx, dx), syy = LA.dot(dy, dy);
    R.given('n', n).given('x̄', mx).given('ȳ', my);
    R.formula('r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √[Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)²] = s_xy / (s_x s_y)');
    R.table(['i', 'xᵢ', 'yᵢ', 'xᵢ − x̄', 'yᵢ − ȳ', '(xᵢ−x̄)(yᵢ−ȳ)', '(xᵢ−x̄)²', '(yᵢ−ȳ)²'], x.map((t, i) => [i + 1, t, y[i], dx[i], dy[i], dx[i] * dy[i], dx[i] ** 2, dy[i] ** 2]));
    R.step('Σ(x−x̄)(y−ȳ)', sxy).step('Σ(x−x̄)²', sxx).step('Σ(y−ȳ)²', syy);
    const r = sxy / Math.sqrt(sxx * syy);
    const a = Math.abs(r);
    const strength = a > 0.9 ? 'STRONG' : a > 0.7 ? 'MEDIUM' : a > 0.5 ? 'WEAK' : 'NO or doubtful';
    R.answer('r', r, { sub: `${strength} ${r >= 0 ? 'positive' : 'negative'} linear relationship (lecture table: |r| > 0.9 strong, 0.7–0.9 medium, 0.5–0.7 weak, < 0.5 none/doubtful)` });
    R.terms([
      { star: true, q: 'Pearson correlation coefficient r · correlation · linear correlation', ko: `${strength} ${r >= 0 ? 'positive (양의)' : 'negative (음의)'} 상관 — |r| > 0.9 strong, 0.7–0.9 medium, 0.5–0.7 weak`, f: 'Σ(x−x̄)(y−ȳ) / √[Σ(x−x̄)² Σ(y−ȳ)²]', v: r },
      { q: 'Coefficient of determination r²', ko: 'r 의 제곱', v: r * r },
      { q: 'Covariance (population, ÷n)', ko: '공분산 — n 으로 나눔', f: `${fmtNum(sxy)} / ${n}`, v: sxy / n },
      { q: 'Sample covariance (÷(n − 1))', ko: '공분산 — n − 1 로 나눔 (np.cov 기본값)', f: `${fmtNum(sxy)} / ${n - 1}`, v: sxy / (n - 1) },
      { q: 'Mean of x · mean of y', ko: '각각의 평균', v: `x̄ = ${fmtNum(mx)} · ȳ = ${fmtNum(my)}` },
      { q: 'Least squares line through the data', ko: '최소제곱 직선 (y 를 x 로 예측)', v: `ŷ = ${fmtNum(my - (sxy / sxx) * mx)} + ${fmtNum(sxy / sxx)}x` },
    ]);
    R.check('r²', r * r).check('covariance (÷n) / (÷(n−1))', `${fmtNum(sxy / n)} / ${fmtNum(sxy / (n - 1))}`).check('Least Squares (LS) line', `ŷ = ${fmtNum(my - (sxy / sxx) * mx)} + ${fmtNum(sxy / sxx)}x`);
    R.code(`import numpy as np\nfrom scipy.stats import pearsonr\nx = ${pyArr(x)}\ny = ${pyArr(y)}\nprint(np.corrcoef(x, y)[0, 1])\nprint(pearsonr(x, y))   # (r, p-value)`);
  },
});

tool({
  id: 'corrfeat', cat: 'stats', name: 'Correlation of each feature column with y (rank features)', short: 'r per feature',
  kw: 'feature selection correlation each column pearson top features correlation matrix',
  inputs: [
    { k: 'X', type: 'matrix', label: 'X (columns = features)', def: [[0.351, 1.1796, -0.9852], [2.1812, 2.1068, 1.3766], [0.2415, 1.7753, -1.3244], [-0.1096, 1.2724, -0.6316], [0.1544, 2.0851, -0.832]], group: 'm' },
    { k: 'y', type: 'vector', label: 'y', def: [0.2758, 1.4392, -0.4611, 0.6154, 1.0006], group: 'm', link: 'X' },
  ],
  solve(v, R) {
    const { X, y } = v;
    const cols = LA.T(X);
    const r = cols.map(c => { const mx = NUM.mean(c), my = NUM.mean(y); const dx = c.map(t => t - mx), dy = y.map(t => t - my); return LA.dot(dx, dy) / Math.sqrt(LA.dot(dx, dx) * LA.dot(dy, dy)); });
    const order = r.map((t, i) => i).sort((a, b) => Math.abs(r[b]) - Math.abs(r[a]));
    R.table(['feature', 'r with y', '|r| rank'], r.map((t, i) => [`x${i + 1}`, t, order.indexOf(i) + 1]), 'answer');
    R.answer('Features by |r| (strongest first)', order.map(i => `x${i + 1}`).join(', '));
    const C = cols.map(a => cols.map(b => { const ma = NUM.mean(a), mb = NUM.mean(b); const da = a.map(t => t - ma), db = b.map(t => t - mb); return LA.dot(da, db) / Math.sqrt(LA.dot(da, da) * LA.dot(db, db)); }));
    R.check('correlation matrix between features', C);
    R.code(`import numpy as np\nX = ${pyArr(X)}\ny = ${pyArr(y)}\nr = [np.corrcoef(X[:, i], y)[0, 1] for i in range(X.shape[1])]\nprint(r)\nprint(np.argsort(-np.abs(r)))   # most correlated first`);
  },
});

tool({
  id: 'normalize', cat: 'stats', name: 'Normalization (minimum–maximum, z-score) & missing-value imputation', short: 'Normalize / Not Available (NA) values',
  kw: 'normalization min max linear scaling z-score standardization missing data imputation mean NA NaN 정규화 결측',
  desc: 'Each column is a feature. Type <code>NA</code> (Not Available) or leave blank for missing values.',
  inputs: [
    { k: 'X', type: 'matrix', label: 'X (columns = features)', def: [[1.2234, 30033.81], [1.3456, 'NA'], [0.9988, 36034.33], [1.1858, 34037.35]], allowNA: true },
    { k: 'na', type: 'select', label: 'Missing values', def: 'mean', options: [['mean', 'Method 1: replace by column mean'], ['flag', 'Method 2: replace by a value outside the range'], ['drop', 'Remove rows with missing values']] },
    { k: 'flag', type: 'number', label: 'value to use', def: '-1', showIf: r => r.na === 'flag' },
  ],
  solve(v, R) {
    let X = v.X;
    const nNA = X.flat().filter(Number.isNaN).length;
    R.given('X', X);
    if (nNA) {
      if (v.na === 'drop') X = X.filter(r => !r.some(Number.isNaN));
      else {
        const means = LA.T(X).map(c => { const ok = c.filter(t => !Number.isNaN(t)); return ok.length ? NUM.mean(ok) : 0; });
        X = X.map(r => r.map((t, j) => (Number.isNaN(t) ? (v.na === 'mean' ? means[j] : v.flag) : t)));
        if (v.na === 'mean') R.step('column means (of available values)', [means]);
      }
      R.step(`after handling ${nNA} missing value(s)`, X);
      if (!X.length) uerr('No rows left');
    }
    const cols = LA.T(X);
    const mn = cols.map(c => Math.min(...c)), mx = cols.map(c => Math.max(...c)), mu = cols.map(NUM.mean);
    const sd = cols.map((c, j) => Math.sqrt(c.reduce((s, t) => s + (t - mu[j]) ** 2, 0) / c.length));
    R.formula('min-max: xᵢ = (xᵢʳᵃʷ − xᵐⁱⁿ)/(xᵐᵃˣ − xᵐⁱⁿ) ∈ [0, 1] ;  z-score: xᵢ = (xᵢʳᵃʷ − E[X]) / σ(X)');
    R.table(['feature', 'minimum (min)', 'maximum (max)', 'mean', 'standard deviation σ (population)'], cols.map((c, j) => [`x${j + 1}`, mn[j], mx[j], mu[j], sd[j]]));
    R.answer('Min-max scaled', X.map(r => r.map((t, j) => (mx[j] - mn[j] ? (t - mn[j]) / (mx[j] - mn[j]) : 0))));
    R.answer('Z-score standardized', X.map(r => r.map((t, j) => (sd[j] ? (t - mu[j]) / sd[j] : 0))));
    R.note('Why: features with very large values would overshadow features with small values.', 'info', 'check');
  },
});

/* ---------------- PROBABILITY ---------------- */
function solveUnknown(exprs, xs, varName) {
  // exprs: parsed nodes for probabilities (may contain one unknown), xs: support values
  const unknowns = new Set();
  exprs.forEach(n => EX.vars(n).forEach(q => { if (q !== varName) unknowns.add(q); }));
  if (unknowns.size > 1) uerr(`Only one unknown allowed, found: ${[...unknowns].join(', ')}`);
  const u = [...unknowns][0];
  const evalAll = val => exprs.map((n, i) => EX.evaluate(n, { [varName]: xs[i], ...(u ? { [u]: val } : {}) }));
  if (!u) return { u: null, p: evalAll(0) };
  const s0 = NUM.sum(evalAll(0)), s1 = NUM.sum(evalAll(1));
  if (Math.abs(s1 - s0) < 1e-15) uerr(`Sum does not depend on ${u}`);
  const val = (1 - s0) / (s1 - s0);
  return { u, val, p: evalAll(val) };
}

tool({
  id: 'pmf', cat: 'prob', name: 'Probability Mass Function (PMF): find unknown k/c, expected value E[X], variance Var(X), standard deviation σ, probability P(condition)', short: 'Probability Mass Function (PMF)',
  kw: 'pmf probability mass function discrete random variable expectation mean variance standard deviation unknown k c sum to one 확률질량함수 기댓값 분산',
  desc: 'Probabilities may contain ONE unknown (k or c) → solved from Σ Pr = 1. Either one probability per value, or one formula in x, for example <code>c*(1/2)^x</code>.',
  inputs: [
    { k: 'xs', type: 'text', label: 'values of X', def: '1, 2, 3, 4, 5', ph: '0,1,2   or   0..2' },
    { k: 'ps', type: 'text', label: 'Pr[X = x] (list, or one formula in x)', def: '0.1, 0.05, 0.05, 0.6, k' },
    { k: 'cond', type: 'text', label: 'event / condition in x (optional)', def: 'x % 2 == 1', ph: 'x <= 1,  x % 2 == 1 (odd),  x > 2 and x < 5' },
  ],
  solve(v, R) {
    let xs;
    const rng = String(v.xs).match(/^\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*$/);
    xs = rng ? Array.from({ length: +rng[2] - +rng[1] + 1 }, (_, i) => +rng[1] + i) : parseList(v.xs);
    const parts = String(v.ps).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    let nodes;
    if (parts.length === 1 && xs.length > 1) {
      const n0 = EX.parse(parts[0]);
      nodes = xs.map(() => n0);
    } else {
      if (parts.length !== xs.length) uerr(`${xs.length} values but ${parts.length} probabilities`);
      nodes = parts.map(s => EX.parse(s));
    }
    const vn = nodes.some(n => EX.vars(n).has('n')) && !nodes.some(n => EX.vars(n).has('x')) ? 'n' : 'x';
    const { u, val, p } = solveUnknown(nodes, xs, vn);
    R.given('support', xs.map(t => fmtNum(t)).join(', ')).given('Pr', parts.join(', '));
    if (u) {
      R.formula(`Σ Pr[X = x] = 1  ⇒  solve for ${u}`);
      R.answer(u, val, { sub: fmtExact(val) });
    }
    if (p.some(t => t < -1e-12)) R.note('Some probabilities are negative → NOT a valid Probability Mass Function (PMF)!', 'err');
    R.table(['x', 'Pr[X = x]', 'x·Pr', 'x²·Pr', 'Cumulative Distribution Function (CDF) Pr[X ≤ x]'], xs.map((t, i) => [t, p[i], t * p[i], t * t * p[i], NUM.sum(p.slice(0, i + 1))]));
    const E = NUM.sum(xs.map((t, i) => t * p[i])), E2 = NUM.sum(xs.map((t, i) => t * t * p[i]));
    const Var = E2 - E * E;
    R.formula('E[X] = Σ xᵢ Pr(X = xᵢ) ;  Var = E[(X − μ)²] = Σ Pr(X = xᵢ)(xᵢ − μ)² ;  σ = √Var');
    R.answer('E[X] = μ (mean)', E, { sub: fmtExact(E) });
    R.answer('Variance Var(X) = σ²', Var, { sub: `${fmtExact(Var)}  (= E[X²] − μ² = ${fmtNum(E2)} − ${fmtNum(E * E)})` });
    R.answer('σ (standard deviation)', Math.sqrt(Math.max(0, Var)));
    let Pc = null, incC = [];
    if (String(v.cond).trim()) {
      const c0 = EX.parse(v.cond);
      incC = xs.map((t, i) => (EX.evaluate(c0, { [vn]: t, x: t, n: t }) ? i : -1)).filter(i => i >= 0);
      Pc = NUM.sum(incC.map(i => p[i]));
    }
    R.terms([
      u ? { star: true, q: `Unknown constant ${esc(u)} (normalising constant)`, ko: '모든 확률의 합 = 1 이 되게 하는 값', f: 'Σ Pr = 1', v: val } : null,
      { star: true, q: 'Expected value · expectation · mean · μ · E[X] · average value of X', ko: '기댓값 = Σ x · Pr(x) (Lecture 3 slide 31)', f: xs.map((t, i) => `${fmtNum(t)}·${fmtNum(p[i])}`).slice(0, 8).join(' + ') + (xs.length > 8 ? ' + …' : ''), v: E },
      { q: 'Second moment E[X²]', ko: 'Σ x² · Pr(x)', v: E2 },
      { star: true, q: 'Variance · Var(X) · σ² · E[(X − μ)²]', ko: '분산 = E[X²] − μ² (Lecture 3 slide 32)', f: `${fmtNum(E2)} − ${fmtNum(E)}²`, v: Var },
      { star: true, q: 'Standard deviation · σ · √Var(X)', ko: '분산의 제곱근', v: Math.sqrt(Math.max(0, Var)) },
      Pc != null ? { star: true, q: `Probability of the event · Pr[${esc(v.cond)}]`, ko: `조건을 만족하는 x: ${incC.map(i => fmtNum(xs[i])).join(', ') || '없음'} 의 확률을 더함`, f: incC.map(i => fmtNum(p[i])).join(' + ') || '0', v: Pc } : null,
    ]);
    if (String(v.cond).trim()) {
      const inc = incC, P = Pc;
      R.answer(`Pr[${esc(v.cond)}]`, P, { sub: `values ${inc.map(i => fmtNum(xs[i])).join(', ') || '(none)'} → ${inc.map(i => fmtNum(p[i])).join(' + ')}${frac(P)}` });
    }
    R.check('Σ Pr', NUM.sum(p));
  },
});

function simpson(f, a, b, n = 4000) {
  if (n % 2) n++;
  const hh = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * hh) * (i % 2 ? 4 : 2);
  return (s * hh) / 3;
}

tool({
  id: 'pdf', cat: 'prob', name: 'Probability Density Function (PDF): find constant c, probability Pr[a ≤ X ≤ b], expected value E[X], variance Var(X)', short: 'Probability Density Function (PDF)',
  kw: 'pdf probability density function continuous random variable integral constant c area under curve expectation variance 확률밀도함수 적분',
  inputs: [
    { k: 'f', type: 'expr', label: 'f_X(x) (may contain unknown c)', def: 'c*x', wide: true },
    { k: 'a', type: 'number', label: 'support from', def: '0', group: 's' },
    { k: 'b', type: 'number', label: 'support to', def: '2', group: 's' },
    { k: 'lo', type: 'number', label: 'query Pr[lo ≤ X ≤ hi]: lo', def: '-1/2', group: 'q' },
    { k: 'hi', type: 'number', label: 'hi', def: '1/2', group: 'q' },
  ],
  solve(v, R) {
    const n = parseF(v.f);
    const others = EX.varList(n).filter(q => q !== 'x');
    if (others.length > 1) uerr('Only one unknown constant allowed');
    const u = others[0];
    const g = (c) => t => EX.evaluate(n, { x: t, ...(u ? { [u]: c } : {}) });
    let c = null;
    R.given('f(x)', exprBox(n)).given('support', `[${fmtNum(v.a)}, ${fmtNum(v.b)}] (f = 0 outside)`);
    if (u) {
      const I1 = simpson(g(1), v.a, v.b), I0 = simpson(g(0), v.a, v.b);
      c = (1 - I0) / (I1 - I0);
      R.formula(`∫ f(x) dx over the support = 1  ⇒  ${u} = 1 / ∫(f with ${u} = 1)`);
      R.step(`∫ f dx (with ${u} = 1)`, I1);
      R.answer(u, c, { sub: fmtExact(c) });
    }
    const f = g(c);
    const tot = simpson(f, v.a, v.b);
    const lo = Math.max(v.lo, v.a), hi = Math.min(v.hi, v.b);
    const P = hi > lo ? simpson(f, lo, hi) : 0;
    R.formula('Pr[lo ≤ X ≤ hi] = ∫ f(x) dx over [lo, hi] ∩ support');
    R.answer(`Pr[${fmtNum(v.lo)} ≤ X ≤ ${fmtNum(v.hi)}]`, P, { sub: `${fmtExact(P)} — integrated over [${fmtNum(lo)}, ${fmtNum(Math.max(lo, hi))}] (part outside the support contributes 0)` });
    const E = simpson(t => t * f(t), v.a, v.b), E2 = simpson(t => t * t * f(t), v.a, v.b);
    R.answer('E[X] = ∫ x f(x) dx', E, { sub: fmtExact(E) });
    R.answer('Variance Var(X) = ∫ (x − μ)² f(x) dx', E2 - E * E, { sub: fmtExact(E2 - E * E) + `, σ = ${fmtNum(Math.sqrt(Math.max(0, E2 - E * E)))}` });
    R.terms([
      u ? { star: true, q: `Unknown constant ${esc(u)} (normalising constant)`, ko: '전체 넓이 ∫ f(x) dx = 1 이 되게 하는 값', v: c } : null,
      { star: true, q: `Probability Pr[${fmtNum(v.lo)} ≤ X ≤ ${fmtNum(v.hi)}] · area under the curve between the limits`, ko: '그 구간에서 f(x) 를 적분 (support 밖은 0)', f: `∫ f(x) dx from ${fmtNum(lo)} to ${fmtNum(Math.max(lo, hi))}`, v: P },
      { star: true, q: 'Expected value · expectation · mean · μ · E[X]', ko: '∫ x f(x) dx (Lecture 3 slide 34)', v: E },
      { star: true, q: 'Variance · Var(X) · σ²', ko: '∫ (x − μ)² f(x) dx = E[X²] − μ²', v: E2 - E * E },
      { q: 'Standard deviation · σ', ko: '분산의 제곱근', v: Math.sqrt(Math.max(0, E2 - E * E)) },
      { q: 'Second moment E[X²]', ko: '∫ x² f(x) dx', v: E2 },
    ]);
    R.check('∫ f over support', tot, { note: Math.abs(tot - 1) < 1e-6 ? 'valid pdf ✓' : 'not 1 → not a valid pdf' });
  },
});

tool({
  id: 'gauss', cat: 'prob', name: 'Gaussian / Normal probability — Cumulative Distribution Function (CDF)', short: 'Normal Cumulative Distribution Function (CDF)',
  kw: 'gaussian normal distribution cdf probability mean standard deviation z score interval percentile scipy stats norm 정규분포',
  inputs: [
    { k: 'mu', type: 'number', label: 'mean μ', def: '30', group: 'p' },
    { k: 's', type: 'number', label: 'standard deviation σ', def: '1.8', group: 'p' },
    { k: 'a', type: 'number', label: 'lower a', def: '28', group: 'q' },
    { k: 'b', type: 'number', label: 'upper b', def: '33', group: 'q' },
    { k: 'p', type: 'number', label: 'percentile p (optional, 0–1)', def: '', optional: true },
  ],
  solve(v, R) {
    const { mu, s, a, b } = v;
    if (!(s > 0)) uerr('σ must be > 0');
    const Fa = NUM.normCdf(a, mu, s), Fb = NUM.normCdf(b, mu, s);
    R.formula('Pr(a < X ≤ b) = F(b) − F(a),  F(x) = Φ((x − μ)/σ)');
    R.step('z_a = (a − μ)/σ', (a - mu) / s).step('z_b = (b − μ)/σ', (b - mu) / s).step('F(a)', Fa).step('F(b)', Fb);
    R.answer(`Pr(${fmtNum(a)} < X ≤ ${fmtNum(b)})`, Fb - Fa, { sub: `= ${fmtNum((Fb - Fa) * 100, { dec: 2 })}% inside, ${fmtNum((1 - Fb + Fa) * 100, { dec: 2 })}% outside` });
    R.answer(`Pr(X ≤ ${fmtNum(a)})`, Fa).answer(`Pr(X > ${fmtNum(b)})`, 1 - Fb);
    if (v.p != null) R.answer(`x with Pr(X ≤ x) = ${fmtNum(v.p)}`, NUM.normInv(v.p, mu, s));
    R.terms([
      { star: true, q: `Probability within ${fmtNum(a)} to ${fmtNum(b)} · Pr(${fmtNum(a)} < X ≤ ${fmtNum(b)}) · fraction inside`, ko: 'F(b) − F(a): 구간 안에 들어갈 확률', f: `${fmtNum(Fb)} − ${fmtNum(Fa)}`, v: Fb - Fa },
      { q: 'Probability outside the interval · fraction rejected', ko: '1 − (안에 들어갈 확률)', v: 1 - (Fb - Fa) },
      { q: `Pr(X ≤ ${fmtNum(a)}) · Cumulative Distribution Function (CDF) F(${fmtNum(a)})`, ko: 'a 이하일 확률', v: Fa },
      { q: `Pr(X > ${fmtNum(b)}) · 1 − F(${fmtNum(b)})`, ko: 'b 초과일 확률', v: 1 - Fb },
      { q: 'z-scores (standardised values)', ko: '(x − μ) / σ', v: `z_a = ${fmtNum((a - mu) / s)} · z_b = ${fmtNum((b - mu) / s)}` },
    ]);
    R.check('rule of thumb', 'μ ± σ: 68.3%, μ ± 2σ: 95.4%, μ ± 3σ: 99.7%');
    R.code(`from scipy import stats\nmu, sigma = ${pyNum(mu)}, ${pyNum(s)}\nP = stats.norm.cdf(${pyNum(b)}, mu, sigma) - stats.norm.cdf(${pyNum(a)}, mu, sigma)\nprint(P, 1 - P)`);
  },
});

tool({
  id: 'bayes', cat: 'prob', name: "Bayes' rule P(B|A)", short: 'Bayes',
  kw: 'bayes rule theorem posterior prior likelihood evidence conditional probability total probability 베이즈 조건부확률',
  desc: 'posterior = likelihood × prior / evidence:  Pr(B|A) = Pr(A|B)Pr(B) / Pr(A)',
  inputs: [
    { k: 'mode', type: 'select', label: 'I know…', def: 'pa', options: [['pa', 'Pr(A|B), Pr(B), Pr(A)'], ['pnb', 'Pr(A|B), Pr(B), Pr(A|not B)  (evidence by total probability)']] },
    { k: 'ab', type: 'number', label: 'Pr(A|B)  likelihood', def: '0.6' },
    { k: 'b', type: 'number', label: 'Pr(B)  prior', def: '0.3' },
    { k: 'a', type: 'number', label: 'Pr(A)  evidence', def: '0.78', showIf: r => r.mode === 'pa' },
    { k: 'anb', type: 'number', label: 'Pr(A|not B)', def: '0.85', showIf: r => r.mode === 'pnb' },
  ],
  solve(v, R) {
    let pa = v.a;
    R.given('Pr(A|B)', v.ab).given('Pr(B)', v.b);
    if (v.mode === 'pnb') {
      pa = v.ab * v.b + v.anb * (1 - v.b);
      R.formula('Pr(A) = Pr(A|B)Pr(B) + Pr(A|¬B)Pr(¬B)  (sum + product rule)');
      R.step('Pr(A)', pa, { note: `${fmtNum(v.ab)}·${fmtNum(v.b)} + ${fmtNum(v.anb)}·${fmtNum(1 - v.b)}` });
    } else R.given('Pr(A)', pa);
    R.formula('Pr(B|A) = Pr(A|B)·Pr(B) / Pr(A)');
    const post = (v.ab * v.b) / pa;
    R.step('Pr(A, B) = Pr(A|B)Pr(B)', v.ab * v.b);
    R.answer('Pr(B|A) (posterior)', post, { sub: `${fmtNum(v.ab)} × ${fmtNum(v.b)} / ${fmtNum(pa)}${frac(post)}` });
    R.check('Pr(¬B|A)', 1 - post);
  },
});

tool({
  id: 'bayesmulti', cat: 'prob', name: 'Bayes with several hypotheses (boxes / machines)', short: 'Bayes (multi)',
  kw: 'bayes multiple hypotheses boxes fruit total probability posterior table',
  inputs: [
    { k: 'names', type: 'text', label: 'hypotheses', def: 'red box, blue box' },
    { k: 'prior', type: 'text', label: 'priors Pr(Hᵢ)', def: '0.4, 0.6' },
    { k: 'lik', type: 'text', label: 'likelihoods Pr(E | Hᵢ)', def: '0.75, 0.25' },
  ],
  solve(v, R) {
    const names = String(v.names).split(',').map(s => s.trim());
    const pr = parseList(v.prior), lk = parseList(v.lik);
    if (pr.length !== lk.length) uerr('priors and likelihoods must have the same length');
    const joint = pr.map((p, i) => p * lk[i]);
    const ev = NUM.sum(joint);
    R.formula('Pr(E) = Σ Pr(E|Hᵢ)Pr(Hᵢ) ;  Pr(Hᵢ|E) = Pr(E|Hᵢ)Pr(Hᵢ) / Pr(E)');
    R.table(['H', 'prior', 'likelihood', 'joint', 'posterior'], pr.map((p, i) => [names[i] || `H${i + 1}`, p, lk[i], joint[i], joint[i] / ev]), 'answer');
    R.answer('evidence Pr(E)', ev, { sub: fmtExact(ev) });
    if (Math.abs(NUM.sum(pr) - 1) > 1e-9) R.note('priors do not sum to 1!', 'warn');
  },
});

tool({
  id: 'probrules', cat: 'prob', name: 'Axioms · union · conditional · independence', short: 'P(A∪B), P(A|B)',
  kw: 'axioms probability union intersection conditional independent product rule sum rule valid assignment 확률 공리 합집합 교집합 독립',
  inputs: [
    { k: 'a', type: 'number', label: 'Pr(A)', def: '0.5', group: 'p' },
    { k: 'b', type: 'number', label: 'Pr(B)', def: '0.4', group: 'p' },
    { k: 'ab', type: 'number', label: 'Pr(A ∩ B)', def: '0.2', group: 'p' },
    { k: 'list', type: 'text', label: 'check a probability assignment (optional)', def: '0.2, 0.9', ph: 'for example P[H], P[T]' },
  ],
  solve(v, R) {
    const { a, b, ab } = v;
    R.formula('Pr(A ∪ B) = Pr(A) + Pr(B) − Pr(A ∩ B) ;  Pr(A|B) = Pr(A ∩ B)/Pr(B) ;  independent ⇔ Pr(A ∩ B) = Pr(A)Pr(B)');
    R.answer('Pr(A ∪ B)', a + b - ab).answer('Pr(A|B)', b ? ab / b : NaN).answer('Pr(B|A)', a ? ab / a : NaN);
    R.answer('Independent?', Math.abs(ab - a * b) < 1e-12 ? '<b class="yes">YES</b>' : '<b class="no">NO</b>', { sub: `Pr(A)Pr(B) = ${fmtNum(a * b)} vs Pr(A∩B) = ${fmtNum(ab)}` });
    R.check('mutually exclusive (A ∩ B = ∅)?', ab === 0 ? 'yes → Pr(A∪B) = Pr(A) + Pr(B)' : 'no');
    if (String(v.list).trim()) {
      const p = parseList(v.list);
      const ok = p.every(t => t >= 0 && t <= 1) && Math.abs(NUM.sum(p) - 1) < 1e-9;
      R.answer('Assignment valid?', ok ? '<b class="yes">VALID</b>' : '<b class="no">INVALID</b>', { sub: `all ≥ 0: ${p.every(t => t >= 0)}, sum = ${fmtNum(NUM.sum(p))} (must be 1)` });
    }
  },
});

tool({
  id: 'joint', cat: 'prob', name: 'Joint probability table → marginals, conditionals', short: 'Joint table',
  kw: 'joint probability table marginal conditional sum rule product rule independence two random variables',
  inputs: [
    { k: 'P', type: 'matrix', label: 'Pr(X = xᵢ, Y = yⱼ)  (rows: X values, columns: Y values)', def: [[0.1, 0.2], [0.3, 0.4]] },
    { k: 'xn', type: 'text', label: 'X values (row names)', def: 'x1, x2', group: 'n' },
    { k: 'yn', type: 'text', label: 'Y values (col names)', def: 'y1, y2', group: 'n' },
  ],
  solve(v, R) {
    const P = v.P;
    const xn = parseLabels(v.xn), yn = parseLabels(v.yn);
    const px = P.map(r => NUM.sum(r)), py = LA.T(P).map(c => NUM.sum(c));
    R.given('joint', P, { rowLabels: xn, colLabels: yn });
    R.formula('sum rule: Pr(X = x) = Σ_y Pr(X = x, Y = y) ;  product rule: Pr(X, Y) = Pr(Y|X)Pr(X)');
    R.answer('marginal Pr(X)', px, { rowLabels: xn }).answer('marginal Pr(Y)', [py], { colLabels: yn });
    R.answer('Pr(Y | X) (rows sum to 1)', P.map((r, i) => r.map(t => t / px[i])), { rowLabels: xn, colLabels: yn });
    R.answer('Pr(X | Y) (columns sum to 1)', P.map(r => r.map((t, j) => t / py[j])), { rowLabels: xn, colLabels: yn });
    const ind = P.every((r, i) => r.every((t, j) => Math.abs(t - px[i] * py[j]) < 1e-9));
    R.check('X, Y independent?', ind ? 'YES (Pr(x,y) = Pr(x)Pr(y) for all cells)' : 'NO');
    R.check('total', NUM.sum(P.flat()));
  },
});

tool({
  id: 'dice', cat: 'prob', name: 'Dice / enumeration: Pr(condition) by counting outcomes', short: 'Dice counting',
  kw: 'dice die toss sum product enumerate outcomes counting equally likely probability sum equals seven 주사위',
  desc: 'Variables: <code>a, b, c, d, e</code> = each die, <code>s</code> = sum, <code>p</code> = product. Example conditions: <code>s == 7</code>, <code>p/2 > s</code>, <code>a > b</code>, <code>s >= 10 or a == b</code>.',
  inputs: [
    { k: 'n', type: 'int', label: 'number of dice', def: '2', group: 'a' },
    { k: 'sides', type: 'text', label: 'faces of each die', def: '1..6', group: 'a', ph: '1..6 or list 1,2,3' },
    { k: 'cond', type: 'expr', label: 'condition', def: 's == 7' },
  ],
  solve(v, R) {
    const rng = String(v.sides).match(/^\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*$/);
    const faces = rng ? Array.from({ length: +rng[2] - +rng[1] + 1 }, (_, i) => +rng[1] + i) : parseList(v.sides);
    const n = v.n;
    if (n < 1 || n > 6 || faces.length ** n > 2e6) uerr('Too many outcomes (max 6 dice / 2 million outcomes)');
    const c = EX.parse(v.cond);
    const names = ['a', 'b', 'c', 'd', 'e', 'f'];
    let total = 0, hit = 0;
    const dist = {};
    const examples = [];
    const idx = Array(n).fill(0);
    for (;;) {
      const vals = idx.map(i => faces[i]);
      const s = NUM.sum(vals), p = vals.reduce((x, y) => x * y, 1);
      const env = { s, p };
      vals.forEach((x, i) => (env[names[i]] = x));
      total++;
      dist[s] = (dist[s] || 0) + 1;
      if (EX.evaluate(c, env)) { hit++; if (examples.length < 12) examples.push('(' + vals.join(',') + ')'); }
      let k = n - 1;
      while (k >= 0 && ++idx[k] === faces.length) idx[k--] = 0;
      if (k < 0) break;
    }
    const g = NUM.gcd(hit, total);
    R.given('outcomes', `${faces.length}^${n} = ${total} equally likely`);
    R.formula('Pr = (number of outcomes satisfying the condition) / (number of all outcomes)');
    R.answer(`Pr[${esc(v.cond)}]`, hit / total, { sub: `${hit}/${total} = ${hit / g}/${total / g}` });
    R.check('some satisfying outcomes', examples.join(' ') + (hit > 12 ? ' …' : ''));
    R.table(['sum s', 'number of ways', 'probability Pr'], Object.keys(dist).map(Number).sort((a, b) => a - b).map(s => [s, dist[s], dist[s] / total]), 'check');
    const nm = names.slice(0, n);
    R.code(`import itertools\nimport numpy as np\nfaces = ${JSON.stringify(faces)}\ncount = total = 0\nfor o in itertools.product(faces, repeat=${n}):\n    ${nm.join(', ')}${n === 1 ? ',' : ''} = o\n    s, p = sum(o), np.prod(o)\n    total += 1\n    if ${EX.str(c, true)}:\n        count += 1\nprint(count, total, count / total)`);
  },
});

tool({
  id: 'draws', cat: 'prob', name: 'Sequential draws (cards, balls) with / without replacement', short: 'Draws',
  kw: 'cards deck queen balls urn draw without replacement with replacement sequence hypergeometric product rule conditional 카드 공 뽑기 비복원',
  desc: 'Population as <code>name:count</code> pairs. Sequence = the categories drawn in order, for example <code>Q, Q</code> (two queens in a row) or <code>B, R</code>.',
  inputs: [
    { k: 'pop', type: 'text', label: 'population', def: 'Q:4, other:48' },
    { k: 'seq', type: 'text', label: 'sequence drawn (in order)', def: 'Q, Q' },
    { k: 'repl', type: 'check', label: 'with replacement', def: false },
    { k: 'k', type: 'text', label: 'also: exactly k of a category in n draws (optional)', def: 'Q, 1, 2', ph: 'category, k, n' },
  ],
  solve(v, R) {
    const pop = {};
    String(v.pop).split(',').forEach(s => { const m = s.split(':'); if (m.length === 2) pop[m[0].trim()] = EX.constVal(m[1]); });
    const N = NUM.sum(Object.values(pop));
    if (!N) uerr('population is empty — use name:count pairs');
    const seq = parseLabels(v.seq);
    const cur = { ...pop };
    let tot = N, P = 1;
    const parts = [];
    for (const s of seq) {
      if (!(s in cur)) uerr(`"${s}" is not in the population (${Object.keys(pop).join(', ')})`);
      const p = cur[s] / tot;
      parts.push(`${cur[s]}/${tot}`);
      P *= p;
      if (!v.repl) { cur[s]--; tot--; }
    }
    R.given('population', Object.entries(pop).map(([k, c]) => `${k}: ${c}`).join(', ') + ` (N = ${N})`).given('sequence', seq.join(' → '));
    R.formula('product rule: Pr(x₁, x₂, …) = Pr(x₁) Pr(x₂|x₁) Pr(x₃|x₁,x₂) …');
    R.answer('Pr(sequence)', P, { sub: parts.join(' × ') + frac(P) });
    if (String(v.k).trim()) {
      const [cat, ks, ns] = String(v.k).split(',').map(s => s.trim());
      const K = pop[cat], k = +ks, n = +ns;
      if (K == null) uerr(`unknown category ${cat}`);
      const p = v.repl ? NUM.comb(n, k) * (K / N) ** k * (1 - K / N) ** (n - k) : (NUM.comb(K, k) * NUM.comb(N - K, n - k)) / NUM.comb(N, n);
      R.answer(`Pr(exactly ${k} × ${cat} in ${n} draws)`, p, { sub: (v.repl ? 'binomial C(n,k)p^k(1−p)^(n−k)' : `hypergeometric C(${K},${k})C(${N - K},${n - k})/C(${N},${n})`) + frac(p) });
    }
  },
});

tool({
  id: 'indep', cat: 'prob', name: 'Independent events: Pr(exactly k occur) — urn problems', short: 'Exactly k (urns)',
  kw: 'independent events exactly k at least one none urns three urns red balls poisson binomial',
  desc: 'Give Pr(success) for each independent trial (for example drawing red from urn 1, 2, 3).',
  inputs: [{ k: 'p', type: 'text', label: 'success probabilities', def: '7/8, 6/8, 3/8' }],
  solve(v, R) {
    const p = parseList(v.p);
    let dist = [1];
    for (const q of p) { const nd = Array(dist.length + 1).fill(0); dist.forEach((t, k) => { nd[k] += t * (1 - q); nd[k + 1] += t * q; }); dist = nd; }
    R.given('pᵢ', p.map(t => fmtNum(t)).join(', '));
    R.formula('sum over which trials succeed, multiply (independent): for example exactly 2 of 3 = p₁p₂(1−p₃) + p₁(1−p₂)p₃ + (1−p₁)p₂p₃');
    R.table(['k', 'Pr(exactly k)', 'fraction'], dist.map((t, k) => [k, t, frac(t).replace(' = ', '')]), 'answer');
    R.answer('Pr(at least one)', 1 - dist[0]).answer('Pr(all)', dist[dist.length - 1]);
  },
});

tool({
  id: 'simpson', cat: 'prob', name: "Simpson's paradox checker", short: "Simpson's paradox",
  kw: 'simpson paradox batting average groups combined trend reverses',
  desc: 'Each row = one group: successes and totals for A and B.',
  inputs: [
    { k: 'T', type: 'matrix', label: 'rows: [A successes, A total, B successes, B total]', def: [[12, 48, 104, 411], [183, 582, 45, 140]], colLabels: ['A succ', 'A total', 'B succ', 'B total'] },
  ],
  solve(v, R) {
    const T = v.T;
    if (T[0].length !== 4) uerr('need 4 columns');
    const rows = T.map((r, i) => [`group ${i + 1}`, r[0] / r[1], r[2] / r[3], r[0] / r[1] > r[2] / r[3] ? 'A' : 'B']);
    const sa = NUM.sum(T.map(r => r[0])), ta = NUM.sum(T.map(r => r[1])), sb = NUM.sum(T.map(r => r[2])), tb = NUM.sum(T.map(r => r[3]));
    rows.push(['<b>combined</b>', sa / ta, sb / tb, sa / ta > sb / tb ? 'A' : 'B']);
    R.table(['', 'rate A', 'rate B', 'better'], rows, 'answer');
    const groupWin = rows.slice(0, -1).map(r => r[3]);
    const para = groupWin.every(w => w === groupWin[0]) && groupWin[0] !== rows[rows.length - 1][3];
    R.answer('Paradox?', para ? `<b class="yes">YES</b> — ${groupWin[0]} is better in every group but worse combined` : 'no');
  },
});

/* ---------------- DATA & CONCEPTS ---------------- */
const NOIR_EX = [
  ['gender, occupation, favorite restaurant, color, shape, blood type, yes/no label', 'Nominal'],
  ['exam difficulty 1–5, egg size S/M/L/XL, military rank, Disease Outbreak Response System Condition (DORSCON) Green/Yellow/Orange/Red, size small/large, satisfaction rating', 'Ordinal'],
  ['temperature in °C / °F, year of birth, SAT score [400,1600], credit score [300,850], IQ, pH', 'Interval'],
  ['weight (kg), luggage weight, time/duration, height, age, number of people in household, income, Kelvin temperature, counts', 'Ratio'],
];
tool({
  id: 'noir', cat: 'data', name: 'Data type: Nominal / Ordinal / Interval / Ratio (NOIR)', short: 'Nominal / Ordinal / Interval / Ratio (NOIR)',
  kw: 'nominal ordinal interval ratio noir level of measurement data type categorical numerical qualitative quantitative 데이터 타입',
  inputs: [
    { k: 'ord', type: 'select', label: 'Is there a natural ORDER?', def: 'yes', options: [['yes', 'yes'], ['no', 'no']] },
    { k: 'eq', type: 'select', label: 'Are intervals EQUAL / differences meaningful?', def: 'yes', options: [['yes', 'yes'], ['no', 'no']], showIf: r => r.ord === 'yes' },
    { k: 'zero', type: 'select', label: 'Does ZERO mean “none” (true zero, ratios meaningful)?', def: 'no', options: [['yes', 'yes'], ['no', 'no']], showIf: r => r.ord === 'yes' && r.eq === 'yes' },
  ],
  solve(v, R) {
    const t = v.ord === 'no' ? 'Nominal' : v.eq === 'no' ? 'Ordinal' : v.zero === 'yes' ? 'Ratio' : 'Interval';
    R.answer('Level of measurement', `<b>${t}</b>`, { sub: t === 'Nominal' || t === 'Ordinal' ? 'categorical / qualitative' : 'numerical / quantitative' });
    R.table(['can estimate', 'Nominal', 'Ordinal', 'Interval', 'Ratio'], [
      ['frequency distribution / mode', '✓', '✓', '✓', '✓'], ['median', '✗', '✓', '✓', '✓'], ['add / subtract', '✗', '✗', '✓', '✓'],
      ['mean, standard deviation', '✗', '✗', '✓', '✓'], ['ratios (×, ÷)', '✗', '✗', '✗', '✓']], 'answer');
    R.table(['examples', 'type'], NOIR_EX, 'check');
    R.note('Temperature in °C: INTERVAL (0 °C is not “no temperature”, 20 °C is not “twice as hot”) → mean & standard deviation (std) OK, ratio NOT OK. Trial-quiz answer: °C recorded to 2 decimal places was marked “not continuous”.', 'info', 'check');
  },
});

tool({
  id: 'nn', cat: 'data', name: 'Nearest-neighbour classifier (Lecture 1 toy example)', short: 'Nearest neighbour',
  kw: 'nearest neighbor classifier similarity token classification feature matching knn supervised',
  desc: 'Categorical: similarity = number of matching attributes (higher = nearer). Numeric: Euclidean distance (smaller = nearer). One training sample per line: <code>features… , label</code>.',
  inputs: [
    { k: 'train', type: 'textarea', label: 'training samples (last item = label)', def: 'Blue, Large, Ring, Yes\nRed, Large, Triangle, Yes\nOrange, Large, Diamond, Yes\nGreen, Small, Circle, Yes\nYellow, Small, Arrow, No\nBlue, Large, Rectangle, No\nRed, Large, Circle, No\nGreen, Small, Diamond, No', rows: 8, wide: true },
    { k: 'q', type: 'text', label: 'query sample (features only)', def: 'Yellow, Large, Triangle' },
  ],
  solve(v, R) {
    const rows = String(v.train).split('\n').map(l => l.split(',').map(s => s.trim())).filter(r => r.length > 1);
    const q = String(v.q).split(',').map(s => s.trim());
    const numeric = q.every(t => !isNaN(+t));
    const res = rows.map(r => {
      const f = r.slice(0, -1);
      if (f.length !== q.length) uerr('query has a different number of features');
      const score = numeric ? Math.sqrt(f.reduce((s, t, i) => s + (+t - +q[i]) ** 2, 0)) : f.filter((t, i) => t.toLowerCase() === q[i].toLowerCase()).length;
      return { f, label: r[r.length - 1], score };
    });
    const best = numeric ? Math.min(...res.map(r => r.score)) : Math.max(...res.map(r => r.score));
    R.table(['sample', 'label', numeric ? 'distance' : 'similarity (# matches)'], res.map(r => [r.f.join(', '), r.label, r.score === best ? `<b>${fmtNum(r.score)}</b>` : fmtNum(r.score)]));
    const winners = res.filter(r => r.score === best);
    R.answer('Nearest neighbour(s)', winners.map(r => `${r.f.join(', ')} → <b>${esc(r.label)}</b>`).join('<br>'), { sub: winners.length > 1 ? 'tie — several nearest neighbours' : '' });
  },
});

const FACTS = [
  ['Lecture 1', 'Machine Learning (ML) definition (Tom Mitchell): learn from Experience E with respect to (w.r.t.) Task T and Performance P. for example weather prediction: T = prediction task, P = accuracy, E = historical data.'],
  ['Lecture 1', 'Arthur Samuel: Machine Learning (ML) = field of study that gives computers the ability to learn without being explicitly programmed.'],
  ['Lecture 1', 'Supervised = labelled data (classification: categorical y, regression: continuous y). Unsupervised = no labels (clustering). Reinforcement = states, actions, delayed rewards → policy.'],
  ['Lecture 1', 'Spam detection → classification; predicting sales amount / temperature / number of shares → regression.'],
  ['Lecture 1', 'Grouping users/patients/oranges by similarity (no labels) → unsupervised (clustering).'],
  ['Lecture 1', 'Inductive reasoning = probable conclusions from observations (Machine Learning (ML), statistics). Deductive = logical, rule-based (all men are mortal…).'],
  ['Lecture 1', 'Nearest Neighbour classifier is SUPERVISED and INDUCTIVE; it is a classifier, not feature selection.'],
  ['Lecture 1', 'Artificial Intelligence (AI) is the broader concept; Machine Learning (ML) is a subset of AI; deep learning is a subset of ML. Deductive rule-based reasoning is AI but not ML.'],
  ['Lecture 1', 'Payroll calculation does not need Machine Learning (ML) (explicit formula).'],
  ['Lecture 2', 'Nominal / Ordinal / Interval / Ratio (NOIR): Nominal (named) < Ordinal (+order) < Interval (+equal intervals) < Ratio (+true zero).'],
  ['Lecture 2', 'Mean & standard deviation (std) are meaningful only for interval and ratio data. Median needs at least ordinal. Mode works for all.'],
  ['Lecture 2', 'Trial quiz: temperature in °C → interval ✓, mean & standard deviation (std) can be computed ✓, ratio ✗, “continuous (2 decimal places)” ✗.'],
  ['Lecture 2', 'Temperature in Celsius = interval. Weight in kg = ratio. Disease Outbreak Response System Condition (DORSCON) colours = ordinal. Favourite restaurant = nominal.'],
  ['Lecture 2', 'Missing data: use one common code (for example NA = Not Available), not blanks. Handling: remove rows, use algorithm that handles missing values (random forest), or impute (mean, or out-of-range value like −1).'],
  ['Lecture 2', 'One-hot encoding converts categories to binary vectors; it can be applied to a binary target ([1,0],[0,1]).'],
  ['Lecture 2', 'Normalization: minimum–maximum (min-max) scaling to [0,1]; z-score (x − E[X])/σ. Large-valued features overshadow small ones without it.'],
  ['Lecture 2', 'Boxplot: minimum (min), first quartile (Q1), median, third quartile (Q3), maximum (max); 50% of data lie between Q1 and Q3.'],
  ['Lecture 2', 'Anscombe: different datasets can have identical mean/variance/regression line → visualise the data.'],
  ['Lecture 2', 'Data integrity = accuracy & consistency of data (for example numeric columns reject letters).'],
  ['Lecture 3', 'Correlation does NOT imply causation. If A and B are both caused by C: A–C and B–C correlated; A does not cause B.'],
  ['Lecture 3', 'Pearson r ∈ [−1, 1]; |r| > 0.9 strong, 0.7–0.9 medium, 0.5–0.7 weak, < 0.5 none/doubtful.'],
  ['Lecture 3', "Simpson's paradox: a trend in several groups reverses when the groups are combined."],
  ['Lecture 3', 'Randomized Controlled Trial: randomly assign to experimental/control groups to study causality (can be infeasible / unethical).'],
  ['Lecture 3', 'Axioms: Pr(A) ≥ 0, Pr(S) = 1, disjoint A,B ⇒ Pr(A∪B) = Pr(A) + Pr(B); otherwise subtract Pr(A∩B).'],
  ['Lecture 3', 'A discrete Random Variable (RV) can take a countably INFINITE number of values (0, 1, 2, …) → “discrete = finite” is FALSE.'],
  ['Lecture 3', 'For a continuous Random Variable (RV), Pr(X = c) = 0; probability density function (PDF) ≥ 0 and area under the curve = 1. PDF values can exceed 1.'],
  ['Lecture 3', 'Bayes: posterior = likelihood × prior / evidence.'],
  ['Lecture 3', 'rank = maximal number of linearly independent rows/columns. Square X with independent rows/columns ⇒ invertible (full rank).'],
  ['Lecture 4', 'Square (m = d): even-determined, unique solution if X invertible: ŵ = X⁻¹y.'],
  ['Lecture 4', 'Tall (m > d): over-determined, no exact solution in general → least squares with left inverse (XᵀX)⁻¹Xᵀ. Exception: rank(X) = rank([X, y]) gives an exact solution.'],
  ['Lecture 4', 'Wide (m < d): under-determined, infinitely many solutions → constrained solution with right inverse Xᵀ(XXᵀ)⁻¹. No solution if rank(X) < rank([X, y]).'],
  ['Lecture 4', 'Under-determined = MORE UNKNOWNS than equations (fewer equations). Over-determined = more equations than unknowns.'],
  ['Lecture 4', '100 people × 10 measures → tall → over-determined. 100 people × 100 measures → square (even-determined), exact solution if invertible. 40 people × 100 measures → under-determined (right inverse).'],
  ['Lecture 4', 'wᵀX = yᵀ with X ∈ ℝ^(3×2), y ∈ ℝ^(2×1): number of equations = 2 (entries of y).'],
  ['Lecture 4', 'A non-square matrix has no determinant and no ordinary inverse. [1 2 3; 4 5 6] is right-invertible (rank 2 = rows), not left-invertible.'],
  ['Lecture 4', 'Linear f(x) = aᵀx (superposition: homogeneity + additivity). Affine f(x) = aᵀx + b. y = a + b + 2c + 3 is affine, NOT linear.'],
  ['Lecture 4', 'Inverse via adjugate: A⁻¹ = adj(A)/det(A), adj(A) = Cᵀ, Cᵢⱼ = (−1)^(i+j) Mᵢⱼ.'],
  ['Lecture 5', 'max f returns a value in the range (output); argmax f returns the element of the domain (input). f(a) = 3a on [0,1]: max = 3, argmax = 1.'],
  ['Lecture 5', 'Local minimum (min) at c: f(x) ≥ f(c) on an open interval around c. Global minimum: f(x) ≥ f(c) on the whole domain.'],
  ['Lecture 5', 'Gradient of a scalar function of a d×1 vector is a d×1 vector. Jacobian of an h×1 vector function with respect to (w.r.t.) d×1 x is h×d.'],
  ['Lecture 5', 'd(Ax)/dx = A, d(bᵀx)/dx = b, d(xᵀAx)/dx = (A + Aᵀ)x, d(yᵀAx)/dx = Aᵀy.'],
  ['Lecture 5', 'Loss = penalty for one sample (f(xᵢ) − yᵢ)². Cost/objective = sum (or average = empirical risk) of losses (+ regularization).'],
  ['Lecture 5', 'Normal equation XᵀXw = Xᵀy from ∂J/∂w = 2XᵀXw − 2Xᵀy = 0; ŵ = (XᵀX)⁻¹Xᵀy when XᵀX invertible. The 1/m factor does not change the minimiser.'],
  ['Lecture 5', 'Bias/offset term translates the line/plane away from the origin; add a column of 1s to X (w₀ = b).'],
  ['Lecture 5', 'Multi-output: X ∈ ℝ^(m×(d+1)), W ∈ ℝ^((d+1)×h), Y ∈ ℝ^(m×h); J(W) = trace(EᵀE). 5 input measures predicting age & sex → W is 6×2 with bias (5×2 without).'],
  ['Lecture 5', 'Extrapolation far outside the training range (for example 5 students when data is 26–39) can be unreliable. Duplicated samples influence the fit.'],
  ['Lecture 6', 'Binary classification: learn ŵ with y ∈ {−1, +1}, predict sign(x_newᵀŵ).'],
  ['Lecture 6', 'Multi-class: one-hot Y (m×C), Ŵ = (XᵀX)⁻¹XᵀY, class = argmax over the columns of x_newᵀŴ.'],
  ['Lecture 6', 'Ridge: J = (Xw − y)ᵀ(Xw − y) + λwᵀw; larger λ ⇒ more shrinkage ⇒ ‖ŵ‖ decreases. (XᵀX + λI) invertible for λ > 0.'],
  ['Lecture 6', 'Ridge primal (m > d): (XᵀX + λI)⁻¹Xᵀy with I d×d. Dual (m < d): Xᵀ(XXᵀ + λI)⁻¹y with I m×m.'],
  ['Lecture 6', 'Ridge CAN be applied to multi-target regression (replace y by Y).'],
  ['Lecture 6', 'Polynomial model is nonlinear in x (nonlinear decision boundary, for example Exclusive OR (XOR)) but linear in w. Number of parameters = C(d+p, p).'],
  ['Lecture 6', '1 feature, full 3rd order → 4 parameters (w₀..w₃), not 3. 2 features, 2nd order → 6 parameters; 4 samples → under-determined (4 < 6).'],
  ['Lecture 6', '2 features, 3rd order → 10 parameters; with 3 samples → under-determined → infinitely many solutions.'],
  ['Lecture 6', 'Primal/dual choice uses the size of P (not X). Always expand X_new with the SAME polynomial terms.'],
  ['Lecture 6', 'Weierstrass: any continuous function on [a, b] can be approximated arbitrarily well by a polynomial. High order + many features → explosion of terms; order > 3 rarely used.'],
];
tool({
  id: 'facts', cat: 'data', name: 'Concept cheat sheet — True / False (T/F) and Multiple Choice Question (MCQ), searchable', short: 'Concept cheat sheet',
  kw: 'concept theory true false mcq quiz cheat sheet summary definitions 개념 이론',
  inputs: [{ k: 'q', type: 'text', label: 'filter (words)', def: '', ph: 'for example under-determined, ridge, causation' }],
  solve(v, R) {
    const terms = String(v.q).toLowerCase().split(/\s+/).filter(Boolean);
    const list = FACTS.filter(([l, f]) => terms.every(t => (l + ' ' + f).toLowerCase().includes(t)));
    R.table(['lecture', 'fact'], list.map(([l, f]) => [l, esc(f)]), 'answer');
    if (!list.length) R.answer('No match', 'try fewer words');
  },
});
