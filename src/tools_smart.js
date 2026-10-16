'use strict';
/* =====================================================================
   tools_smart.js — Smart Solve (auto-detect task) + question router
   ===================================================================== */

tool({
  id: 'smart', cat: 'smart', name: 'Smart Solve — give X (+ target) and it figures out the rest', short: 'Smart Solve',
  kw: 'auto automatic detect smart solve everything 자동 판별 regression classification ridge polynomial system',
  desc: 'Enter the training inputs and targets. The solver detects: regression vs binary vs multi-class, bias, polynomial expansion, ridge, primal vs dual, and whether an inverse or pseudoinverse is needed. Then it trains (and predicts if X_new is given).',
  inputs: [
    { k: 'X', type: 'matrix', biasAware: true, label: 'X (raw) <span class="muted">(TRAIN 학습용 — 정답 y를 아는 샘플, 한 행 = 한 샘플, 회색 1 열 = bias 자동·수정 불가)</span>', def: [[1, 1], [-1, 1], [1, 3], [1, 0]], group: 'xy', colLabels: j => `x${j + 1}` },
    { k: 'tt', type: 'select', label: 'Target is…', def: 'labels', options: [['y', 'numbers y (one per sample)'], ['labels', 'class labels (text list)'], ['Y', 'matrix Y (multi-output or one-hot)'], ['none', 'nothing — just analyse the matrix X']] },
    { k: 'y', type: 'vector', label: 'y', def: [1, 0, 2, -1], group: 'xy', link: 'X', showIf: r => r.tt === 'y' },
    { k: 'labels', type: 'text', label: 'labels', def: '1, 2, 1, 3', showIf: r => r.tt === 'labels' },
    { k: 'Y', type: 'matrix', label: 'Y', def: [[1, 0], [0, 1], [2, -1], [-1, 3]], group: 'xy', link: 'X', showIf: r => r.tt === 'Y' },
    { k: 'task', type: 'select', label: 'Task', def: 'auto', options: [['auto', 'auto-detect'], ['reg', 'regression'], ['bin', 'binary classification'], ['multi', 'multi-class classification']], showIf: r => r.tt !== 'none' },
    { k: 'bias', type: 'check', label: 'add bias (w₀). Untick for a pure system of equations Xw = y', def: true, showIf: r => r.tt !== 'none' },
    { k: 'deg', type: 'int', label: 'polynomial order (1 = linear)', def: '1', group: 'o', showIf: r => r.tt !== 'none' },
    { k: 'lam', type: 'number', label: 'ridge λ (0 = none)', def: '0', group: 'o', showIf: r => r.tt !== 'none' },
    { k: 'doPred', type: 'check', label: 'PREDICT (예측) — 새 샘플 X_new의 ŷ 계산', def: true, showIf: r => r.tt !== 'none' },
    { k: 'Xnew', type: 'matrix', biasAware: true, label: 'X_new (raw) <span class="muted">(PREDICT 예측용 — 정답을 모르는 새 샘플, X와 열 개수 같게, 회색 1 열 = bias 자동·수정 불가)</span>', def: [[6, 8], [0, -1]], showIf: r => r.tt !== 'none' && r.doPred, colLabels: j => `x${j + 1}` },
  ],
  solve(v, R) {
    if (v.tt === 'none') { R.detect('No target → matrix analysis'); TOOL_BY_ID.report.solve({ A: v.X }, R); return; }
    let task = v.task, Y, binInfo, classes;
    const det = [];
    if (v.tt === 'y') {
      if (v.y.length !== v.X.length) uerr(`X has ${v.X.length} rows but y has ${v.y.length} values`);
      const u = uniqSorted(v.y.map(String));
      if (task === 'auto') {
        task = u.length === 2 && (u.join() === '-1,1' || u.join() === '0,1') ? 'bin' : 'reg';
        det.push(task === 'bin' ? `y takes only the values {${u.join(', ')}} → <b>binary classification</b> (choose Task = regression to override)` : 'y is continuous / many values → <b>regression</b>');
      }
      if (task === 'bin') { binInfo = binaryMap(v.y.map(String)); Y = LA.col(binInfo.y); }
      else if (task === 'multi') { ({ Y, classes } = oneHot(v.y.map(String))); }
      else Y = LA.col(v.y);
    } else if (v.tt === 'labels') {
      const lab = parseLabels(v.labels);
      if (lab.length !== v.X.length) uerr(`${lab.length} labels for ${v.X.length} samples`);
      const u = uniqSorted(lab);
      if (task === 'auto') { task = u.length === 2 ? 'bin' : 'multi'; det.push(`${u.length} distinct labels {${u.join(', ')}} → <b>${task === 'bin' ? 'binary' : 'multi-category'} classification</b>`); }
      if (task === 'bin') { binInfo = binaryMap(lab); Y = LA.col(binInfo.y); }
      else if (task === 'multi') ({ Y, classes } = oneHot(lab));
      else Y = LA.col(lab.map(Number));
    } else {
      Y = v.Y;
      const oh = Y.every(r => r.every(t => t === 0 || t === 1) && NUM.sum(r) === 1);
      if (task === 'auto') { task = oh ? 'multi' : 'reg'; det.push(oh ? 'every row of Y is one-hot → <b>multi-category classification</b>' : `Y has ${Y[0].length} columns → <b>multi-output regression</b>`); }
      if (task === 'multi') classes = Y[0].map((_, k) => String(k + 1));
    }
    if (v.deg > 1) det.push(`order ${v.deg} → <b>polynomial</b> features P`);
    if (v.lam > 0) det.push(`λ = ${fmtNum(v.lam)} → <b>ridge</b> (primal/dual picked from the size of ${v.deg > 1 ? 'P' : 'X'})`);
    det.push(v.bias || v.deg > 1 ? 'bias/intercept included (column of 1s)' : 'no bias (pure linear system)');
    R.detect(det.join('<br>'));
    R.given('X', v.X);
    if (binInfo) R.given('labels → ±1', `${esc(binInfo.pos)} → +1, ${esc(binInfo.neg)} → −1`);
    if (task === 'multi') R.given('Y (one-hot)', Y, { colLabels: classes.map(c => clsName(c)) });
    else if (task === 'reg') R.given(Y[0].length > 1 ? 'Y' : 'y', Y[0].length > 1 ? Y : Y.map(r => r[0]));
    const o = { Xraw: v.X, Y, bias: v.bias, deg: v.deg > 1 ? v.deg : 0, order: 'sklearn', lambda: v.lam, mode: 'auto', task, binInfo, classes, Xnew: v.doPred ? v.Xnew : null };
    fitModel(o, R);
    R.code(fitCode(o));
  },
});

tool({
  id: 'router', cat: 'smart', name: 'Which solver? — paste the question text', short: 'Find solver',
  kw: 'question paste text which tool find router search recommend 문제 붙여넣기',
  desc: 'Paste (or type key words of) the exam question. The most relevant solvers are listed — click to open.',
  inputs: [{ k: 'q', type: 'textarea', label: 'question text', def: 'Given Xw = y where X = [1 2; 2 4; 1 -1] and y = [0; 0.1; 1]. What kind of system is this? Is X invertible? Solve for w.', rows: 5, wide: true }],
  solve(v, R) {
    const q = String(v.q).toLowerCase();
    const words = q.split(/[^a-z0-9가-힣⁻¹ᵀ†]+/).filter(w => w.length > 2);
    const boosts = [
      [/pmf|mass function|pr\[x/, 'pmf', 6], [/pdf|density/, 'pdf'], [/bayes|posterior|given that/, 'bayes'], [/gaussian|normal distribution/, 'gauss'],
      [/dice|die\b|toss/, 'dice'], [/cards?|deck|queen|without replacement/, 'draws'], [/urn/, 'indep'], [/simpson/, 'simpson'],
      [/correlat|pearson/, 'pearson'], [/mean|median|mode|variance|standard deviation/, 'descstats'], [/nominal|ordinal|interval|ratio|noir|type of data/, 'noir'],
      [/ridge|lambda|λ|regulari/, 'ridgeauto', 6], [/polynomial|(2nd|3rd|\d+th|second|third).?order|quadratic|cubic/, 'polytrain', 6], [/one.?hot|multi.?(class|category)|argmax/, 'multitrain'],
      [/sign|binary|class ?1|class ?2|classif/, 'bintrain'], [/regression|least square|fit a line|intercept|bias|offset/, 'lrtrain', 2], [/predict|test/, 'lrtrain', 1],
      [/xw ?= ?y|system|even.?determined|over.?determined|under.?determined|solve for w/, 'solve'], [/invertible|inverse/, 'invcheck'], [/left inverse|right inverse|pseudo|dagger|†/, 'pinv'],
      [/determinant|det\(/, 'det'], [/cofactor/, 'cofactor'], [/adjugate|adjoint/, 'adj'], [/minor/, 'minor'], [/rank/, 'rank'], [/linearly (in)?dependent/, 'linindep'],
      [/derivative|differentiat/, 'deriv'], [/gradient|∇/, 'grad'], [/jacobian/, 'jacobian'], [/minimum|maximum|minimi|maximi|argmin|argmax|extrem/, 'minmax1d'],
      [/linear function|affine/, 'linaff'], [/loss|cost|objective|j\(w\)/, 'lrloss'], [/mse|mean squared/, 'mse'], [/multiple outputs|multi.?output/, 'lrmulti'],
      [/parameters to learn|how many parameters/, 'polycount'], [/nearest neighbo/, 'nn'], [/supervised|unsupervised|reinforcement|inductive|deductive|causal/, 'facts'],
      [/csv|read_csv|pandas|plot/, 'code_csv'], [/python|code|function|def /, 'code_builder'], [/normaliz|z-score|min-max|missing/, 'normalize'],
    ];
    const score = {};
    TOOLS.filter(t => !t.alias).forEach(t => {
      const hay = (t.name + ' ' + (t.kw || '') + ' ' + (t.desc || '')).toLowerCase();
      score[t.id] = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0) * 0.2;
    });
    boosts.forEach(([re, id, wt]) => { if (re.test(q) && score[id] != null) score[id] += wt || 3; });
    const top = Object.entries(score).filter(([, s]) => s > 0.5).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!top.length) { R.answer('No match', 'Try key words like: inverse, rank, regression, ridge, pmf, bayes…'); return; }
    R.answer('Suggested solvers', { html: top.map(([id]) => `<a class="chip big" href="#${id}">${esc(TOOL_BY_ID[id].name)}</a>`).join('') });
  },
});
