const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'EE2211 Solver — Tool Map';

const NAVY = '003D7C', ORANGE = 'EF7C00', INK = '1F2937', MUTED = '5B6475', TINT = 'EEF3FA', WHITE = 'FFFFFF', LINE = 'D5DEEA';
const FONT = 'Arial';

/* ---------------- data ---------------- */
// [tool name, what it does, lecture slides, tutorials / quiz]
const CATS = [
  { key: 'smart', title: 'Smart Solve', range: 'L4–L6 전체', rows: [
    ['Smart Solve', 'X와 y(또는 라벨)를 넣으면 회귀 / binary / multi-class, bias, polynomial, ridge, primal·dual을 자동 판별해서 학습·예측', 'L4 p27–33, p51 (시스템 종류 표)\nL5 p21 · L6 p7, p10, p15–16, p22–23', 'T5 Q1–Q4, T6 Q2–Q5'],
    ['Which solver?', '문제 문장을 붙여넣으면 키워드로 맞는 도구를 추천', 'L1–L6 전 범위', '—'],
  ], note: '판별 규칙은 L4 p51 요약표(m = d → X⁻¹, m > d → left inverse, m < d → right inverse)와 L6 p15–16 (primal: m > d, dual: m < d)을 그대로 따름.' },
  { key: 'matrix', title: 'Matrix & Vector 연산', range: 'L3 p5–9 · L4 p5–13, p40–41', rows: [
    ['Matrix Expression Calculator', 'A, B, C, x, y로 inv(A\'A)A\'y 같은 식을 직접 계산', 'L4 p6–14 (연산 전반)', 'L4 Python demo 2, T4 코드'],
    ['Matrix ± ×', 'A+B, A−B, AB, BA, kA, AᵀB, AᵀA / AAᵀ — 차원이 안 맞으면 이유 설명', 'L4 p7 (scalar), p12 (m×d · d×h → m×h)', 'L4 demo 2'],
    ['Transpose Xᵀ', '행 ↔ 열 바꾸기', 'L4 p8', 'L4 demo 1'],
    ['Matrix–Vector Wx', '행 하나씩 곱해서 더하기', 'L4 p10', '—'],
    ['Vector–Matrix xᵀW', 'xᵀ(1×d) 곱하기 W', 'L4 p11', '—'],
    ['Vector ops / dot', 'x±y, a·x, 내적 xᵀy, 길이 ‖x‖, 각도 cos θ', 'L4 p6–7, p9 · L3 p6–8', 'T3 Q10'],
    ['Identity Iₙ', '단위행렬 만들기', 'L4 p13', '—'],
    ['Sets ∩ ∪', '교집합, 합집합', 'L4 p40–41', '—'],
  ] },
  { key: 'detfam', title: 'Determinant · Minor · Cofactor · Adjugate · Inverse', range: 'L4 p13–23, p29', rows: [
    ['Determinant det(A)', '2×2: ad − bc, 3×3: 1행 cofactor 전개를 숫자로 보여줌', 'L4 p14 (2×2), p17 (3×3), p18–22', 'T4 Q1(b), Q4(b)'],
    ['Minor Mᵢⱼ', 'i행 j열을 지운 행렬의 det', 'L4 p15, p18–22', '—'],
    ['Matrix of all minors', '모든 Mᵢⱼ를 행렬로', 'L4 p15, p23', '—'],
    ['Cofactor Cᵢⱼ', 'Cᵢⱼ = (−1)^(i+j) Mᵢⱼ', 'L4 p15', '—'],
    ['Cofactor Matrix C', '모든 Cᵢⱼ (부호 패턴 + − +)', 'L4 p23 (A = [1 2 3; 0 4 5; 1 0 6] 예제)', '—'],
    ['Adjugate adj(A)', 'adj(A) = Cᵀ', 'L4 p15–16', '—'],
    ['Inverse A⁻¹', 'A⁻¹ = adj(A)/det(A), 정사각·det ≠ 0 확인 후 A·A⁻¹ = I 검산', 'L4 p13–14, p16, p29', 'T4 Q1(b), Trial Quiz TF2'],
  ] },
  { key: 'diagsys', title: 'Rank · Invertibility  +  Linear System Xw = y', range: 'L3 p11–14 · L4 p25–35, p51', rows: [
    ['#Rank · Invertibility · Independence'],
    ['Rank', '행사다리꼴(echelon) 단계를 보여주고 rank, rank(XᵀX), rank(XXᵀ)', 'L3 p13–14', 'T3 Q10–Q11, L4 demo 1, 3'],
    ['Invertibility checker', '정사각? det? rank? → invertible / left / right invertible 판정', 'L3 p11 · L4 p13, p28, p30, p32', 'T4 Q1, Q2, Q7, Q8'],
    ['Full matrix report', 'dims, rank, det, Aᵀ, AᵀA, AAᵀ, 역행렬, pinv, cofactor, adj 한 번에', 'L4 p8–23', '—'],
    ['Linear independence', 'rank = 벡터 개수인지, 아니면 Σβᵢxᵢ = 0 예시 β', 'L3 p11–12', 'T3 Q10'],
    ['#Linear System Xw = y'],
    ['Solve Xw = y', 'm, d 비교 → X⁻¹y / (XᵀX)⁻¹Xᵀy / Xᵀ(XXᵀ)⁻¹y 자동 선택, exact·approx·constrained·해 없음 표시, wᵀX = yᵀ도 지원', 'L4 p25–35, p51 (요약표)', 'T4 Q1–Q6, Trial MCQ2'],
    ['Solution type', 'rank(X) vs rank([X, y]) → unique / infinite / none', 'L4 p30 (예외 조건), p32, p35', 'T4 Q2, Q5'],
    ['Pseudoinverse X†', 'tall → (XᵀX)⁻¹Xᵀ, wide → Xᵀ(XXᵀ)⁻¹, 존재 여부 확인', 'L4 p30 (left), p32–33 (right)', 'T4 Q3, Q4, Q7'],
  ] },
  { key: 'calc1', title: 'Functions · Derivative · Gradient (1/2)', range: 'L4 p42–50 · L5 p4–10', rows: [
    ['Evaluate f', '점을 대입해서 f 값 계산', 'L4 p42–44 (f: ℝᵈ → ℝ 예)', '—'],
    ['Linear vs Affine', 'aᵀx(linear) / aᵀx + b(affine) / neither 판정, a와 b 출력', 'L4 p45–50 · L5 p4', 'T5 Q7, L4 poll p37 (y = a+b+2c+3)'],
    ['Derivative df/dx', '기호 미분 + f″ + 특정 점의 값', 'L5 p7', '—'],
    ['Partial ∂f/∂xᵢ', '다른 변수는 상수로 두고 미분', 'L5 p8', '—'],
    ['Gradient ∇f', 'd×1 열벡터의 편미분들, 특정 점의 값', 'L5 p8', 'T5 Q8, L5 poll p12'],
    ['Jacobian', 'vector function의 h×d 행렬', 'L5 p9 · L4 p43 (vector function)', '—'],
  ] },
  { key: 'calc2', title: 'Min / Max · argmin / argmax (2/2)', range: 'L5 p5–10, p20–21', rows: [
    ['Hessian', '2차 미분 행렬, 고유값으로 볼록/오목 판단 (min/max 판별 보조)', 'L5 p7 (기울기 0) 확장 — 강의에 직접 없음', '—'],
    ['Min/Max/argmin/argmax (1변수)', 'local / global min·max, 구간 끝점, open interval, 무한대까지 처리. max = 값, argmax = 입력', 'L5 p5 (local vs global), p6 (max vs argmax)', '—'],
    ['max/argmax on set', '유한집합 𝒜 위에서 최댓값과 그 원소', 'L5 p6 (f(a) = 3a on [0,1] → max 3, argmax 1)', '—'],
    ['∇f = 0 (stationary)', '다변수 f / J(w)의 정류점을 찾고 min / max / saddle 분류', 'L5 p7, p21 (∂J/∂w = 0) · L6 p14', '—'],
    ['d(xᵀAx)/dx …', 'd(Ax)/dx = A, d(bᵀx)/dx = b, d(xᵀAx)/dx = (A+Aᵀ)x, d(yᵀAx)/dx = Aᵀy, ∇J(w)', 'L5 p10, p20–21', '—'],
  ] },
  { key: 'linreg', title: 'Linear Regression', range: 'L5 p14–36 · L6 p4–5', rows: [
    ['Train ŵ (+ Predict)', 'bias 붙이고 ŵ = (XᵀX)⁻¹Xᵀy (크기에 따라 자동), 회귀식 ŷ = w₀ + w₁x, 새 x 예측', 'L5 p14–25 (Ex1 p22–23, Ex2 p24–25) · L6 p4', 'T5 Q1–Q4, Trial MCQ4, FIB3(i), A1'],
    ['Predict ŷ', '이미 구한 ŵ에 X_new를 넣어 ŷ = X_new ŵ (bias 1 자동)', 'L5 p21, p23, p25', 'T5 Q2, Q3(c)(d)'],
    ['Loss / J(w)', '샘플별 loss (xᵢᵀw − yᵢ)², J(w) = eᵀe, MSE, over/under-estimate, ridge penalty', 'L5 p16–18 (loss·cost·objective), p20', 'L6 p13'],
    ['Multi-output', 'Ŵ = (XᵀX)⁻¹XᵀY, X: m×(d+1), W: (d+1)×h', 'L5 p26–31 (Ex3 p29–30, Ex4 p31) · L6 p5', 'T5 Q9, L5 poll p33'],
    ['Normal equation derivation', 'J(w) → ∂J/∂w = 0 → XᵀXw = Xᵀy → ŵ', 'L5 p20–21', '—'],
    ['MSE', '(1/m)Σ(ŷ − y)², SSE, RMSE', 'L5 p16, p36 · L5 demo 1', 'T5 Q6'],
  ] },
  { key: 'class', title: 'Classification', range: 'L1 p19–20 · L2 p23 · L6 p6–12', rows: [
    ['Regression vs Classification', 'y가 연속이면 회귀, 이산 라벨이면 분류', 'L1 p19–20 · L5 p15 · L6 p6', 'T1 Q4–Q6'],
    ['Binary Train + Predict', '라벨을 ±1로 바꿔 ŵ 학습 → score = xᵀŵ → sign → 원래 라벨', 'L6 p6–9 (Ex1)', 'T6 Q4, Trial FIB2(i)'],
    ['sign(score)', 'score ≥ 0 → +1, < 0 → −1', 'L6 p7, p9', '—'],
    ['One-hot encoder', 'Class k → k번째만 1인 벡터', 'L2 p23 · L6 p10', 'Trial TF1, L6 demo 2'],
    ['Multi-class Train + Predict', 'Ŵ = (XᵀX)⁻¹XᵀY(one-hot) → 행마다 argmax → Class', 'L6 p10–12 (Ex2)', 'T6 Q5(a)'],
    ['Argmax class', '점수 행렬 Ŷ의 행마다 가장 큰 열 → Class 번호', 'L6 p12', '—'],
  ] },
  { key: 'ridge', title: 'Ridge Regression', range: 'L6 p13–16, p22', rows: [
    ['Ridge Auto', 'm > d → primal, m < d → dual 자동 선택 (+ 예측)', 'L6 p13–16, p22', 'T6 Q3(c)(d), L6 demo 3'],
    ['Ridge Primal', 'ŵ = (XᵀX + λI)⁻¹Xᵀy, I는 d×d', 'L6 p14–15', 'T6 Q3(d)'],
    ['Ridge Dual', 'ŵ = Xᵀ(XXᵀ + λI)⁻¹y, I는 m×m', 'L6 p16', 'T6 Q1 (유도), Q3(c)'],
    ['Ridge J(w)', 'error 항 (Xw−y)ᵀ(Xw−y)와 penalty 항 λwᵀw를 따로 보여줌', 'L6 p13', '—'],
    ['Ridge Predict', 'ŷ = X_new ŵ', 'L6 p15–16', '—'],
    ['Compare λ', 'λ 여러 개 → ŵ, ‖ŵ‖, training error 표 (shrinkage)', 'L6 p13 (λ↑ → 더 많이 shrink)', 'T6 Q8(c)'],
  ] },
  { key: 'poly', title: 'Polynomial Regression / Classification', range: 'L6 p17–25, p29', rows: [
    ['Build P', 'x → [1, x, x², …], 2 feature면 x1x2, x1², x2² — 열 이름, 파라미터 개수 표시', 'L6 p17–21', 'T6 Q3(a)(b), Trial MCQ3'],
    ['Poly Train + Predict', 'P의 크기로 primal / dual 선택, X_new도 같은 확장', 'L6 p20–22', 'T6 Q2, Trial FIB3(ii)'],
    ['Poly Binary', 'P로 학습 → sign (XOR 예제)', 'L6 p21, p23–25 (Ex3)', 'Trial FIB2(ii)(iii)'],
    ['Poly Multi-class', 'P + one-hot → argmax', 'L6 p23', 'T6 Q5(b), Q6(d)'],
    ['# params / system type', 'C(d+p, p)개 파라미터, P가 over / under-determined인지, W 크기', 'L6 p19, p22', 'T6 Q7, Q8(d), Trial MCQ3, L6 polls p27–28'],
  ] },
  { key: 'statsdata', title: 'Statistics · Correlation  +  Data Types', range: 'L1 p27–32 · L2 p6–33 · L3 p20–22', rows: [
    ['#Statistics · Correlation · Normalization'],
    ['Descriptive statistics', 'mean, median, mode, 분산·표준편차(÷n, ÷(n−1)), 사분위, boxplot 5수 요약, z-score', 'L2 p8, p11–13, p32 · L3 p31–32', 'T2 Q5(a), Q7'],
    ['Pearson r', 'Σ(x−x̄)(y−ȳ) 표로 r 계산, 강도 해석 (0.9 / 0.7 / 0.5)', 'L3 p20–22', 'T3 Q6–Q7'],
    ['r per feature', '각 feature 열과 y의 r, |r| 순위', 'L3 p21 (+ 추가자료 Pearsons r.py)', '—'],
    ['Normalize / NA', 'min-max, z-score, 결측값 평균 대체 / 범위 밖 값 / 행 삭제', 'L2 p23 (scaling), p24–26 (imputation)', 'T2 Q4, Q5'],
    ['#Data Types · ML Concepts'],
    ['NOIR', 'ordered? equal intervals? true zero? → Nominal / Ordinal / Interval / Ratio + 쓸 수 있는 통계', 'L2 p6–17 (p7, p13–14, quiz p15), p35', 'T2 Q6, Trial MCQ5'],
    ['Nearest neighbour', '속성 일치 개수(또는 거리)로 가장 가까운 샘플의 라벨', 'L1 p27–32', 'L1 practice p36'],
    ['Concept cheat sheet', 'T/F · MCQ용 개념 정리 (검색 가능)', 'L1–L6 전반', 'T1, T3 Q7–Q8, 강의 poll'],
  ] },
  { key: 'prob1', title: 'Probability (1/2)', range: 'L3 p26–43', rows: [
    ['PMF', 'Σ = 1로 k / c 풀기, E[X], Var, σ, CDF, P(조건)', 'L3 p30–32, p43 (practice)', 'T3 Q1, Trial FIB1'],
    ['PDF', '∫f = 1로 c 풀기, P(a ≤ X ≤ b), E[X], Var', 'L3 p33–34', 'T3 Q2'],
    ['Gaussian CDF', 'P(a < X ≤ b) = F(b) − F(a), z-score', 'L3 p35', 'T3 Q5'],
    ["Bayes' rule", 'P(B|A) = P(A|B)P(B) / P(A), P(A)를 total probability로도', 'L3 p40–41', 'T3 Q3'],
    ['Bayes (multi)', '가설 여러 개 → evidence와 posterior 표 (과일 상자 예)', 'L3 p41', '—'],
    ['Axioms · union · conditional', 'P(A∪B), P(A|B), 독립 여부, 확률 할당이 유효한지', 'L3 p27, p37–39', 'T3 Q8'],
  ] },
  { key: 'prob2', title: 'Probability (2/2)', range: 'L3 p23–24, p36–39', rows: [
    ['Joint table', 'sum rule로 marginal, product rule로 conditional, 독립 확인', 'L3 p39', '—'],
    ['Dice counting', '모든 경우를 세서 P(조건) (합, 곱, 비교)', 'L3 p36 (독립 사건)', 'T3 Q4'],
    ['Draws (cards, balls)', '비복원/복원 추출, product rule, hypergeometric', 'L3 p37–38', 'Trial MCQ6 (1/221)'],
    ['Exactly k (urns)', '독립 사건 여러 개 중 정확히 k개 일어날 확률', 'L3 p36', 'Trial MCQ1 (270/512)'],
    ["Simpson's paradox", '그룹별 비율과 합친 비율을 비교해 역전 여부 판정', 'L3 p23–24', '—'],
  ] },
  { key: 'code', title: 'Python Code Generator', range: 'L2 p30–31 · L5 p36 · L6 p29 · 튜토리얼 코딩 문제', rows: [
    ['Function builder', '체크한 기능대로 def 함수 생성 (bias, poly, ridge, 분류, 예측, MSE, (XᵀX)⁻¹ 반환)', 'L5 p21 · L6 p15–16, p22', 'Assignment 1 (A1_학번)'],
    ['CSV regression', 'CSV 읽기 → bias → ŵ → 그래프 → 예측. 열은 이름(year) 또는 번호(0부터)로', 'L5 p36 (numpy, pandas)', 'T5 Q5'],
    ['Split + MSE', 'index / train_test_split로 나누고 test MSE', 'L5 p36 (mean_squared_error)', 'T5 Q6'],
    ['CSV plot', '열을 골라 그래프, 카테고리별 선', 'L2 p30–31 (visualization)', 'T2 Q1, Q2'],
    ['describe / NaN', 'summary 통계, 0 개수 세기, 0 → NaN', 'L2 p19, p24–26', 'T2 Q5'],
    ['Iris classification', 'train_test_split + one-hot + linear / polynomial 분류 정확도', 'L6 p29 (sklearn hints)', 'T2 Q3, T6 Q6'],
    ['Probability code', '주사위 enumeration, normal CDF, PMF 평균·분산', 'L3 p30–35', 'T3 Q4, Q5'],
    ['numpy cheat sheet', 'inv, det, rank, pinv, @, hstack, OneHotEncoder, PolynomialFeatures …', 'L4 p51 · L5 p36 · L6 p29', '—'],
  ] },
];

const TAGS = {
  'Smart Solve': '문제 형식 입력 OK · 1 열 자동',
  'Train ŵ (+ Predict)': '문제 형식 입력 OK · 1 열 자동', 'Loss / J(w)': '문제 형식 입력 OK · 1 열 자동', 'Multi-output': '문제 형식 입력 OK · 1 열 자동',
  'Normal equation derivation': '문제 형식 입력 OK', 'Binary Train + Predict': '문제 형식 입력 OK · 1 열 자동', 'Multi-class Train + Predict': '문제 형식 입력 OK · 1 열 자동',
  'Ridge Auto': '문제 형식 입력 OK · 1 열 자동', 'Ridge Primal': '문제 형식 입력 OK · 1 열 자동', 'Ridge Dual': '문제 형식 입력 OK · 1 열 자동', 'Ridge J(w)': '문제 형식 입력 OK · 1 열 자동', 'Compare λ': '문제 형식 입력 OK · 1 열 자동',
  'Build P': '문제 형식 입력 OK', 'Poly Train + Predict': '문제 형식 입력 OK', 'Poly Binary': '문제 형식 입력 OK', 'Poly Multi-class': '문제 형식 입력 OK',
  'Solve Xw = y': '방정식 형식 입력 OK', 'Solution type': '방정식 형식 입력 OK',
  'Predict ŷ': '모델 식 형식 입력 OK · 1 열 자동', 'Ridge Predict': '모델 식 형식 입력 OK',
};

const CHEAT = [
  ['“Given Xw = y where X = …, y = …” (even / over / under?)', 'Solve Xw = y', 'X, y 그대로 (bias 없음 — 1은 계수)'],
  ['“w₁ + w₂ = 4, w₁ − 2w₂ = 1”', 'Solve Xw = y', '방정식 형식 → □ w1 + □ w2 = □에 1, 1, 4 / 1, −2, 1'],
  ['“Given wᵀX = yᵀ …”', 'Solve Xw = y', 'System written as = wᵀX = yᵀ'],
  ['“Is X invertible? has a left / right inverse? (T/F)”', 'Invertibility checker', 'X 입력 → 표의 YES / NO'],
  ['“Find det(A) / cofactor matrix / adj(A) / A⁻¹”', 'Determinant 계열', 'A 입력 (정사각)'],
  ['“rank of …”, “linearly dependent?”', 'Rank / Linear independence', '벡터는 V의 열로'],
  ['“{x = −9} → {y = −6} … regression line … predict x = 8”', 'Train ŵ (+ Predict)', '문제 형식 입력 · add bias 체크 · X_new: x = 8'],
  ['“… without any bias / offset term”', 'Train ŵ (+ Predict)', 'add bias 해제 (회색 1 열 사라짐)'],
  ['“the fitted model is y = … , predict for x = …”', 'Predict ŷ', '모델 식 형식 → y = □ + □ x'],
  ['“loss / cost / J(w) / MSE for w = …”', 'Loss / J(w)', 'X, y, w 입력 → J와 MSE'],
  ['“x → y = [1, −1]” (여러 출력)', 'Multi-output', '문제 형식 + y 버튼 → y = [□, □]'],
  ['“→ {class1} / {class2}”, “sign”, “y ∈ {0, 1}”', 'Binary Train + Predict', '라벨 그대로 (class1 → +1, 0 → −1)'],
  ['“three classes”, “one-hot”, “argmax”', 'Multi-class Train + Predict', '라벨 1, 2, 1, 3 (one-hot 자동)'],
  ['“ridge regression with λ = 0.1”', 'Ridge Auto', 'λ 칸 · primal / dual 자동'],
  ['“3rd-order polynomial regression, predict x = 9”', 'Poly Train + Predict', 'order 3 · raw x만 (x², x³ 자동)'],
  ['“how many parameters? under-determined?”', '# params / system type', 'd, p, m 입력'],
  ['“min / max / argmin / argmax of f(x) on [a, b]”', 'Min/Max/argmin/argmax', 'domain에 [a, b] / R / (0, 1]'],
  ['“minimize J(w) = …”, “stationary point”', '∇f = 0', 'J 식 그대로'],
  ['“derivative / gradient / Jacobian of …”', 'Derivative / Gradient / Jacobian', '식 입력 (x1, x2 …)'],
  ['“PMF with unknown k”, “Pr[X odd]”, “mean of X”', 'PMF', 'Pr에 k 포함 · 조건 x % 2 == 1'],
  ['“f_X(x) = cx for 0 ≤ x ≤ 2, find c and Pr[…]”', 'PDF', 'f = c*x, support 0 ~ 2'],
  ['“Pr[A|B] = …, find Pr[B|A]”, “given that …”', "Bayes' rule", 'Pr(A|B), Pr(B), Pr(A)'],
  ['“normal, mean 30, std 1.8, between 28 and 33”', 'Gaussian CDF', 'μ, σ, a, b'],
  ['“two dice sum 7” / “two Queens in a row” / “urns, exactly 2 red”', 'Dice / Draws / Exactly k', 's == 7 / Q:4, other:48 / 7/8, 6/8, 3/8'],
  ['“mean / median / mode / variance / std / r”', 'Descriptive statistics / Pearson r', '숫자 나열 (두 집합이면 r도)'],
  ['“nominal / ordinal / interval / ratio?”', 'NOIR', '질문 3개에 답'],
  ['“Write def A1_…(X, y) returning (XᵀX)⁻¹ and w”', 'Function builder', '함수 이름 = 학번 · bias 해제 · return 체크'],
  ['“use the csv … predict the value for 2021”', 'CSV regression', 'x · y 열 이름 또는 번호(0부터)'],
];

const LECTURE_INDEX = [
  ['L1', 'p7–9 ML 정의 · p17–26 supervised / unsupervised / RL · p19–20 regression vs classification · p27–32 toy example (nearest neighbour) · p33–34 inductive / deductive', 'Nearest neighbour, Reg vs Class, Concept cheat sheet'],
  ['L2', 'p6–17 NOIR · p8 mean / median / mode · p19, p24–26 missing data · p23 one-hot, min-max, z-score · p30–33 visualization, boxplot', 'NOIR, Descriptive statistics, Normalize / NA, One-hot, CSV plot, describe / NaN'],
  ['L3', 'p5–10 vector, matrix · p11–14 linear dependence, rank · p20–22 correlation · p23–24 Simpson · p26–27 axioms · p30–35 PMF, PDF, Gaussian · p36–39 examples, sum / product rule · p40–41 Bayes · p43 practice', 'Rank, Linear independence, Pearson r, Simpson, PMF, PDF, Gaussian, Bayes, Axioms, Joint, Dice, Draws, Exactly k'],
  ['L4', 'p6–12 vector / matrix 연산 · p13–23 inverse, det, minor, cofactor, adj · p25–35 Xw = y (square / tall / wide) · p40–41 sets · p42–50 functions, linear, affine · p51 summary', 'Matrix / Vector 도구 전부, det 계열 전부, Invertibility, Solve Xw = y, Solution type, X†, Sets, Evaluate f, Linear vs Affine'],
  ['L5', 'p5–6 min / max / argmax · p7–10 derivative, gradient, Jacobian, 공식 · p14–25 linear regression (loss, J(w), 정규방정식, Ex1–2) · p26–31 multiple outputs · p36 summary', 'Derivative, Partial, Gradient, Jacobian, Min/Max, ∇f = 0, d(xᵀAx)/dx, Train, Predict, Loss / J(w), Multi-output, Normal equation, MSE'],
  ['L6', 'p4–5 review · p6–12 binary / multi-class classification · p13–16 ridge (primal, dual) · p17–25 polynomial (P, Ex3 XOR) · p22–23, p29 summary', 'Binary, sign, One-hot, Multi-class, Argmax, Ridge 6종, Poly 5종'],
];

/* ---------------- helpers ---------------- */
function titleBlock(slide, num, title, range) {
  slide.addShape(pres.shapes.OVAL, { x: 0.5, y: 0.42, w: 0.62, h: 0.62, fill: { color: ORANGE }, line: { color: ORANGE } });
  slide.addText(String(num), { x: 0.5, y: 0.42, w: 0.62, h: 0.62, fontFace: FONT, fontSize: String(num).length > 2 ? 12 : 18, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  slide.addText(title, { x: 1.3, y: 0.32, w: 11.5, h: 0.6, fontFace: FONT, fontSize: 28, bold: true, color: NAVY, margin: 0, valign: 'middle', isTextBox: true });
  slide.addText(range, { x: 1.3, y: 0.9, w: 11.5, h: 0.32, fontFace: FONT, fontSize: 13, color: MUTED, margin: 0, isTextBox: true });
}
function footer(slide, n) {
  slide.addText(`EE2211 Solver · Tool Map   ${n}`, { x: 9.8, y: 7.05, w: 3.0, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right', margin: 0, isTextBox: true });
}
const COLW = [2.55, 4.55, 3.1, 2.1];
function estH(txt, w, fs) { // rough wrapped height in inches
  const lines = String(txt).split('\n');
  let n = 0;
  for (const l of lines) { let wid = 0; for (const ch of l) wid += /[\u3131-\uD79D]/.test(ch) ? fs / 72 : fs * 0.52 / 72; n += Math.max(1, Math.ceil(wid / (w - 0.18))); }
  return n * fs * 1.2 / 72 + 0.12;
}
const EST = [];
function toolTable(slide, rows, y = 1.45, fs = 11) {
  EST.push(y + 0.4 + rows.reduce((t, r) => t + (r.length === 1 ? 0.35 : Math.max(...r.map((c, i) => estH(c, COLW[i], fs)))), 0));
  const hdr = ['도구 (solver 이름)', '무엇을 계산하나', '강의 슬라이드', '튜토리얼 · 퀴즈'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12 } }));
  const body = [];
  let k = 0;
  for (const r of rows) {
    if (r.length === 1) {
      body.push([{ text: r[0].slice(1), options: { colspan: 4, bold: true, color: ORANGE, fill: { color: 'FFF4E8' }, fontSize: 12 } }]);
      continue;
    }
    const fill = { color: k++ % 2 ? TINT : WHITE };
    body.push([
      { text: TAGS[r[0]] ? [{ text: r[0], options: { bold: true, color: NAVY, breakLine: true } }, { text: TAGS[r[0]], options: { color: ORANGE, fontSize: fs - 2, bold: true } }] : r[0], options: { bold: true, color: NAVY, fill } },
      { text: r[1], options: { color: INK, fill } },
      { text: r[2], options: { color: INK, fill } },
      { text: r[3], options: { color: MUTED, fill } },
    ]);
  }
  slide.addTable([hdr, ...body], { x: 0.5, y, w: 12.3, colW: COLW, fontFace: FONT, fontSize: fs, valign: 'middle', border: { type: 'solid', pt: 0.75, color: LINE }, margin: [0.05, 0.08, 0.05, 0.08] });
}

/* ---------------- slides ---------------- */
let n = 1;
// 1. title
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.shapes.OVAL, { x: 0.8, y: 1.55, w: 0.9, h: 0.9, fill: { color: ORANGE }, line: { color: ORANGE } });
  s.addText('84', { x: 0.8, y: 1.55, w: 0.9, h: 0.9, fontFace: FONT, fontSize: 24, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  s.addText('EE2211 Solver — Tool Map', { x: 0.8, y: 2.7, w: 11.5, h: 1.0, fontFace: FONT, fontSize: 44, bold: true, color: WHITE, margin: 0, isTextBox: true });
  s.addText('각 도구가 어떤 Lecture의 어떤 슬라이드, 어떤 튜토리얼·퀴즈 문제를 다루는지', { x: 0.8, y: 3.7, w: 11.5, h: 0.6, fontFace: FONT, fontSize: 20, color: 'CADCFC', margin: 0, isTextBox: true });
  s.addText('출처: Lec 1–3 (Xinchao), Lecture 4–6 annotated (Helen Zhou), Tutorial 1–6, Trial Quiz, Assignment 1\n슬라이드 번호 = PDF 페이지 번호 (예: “L4 p23” = Lecture 4 PDF 23쪽)', { x: 0.8, y: 5.4, w: 11.5, h: 0.9, fontFace: FONT, fontSize: 13, color: 'CADCFC', margin: 0, isTextBox: true });
  n++;
}
// 2. overview
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, 'All', '한눈에 보기: 도구 카테고리 → 강의 범위', '왼쪽 트리의 카테고리 순서 그대로. 뒤 슬라이드에서 도구 하나하나를 풀어서 설명.');
  const cards = [
    ['Smart Solve', '2', 'L4–L6'], ['Matrix & Vector', '8', 'L3–L4'], ['Determinant 계열', '7', 'L4 p13–23'], ['Rank · Invertibility', '4', 'L3 · L4'],
    ['Linear System Xw = y', '3', 'L4 p25–35'], ['Functions · Min/Max', '11', 'L4–L5'], ['Linear Regression', '6', 'L5'], ['Classification', '6', 'L6 p6–12'],
    ['Ridge', '6', 'L6 p13–16'], ['Polynomial', '5', 'L6 p17–25'], ['Statistics', '4', 'L2 · L3'], ['Probability', '11', 'L3'],
    ['Data Types · Concepts', '3', 'L1 · L2'], ['Python Code', '8', '튜토리얼 코딩'],
  ];
  const cw = 2.9, chh = 1.18, gx = 0.23, gy = 0.22;
  cards.forEach((c, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.5 + col * (cw + gx), y = 1.55 + row * (chh + gy);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: chh, rectRadius: 0.08, fill: { color: TINT }, line: { color: LINE, width: 0.75 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.2, w: 0.5, h: 0.5, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(c[1], { x: x + 0.15, y: y + 0.2, w: 0.5, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(c[0], { x: x + 0.78, y: y + 0.14, w: cw - 0.9, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: NAVY, valign: 'middle', margin: 0, isTextBox: true });
    s.addText(c[2], { x: x + 0.78, y: y + 0.66, w: cw - 0.9, h: 0.34, fontFace: FONT, fontSize: 12, color: MUTED, margin: 0, isTextBox: true });
  });
  s.addText('동그라미 숫자 = 그 카테고리의 도구 개수', { x: 0.5, y: 7.0, w: 6, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0, isTextBox: true });
  footer(s, n++);
}
// input how-to
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, 'In', '입력하는 법 (모든 solver 공통)', '행렬로 넣든, 문제 문장 그대로 넣든 결과는 같아');
  const cards = [
    ['행렬로 입력 (기본)', ['칸에 숫자 입력, +행 / −행 / +열 / −열', '엑셀·텍스트를 맨 왼쪽 위 칸에 붙여넣으면 행렬 전체가 바뀜', '1/3, −2^2, sqrt(2) 같은 값도 OK', 'X와 y는 행 수가 자동으로 맞춰짐']],
    ['문제 형식 그대로 입력 (OR 옵션)', ['맨 위 “입력 방식” 드롭다운에서 바꿈 — 빈칸 채우기', '학습 데이터: { x = □ } → { y = □ } (+샘플, +x)', '방정식: □ w1 + □ w2 = □ (Solve Xw = y)', '모델: y = □ + □ x (Predict) · “텍스트로 붙여넣기”로 자동 채움']],
    ['bias 1 열 = 자동 · 잠금', ['add bias 체크 → X, X_new 맨 앞에 회색 “1 (bias)” 열', '수정 불가 · 체크 해제하면 사라짐', '문제 X에 1 열이 있으면 그 열은 빼고 입력', 'Solve Xw = y에는 bias 없음 (1은 w의 계수)']],
    ['문제 → 입력 가이드', ['모든 solver 위에 “문제에서 이렇게 나오면 → 이렇게 넣어” 표', '검색창에 문제 문장 일부를 쳐도 찾아줌 (예: given that → Bayes)', '입력칸마다 “예: …” 힌트', '결과의 1번에 읽은 값·순서 표시']],
  ];
  const cw = 6.0, ch = 2.55;
  cards.forEach((c, i) => {
    const x = 0.5 + (i % 2) * (cw + 0.3), y = 1.5 + Math.floor(i / 2) * (ch + 0.3);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: i === 2 ? 'FFF4E8' : TINT }, line: { color: LINE, width: 0.75 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.22, w: 0.45, h: 0.45, fill: { color: ORANGE }, line: { color: ORANGE } });
    s.addText(String(i + 1), { x: x + 0.25, y: y + 0.22, w: 0.45, h: 0.45, fontFace: FONT, fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(c[0], { x: x + 0.85, y: y + 0.2, w: cw - 1.05, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: NAVY, valign: 'middle', margin: 0, isTextBox: true });
    s.addText(c[1].map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < c[1].length - 1 } })), { x: x + 0.3, y: y + 0.85, w: cw - 0.55, h: ch - 0.95, fontFace: FONT, fontSize: 12, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 4, isTextBox: true });
  });
  footer(s, n++);
}
// category slides
let catNum = 1;
for (const c of CATS) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, catNum++, c.title, '강의 범위: ' + c.range);
  const nrows = c.rows.length;
  toolTable(s, c.rows, 1.45, nrows > 8 ? 11 : 12.5);
  if (c.note) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.35, w: 12.3, h: 1.1, rectRadius: 0.08, fill: { color: 'FFF4E8' }, line: { color: 'F5D2A8', width: 0.75 } });
    s.addText([{ text: '판별 근거  ', options: { bold: true, color: ORANGE } }, { text: c.note, options: { color: INK } }], { x: 0.75, y: 3.45, w: 11.8, h: 0.9, fontFace: FONT, fontSize: 14, valign: 'middle', margin: 0, isTextBox: true });
  }
  footer(s, n++);
}
// cheat sheet: problem wording -> tool
for (let part = 0; part < 2; part++) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, 'Q', `문제에서 이렇게 나오면 → 이 도구, 이렇게 입력 (${part + 1}/2)`, '시험지 문장을 보고 바로 도구 고르기 — 자세한 건 각 solver 위의 가이드 표');
  const rows = CHEAT.slice(part * 14, part * 14 + 14);
  const hdr = ['문제에서 이렇게 나오면', '도구', '이렇게 입력'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12 } }));
  const body = rows.map((r, i) => {
    const fill = { color: i % 2 ? TINT : WHITE };
    return [{ text: r[0], options: { color: INK, fill } }, { text: r[1], options: { bold: true, color: NAVY, fill } }, { text: r[2], options: { color: INK, fill } }];
  });
  s.addTable([hdr, ...body], { x: 0.5, y: 1.4, w: 12.3, colW: [5.4, 3.0, 3.9], fontFace: FONT, fontSize: 11, valign: 'middle', border: { type: 'solid', pt: 0.75, color: LINE }, margin: [0.04, 0.08, 0.04, 0.08] });
  EST.push(1.4 + 0.35 + rows.reduce((t, r) => t + Math.max(estH(r[0], 5.4, 11), estH(r[1], 3.0, 11), estH(r[2], 3.9, 11)), 0));
  footer(s, n++);
}
// reverse index
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, '↔', '역색인: Lecture → 도구', '강의 슬라이드를 보다가 “이거 어떤 도구로 풀지?” 할 때');
  const hdr = ['Lecture', '주요 슬라이드', '쓰는 도구'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12 } }));
  const body = LECTURE_INDEX.map((r, i) => {
    const fill = { color: i % 2 ? TINT : WHITE };
    return [{ text: r[0], options: { bold: true, color: ORANGE, fill, fontSize: 16, align: 'center' } }, { text: r[1], options: { color: INK, fill } }, { text: r[2], options: { color: NAVY, fill } }];
  });
  s.addTable([hdr, ...body], { x: 0.5, y: 1.45, w: 12.3, colW: [1.0, 6.6, 4.7], fontFace: FONT, fontSize: 12, valign: 'middle', border: { type: 'solid', pt: 0.75, color: LINE }, margin: [0.05, 0.08, 0.05, 0.08] });
  footer(s, n++);
}
// tutorial index
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  titleBlock(s, '↔', '역색인: 튜토리얼 · Trial Quiz → 도구', '문제 번호로 바로 도구 찾기');
  const T = [
    ['T1', 'Q1–Q11 ML 개념', 'Concept cheat sheet, Reg vs Class'],
    ['T2', 'Q1–Q3 그래프 · Q4 정규화 · Q5 결측값 · Q6 NOIR · Q7 boxplot', 'CSV plot, Iris, Normalize / NA, describe / NaN, NOIR, Descriptive statistics'],
    ['T3', 'Q1 PMF · Q2 PDF · Q3 Bayes · Q4 주사위 · Q5 정규분포 · Q6–7 상관/인과 · Q8 공리 · Q10–11 rank', 'PMF, PDF, Bayes, Dice, Gaussian, Pearson r, Axioms, Rank, Linear independence'],
    ['T4', 'Q1–Q6 Xw = y (wᵀX = yᵀ 포함) · Q7–Q8 left / right inverse', 'Solve Xw = y, Solution type, X†, Invertibility checker, Determinant, Inverse'],
    ['T5', 'Q1–Q4 회귀·bias·예측 · Q5 CSV · Q6 MSE · Q7 affine · Q8 gradient 차원 · Q9 multi-output', 'Train + Predict, Predict, CSV regression, Split + MSE, Linear vs Affine, Gradient, Multi-output'],
    ['T6', 'Q1 dual 유도 · Q2–Q3 polynomial · Q4 binary · Q5 multi-class · Q6 iris · Q7–Q8 개념', 'Ridge Dual, Poly Train + Predict, Build P, Binary, Multi-class, Poly Multi-class, Iris, # params'],
    ['Trial', 'TF1 one-hot · TF2 역행렬 · MCQ1 항아리 · MCQ2 식 개수 · MCQ3 poly · MCQ4 회귀 · MCQ5 NOIR · MCQ6 카드 · FIB1 PMF · FIB2 분류 · FIB3 예측', 'One-hot, Inverse, Exactly k, Solve Xw = y, # params, Train + Predict, NOIR, Draws, PMF, Binary / Poly Binary, Poly Train + Predict'],
    ['A1', '4×2 X로 (XᵀX)⁻¹와 w를 return하는 함수', 'Function builder (return (XᵀX)⁻¹ 체크, bias 해제)'],
  ];
  const hdr = ['자료', '문제', '쓰는 도구'].map(t => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12 } }));
  const body = T.map((r, i) => {
    const fill = { color: i % 2 ? TINT : WHITE };
    return [{ text: r[0], options: { bold: true, color: ORANGE, fill, fontSize: 14, align: 'center' } }, { text: r[1], options: { color: INK, fill } }, { text: r[2], options: { color: NAVY, fill } }];
  });
  s.addTable([hdr, ...body], { x: 0.5, y: 1.45, w: 12.3, colW: [1.0, 6.2, 5.1], fontFace: FONT, fontSize: 12, valign: 'middle', border: { type: 'solid', pt: 0.75, color: LINE }, margin: [0.05, 0.08, 0.05, 0.08] });
  footer(s, n++);
}

console.log('est table bottoms:', EST.map(v => v.toFixed(2)).join(' '));
pres.writeFile({ fileName: '../EE2211_Solver_Tool_Map.pptx' }).then(f => console.log('wrote', f));
