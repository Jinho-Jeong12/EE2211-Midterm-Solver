'use strict';
/* =====================================================================
   tools_reg.js — Linear regression, multi-output, classification,
   ridge, polynomial  (all share fitModel)
   ===================================================================== */

/* ---------- every error / loss quantity, named the way exam questions name it ----------
   e = residuals ŷ − y (flattened), o = { m (samples), h (outputs), lam, wsq (wᵀw) } */
function errorTerms(R, e, o = {}) {
  const m = o.m ?? e.length, h = o.h || 1, n = e.length;
  const sse = e.reduce((s, x) => s + x * x, 0), mse = sse / m;
  const list = f => e.slice(0, 20).map((x, i) => f(x, i)).join('<br>') + (e.length > 20 ? '<br>…' : '');
  const rows = [
    { star: true, q: 'Squared error loss (of the whole data set) · Sum of Squared Errors (SSE) · Residual Sum of Squares (RSS)',
      ko: '오차 제곱의 <b>합</b> — m으로 <b>나누지 않음</b>. Lecture 5 slide 17: “this choice of the loss function is called squared error loss”.<br>' +
        '⚠ <b>cost function · objective function · J(w)</b> 는 강의에 두 정의가 있음: slide 17 = 이 합 (기본), slide 16 = (1/m) 을 붙인 평균 → 문제의 식에 1/m 이 있으면 아래 MSE 줄',
      f: h > 1 ? 'Σᵢ Σₖ (ŷᵢₖ − yᵢₖ)² = trace(EᵀE)' : 'Σᵢ (ŷᵢ − yᵢ)² = eᵀe = (Xw − y)ᵀ(Xw − y)', v: sse },
    { star: true, q: 'Mean Squared Error (MSE) · mean of squared error · average squared error',
      ko: `오차 제곱의 <b>평균</b> — 합(SSE)을 샘플 수 m = ${m} 으로 나눔.<br>` +
        '조건부로 같은 말: <b>average loss</b> (loss 가 squared error 일 때) · <b>empirical risk</b> (학습 데이터에서 계산할 때, Lecture 5 slide 18) · ' +
        `<b>(1/m)·J(w)</b> (${o.lam > 0 ? '<b>지금은 ridge 라서 다름</b> — 벌점이 빠진 값' : 'ridge 벌점이 없을 때'})`, f: `(1/m) Σ (ŷᵢ − yᵢ)² = ${fmtNum(sse)} / ${m}`, v: mse },
    h > 1 ? { q: 'Mean Squared Error over every entry (sklearn mean_squared_error default for several outputs)', ko: `모든 칸 m × h = ${n} 개로 나눔`, f: `SSE / ${n}`, v: sse / n } : null,
    { q: 'Root Mean Squared Error (RMSE)', ko: 'Mean Squared Error (MSE) 의 제곱근', f: '√MSE', v: Math.sqrt(mse) },
    { q: 'Mean Absolute Error (MAE) — not in the lecture', ko: '오차 절댓값의 평균', f: '(1/m) Σ |ŷᵢ − yᵢ|', v: e.reduce((s, x) => s + Math.abs(x), 0) / m },
  ];
  if (h === 1) {
    rows.push({ q: 'Squared error loss of ONE sample i · loss function Lᵢ · penalty for sample i', ko: '샘플 하나의 오차 제곱 (Lecture 5 slide 16)', f: 'Lᵢ = (ŷᵢ − yᵢ)²', v: list((x, i) => `L${sub(i + 1)} = ${fmtNum(x * x)}`) });
    rows.push({ q: 'Residual · error eᵢ · prediction error', ko: '예측값 − 실제값 (책에 따라 yᵢ − ŷᵢ 로 부호만 반대, 제곱하면 같음)', f: 'eᵢ = ŷᵢ − yᵢ', v: list((x, i) => `e${sub(i + 1)} = ${fmtNum(x)}`) });
  }
  if (o.lam > 0) {
    const pen = o.lam * o.wsq;
    rows.push({ q: 'Regularization term · penalty term · λ‖w‖² = λwᵀw', ko: 'ridge 의 벌점 항 (w₀ 포함 모든 w)', f: `${fmtNum(o.lam)} × ${fmtNum(o.wsq)}`, v: pen });
    rows.push({ star: true, q: 'Ridge objective · ridge cost function · regularized (penalized) loss · J(w) = SSE + λwᵀw', ko: '오차 제곱 합 + 벌점', f: `${fmtNum(sse)} + ${fmtNum(pen)}`, v: sse + pen });
    rows.push({ q: 'Squared L2 norm of w · ‖w‖² = wᵀw', ko: 'w 원소 제곱의 합', v: o.wsq });
  }
  R.terms(rows);
  return { sse, mse };
}

function classTerms(R, correct, m, e, what, h = 1) {
  const sse = e.reduce((s, x) => s + x * x, 0);
  R.terms([
    { star: true, q: 'Training accuracy · classification accuracy · fraction correctly classified', ko: `맞힌 개수 / 전체 = ${correct} / ${m}`, f: `${correct} / ${m} = ${fmtNum((100 * correct) / m, { dec: 2 })}%`, v: correct / m },
    { q: 'Number of correctly classified samples', ko: '맞힌 샘플 수', v: correct },
    { q: 'Number of misclassified samples · misclassifications', ko: '틀린 샘플 수', v: m - correct },
    { q: 'Misclassification rate · error rate · classification error', ko: '틀린 비율 = 1 − accuracy', f: `${m - correct} / ${m}`, v: (m - correct) / m },
    { q: `Squared error loss of the linear scores · Sum of Squared Errors (SSE) (${what})`, ko: '분류 전 점수(score)와 정답 사이의 오차 제곱 합 — 학습이 최소화한 값', f: h > 1 ? 'trace(EᵀE), E = XŴ − Y' : 'Σ (xᵢᵀŵ − yᵢ)²', v: sse },
    { q: 'Mean Squared Error (MSE) of the linear scores', ko: '위 합을 m 으로 나눔', f: `SSE / ${m}`, v: sse / m },
  ], '문제에서 이렇게 물으면 → 이 값을 쓰세요 (training data, question wording → value)');
}

/* ---------- the shared fit / predict engine ----------
   o = { Xraw, Y (m×h), bias, lambda, mode, deg, order, task: 'reg'|'bin'|'multi',
         Xnew (raw) | null, binInfo {pos,neg}, classes, yNames } */
function fitModel(o, R) {
  const { Xraw, Y } = o;
  const m = Xraw.length;
  legend(R, [o.deg ? 'P' : 'X', Y[0].length > 1 ? 'Y' : 'y', 'wh', 'yh', ...(o.Xnew ? ['Xn'] : []), 'm', 'd', ...(o.task === 'multi' ? ['C'] : []), ...(o.lambda > 0 ? ['lam', 'I'] : [])]);
  if (Y.length !== m) uerr(`X has ${m} rows (samples) but the target has ${Y.length} — one target per sample.`);
  const h = Y[0].length;
  const d0 = Xraw[0].length;
  let D, labels, Dn = 'X', biasIncluded = false;
  if (o.deg && o.deg >= 1) {
    const pe = polyExpand(Xraw, o.deg, o.order);
    D = pe.P; labels = pe.labels; Dn = 'P'; biasIncluded = true;
    R.step(`Polynomial feature matrix P (order ${o.deg}${d0 > 1 ? `, ${o.order === 'lecture' ? 'lecture' : 'sklearn'} column order` : ''})`, D, { colLabels: labels, note: `${m}×${labels.length}: ${labels.length} parameters = C(d+p, p) = C(${d0}+${o.deg}, ${o.deg})` });
  } else {
    const dm = designMatrix(Xraw, o.bias, R);
    D = dm.X; biasIncluded = o.bias;
    const names = featNames(d0);
    labels = o.bias ? (dm.already ? ['1', ...featNames(d0 - 1)] : ['1', ...names]) : names;
    R.step(o.bias ? (dm.added ? 'Design matrix X = [1, x] (bias column of 1s added)' : 'Design matrix X') : 'X (no bias)', D, { colLabels: labels });
  }
  const [mm, dd] = LA.shape(D);
  const st = sysType(mm, dd);
  const lam = o.lambda || 0;
  const form = lam > 0 ? (o.mode === 'dual' || (o.mode !== 'primal' && mm < dd) ? 'Ridge DUAL' : 'Ridge PRIMAL') : mm === dd ? (LA.isInvertible(D) ? 'square: inverse' : 'square singular') : mm > dd ? 'least squares (primal / left inverse)' : 'constrained min-norm (dual / right inverse)';
  const taskName = { reg: h > 1 ? 'Linear regression with MULTIPLE outputs' : 'Linear regression (training)', bin: 'Binary classification (linear regression + sign)', multi: 'Multi-category classification (one-hot + argmax)' }[o.task];
  R.detect(`${o.deg ? `Polynomial (order ${o.deg}) · ` : ''}${taskName} · ${Dn} is ${mm}×${dd} → ${st.short} · ${lam > 0 ? `λ = ${fmtNum(lam)} → ` : ''}<b>${form}</b>`);
  const res = lsqSolve(D, Y, R, { lambda: lam, mode: o.mode, Xn: Dn, yn: h > 1 ? 'Y' : 'y' });
  const W = res.W;
  // parameter labels
  const pl = labels.map((l, i) => (biasIncluded ? `w${sub(i)}` : `w${sub(i + 1)}`) + (l === '1' ? ' (bias)' : ` [${l}]`));
  if (h === 1) {
    const w = W.map(r => r[0]);
    R.answer(`Learned parameters ŵ = argmin J(w) ${lam > 0 ? '(ridge)' : '(least squares solution · weights · coefficients)'}`, w, { rowLabels: pl, copy: '[' + w.map(t => fmtNum(t)).join(', ') + ']' });
    if (biasIncluded) R.answer('Intercept / bias w₀', w[0], { sub: `feature coefficients: ${labels.slice(1).map((l, i) => `${l}: ${fmtNum(w[i + 1])}`).join(', ')}` });
    if (o.task !== 'multi') R.answer('Fitted model', modelEquation(w, labels, o.task === 'bin' ? 'score' : 'ŷ'));
  } else {
    const cl = o.task === 'multi' ? o.classes.map(c => clsName(c)) : Array.from({ length: h }, (_, k) => `y${sub(k + 1)}`);
    R.answer(`Ŵ (${dd}×${h})`, W, { rowLabels: pl, colLabels: cl, sub: o.task === 'multi' ? 'column k = score model of class k' : 'column k = model for output k' });
  }
  // training fit
  const F = LA.mul(D, W);
  if (o.task === 'reg') {
    const E = LA.sub(F, Y);
    const sse = E.flat().reduce((s, x) => s + x * x, 0);
    if (h === 1) R.table(['i', 'yᵢ (actual)', 'ŷᵢ = xᵢᵀŵ', 'eᵢ = ŷᵢ − yᵢ', 'eᵢ²', 'over / under'], Y.map((r, i) => [i + 1, r[0], F[i][0], E[i][0], E[i][0] ** 2, overUnder(E[i][0])]), 'check');
    R.check(`J(ŵ) = Σ(ŷᵢ − yᵢ)² = eᵀe ${h > 1 ? '(trace(EᵀE))' : ''}`, sse, { note: `Mean Squared Error (MSE) = J/m = ${fmtNum(sse / m)}${res.exact ? '  → exact fit (ŷ = y)' : ''}` });
    if (res.exact) R.note('Exact fit: ŷ = y on every training sample, so every error below is 0.', 'info', 'answer');
    errorTerms(R, E.flat(), { m, h, lam, wsq: W.flat().reduce((s, x) => s + x * x, 0) });
    if (lam > 0) { const pen = lam * W.flat().reduce((s, x) => s + x * x, 0); R.check('penalty λ‖ŵ‖²', pen, { note: `J_ridge = ${fmtNum(sse + pen)}` }); }
  } else if (o.task === 'bin') {
    const pred = F.map(r => sgn(r[0]));
    const acc = pred.filter((p, i) => p === Y[i][0]).length;
    R.table(['i', 'score xᵢᵀŵ', 'sign → class', 'true'], F.map((r, i) => [i + 1, r[0], `${pred[i] > 0 ? '+1' : '−1'} (${pred[i] > 0 ? o.binInfo.pos : o.binInfo.neg})`, Y[i][0] > 0 ? `+1 (${o.binInfo.pos})` : `−1 (${o.binInfo.neg})`]), 'check');
    R.check('training accuracy', `${acc}/${m}`);
    classTerms(R, acc, m, LA.sub(F, Y).flat(), 'scores xᵢᵀŵ vs labels ±1');
  } else if (o.task === 'multi') {
    const am = F.map(r => r.indexOf(Math.max(...r)));
    const tr = Y.map(r => r.indexOf(1));
    R.check('training accuracy', `${am.filter((a, i) => a === tr[i]).length}/${m}`);
    classTerms(R, am.filter((a, i) => a === tr[i]).length, m, LA.sub(F, Y).flat(), 'score matrix XŴ vs one-hot Y', Y[0].length);
  }
  // prediction
  let pred = null;
  if (o.Xnew) {
    if (o.Xnew[0].length !== d0) uerr(`X_new has ${o.Xnew[0].length} feature column(s) but training X has ${d0}. Enter RAW features (the same columns as training X${o.deg ? ', before polynomial expansion' : ''}).`);
    let Dnew, nm = 'X_new';
    if (o.deg) { Dnew = polyExpand(o.Xnew, o.deg, o.order).P; nm = 'P_new'; R.note('X_new is expanded with the SAME polynomial terms as training.', 'info', 'answer'); }
    else if (biasIncluded && D[0].length === d0 + 1) Dnew = addBias(o.Xnew);
    else Dnew = o.Xnew;
    R.answer(`${nm} ${biasIncluded && !o.deg ? '(1 prepended to every new sample)' : ''}`, Dnew, { colLabels: labels });
    const Yn = LA.mul(Dnew, W, nm, 'ŵ');
    if (o.task === 'reg') {
      R.answer(`Prediction ŷ_new = ${nm}·ŵ  (predicted output · estimated y · test output)`, h === 1 ? Yn.map(r => r[0]) : Yn, { colLabels: h > 1 ? Array.from({ length: h }, (_, k) => `y${sub(k + 1)}`) : undefined });
    } else if (o.task === 'bin') {
      const rows = Yn.map((r, i) => {
        const s = r[0], c = sgn(s);
        return [i + 1, o.Xnew[i].map(t => fmtNum(t)).join(', '), `<b>${fmtNum(s)}</b>`, `sign(${fmtNum(s)}) = ${c > 0 ? '+1' : '−1'}`, `<b>${c > 0 ? '+1' : '−1'} → ${esc(c > 0 ? o.binInfo.pos : o.binInfo.neg)}</b>`];
      });
      R.text('Step 1 — linear output (score): same calculation as linear regression. Step 2 — apply sign (score ≥ 0 → +1, score < 0 → −1).', 'answer');
      R.table(['#', 'x_new', 'score = x_newᵀŵ', 'sign', 'Final class'], rows, 'answer');
      pred = Yn.map(r => sgn(r[0]));
      R.answer('Predicted classes', pred.map((c, i) => `${c > 0 ? '+1' : '−1'} (${esc(c > 0 ? o.binInfo.pos : o.binInfo.neg)})`).join(', '));
    } else {
      const rows = Yn.map((r, i) => {
        const k = r.indexOf(Math.max(...r));
        return [i + 1, o.Xnew[i].map(t => fmtNum(t)).join(', '), r.map((s, j) => (j === k ? `<b>${fmtNum(s)}</b>` : fmtNum(s))).join(', '), `largest = ${fmtNum(r[k])} in column ${k + 1}`, `<b>${esc(clsName(o.classes[k]))}</b>`];
      });
      R.answer('Ŷ_new = X_new·Ŵ (class scores)', Yn, { colLabels: o.classes.map(c => clsName(c)), hl: (i, j) => Yn[i][j] === Math.max(...Yn[i]) });
      R.table(['#', 'x_new', 'scores [Class 1 … C]', 'argmax', 'Predicted class'], rows, 'answer');
      R.answer('Predicted classes', Yn.map(r => clsName(o.classes[r.indexOf(Math.max(...r))])).join(', '));
    }
    pred = Yn;
  }
  return { W, D, labels, res, pred };
}

function fitCode(o) {
  const L = ['import numpy as np', 'from numpy.linalg import inv'];
  if (o.deg) L.push('from sklearn.preprocessing import PolynomialFeatures');
  L.push(`X = ${pyArr(o.Xraw)}`);
  if (o.task === 'multi') L.push(`Y = ${pyArr(o.Y)}   # one-hot targets (columns = classes ${o.classes.join(', ')})`);
  else if (o.Y[0].length > 1) L.push(`Y = ${pyArr(o.Y)}`);
  else L.push(`y = ${pyArr(o.Y.map(r => r[0]))}${o.task === 'bin' ? `   # +1 = ${o.binInfo.pos}, -1 = ${o.binInfo.neg}` : ''}`);
  const yv = o.task === 'multi' || o.Y[0].length > 1 ? 'Y' : 'y';
  let M = 'X';
  if (o.deg) { L.push(`poly = PolynomialFeatures(${o.deg})`, 'P = poly.fit_transform(X)' + (o.order === 'lecture' && o.Xraw[0].length > 1 ? '   # NOTE: sklearn column order differs from lecture order' : '')); M = 'P'; }
  else if (o.bias) L.push('X = np.hstack((np.ones((X.shape[0], 1)), X))   # add bias column of 1s');
  const lam = o.lambda || 0;
  const [mm, dd] = [o.Xraw.length, o.deg ? polyTerms(o.Xraw[0].length, o.deg).length : o.Xraw[0].length + (o.bias ? 1 : 0)];
  const dual = lam > 0 ? o.mode === 'dual' || (o.mode !== 'primal' && mm < dd) : mm < dd;
  if (lam > 0) {
    L.push(`lam = ${pyNum(lam)}`);
    L.push(dual ? `w = ${M}.T @ inv(${M} @ ${M}.T + lam * np.identity(${M}.shape[0])) @ ${yv}   # ridge dual (m < d)` : `w = inv(${M}.T @ ${M} + lam * np.identity(${M}.shape[1])) @ ${M}.T @ ${yv}   # ridge primal`);
  } else if (mm === dd) L.push(`w = inv(${M}) @ ${yv}   # square & invertible`);
  else L.push(dual ? `w = ${M}.T @ inv(${M} @ ${M}.T) @ ${yv}   # under-determined: right inverse` : `w = inv(${M}.T @ ${M}) @ ${M}.T @ ${yv}   # least squares`);
  L.push('print(w)');
  if (o.Xnew) {
    L.push(`Xnew = ${pyArr(o.Xnew)}`);
    if (o.deg) L.push('Pnew = poly.fit_transform(Xnew)');
    else if (o.bias) L.push('Xnew = np.hstack((np.ones((Xnew.shape[0], 1)), Xnew))');
    const Mn = o.deg ? 'Pnew' : 'Xnew';
    L.push(`y_new = ${Mn} @ w`, 'print(y_new)');
    if (o.task === 'bin') L.push('print(np.sign(y_new))   # careful: np.sign(0) = 0; EE2211 uses score >= 0 -> +1');
    if (o.task === 'multi') L.push(`print(np.argmax(y_new, axis=1) + 1)   # predicted class index (1-based)`);
  }
  return L.join('\n');
}

/* ---------- common input specs ---------- */
const XIN = (def, label) => ({ k: 'X', type: 'matrix', biasAware: true, label: label || 'X (raw) <span class="muted">(TRAIN 학습용 — 정답 y를 아는 샘플, 한 행 = 한 샘플, 회색 1 열 = bias 자동·수정 불가)</span>', def, group: 'xy', colLabels: j => `x${j + 1}`, hint: '“add bias”를 체크하면 맨 앞에 회색 <b>1 (bias)</b> 열이 자동으로 들어가 — 수정 불가. 체크 해제하면 사라져. polynomial 도구는 raw x만 넣으면 [1, x, x², …]로 자동 확장.' });
const YIN = def => ({ k: 'y', type: 'vector', label: 'y <span class="muted">(TRAIN 정답값, X의 각 행에 하나씩)</span>', def, group: 'xy', link: 'X' });
const BIAS = { k: 'bias', type: 'check', label: 'Add bias / intercept (prepend 1 → w₀ = b)', def: true };
const PRED = def => [
  { k: 'doPred', type: 'check', label: 'Also PREDICT (예측) — 학습된 ŵ로 새 샘플 X_new의 ŷ 계산', def: def != null },
  { k: 'Xnew', type: 'matrix', biasAware: true, label: 'X_new (raw) <span class="muted">(PREDICT 예측용 — 정답을 모르는 새 샘플, X와 열 개수 같게, 회색 1 열 = bias 자동·수정 불가)</span>', def: def || [[0]], showIf: r => r.doPred, colLabels: j => `x${j + 1}` },
];

/* ---------------- LINEAR REGRESSION ---------------- */
tool({
  id: 'lrtrain', cat: 'linreg', name: 'Train ŵ (+ Predict)  — least squares', short: 'Train + Predict',
  kw: 'linear regression train fit least squares w hat normal equation intercept slope bias predict mean squared error mse of the estimated model 평균제곱오차 선형회귀 학습 예측 최소제곱 regression equation line',
  desc: '<b>TRAIN</b>: find w₀ (bias), w₁, … from training X and y. <b>PREDICT</b>: put new x into the trained model to get ŷ. Formula chosen automatically from the size of X.',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]), YIN([-6, -6, -4, -1, 1, 4]), BIAS, ...PRED([[-1]])],
  solve(v, R) {
    const o = { Xraw: v.X, Y: LA.col(v.y), bias: v.bias, task: 'reg', Xnew: v.doPred ? v.Xnew : null };
    R.given('X (raw, TRAIN)', v.X).given('y', v.y);
    R.find(`ŵ = argmin_w J(w), J(w) = Σ(xᵢᵀw − yᵢ)²${o.Xnew ? '; then ŷ_new' : ''}`);
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'lrpredict', cat: 'linreg', name: 'Predict ŷ from a trained ŵ', short: 'Predict ŷ',
  kw: 'predict prediction test new sample y hat 예측 x_new',
  desc: 'ŷ = x_newᵀŵ for each new sample. If ŵ includes w₀ (bias), a 1 is automatically prepended to each new x.',
  inputs: [
    { k: 'w', type: 'vector', label: 'ŵ <span class="muted">(TRAIN 결과로 이미 구한 값)</span>', def: [-1.4375, 0.5625], group: 'm' },
    { k: 'Xnew', type: 'matrix', biasAware: true, label: 'X_new (raw) <span class="muted">(PREDICT 예측용 — 정답을 모르는 새 샘플, X와 열 개수 같게, 회색 1 열 = bias 자동·수정 불가)</span>', def: [[-1], [2]], group: 'm', colLabels: j => `x${j + 1}` },
    { k: 'bias', type: 'check', label: 'ŵ contains bias w₀ (prepend 1 to x_new)', def: true },
    { k: 'out', type: 'select', label: 'Output type', def: 'reg', options: [['reg', 'Regression value ŷ'], ['sign', 'Binary class = sign(ŷ)'], ['argmax', '— for multi-class use “Argmax class” tool —']] },
  ],
  solve(v, R) {
    const { w, Xnew } = v;
    const D = v.bias ? addBias(Xnew) : Xnew;
    if (D[0].length !== w.length) uerr(`Each new sample needs ${w.length} entries${v.bias ? ' (1 bias + ' + (w.length - 1) + ' features)' : ''}, but X_new gives ${D[0].length}. ${v.bias ? 'Untick bias if ŵ has no w₀.' : 'Tick bias if ŵ includes w₀.'}`);
    R.given('ŵ', w).given('X_new', Xnew);
    R.formula('ŷ_new = X_new ŵ   (row i: ŷᵢ = xᵢᵀŵ — xᵢ is a column vector, so we need xᵢᵀ)');
    R.step(v.bias ? 'X_new with 1s' : 'X_new', D);
    D.forEach((r, i) => R.step(`ŷ${sub(i + 1)}`, undefined, { note: r.map((x, j) => `(${fmtNum(x)})(${fmtNum(w[j])})`).join(' + ') + ' = <b>' + fmtNum(LA.dot(r, w)) + '</b>' }));
    const y = D.map(r => LA.dot(r, w));
    R.answer('ŷ_new', y);
    if (v.out === 'sign') R.answer('class = sign(ŷ)', y.map(s => (sgn(s) > 0 ? '+1' : '−1')).join(', '), { sub: 'score ≥ 0 → +1, score < 0 → −1' });
    R.code(`import numpy as np\nw = ${pyArr(w)}\nXnew = ${pyArr(Xnew)}\n${v.bias ? 'Xnew = np.hstack((np.ones((Xnew.shape[0], 1)), Xnew))\n' : ''}print(Xnew @ w)${v.out === 'sign' ? '\nprint(np.sign(Xnew @ w))' : ''}`);
  },
});

tool({
  id: 'lrloss', cat: 'linreg', name: 'Loss · Cost · Objective J(w) for a given w', short: 'Loss / J(w)',
  kw: 'loss function cost objective J(w) squared error residual empirical risk Mean Squared Error (MSE) sum of squares evaluate w 손실 목적함수 비용',
  desc: 'Loss (one sample): Lᵢ = (xᵢᵀw − yᵢ)². Cost / objective: J(w) = Σᵢ Lᵢ = (Xw − y)ᵀ(Xw − y). Mean form: (1/m)Σ. Ridge adds λwᵀw.',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]), YIN([-6, -6, -4, -1, 1, 4]), BIAS,
    { k: 'w', type: 'vector', label: 'w (the parameters to evaluate)', def: [-1.4375, 0.5625] },
    { k: 'lam', type: 'number', label: 'λ (0 = no ridge penalty)', def: '0' }],
  solve(v, R) {
    const dm = designMatrix(v.X, v.bias, R);
    const X = dm.X, y = v.y, w = v.w;
    if (X[0].length !== w.length) uerr(`w has ${w.length} entries but X${v.bias ? ' (with bias)' : ''} has ${X[0].length} columns.`);
    if (X.length !== y.length) uerr('X rows and y length differ');
    R.given('X', X).given('y', y).given('w', w);
    R.find('predictions, residuals, loss per sample, J(w), and the Mean Squared Error (MSE)');
    R.formula('eᵢ = xᵢᵀw − yᵢ,  Lᵢ = eᵢ²,  J(w) = Σ Lᵢ = eᵀe = (Xw − y)ᵀ(Xw − y)' + (v.lam ? ' + λwᵀw' : ''));
    const yh = X.map(r => LA.dot(r, w)), e = yh.map((t, i) => t - y[i]), L = e.map(t => t * t);
    R.table(['i', 'xᵢ', 'ŷᵢ = xᵢᵀw', 'yᵢ', 'eᵢ = ŷᵢ − yᵢ', 'Lᵢ = eᵢ²', 'over / under'], X.map((r, i) => [i + 1, '[' + r.map(t => fmtNum(t)).join(', ') + ']', yh[i], y[i], e[i], L[i], overUnder(e[i])]));
    const J = NUM.sum(L);
    R.step('Xw (predictions)', yh).step('e = Xw − y', e);
    errorTerms(R, e, { m: y.length, lam: v.lam || 0, wsq: LA.dot(w, w) });
    R.check('eᵀe (matrix form)', LA.dot(e, e));
    R.code(`import numpy as np\nX = ${pyArr(X)}\ny = ${pyArr(y)}\nw = ${pyArr(w)}\ne = X @ w - y\nJ = e @ e          # sum of squared errors\nprint(J, J / len(y))  # J and MSE${v.lam ? `\nprint(J + ${pyNum(v.lam)} * w @ w)   # ridge objective` : ''}`);
  },
});

tool({
  id: 'lrmulti', cat: 'linreg', name: 'Multiple-output regression Ŵ = (XᵀX)⁻¹XᵀY', short: 'Multi-output',
  kw: 'multiple outputs multi-output vector function W matrix Y matrix h outputs 다중출력',
  desc: 'X: m×(d+1), W: (d+1)×h, Y: m×h. Each column of Y is one output.',
  inputs: [XIN([[3], [4], [10], [6], [7]]), { k: 'Y', type: 'matrix', label: 'Y (m × h targets)', def: [[0, 5], [1.5, 4], [-3, 8], [-4, 10], [1, 6]], group: 'xy', link: 'X' }, BIAS, ...PRED([[2]])],
  solve(v, R) {
    const o = { Xraw: v.X, Y: v.Y, bias: v.bias, task: 'reg', Xnew: v.doPred ? v.Xnew : null };
    R.given('X', v.X).given('Y', v.Y);
    R.find('Ŵ and Ŷ_new');
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'normaleq', cat: 'linreg', name: 'Normal equation derivation (show steps)', short: 'Derivation',
  kw: 'derive derivation normal equation gradient set to zero proof 유도',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]), YIN([-6, -6, -4, -1, 1, 4]), BIAS],
  solve(v, R) {
    const X = designMatrix(v.X, v.bias, R).X, y = LA.col(v.y);
    R.formula('J(w) = (Xw − y)ᵀ(Xw − y) = wᵀXᵀXw − 2yᵀXw + yᵀy');
    R.text('∂J/∂w = 2XᵀXw − 2Xᵀy   (using d(xᵀAx)/dx = (A+Aᵀ)x and d(yᵀAx)/dx = Aᵀy)');
    R.text('Set ∂J/∂w = 0  ⇒  <b>XᵀX w = Xᵀy</b>  (normal equation)');
    R.text('If XᵀX is invertible  ⇒  <b>ŵ = (XᵀX)⁻¹Xᵀy</b>');
    R.step('XᵀX', LA.mul(LA.T(X), X)).step('Xᵀy', LA.mul(LA.T(X), y));
    const inv = LA.inv(LA.mul(LA.T(X), X));
    if (inv) R.answer('ŵ', LA.mul(inv, LA.mul(LA.T(X), y)).map(r => r[0]));
    else R.answer('ŵ', 'XᵀX singular → normal equation has infinitely many solutions');
  },
});

tool({
  id: 'mse', cat: 'linreg', name: 'Mean Squared Error (MSE) / Sum of Squared Errors (SSE) between y and ŷ', short: 'Mean Squared Error (MSE)',
  kw: 'mean squared error mse sse rmse accuracy test error sklearn mean_squared_error',
  inputs: [
    { k: 'y', type: 'vector', label: 'y (actual)', def: [3, -0.5, 2, 7], group: 'm' },
    { k: 'yh', type: 'vector', label: 'ŷ (predicted)', def: [2.5, 0, 2, 8], group: 'm', link: 'y' },
  ],
  solve(v, R) {
    if (v.y.length !== v.yh.length) uerr('Lengths differ');
    const e = v.yh.map((t, i) => t - v.y[i]);
    const sse = LA.dot(e, e);
    R.formula('Mean Squared Error (MSE) = (1/m) Σ (ŷᵢ − yᵢ)²');
    R.table(['i', 'yᵢ', 'ŷᵢ', 'eᵢ', 'eᵢ²'], v.y.map((t, i) => [i + 1, t, v.yh[i], e[i], e[i] ** 2]));
    errorTerms(R, e);
    R.code(`import numpy as np\nfrom sklearn.metrics import mean_squared_error\ny = ${pyArr(v.y)}\ny_hat = ${pyArr(v.yh)}\nprint(np.square(y - y_hat).mean())\nprint(mean_squared_error(y, y_hat))`);
  },
});

/* ---------------- CLASSIFICATION ---------------- */
tool({
  id: 'regvscls', cat: 'class', name: 'Regression or Classification? (from y)', short: 'Reg vs Class?',
  kw: 'regression classification continuous discrete label detect 판별 회귀 분류',
  inputs: [{ k: 'y', type: 'text', label: 'target values y', def: '-1, -1, -1, 1, 1, 1' }],
  solve(v, R) {
    const lab = parseLabels(v.y);
    const u = uniqSorted(lab);
    const nums = lab.every(x => !isNaN(parseFloat(x)) && isFinite(x));
    R.given('y', lab.join(', ')).given('distinct values', `{${u.join(', ')}} (${u.length})`);
    R.formula('continuous y → REGRESSION;  discrete label y → CLASSIFICATION');
    let verdict;
    if (!nums) verdict = u.length === 2 ? 'Binary CLASSIFICATION (named labels)' : `Multi-category CLASSIFICATION (${u.length} classes)`;
    else if (u.length === 2) verdict = `Binary CLASSIFICATION (labels {${u.join(', ')}}${u.join() === '-1,1' ? '' : ' → map to −1/+1'})`;
    else if (lab.every(x => Number.isInteger(+x)) && u.length <= Math.max(3, lab.length / 2)) verdict = `Probably CLASSIFICATION (${u.length} integer labels) — if they are counts/measurements it is regression`;
    else verdict = 'REGRESSION (continuous values)';
    R.answer('Task', verdict);
  },
});

tool({
  id: 'bintrain', cat: 'class', name: 'Binary classification: Train + Predict (sign)', short: 'Binary Train+Predict',
  kw: 'binary classification sign signum linear classifier class1 class2 0 1 -1 +1 이진분류',
  desc: 'Labels can be −1/+1, 0/1, or names (class1, class2 …). EE2211 maps them to ±1 (class1 → +1, 0 → −1), learns ŵ by least squares, then class = sign(xᵀŵ).',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]),
    { k: 'labels', type: 'text', label: 'labels y (one per row of X)', def: '-1, -1, -1, 1, 1, 1', group: 'lab' },
    { k: 'pos', type: 'text', label: 'which label is +1? (blank = auto)', def: '', ph: 'auto: 1 / first class', group: 'lab' },
    BIAS, { k: 'lam', type: 'number', label: 'λ ridge (0 = none)', def: '0' }, ...PRED([[-2]])],
  solve(v, R) {
    const lab = parseLabels(v.labels);
    if (lab.length !== v.X.length) uerr(`${lab.length} labels for ${v.X.length} samples`);
    const bm = binaryMap(lab, v.pos.trim());
    R.given('X', v.X).given('labels', lab.join(', '));
    R.given('label → numeric target', `${esc(bm.pos)} → +1,  ${esc(bm.neg)} → −1`, { note: 'y = ' + bm.y.map(t => (t > 0 ? '+1' : '−1')).join(', ') });
    R.find('ŵ, the scores x_newᵀŵ, and the classes sign(score)');
    const o = { Xraw: v.X, Y: LA.col(bm.y), bias: v.bias, lambda: v.lam, task: 'bin', binInfo: bm, Xnew: v.doPred ? v.Xnew : null };
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'signscore', cat: 'class', name: 'sign(score) → class', short: 'sign(score)',
  kw: 'sign signum score class threshold 부호',
  inputs: [{ k: 's', type: 'list', label: 'scores', def: '-0.1406, 0.4444, 0' }],
  solve(v, R) {
    R.formula('class = sign(score):  score ≥ 0 → +1,  score < 0 → −1', 'np.sign(0) returns 0 — EE2211 treats 0 as +1');
    R.table(['score', 'class'], v.s.map(s => [s, sgn(s) > 0 ? '+1' : '−1']));
    R.answer('classes', v.s.map(s => (sgn(s) > 0 ? '+1' : '−1')).join(', '));
  },
});

tool({
  id: 'onehot', cat: 'class', name: 'One-hot encoder / decoder', short: 'One-hot',
  kw: 'one hot encoding encoder class label vector ohe 원핫',
  desc: 'Class = the category/group a sample belongs to. One-hot: Class k → vector with 1 in position k, 0 elsewhere.',
  inputs: [
    { k: 'labels', type: 'text', label: 'class labels (one per sample)', def: '1, 2, 1, 3' },
    { k: 'classes', type: 'text', label: 'all classes in order (optional)', def: '', ph: 'auto (sorted)' },
  ],
  solve(v, R) {
    const lab = parseLabels(v.labels);
    const cls = v.classes.trim() ? parseLabels(v.classes) : uniqSorted(lab);
    const miss = lab.filter(l => !cls.includes(l));
    if (miss.length) uerr(`Labels not in class list: ${miss.join(', ')}`);
    const { Y } = oneHot(lab, cls);
    R.given('labels', lab.join(', ')).given('C (number of classes)', cls.length);
    R.table(['class', 'one-hot'], cls.map((c, k) => [clsName(esc(c)), '[' + cls.map((_, j) => (j === k ? 1 : 0)).join(', ') + ']']));
    R.answer('Y (one-hot, m × C)', Y, { colLabels: cls.map(c => clsName(c)) });
    R.code(`import numpy as np\nfrom sklearn.preprocessing import OneHotEncoder\ny_class = np.array(${JSON.stringify(lab.map(x => (isNaN(+x) ? x : +x)))}).reshape(-1, 1)\nenc = OneHotEncoder(sparse_output=False)\nY = enc.fit_transform(y_class)\nprint(Y)`);
  },
});

tool({
  id: 'multitrain', cat: 'class', name: 'Multi-class: Train + Predict (one-hot, argmax)', short: 'Multi-class Train+Predict',
  kw: 'multi class category classification one-hot argmax W matrix 다중분류 class 1 2 3',
  desc: 'Enter class labels (auto one-hot) — or tick to type the one-hot Y directly. Ŵ = (XᵀX)⁻¹XᵀY, then for each new sample: predicted class = column with the largest score.',
  inputs: [XIN([[1, 1], [-1, 1], [1, 3], [1, 0]]),
    { k: 'useY', type: 'check', label: 'I will type one-hot Y myself', def: false },
    { k: 'labels', type: 'text', label: 'class labels (one per row of X)', def: '1, 2, 1, 3', showIf: r => !r.useY },
    { k: 'Y', type: 'matrix', label: 'Y (one-hot)', def: [[1, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]], showIf: r => r.useY },
    BIAS, { k: 'lam', type: 'number', label: 'λ ridge (0 = none)', def: '0' }, ...PRED([[6, 8], [0, -1]])],
  solve(v, R) {
    let Y, classes;
    if (v.useY) { Y = v.Y; classes = Y[0].map((_, k) => String(k + 1)); }
    else { const lab = parseLabels(v.labels); if (lab.length !== v.X.length) uerr(`${lab.length} labels for ${v.X.length} samples`); ({ Y, classes } = oneHot(lab)); R.given('labels', lab.join(', ')); }
    R.given('X', v.X).given('Y (one-hot)', Y, { colLabels: classes.map(c => clsName(c)) });
    R.find('Ŵ (one score model per class) and predicted classes = argmax of scores');
    const o = { Xraw: v.X, Y, bias: v.bias, lambda: v.lam, task: 'multi', classes, Xnew: v.doPred ? v.Xnew : null };
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'argmaxclass', cat: 'class', name: 'Argmax class from a score matrix Ŷ', short: 'Argmax class',
  kw: 'argmax class scores largest column predicted class',
  inputs: [{ k: 'Y', type: 'matrix', label: 'Ŷ (rows = samples, columns = classes)', def: [[4, -2.5, -0.5], [-0.2587, 0.5, 0.7857]] }],
  solve(v, R) {
    R.formula('predicted class = arg max_k Ŷ(i, k)', 'for each ROW, the column position of the largest number');
    const rows = v.Y.map((r, i) => { const k = r.indexOf(Math.max(...r)); return [i + 1, r.map(x => fmtNum(x)).join(', '), fmtNum(r[k]), `column ${k + 1}`, `<b>Class ${k + 1}</b>`]; });
    R.table(['sample', 'scores', 'largest', 'position', 'class'], rows);
    R.answer('Predicted classes', v.Y.map(r => 'Class ' + (r.indexOf(Math.max(...r)) + 1)).join(', '));
    R.code(`import numpy as np\nY_hat = ${pyArr(v.Y)}\nprint(np.argmax(Y_hat, axis=1) + 1)`);
  },
});

/* ---------------- RIDGE ---------------- */
const PD_HINT = (what = 'X') => `<span class="pdbox"><b>Primal vs Dual — 언제?</b><br>m = 샘플 수 (${what}의 행), d = 파라미터 수 (${what}의 열 — bias 1 열${what === 'P' ? '·polynomial 항' : ''} 포함)<br><b>m &gt; d → Primal</b> ŵ = (${what}ᵀ${what} + λI)⁻¹${what}ᵀy, I는 d×d<br><b>m &lt; d → Dual</b> ŵ = ${what}ᵀ(${what}${what}ᵀ + λI)⁻¹y, I는 m×m<br>m = d → 둘 다 같은 답. λ &gt; 0이면 두 form은 항상 같은 답 — 더 작은 행렬을 역행렬하는 쪽을 고르는 것 (L6 p15–16${what === 'P' ? ', p22: m, d는 X가 아니라 P의 크기' : ''})<br>λ = 0이면 m &gt; d는 primal만, m &lt; d는 dual만 가능. <b>Auto</b>로 두면 알아서 골라줘</span>`;

const RIDGE_DEF = {
  L5: { X: [[-9], [-7], [-5], [1], [5], [9]], y: [-6, -6, -4, -1, 1, 4], Xn: [[-1]] },
  T5: { X: [[1, 0, 1], [2, -1, 1], [1, 1, 5]], y: [1, 2, 3], Xn: [[-1, 2, 8], [1, 5, -1]] },
};
function ridgeTool(id, name, short, mode, desc) {
  const D = mode === 'dual' ? RIDGE_DEF.T5 : RIDGE_DEF.L5;
  tool({
    id, cat: 'ridge', name, short, desc,
    kw: 'ridge regression regularization lambda penalty shrinkage primal dual l2 릿지 정규화 ' + mode,
    inputs: [XIN(D.X), YIN(D.y),
      BIAS,
      { k: 'lam', type: 'number', label: 'λ (lambda)', def: '0.1', hint: PD_HINT('X') },
      ...(mode === 'auto' ? [{ k: 'mode', type: 'select', label: 'Form', def: 'auto', options: [['auto', 'Auto (m > d → primal, m < d → dual)'], ['primal', 'Force primal'], ['dual', 'Force dual']] }] : []),
      ...PRED(D.Xn)],
    solve(v, R) {
      if (!(v.lam >= 0)) uerr('λ must be ≥ 0');
      const md = mode === 'auto' ? v.mode : mode;
      const o = { Xraw: v.X, Y: LA.col(v.y), bias: v.bias, lambda: v.lam, mode: md, task: 'reg', Xnew: v.doPred ? v.Xnew : null };
      R.given('X (raw, TRAIN)', v.X).given('y', v.y).given('λ', v.lam);
      R.find('ŵ minimising J(w) = (Xw − y)ᵀ(Xw − y) + λwᵀw');
      if (v.lam === 0) R.note('λ = 0 → ordinary least squares (no ridge).', 'warn', 'given');
      fitModel(o, R);
      R.note('Larger λ ⇒ more shrinkage ⇒ smaller ‖ŵ‖. (XᵀX + λI) is always invertible for λ > 0.', 'info', 'check');
      R.code(fitCode(o));
    },
  });
}
ridgeTool('ridgeauto', 'Ridge Train — Auto primal/dual (+ predict)', 'Ridge Auto', 'auto', 'm > d → primal ŵ = (XᵀX + λI)⁻¹Xᵀy (I is d×d);  m < d → dual ŵ = Xᵀ(XXᵀ + λI)⁻¹y (I is m×m). You never need to pick.');
ridgeTool('ridgeprimal', 'Ridge Primal form (XᵀX + λI)⁻¹Xᵀy', 'Ridge Primal', 'primal', 'Forced primal form. I is d×d (d = number of columns).');
ridgeTool('ridgedual', 'Ridge Dual form Xᵀ(XXᵀ + λI)⁻¹y', 'Ridge Dual', 'dual', 'Forced dual form. I is m×m (m = number of rows).');

tool({
  id: 'ridgeJ', cat: 'ridge', name: 'Ridge objective J(w) = error + λwᵀw', short: 'Ridge J(w)',
  kw: 'ridge objective cost penalty term error term evaluate',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]), YIN([-6, -6, -4, -1, 1, 4]), BIAS, { k: 'w', type: 'vector', label: 'w', def: [-1.4, 0.55] }, { k: 'lam', type: 'number', label: 'λ', def: '1' }],
  solve(v, R) { TOOL_BY_ID.lrloss.solve(v, R); },
});

tool({
  id: 'ridgepredict', cat: 'ridge', name: 'Ridge Predict ŷ = X_new ŵ', short: 'Ridge Predict',
  kw: 'ridge predict',
  inputs: TOOL_BY_ID.lrpredict.inputs,
  solve(v, R) { TOOL_BY_ID.lrpredict.solve(v, R); },
});

tool({
  id: 'lamcompare', cat: 'ridge', name: 'Compare several λ (shrinkage table)', short: 'Compare λ',
  kw: 'lambda compare shrinkage norm effect ridge multiple',
  inputs: [XIN([[-9], [-7], [-5], [1], [5], [9]]), YIN([-6, -6, -4, -1, 1, 4]), BIAS, { k: 'lams', type: 'list', label: 'λ values', def: '0, 0.1, 1, 10, 100' }],
  solve(v, R) {
    const X = designMatrix(v.X, v.bias, R).X, y = LA.col(v.y);
    const [m, d] = LA.shape(X);
    R.formula(m >= d ? 'ŵ(λ) = (XᵀX + λI)⁻¹Xᵀy' : 'ŵ(λ) = Xᵀ(XXᵀ + λI)⁻¹y');
    const rows = v.lams.map(l => {
      let w;
      if (m >= d) { const A = LA.add(LA.mul(LA.T(X), X), LA.scale(LA.eye(d), l)); const Ai = LA.inv(A); w = Ai ? LA.mul(Ai, LA.mul(LA.T(X), y)) : null; }
      else { const A = LA.add(LA.mul(X, LA.T(X)), LA.scale(LA.eye(m), l)); const Ai = LA.inv(A); w = Ai ? LA.mul(LA.T(X), LA.mul(Ai, y)) : null; }
      if (!w) return [l, 'singular', '', ''];
      const wf = w.map(r => r[0]);
      const e = LA.sub(LA.mul(X, w), y).flat();
      return [l, '[' + wf.map(t => fmtNum(t)).join(', ') + ']', LA.norm(wf), LA.dot(e, e)];
    });
    R.table(['λ', 'ŵ', '‖ŵ‖', 'training error Σeᵢ²'], rows, 'answer');
    R.note('As λ increases, ‖ŵ‖ decreases (shrinkage) and training error increases.', 'info', 'answer');
  },
});

/* ---------------- POLYNOMIAL ---------------- */
const ORDER = { k: 'order', type: 'select', label: 'Column order (only matters for ≥ 2 features)', def: 'sklearn', options: [['sklearn', 'sklearn PolynomialFeatures: 1, x1, x2, x1², x1x2, x2²'], ['lecture', 'Lecture slides: 1, x1, x2, x1x2, x1², x2²']] };

tool({
  id: 'polyexpand', cat: 'poly', name: 'Polynomial feature expansion → P', short: 'Build P',
  kw: 'polynomial feature expansion P matrix terms degree order PolynomialFeatures 다항 특징',
  inputs: [XIN([[0, 0], [1, 1], [1, 0], [0, 1]]), { k: 'deg', type: 'int', label: 'order / degree p', def: '2' }, ORDER],
  solve(v, R) {
    if (v.deg < 1 || v.deg > 12) uerr('degree must be 1..12');
    const { P, labels } = polyExpand(v.X, v.deg, v.order);
    const d = v.X[0].length;
    R.given('X', v.X).given('order p', v.deg);
    R.formula(`f(x) = ${labels.map((l, i) => (l === '1' ? 'w₀' : `w${sub(i)}·${l}`)).join(' + ')}`, `number of parameters = C(d + p, p) = C(${d} + ${v.deg}, ${v.deg}) = ${labels.length}`);
    R.answer(`P (${P.length}×${labels.length})`, P, { colLabels: labels });
    const st = sysType(P.length, labels.length);
    R.check('system with P', `${st.name} → ${st.key === 'wide' ? 'dual / right-inverse Pᵀ(PPᵀ)⁻¹y' : st.key === 'tall' ? 'primal / least squares (PᵀP)⁻¹Pᵀy' : 'P⁻¹y if invertible'}`);
    R.code(`import numpy as np\nfrom sklearn.preprocessing import PolynomialFeatures\nX = ${pyArr(v.X)}\npoly = PolynomialFeatures(${v.deg})\nP = poly.fit_transform(X)\nprint(poly.get_feature_names_out())\nprint(P)`);
  },
});

tool({
  id: 'polytrain', cat: 'poly', name: 'Polynomial regression: Train + Predict (auto primal/dual)', short: 'Poly Train+Predict',
  kw: 'polynomial regression train predict quadratic cubic order degree nonlinear curve fit 다항회귀',
  desc: 'X → P (same expansion for training and prediction). The form is chosen from the size of <b>P</b> (not X). λ = 0 → plain least squares / min-norm.',
  inputs: [XIN([[-10], [-8], [-3], [-1], [2], [8]]), YIN([5, 5, 4, 3, 2, 2]),
    { k: 'deg', type: 'int', label: 'order p', def: '3' }, { k: 'lam', type: 'number', label: 'λ ridge (0 = none)', def: '0' },
    { k: 'mode', type: 'select', label: 'Form', def: 'auto', options: [['auto', 'Auto from size of P'], ['primal', 'Primal'], ['dual', 'Dual']], hint: PD_HINT('P') }, ORDER, ...PRED([[9]])],
  solve(v, R) {
    const o = { Xraw: v.X, Y: LA.col(v.y), deg: v.deg, order: v.order, lambda: v.lam, mode: v.mode, task: 'reg', Xnew: v.doPred ? v.Xnew : null };
    R.given('X', v.X).given('y', v.y).given('order', v.deg);
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'polybin', cat: 'poly', name: 'Polynomial binary classification (sign)', short: 'Poly Binary',
  kw: 'polynomial binary classification sign nonlinear decision boundary Exclusive OR (XOR)',
  inputs: [XIN([[0, 0], [1, 1], [1, 0], [0, 1]]),
    { k: 'labels', type: 'text', label: 'labels', def: '-1, -1, 1, 1', group: 'lab' },
    { k: 'pos', type: 'text', label: '+1 label (blank = auto)', def: '', group: 'lab' },
    { k: 'deg', type: 'int', label: 'order p', def: '2' }, { k: 'lam', type: 'number', label: 'λ (0 = none)', def: '0' },
    { k: 'mode', type: 'select', label: 'Form', def: 'auto', options: [['auto', 'Auto'], ['primal', 'Primal'], ['dual', 'Dual']], hint: PD_HINT('P') }, ORDER,
    ...PRED([[0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]])],
  solve(v, R) {
    const lab = parseLabels(v.labels);
    if (lab.length !== v.X.length) uerr(`${lab.length} labels for ${v.X.length} samples`);
    const bm = binaryMap(lab, v.pos.trim());
    R.given('X', v.X).given('labels → ±1', `${esc(bm.pos)} → +1, ${esc(bm.neg)} → −1`);
    const o = { Xraw: v.X, Y: LA.col(bm.y), deg: v.deg, order: v.order, lambda: v.lam, mode: v.mode, task: 'bin', binInfo: bm, Xnew: v.doPred ? v.Xnew : null };
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'polymulti', cat: 'poly', name: 'Polynomial multi-class classification (argmax)', short: 'Poly Multi-class',
  kw: 'polynomial multi class one-hot argmax',
  inputs: [XIN([[-1], [0], [0.5], [0.3], [0.8]]),
    { k: 'labels', type: 'text', label: 'class labels', def: '1, 1, 2, 3, 2' },
    { k: 'deg', type: 'int', label: 'order p', def: '5' }, { k: 'lam', type: 'number', label: 'λ (0 = none)', def: '0' },
    { k: 'mode', type: 'select', label: 'Form', def: 'auto', options: [['auto', 'Auto'], ['primal', 'Primal'], ['dual', 'Dual']], hint: PD_HINT('P') }, ORDER,
    ...PRED([[-0.1], [0.4]])],
  solve(v, R) {
    const lab = parseLabels(v.labels);
    if (lab.length !== v.X.length) uerr(`${lab.length} labels for ${v.X.length} samples`);
    const { Y, classes } = oneHot(lab);
    R.given('X', v.X).given('Y (one-hot)', Y, { colLabels: classes.map(c => clsName(c)) });
    const o = { Xraw: v.X, Y, deg: v.deg, order: v.order, lambda: v.lam, mode: v.mode, task: 'multi', classes, Xnew: v.doPred ? v.Xnew : null };
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'polycount', cat: 'poly', name: 'How many parameters? system type? — True / False (T/F) helper', short: 'Number of parameters / system type',
  kw: 'number of parameters terms count polynomial order under-determined over-determined true false W dimension concept quiz',
  desc: 'For a full polynomial of order p in d input features: #parameters = C(d + p, p) (includes bias w₀).',
  inputs: [
    { k: 'd', type: 'int', label: 'd = number of input features', def: '2', group: 'a' },
    { k: 'p', type: 'int', label: 'p = polynomial order (1 = linear)', def: '3', group: 'a' },
    { k: 'm', type: 'int', label: 'm = number of samples', def: '3', group: 'a' },
    { k: 'h', type: 'int', label: 'h = number of outputs / classes', def: '1', group: 'a' },
  ],
  solve(v, R) {
    const { d, p, m, h: hh } = v;
    const n = NUM.comb(d + p, p);
    const terms = polyTerms(d, p).map(t => termLabel(t, featNames(d)));
    R.given('d, p, m, h', `${d}, ${p}, ${m}, ${hh}`);
    R.formula('number of parameters = C(d + p, p) = (d + p)! / (d! p!)', 'linear model with bias: d + 1');
    R.answer('Number of parameters (incl. bias)', n, { sub: terms.length <= 40 ? 'terms: ' + terms.join(', ') : '' });
    const st = sysType(m, n);
    R.answer('P is', `${m} × ${n} → <b>${st.name}</b>`, { sub: st.key === 'wide' ? 'infinitely many solutions → dual / right inverse (constrained); primal ridge needs λ > 0' : st.key === 'tall' ? 'no exact solution in general → least squares (primal)' : 'square → P⁻¹ if invertible' });
    R.answer('W dimension', `${n} × ${hh}`, { sub: `X: ${m}×${n}, Y: ${m}×${hh}` });
    R.check('ridge primal I size', `${n}×${n}`).check('ridge dual I size', `${m}×${m}`);
  },
});
