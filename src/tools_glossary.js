'use strict';
/* =====================================================================
   tools_glossary.js — every exam wording → meaning → formula → solver.
   Each entry's wording is also appended to the listed solvers' search
   keywords, so the sidebar search finds the right solver by wording.
   ===================================================================== */

/* [wording (all names it goes by), 한국어 뜻, formula, solver ids] */
const GLOSSARY = [
  // ---- loss / error ----
  ['Squared error loss · Sum of Squared Errors (SSE) · Residual Sum of Squares (RSS) · sum of squared residuals', '오차 제곱의 합. 데이터 전체에 대해 물으면 m 으로 나누지 않음 (Lecture 5 slide 17) — 오차제곱합, 잔차제곱합, 제곱오차 손실', 'Σ (ŷᵢ − yᵢ)² = eᵀe', ['lrtrain', 'lrloss', 'mse', 'polytrain', 'ridgeauto']],
  ['Loss function · loss of one sample · penalty for one example', '샘플 하나의 오차 제곱 (Lecture 5 slide 16) — 손실함수', 'Lᵢ = (f(xᵢ) − yᵢ)²', ['lrloss', 'lrtrain']],
  ['Cost function · objective function · objective · J(w) · training objective', '최소화하는 전체 식. 강의 정의 두 가지: slide 17 = 오차 제곱의 합 (기본), slide 16 = (1/m) 붙인 평균 → 문제 식에 1/m 있는지 확인. ridge 면 + λwᵀw — 비용함수, 목적함수', 'J(w) = (Xw − y)ᵀ(Xw − y) (+ λwᵀw)', ['lrloss', 'ridgeJ', 'lrtrain', 'normaleq']],
  ['Mean Squared Error (MSE) · mean of squared error · average squared error · average loss · empirical risk', '오차 제곱의 평균 = SSE ÷ m. average loss 는 loss 가 squared error 일 때, empirical risk 는 학습 데이터에서 계산할 때만 MSE 와 같음 (Lecture 5 slide 18) — 평균제곱오차, 평균 손실, 경험적 위험', '(1/m) Σ (ŷᵢ − yᵢ)²', ['lrtrain', 'mse', 'lrloss', 'polytrain', 'code_split']],
  ['Root Mean Squared Error (RMSE)', 'Mean Squared Error (MSE) 의 제곱근 — 평균제곱근오차', '√MSE', ['mse', 'lrtrain']],
  ['Mean Absolute Error (MAE)', '오차 절댓값의 평균 (강의에는 없음) — 평균절대오차', '(1/m) Σ |ŷᵢ − yᵢ|', ['mse', 'lrtrain']],
  ['Residual · error · prediction error · eᵢ', '예측값 − 실제값 (또는 반대 부호) — 잔차, 오차', 'eᵢ = ŷᵢ − yᵢ', ['lrloss', 'lrtrain', 'mse']],
  ['Training error · test error', '학습 데이터 / 테스트 데이터에서 계산한 Mean Squared Error (MSE) 또는 오차 합 — 학습 오차, 테스트 오차', 'MSE on train / test set', ['code_split', 'lrtrain', 'mse']],
  // ---- regression ----
  ['Least squares · least squares solution · normal equation · ordinary least squares', '오차 제곱 합을 최소로 하는 w — 최소제곱법, 정규방정식', 'XᵀXw = Xᵀy ⇒ ŵ = (XᵀX)⁻¹Xᵀy', ['lrtrain', 'normaleq', 'solve']],
  ['Learned parameters · weights · coefficients · ŵ · w hat · estimated model', '학습된 파라미터 — 가중치, 계수, 파라미터', 'ŵ = (XᵀX)⁻¹Xᵀy', ['lrtrain', 'polytrain', 'ridgeauto']],
  ['Bias · intercept · offset · w₀ · constant term', '절편. X 앞에 1 열을 붙여서 학습 — 편향, 절편', 'x = [1, x₁, …, x_d]', ['lrtrain', 'polytrain']],
  ['Prediction · predicted output · ŷ · y hat · estimate y for a new x · testing', '새 입력으로 계산한 출력 — 예측값', 'ŷ_new = X_new ŵ', ['lrtrain', 'lrpredict', 'polytrain', 'ridgepredict']],
  ['Design matrix · data matrix · feature matrix X', '행 = 샘플, 열 = 특징 (bias 열 포함) — 설계행렬, 데이터 행렬', 'X ∈ ℝ^(m×d)', ['lrtrain', 'polyexpand']],
  ['Multiple outputs · multi-output regression · parameter matrix W', '출력이 여러 개 → Y 와 W 가 행렬 — 다중 출력', 'Ŵ = (XᵀX)⁻¹XᵀY', ['lrmulti']],
  ['Ridge regression · regularization · penalty term · λ · lambda · shrinkage · L2 regularization', '오차 제곱 합 + λ wᵀw 를 최소화 — 릿지 회귀, 정규화, 규제', 'J = (Xw − y)ᵀ(Xw − y) + λwᵀw', ['ridgeauto', 'ridgeJ', 'lamcompare']],
  ['Primal form · dual form (ridge)', 'm > d → primal (XᵀX + λI)⁻¹Xᵀy, m < d → dual Xᵀ(XXᵀ + λI)⁻¹y — 원형, 쌍대형', 'I 크기: primal d×d, dual m×m', ['ridgeauto', 'ridgeprimal', 'ridgedual']],
  ['Polynomial regression · polynomial features · order · degree · number of parameters', '입력을 1, x, x², x₁x₂ … 로 확장한 뒤 선형회귀 — 다항 회귀, 파라미터 개수', 'parameters = C(d + p, p)', ['polytrain', 'polyexpand', 'polycount']],
  // ---- linear systems ----
  ['Over-determined system · tall · more equations than unknowns (m > d)', '방정식이 더 많음 → 보통 정확한 해 없음 → least squares, left inverse — 과결정 시스템', 'ŵ = (XᵀX)⁻¹Xᵀy', ['solve', 'soltype', 'smart']],
  ['Under-determined system · wide · fewer equations than unknowns (m < d)', '미지수가 더 많음 → 해가 무수히 많음 → right inverse (최소 norm 해) — 부족결정 시스템, 미결정', 'ŵ = Xᵀ(XXᵀ)⁻¹y', ['solve', 'soltype', 'smart']],
  ['Even-determined system · square (m = d)', '정방행렬 → 역행렬로 유일한 해 — 정방 시스템', 'ŵ = X⁻¹y', ['solve', 'soltype']],
  ['Left inverse · right inverse · pseudo-inverse · pseudoinverse · Moore–Penrose', '정방이 아닌 행렬의 역행렬 대용 — 좌역행렬, 우역행렬, 유사역행렬', 'left (XᵀX)⁻¹Xᵀ, right Xᵀ(XXᵀ)⁻¹', ['pinv', 'invcheck', 'solve']],
  ['Unique solution · infinitely many solutions · no solution · consistent · inconsistent', 'rank(X) 와 rank([X, y]) 비교 — 유일해, 해가 무수히 많음, 해 없음', 'rank(X) = rank([X|y]) ⇒ 해 있음', ['soltype', 'eqsystem']],
  ['Simultaneous equations · system of linear equations', '연립방정식 — 연립방정식', 'Xw = y', ['eqsystem', 'solve']],
  // ---- matrix ----
  ['Determinant · det(A) · |A|', '행렬식. 0 이면 역행렬 없음 (singular) — 행렬식', 'ad − bc (2×2)', ['det', 'report']],
  ['Inverse · A⁻¹ · invertible · non-singular · singular', '역행렬. det ≠ 0 일 때만 존재 — 역행렬, 가역, 특이행렬', 'A⁻¹ = adj(A) / det(A)', ['inverse', 'invcheck']],
  ['Rank · full rank · rank deficient', '선형독립인 행/열의 최대 개수 — 랭크, 계수', 'rank(X)', ['rank', 'report']],
  ['Linear independence · linearly dependent · linearly independent', '어떤 벡터도 나머지의 조합으로 못 만듦 — 선형독립, 선형종속', 'β₁a + β₂b = 0 ⇒ β = 0', ['linindep']],
  ['Transpose · Aᵀ', '행과 열을 바꿈 — 전치행렬', '(Aᵀ)ᵢⱼ = Aⱼᵢ', ['transpose']],
  ['Minor · cofactor · adjugate · adjoint', '여인수 전개 / 수반행렬 — 소행렬식, 여인수, 수반행렬', 'Cᵢⱼ = (−1)^(i+j) Mᵢⱼ, adj(A) = Cᵀ', ['minor', 'cofactor', 'adj']],
  ['Inner product · dot product · norm · length of a vector', '내적과 길이 — 내적, 노름, 벡터 길이', 'xᵀy, ‖x‖ = √(xᵀx)', ['vecops']],
  ['Matrix multiplication · matrix-vector product', '행렬 곱 — 행렬곱', '(AB)ᵢⱼ = Σₖ Aᵢₖ Bₖⱼ', ['matops', 'matvec', 'matcalc']],
  // ---- calculus ----
  ['Derivative · differentiate · slope · rate of change', '미분 — 미분, 도함수, 기울기', 'df/dx', ['deriv']],
  ['Partial derivative', '한 변수로만 미분 (나머지는 상수) — 편미분', '∂f/∂xᵢ', ['partial']],
  ['Gradient · ∇f · gradient vector', '편미분들을 모은 열벡터 (d×1) — 그래디언트, 기울기 벡터', '∇f = [∂f/∂x₁, …, ∂f/∂x_d]ᵀ', ['grad']],
  ['Jacobian', '벡터함수의 미분 행렬 (h×d) — 야코비안', 'Jᵢⱼ = ∂fᵢ/∂xⱼ', ['jacobian']],
  ['Hessian · second derivative · convex', '2차 편미분 행렬 — 헤시안, 볼록', 'Hᵢⱼ = ∂²f/∂xᵢ∂xⱼ', ['hessian']],
  ['Minimum · maximum · local · global · argmin · argmax · stationary point', 'min/max 는 함수 값, argmin/argmax 는 그때의 x — 최솟값, 최댓값, 극값, 정류점', 'f′(x) = 0', ['minmax1d', 'setmax', 'stationary']],
  ['Linear function · affine function', 'linear: f(x) = aᵀx, affine: f(x) = aᵀx + b — 선형함수, 아핀함수', 'b ≠ 0 이면 linear 아님', ['linaff']],
  // ---- classification ----
  ['Binary classification · sign · class label ±1', '선형회귀 점수의 부호로 분류 — 이진분류', 'class = sign(x_newᵀŵ)', ['bintrain', 'signscore']],
  ['Multi-class classification · one-hot encoding · argmax', '클래스마다 열 하나, 점수가 가장 큰 열 — 다중분류, 원핫 인코딩', 'class = argmax(x_newᵀŴ)', ['multitrain', 'onehot', 'argmaxclass']],
  ['Accuracy · classification accuracy · misclassification rate · error rate', '맞힌 비율 / 틀린 비율 — 정확도, 오분류율', 'accuracy = correct / m', ['bintrain', 'multitrain', 'polybin', 'polymulti']],
  // ---- statistics ----
  ['Mean · average · arithmetic mean · sample mean · x̄', '평균 = 합 / 개수 — 평균', 'Σx / n', ['descstats']],
  ['Median · mode · range', '가운데 값 · 가장 많이 나온 값 · 최댓값 − 최솟값 — 중앙값, 최빈값, 범위', '', ['descstats']],
  ['Variance · population variance · σ² · Var(X)', '분산. Lecture 3 정의는 n 으로 나눔 (np.var) — 분산, 모분산', 'E[(X − μ)²] = Σ(x − x̄)² / n', ['descstats', 'pmf', 'pdf']],
  ['Sample variance · unbiased variance · s² · ddof=1', 'n − 1 로 나눈 분산 (pandas 기본값) — 표본분산', 'Σ(x − x̄)² / (n − 1)', ['descstats']],
  ['Standard deviation · std · σ · s', '분산의 제곱근 — 표준편차', '√variance', ['descstats', 'pmf', 'gauss']],
  ['Quartile · first quartile (Q1) · third quartile (Q3) · Interquartile Range (IQR) · boxplot · five-number summary', '사분위수 — 사분위수, 사분위범위, 상자그림', 'IQR = Q3 − Q1', ['descstats']],
  ['Pearson correlation coefficient · r · correlation · covariance', '두 변수의 선형 관계 세기 (−1 ~ 1) — 상관계수, 공분산', 'r = Σ(x−x̄)(y−ȳ) / √(Σ(x−x̄)² Σ(y−ȳ)²)', ['pearson', 'corrfeat']],
  ['Correlation versus causation · confounder', '상관관계 ≠ 인과관계 — 상관관계, 인과관계', '', ['facts']],
  ["Simpson's paradox", '그룹별 경향이 합치면 뒤집힘 — 심슨의 역설', '', ['simpson']],
  ['Normalization · min-max scaling · z-score · standardization', '스케일 맞추기 — 정규화, 표준화', '(x − min)/(max − min), (x − μ)/σ', ['normalize']],
  ['Missing data · imputation · Not Available (NA) · Not a Number (NaN)', '빈 값 처리 (행 삭제 / 평균으로 채우기) — 결측치, 결측값', '', ['normalize', 'code_missing']],
  ['Nominal · Ordinal · Interval · Ratio (NOIR) · level of measurement · data type', '데이터 척도 — 명목, 서열, 등간, 비율 척도', '', ['noir']],
  // ---- probability ----
  ['Probability Mass Function (PMF) · discrete random variable', '이산 확률변수의 확률표 (합 = 1) — 확률질량함수, 이산확률변수', 'Σ Pr(X = x) = 1', ['pmf', 'dice']],
  ['Probability Density Function (PDF) · continuous random variable · area under the curve', '연속 확률변수의 밀도 (넓이 = 1) — 확률밀도함수, 연속확률변수', '∫ f(x) dx = 1', ['pdf']],
  ['Cumulative Distribution Function (CDF)', 'x 이하일 확률 — 누적분포함수', 'F(x) = Pr(X ≤ x)', ['gauss', 'pmf']],
  ['Expected value · expectation · mean of a random variable · μ · E[X]', '기댓값 — 기댓값, 기대값', 'Σ x Pr(x)  /  ∫ x f(x) dx', ['pmf', 'pdf']],
  ['Gaussian · normal distribution · bell curve', '정규분포 — 정규분포, 가우시안', 'Pr(a < X ≤ b) = F(b) − F(a)', ['gauss']],
  ["Bayes' rule · posterior · prior · likelihood · evidence", '원인의 확률을 거꾸로 구함 — 베이즈 정리, 사후확률, 사전확률, 우도', 'Pr(B|A) = Pr(A|B)Pr(B) / Pr(A)', ['bayes', 'bayesmulti']],
  ['Conditional probability · Pr(A|B) · given', 'B 가 일어났을 때 A 의 확률 — 조건부확률', 'Pr(A ∩ B) / Pr(B)', ['probrules', 'bayes', 'joint']],
  ['Joint probability · marginal probability · sum rule · product rule', '결합 / 주변 확률 — 결합확률, 주변확률, 합의 법칙, 곱의 법칙', 'Pr(x) = Σ_y Pr(x, y),  Pr(x, y) = Pr(y|x)Pr(x)', ['joint']],
  ['Independent events · mutually exclusive · disjoint · union · intersection', '독립: Pr(A∩B) = Pr(A)Pr(B), 배반: Pr(A∩B) = 0 — 독립사건, 배반사건, 합집합, 교집합', 'Pr(A∪B) = Pr(A) + Pr(B) − Pr(A∩B)', ['probrules', 'indep']],
  ['Counting outcomes · dice · cards · with / without replacement · binomial · hypergeometric', '경우의 수로 확률 계산 — 경우의 수, 주사위, 카드, 복원추출, 비복원추출', '', ['dice', 'draws', 'indep']],
  // ---- machine learning concepts ----
  ['Supervised · unsupervised · reinforcement learning · classification · regression · clustering', '학습 종류 — 지도학습, 비지도학습, 강화학습', '', ['facts', 'regvscls']],
  ['Inductive · deductive reasoning', '귀납 (데이터 → 규칙, ML) / 연역 (규칙 → 결론) — 귀납, 연역', '', ['facts']],
  ['Task · Performance · Experience (T, P, E) · machine learning definition', 'Tom Mitchell 의 정의 — 머신러닝 정의', '', ['facts']],
  ['Nearest neighbour classifier', '가장 가까운 학습 샘플의 클래스 — 최근접 이웃', '', ['nn']],
];

// make every wording searchable from the sidebar: append to the listed solvers' keywords
for (const g of GLOSSARY) g[3] = [...new Set(g[3].map(id => (TOOL_BY_ID[id] && TOOL_BY_ID[id].alias) || id))]; // merged solvers
for (const [w, ko, , ids] of GLOSSARY)
  for (const id of ids) if (TOOL_BY_ID[id]) TOOL_BY_ID[id].kw = (TOOL_BY_ID[id].kw || '') + ' ' + w.replace(/·/g, ' ') + ' ' + ko;

function glossarySlides(term) {
  Store.set('tool:slides', { q: term, scope: 'all' });
  location.hash = 'slides';
}

tool({
  id: 'glossary', cat: 'slides', name: 'Glossary — exam wording → meaning → formula → solver (용어 사전)', short: 'Glossary 용어 사전',
  kw: 'glossary terms definition wording meaning 용어 사전 뜻 개념 ' + GLOSSARY.map(g => g[0].replace(/·/g, ' ') + ' ' + g[1]).join(' '),
  live: true, solveLabel: 'Filter',
  desc: '문제에 나온 단어를 입력하면 <b>뜻 · 공식 · 어느 solver 를 쓰는지</b> 를 보여줍니다. 오른쪽 버튼으로 해당 solver 나 강의 슬라이드로 바로 이동. 비우면 전체 목록.',
  inputs: [{ k: 'q', type: 'text', label: '문제에 나온 단어 (word from the question)', def: '', ph: 'for example: squared error loss, empirical risk, variance, posterior, rank', wide: true }],
  solve(v, R) {
    const terms = String(v.q || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
    const hits = GLOSSARY.filter(g => terms.every(t => (g[0] + ' ' + g[1] + ' ' + g[2]).toLowerCase().includes(t)));
    if (!hits.length) { R.raw(`<div class="note warn big">“${esc(v.q)}” 이(가) 용어 사전에 없어요. <b>Slide Finder</b> 에서 강의 슬라이드를 검색해 보세요.</div>`); return; }
    const mark = s => { let x = esc(s); for (const t of terms) x = x.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); return x; };
    R.raw(`<div class="slnote"><b>${hits.length}</b> term${hits.length > 1 ? 's' : ''}</div><div class="gloss">` + hits.map(([w, ko, f, ids]) => {
      const first = w.split(' · ')[0].replace(/\s*\(.*\)$/, '');
      return `<div class="gitem"><div class="gw">${mark(w)}</div><div class="gko">${mark(ko)}</div>${f ? `<div class="gf">${esc(f)}</div>` : ''}` +
        `<div class="gl">${ids.filter(id => TOOL_BY_ID[id]).map(id => `<a class="chip" href="#${id}">${esc(TOOL_BY_ID[id].short || TOOL_BY_ID[id].name)}</a>`).join('')}` +
        `<a class="chip slidechip" href="javascript:void 0" onclick="glossarySlides('${esc(first).replace(/'/g, "\\'")}')">📄 slides: ${esc(first)}</a></div></div>`;
    }).join('') + '</div>');
  },
});
