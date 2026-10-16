'use strict';
/* =====================================================================
   guides.js — "문제에서 이렇게 나오면 → 여기에 이렇게 넣어"
   GUIDE[toolId] = [[문제 표현, 입력 방법], ...]
   ===================================================================== */
const GUIDE = {
  /* ---------- Smart ---------- */
  smart: [
    ['“Given the training data {x = −9} → {y = −6}, … Find w / predict y for x = …”', '<b>X</b>에 x들을 한 행에 하나씩 (−9, −7, …) → <b>Target</b> = numbers y → <b>y</b>에 −6, −6, … → <b>X_new</b>에 예측할 x'],
    ['“… → {y = class 1}”, “labelled as class 1 / class 2 / class 3”', '<b>Target</b> = class labels → 라벨을 X 행 순서대로 <code>1, 1, 2, 3</code>'],
    ['“y ∈ {−1, +1}” 또는 “{0, 1}” (두 값만)', 'Target = numbers y로 넣으면 자동으로 binary classification'],
    ['“with λ = 0.1”, “ridge regression”, “regularization”', '<b>ridge λ</b> 칸에 0.1'],
    ['“2nd-order / 3rd-order polynomial”, “quadratic”, “cubic”', '<b>polynomial order</b> 칸에 2 / 3'],
    ['“Given Xw = y …” (그냥 연립방정식)', '<b>add bias 체크 해제</b> — 또는 “Solve Xw = y” 도구가 더 정확'],
    ['행렬 X만 주고 “inverse? rank? invertible?”', 'Target = nothing'],
  ],
  router: [
    ['문제가 뭘 묻는지 모르겠을 때', '문제 문장을 통째로 붙여넣고 Solve → 추천 도구 클릭'],
  ],

  /* ---------- Matrix & Vector ---------- */
  matcalc: [
    ['“Compute XᵀX”, “(XᵀX)⁻¹Xᵀy”, “AᵀB + 2I” 처럼 식을 직접 계산하라', '행렬을 A, B, C / 벡터를 x, y 칸에 넣고 Expression에 식. 표기: <code>A\'</code> = Aᵀ, <code>inv(A)</code> = A⁻¹, <code>A B</code> 또는 <code>A*B</code> = 곱, <code>I(3)</code> = 3×3 단위행렬'],
    ['문제의 행렬 이름이 X, W 등일 때', '이름은 A, B, C 중 하나로 바꿔서 넣어 (예: X → A)'],
  ],
  matops: [
    ['“Find AB / BA / A + B / A − B”', 'A, B 입력 → Operation 선택'],
    ['“Compute 2A”, “scalar multiplication”', 'Operation = k·A, k 칸에 2'],
    ['“Can AB be computed? What is its size?”', 'AB 선택 → 안 되면 이유(열 수 ≠ 행 수)가 나오고, 되면 결과 크기 m×h가 나옴'],
    ['“XᵀX and XXᵀ”', 'Operation = AᵀA and AAᵀ, A에 X'],
  ],
  transpose: [['“Xᵀ”, “transpose of X”', 'X 입력하면 끝']],
  matvec: [['“Wx”, “matrix–vector product”', 'W에 행렬, x에 벡터 (x 길이 = W 열 수)']],
  vecmat: [['“xᵀW”, “vector–matrix product”', 'x에 벡터 (x 길이 = W 행 수), W에 행렬']],
  vecops: [
    ['“dot product / inner product a · c”, “aᵀc”', 'x에 a, y에 c'],
    ['“Euclidean length / norm ‖x‖”', 'x에 벡터 (y는 아무거나 같은 길이)'],
    ['“angle between x and y”, “x + y”, “2x”', 'x, y, scalar a 입력'],
  ],
  identity: [['“I₃”, “3×3 identity matrix”', 'n = 3']],
  sets: [['“{1,3,5,8} ∩ {1,8,4}”, “union”', 'S₁ = 1, 3, 5, 8 / S₂ = 1, 8, 4']],

  /* ---------- Determinant family ---------- */
  det: [
    ['“Find det(A)”, “|A|”, “determinant”', 'A 입력 (정사각). 풀이는 lecture처럼 1행 전개'],
    ['“Is A singular / non-singular?”', 'det = 0 → singular (역행렬 없음), det ≠ 0 → non-singular'],
  ],
  minor: [['“minor of a₁₂”, “M₁₂”', 'A 입력, row i = 1, column j = 2']],
  minors: [['“matrix of minors”', 'A 입력']],
  cofactor1: [['“cofactor of a₂₃”, “C₂₃”', 'A 입력, i = 2, j = 3']],
  cofactor: [['“Find the cofactor matrix of A”', 'A 입력 (lecture p23 예제가 기본값)']],
  adj: [['“adjugate”, “adjoint”, “adj(A)”', 'A 입력 → C를 구해서 Cᵀ']],
  inverse: [
    ['“Find A⁻¹”, “inverse of X”, “X⁻¹ = (1/det) adj”', 'A 입력. 정사각이 아니거나 det = 0이면 “does not exist”라고 알려줌'],
    ['“Is X invertible? If so, find X⁻¹”', '여기 넣거나 “Invertibility checker”'],
  ],

  /* ---------- Diagnostics ---------- */
  rank: [
    ['“What is the rank of …”, “try row echelon form”', '행렬 입력 → 행 연산 단계와 rank'],
    ['“full rank?”', 'rank = min(m, d)이면 full rank'],
  ],
  invcheck: [
    ['“Is X invertible? Why?”', 'X 입력 → 판정과 이유 (정사각? det? rank?)'],
    ['“The following matrix has a left inverse. True/False”', 'X 입력 → Left-invertible YES/NO 줄을 봐'],
    ['“Which is true: invertible / left invertible / right invertible / has no determinant”', 'X 입력 → 표의 각 줄이 그대로 답'],
  ],
  report: [['행렬 하나 주고 여러 가지(det, inverse, rank, XᵀX …)를 한꺼번에 물어볼 때', 'A 입력 → 한 번에 다 나옴']],
  linindep: [
    ['“Are a = [1,2,3] and b = [4,5,6] linearly dependent?”', 'V의 <b>열</b>에 a, b를 넣어 (3×2 행렬). 벡터를 행으로 넣었으면 “rows of V” 선택'],
    ['“β₁x₁ + β₂x₂ = 0 for some β not all zero?”', 'dependent면 그런 β 예시도 나와'],
  ],

  /* ---------- Linear system ---------- */
  solve: [
    ['“Given Xw = y where X = [..], y = [..]. (a) even / over / under-determined? (b) X invertible? (c) solve for w”', 'X, y 그대로 입력 (bias 없음). (a)는 Detected task, (b)(c)는 Steps와 Final Answer'],
    ['방정식으로 나올 때: “w₁ + w₂ = 4, w₁ − 2w₂ = 1”', '<b>X의 각 행 = 한 방정식의 계수</b> (1, 1 / 1, −2), <b>y = 오른쪽 값</b> (4, 1)'],
    ['“Given wᵀX = yᵀ where X = …”', 'System written as = <b>wᵀX = yᵀ</b> 선택, X와 y는 문제 그대로'],
    ['“How many simultaneous equations?” (wᵀX = yᵀ, y ∈ ℝ²ˣ¹)', 'y의 원소 개수 = 식의 개수 (여기선 2)'],
  ],
  soltype: [['“unique / infinitely many / no solution?”, “is the system consistent?”', 'X, y 입력 → rank(X) versus (vs) rank([X, y])']],
  pinv: [
    ['“left inverse”, “right inverse”, “pseudo-inverse X†”', 'X 입력 → tall이면 left, wide면 right 자동'],
    ['“X† = (XᵀX)⁻¹Xᵀ exists?”', 'XᵀX가 singular면 does not exist라고 나와'],
  ],

  /* ---------- Calculus ---------- */
  evalf: [['“f(x) = x₁ + x₂ − x₄². Find f at x = …”', 'f에 식 (x₁ → <code>x1</code>), point에 <code>x1=1, x2=2, x4=3</code>']],
  linaff: [
    ['“f(x) = 1 + x₁ + x₂ − x₃ − x₄ is affine. True/False”', 'f에 식 → LINEAR / AFFINE / NEITHER'],
    ['“Suppose y = a + b + 2c + 3, this is a linear function” — True / False (T/F)', 'f에 <code>a + b + 2c + 3</code> → affine but NOT linear → False'],
  ],
  deriv: [
    ['“Find df/dx”, “f′(x)”', 'f에 식 (<code>x^3 - 6x^2 + 9x + 1</code>)'],
    ['“slope at x = 1”, “is f increasing at x = 1?”', 'evaluate at 칸에 1 → f′ 부호로 판단'],
  ],
  partial: [['“∂f/∂x₁”', 'f 입력, variable = x1, (값이 필요하면 point)']],
  grad: [
    ['“Find the gradient ∇f”, “∇J(w)”', 'f 입력 → 편미분들이 d×1 벡터로'],
    ['“outcome of differentiating f(x) with respect to (w.r.t.) x (d×1) is a …”', '답: d×1 vector (scalar 아님)'],
  ],
  jacobian: [['“Jacobian of [y₁; y₂] = [−2x₁; 3x₁]”', '한 줄에 하나씩: <code>-2x1</code> 엔터 <code>3x1</code> → h×d 행렬']],
  hessian: [['“Is f convex?”, “second-derivative matrix”', 'f 입력 → 고유값 모두 > 0이면 convex (bowl)']],
  minmax1d: [
    ['“Find local and global minimum / maximum of f(x) on [0, 5]”', 'f에 식, domain에 <code>[0, 5]</code>'],
    ['“x ∈ ℝ”, “for all real x”', 'domain에 <code>R</code>'],
    ['“0 < x ≤ 1” (open 구간)', 'domain에 <code>(0, 1]</code> — 괄호 ( ) 는 끝점 제외'],
    ['“max f(x)” versus (vs) “arg max f(x)”', 'max = 함수 <b>값</b>(VALUE 줄), argmax = 그때의 <b>x</b>(INPUT 줄)'],
    ['“f(a) = 3a, a ∈ [0,1]: max? argmax?”', 'f = <code>3a</code>, domain <code>[0,1]</code> → max 3, argmax 1'],
  ],
  setmax: [['“𝒜 = {a₁, …, aₘ}, find max_{a∈𝒜} f(a) and argmax”', 'f 입력, set에 원소들']],
  stationary: [
    ['“Minimize J(w) = (w₀ + w₁ − 1)² + …”, “find w that minimizes”', 'f에 J 식 (변수 2개 이상 OK) → argmin = w, min value = J 값'],
    ['“stationary / critical point”, “∇f = 0”', 'f 입력 → min / max / saddle 판정'],
  ],
  vecderiv: [
    ['“d(xᵀAx)/dx”, “d(Ax)/dx”, “d(bᵀx)/dx”, “d(yᵀAx)/dx”', 'formula 선택 후 A, x (…) 입력'],
    ['“gradient of J(w) = ‖Xw − y‖² at w = …”', 'formula = ∇J, A 칸에 X, x 칸에 w, y에 y'],
  ],

  /* ---------- Linear regression ---------- */
  lrtrain: [
    ['“Given training data {x = −9} → {y = −6}, …”', '<b>X (raw)</b>에 x를 한 행에 하나씩, <b>y</b>에 y를 같은 순서로'],
    ['“find the least squares regression line y = ax + b”, “with a bias/offset term”', '<b>add bias 체크</b> → w₀ = b (절편), w₁ = a (기울기)'],
    ['“without inclusion of any bias/offset”', '<b>add bias 체크 해제</b>'],
    ['“estimate / predict y when x = 8”, “test set {x = −1} → y = ?”', '<b>Also PREDICT 체크</b> → X_new에 8'],
    ['표 형태: feature x = [3, −1, 0] 처럼 여러 개', 'X의 한 행 = 한 샘플의 feature들 (열 3개)'],
    ['문제의 X에 이미 1s 열이 있을 때 (“X = [1 −9; 1 −7; …]”)', '그 1 열은 빼고 나머지(−9, −7, …)만 넣어 — 회색 <b>1 (bias)</b> 열이 대신해. (1 열까지 다 넣고 싶으면 add bias 해제)'],
  ],
  lrpredict: [
    ['“The trained w = [−1.4375, 0.5625]. Predict for x = −1”', 'ŵ에 w, X_new에 −1, (w에 w₀가 있으면) bias 체크'],
  ],
  lrloss: [
    ['“Compute the loss / cost / objective J(w) for w = …”', 'X, y, w 입력 → J = Σ(ŷ − y)²'],
    ['“mean squared error”, “empirical risk”, “1/m”', 'Mean form (1/m)·J 줄을 봐'],
    ['“is the prediction an over- or under-estimate?”', '표의 over/under 열 (ŷ > y = over)'],
  ],
  lrmulti: [
    ['“x → y = [1, −1]” (y가 벡터: 여러 출력)', '<b>Y</b>의 한 행 = 한 샘플의 출력들 (열 2개)'],
    ['“what are the values of W? when x = 2, what is y?”', 'X, Y 입력, PREDICT 체크 → X_new에 2'],
  ],
  normaleq: [['“Derive the least squares solution”, “set the gradient to zero”', 'X, y 넣으면 유도 단계 + 실제 숫자']],
  mse: [['“Mean Squared Error (MSE) between predicted and actual values”', 'y에 실제값, ŷ에 예측값']],

  /* ---------- Classification ---------- */
  regvscls: [['“Should you treat this as classification or regression?” (y 값을 줄 때)', 'y 값 나열 — 연속이면 regression, 몇 개 라벨이면 classification']],
  bintrain: [
    ['“{x = −9} → {y = −1}, …”, “y ∈ {−1, +1}”', 'X에 x, labels에 <code>-1, -1, -1, 1, 1, 1</code>'],
    ['“→ {y = class1}”, “→ {y = class2}”', 'labels에 <code>class1, class1, class2, …</code> (class1 → +1 자동)'],
    ['“labelled as y = 0 / y = 1”, “sgn(ax + b)”', 'labels에 0, 1 그대로 (0 → −1, 1 → +1 자동)'],
    ['“predict the class label for x = −0.1 and 0.4”', 'PREDICT 체크 → X_new에 −0.1, 0.4 (한 행에 하나씩)'],
    ['“linear regression with signum discrimination”', '이 도구 그대로 (polynomial이면 “Poly Binary”)'],
  ],
  signscore: [['“sign(−0.1406) = ?”', 'scores에 숫자들']],
  onehot: [['“one-hot encode the labels 1, 2, 1, 3”, “one-hot encoded target”', 'labels에 1, 2, 1, 3']],
  multitrain: [
    ['“three classes”, “class 1 / 2 / 3”, “one-hot encoded target”', 'X에 feature, labels에 1, 2, 1, 3 (one-hot은 자동)'],
    ['one-hot Y 행렬을 직접 줄 때', '“I will type one-hot Y myself” 체크 후 Y 입력'],
    ['“which class for x = (6, 8)?”', 'PREDICT 체크 → X_new → 가장 큰 score의 열 = class'],
  ],
  argmaxclass: [['“Ŷ = X_new W is given, find the predicted class”', 'Ŷ 입력 → 행마다 가장 큰 열 번호']],

  /* ---------- Ridge ---------- */
  ridgeauto: [
    ['“using primal / dual form”이 없고 그냥 “ridge”일 때 — 어느 form?', '<b>m &gt; d (샘플이 더 많음) → Primal</b>, <b>m &lt; d (파라미터가 더 많음) → Dual</b>. m, d는 bias 1 열 붙인 뒤(polynomial이면 P)의 크기. Auto면 자동'],
    ['“ridge regression with λ = 0.1”, “regularization”, “penalty”', 'X, y, λ 입력 — primal/dual은 자동'],
    ['bias (절편) 처리', 'Add bias 기본 체크 → training·predict 둘 다 1 자동. 문제에 “without bias / offset”이면 해제. 이미 polynomial P를 직접 만들어 넣는 경우(1 열 포함)도 해제'],
    ['“can the primal ridge be applied?”', 'λ > 0이면 항상 가능 (XᵀX + λI invertible)'],
  ],
  ridgeprimal: [
    ['“using primal / dual form”이 없고 그냥 “ridge”일 때 — 어느 form?', '<b>m &gt; d (샘플이 더 많음) → Primal</b>, <b>m &lt; d (파라미터가 더 많음) → Dual</b>. m, d는 bias 1 열 붙인 뒤(polynomial이면 P)의 크기. Auto면 자동'],
   ['“using the primal form”, “(XᵀX + λI)⁻¹Xᵀy”', 'X, y, λ — primal 강제']],
  ridgedual: [
    ['“using primal / dual form”이 없고 그냥 “ridge”일 때 — 어느 form?', '<b>m &gt; d (샘플이 더 많음) → Primal</b>, <b>m &lt; d (파라미터가 더 많음) → Dual</b>. m, d는 bias 1 열 붙인 뒤(polynomial이면 P)의 크기. Auto면 자동'],
   ['“using the dual form”, “Xᵀ(XXᵀ + λI)⁻¹y”', 'X, y, λ — dual 강제']],
  ridgeJ: [['“ridge objective / cost for w = … with λ = …”', 'X, y, w, λ → error 항 + penalty 항 따로']],
  ridgepredict: [['“predict with the ridge solution ŵ”', 'ŵ, X_new 입력']],
  lamcompare: [['“what happens to ŵ as λ increases?”', 'λ 칸에 여러 값 → ‖ŵ‖가 줄어드는 것 확인']],

  /* ---------- Polynomial ---------- */
  polyexpand: [
    ['“Write down the P matrix for X = [..] (2nd / 3rd order)”', 'X (raw)와 order 입력'],
    ['“expression for 3rd-order polynomial with 3 inputs”', 'X에 아무 값 3열 1행, order 3 → 열 이름이 곧 항 목록'],
    ['강의 슬라이드처럼 1, x1, x2, x1x2, x1², x2² 순서로', 'Column order = Lecture slides'],
  ],
  polytrain: [
    ['“using primal / dual form”이 없고 그냥 “ridge”일 때 — 어느 form?', '<b>m &gt; d (샘플이 더 많음) → Primal</b>, <b>m &lt; d (파라미터가 더 많음) → Dual</b>. m, d는 bias 1 열 붙인 뒤(polynomial이면 P)의 크기. Auto면 자동'],
    ['“Perform a 3rd-order polynomial regression”', 'X (raw)에 x, y, order 3 (1 열·x² 등은 자동으로 만들어져)'],
    ['“predict y at x = 9 using the polynomial model”', 'PREDICT 체크 → X_new에 9 (raw)'],
    ['“optimal polynomial model of second order with a bias”', 'order 2 (bias는 P에 자동 포함)'],
    ['“with ridge λ = 0.0001”', 'λ 칸에 0.0001'],
  ],
  polybin: [
    ['“quadratic classifier sgn(ax² + bx + c)”', 'X, labels, order 2'],
    ['“8th-order polynomial classifier”', 'order 8 (샘플 수보다 파라미터가 많으면 dual 자동)'],
    ['Exclusive OR (XOR) 예제 (x₁, x₂ → ±1)', 'X 2열, labels, order 2'],
  ],
  polymulti: [['“polynomial model of 5th order and a one-hot encoded target”', 'X, labels (1, 1, 2, 3, 2), order 5']],
  polycount: [
    ['“How many parameters does a full 3rd-order polynomial with 2 features have?”', 'd = 2, p = 3 → 10'],
    ['“is the learning system under-determined? infinitely many solutions?”', 'm = 샘플 수도 넣어 → m < number of parameters면 under-determined'],
    ['“5 inputs predicting age and sex, W dimension?”', 'd = 5, p = 1, h = 2 → W는 6 × 2 (bias 포함)'],
  ],

  /* ---------- Statistics ---------- */
  descstats: [
    ['“Find the mean / median / mode of 1, 3, 4, 6, 6, 7, 8”', '숫자를 쉼표로 나열'],
    ['“variance”, “standard deviation”', '표본이면 ÷(n−1), 모집단(확률분포)이면 ÷n 줄'],
    ['“box plot”, “first/third quartile”', 'first quartile (Q1) / third quartile (Q3) (lecture 방식) 줄, Check의 five-number summary'],
    ['두 집합 x, y를 같이 줄 때', 'y 칸에도 넣으면 상관계수 r까지'],
  ],
  pearson: [['“correlation coefficient r between x and y”, “Pearson”', 'x, y를 같은 순서로 (행 = 한 쌍)']],
  corrfeat: [['“which feature is most correlated with y?”', 'X의 열 = feature, y 입력']],
  normalize: [
    ['“normalize to [0, 1]”, “min-max”, “z-score”', 'X 입력 (열 = feature)'],
    ['“replace missing values with the mean”', '빈 칸에 NA (Not Available), Missing values = mean'],
  ],

  /* ---------- Probability ---------- */
  pmf: [
    ['Probability Mass Function (PMF) 표에 k가 있을 때 (X: 1..5, Pr: 0.1, 0.05, 0.05, 0.6, k)', 'values <code>1, 2, 3, 4, 5</code>, Pr <code>0.1, 0.05, 0.05, 0.6, k</code>'],
    ['“P_N(n) = c(1/2)ⁿ for n = 0, 1, 2”', 'values <code>0..2</code>, Pr에 식 하나 <code>c*(1/2)^n</code>'],
    ['“Pr[X takes an odd value]”', 'condition <code>x % 2 == 1</code>'],
    ['“Pr[N ≤ 1]”, “Pr[X < 2]”', 'condition <code>n <= 1</code> / <code>x < 2</code>'],
    ['“mean / expected value / variance of X”', 'expected value E[X], variance Var(X) 줄'],
  ],
  pdf: [
    ['“f_X(x) = cx for 0 ≤ x ≤ 2, find c”', 'f = <code>c*x</code>, support 0 ~ 2'],
    ['“Pr[0 ≤ X ≤ 1]”, “Pr[−1/2 ≤ X ≤ 1/2]”', 'lo, hi에 구간 (support 밖은 자동으로 0)'],
  ],
  gauss: [['“normal distribution with mean 30 Ω and standard deviation (std) 1.8 Ω, probability within 28 Ω to 33 Ω”', 'μ = 30, σ = 1.8, a = 28, b = 33']],
  bayes: [
    ['“Pr[B] = 0.3, Pr[A] = 0.78, Pr[A|B] = 0.6. Find Pr[B|A]”', 'Pr(A|B) = 0.6, Pr(B) = 0.3, Pr(A) = 0.78'],
    ['“What is the probability that an acceptable resistor comes from machine B?”', '“given A, probability of B” = Pr(B|A). A = 주어진 사건(조건), B = 구하는 원인'],
    ['Pr(A)를 안 주고 Pr(A|not B)를 줄 때', 'I know… = 두 번째 옵션'],
  ],
  bayesmulti: [['“pick a box (red 0.4 / blue 0.6), then fruit; given orange, probability box is red?”', 'hypotheses red, blue / priors 0.4, 0.6 / likelihoods Pr(orange|box)']],
  probrules: [
    ['“P(A ∪ B)?”, “are A and B independent?”', 'Pr(A), Pr(B), Pr(A∩B)'],
    ['“valid probability assignment? P[H] = 0.2, P[T] = 0.9”', '아래 칸에 <code>0.2, 0.9</code>'],
  ],
  joint: [['joint probability 표를 줄 때', '표 그대로 (행 = X 값, 열 = Y 값)']],
  dice: [
    ['“two dice, probability the sum equals seven”', 'dice 2, condition <code>s == 7</code>'],
    ['“half the product of three dice exceeds their sum”', 'dice 3, condition <code>p/2 > s</code>'],
  ],
  draws: [
    ['“draw 2 cards without replacement, two Queens in a row”', 'population <code>Q:4, other:48</code>, sequence <code>Q, Q</code>'],
    ['“3 balls R, G, B, draw B then G without replacement”', 'population <code>R:1, G:1, B:1</code>, sequence <code>B, G</code>'],
  ],
  indep: [['“three urns (1 blue 7 red / 2 blue 6 red / 3 red 5 green), probability exactly 2 red”', '각 항아리에서 빨강 확률: <code>7/8, 6/8, 3/8</code> → k = 2 줄']],
  simpson: [['“batting average of two players over two years”, “trend reverses when combined”', '행 = 그룹: A 성공, A 전체, B 성공, B 전체']],

  /* ---------- Data / concepts ---------- */
  noir: [
    ['“Which level of measurement: nominal / ordinal / interval / ratio?”', '3개 질문에 답 (순서? 간격 같음? 0 = 없음?)'],
    ['“Disease Outbreak Response System Condition (DORSCON) colour”, “egg size”, “°C temperature” 등', 'Check 섹션의 예시 표에서 바로 찾기'],
  ],
  nn: [['“nearest neighbour classifier” + 속성 표 (color, size, shape)', '한 줄에 한 샘플 (마지막 = 라벨), query에 새 샘플']],
  facts: [['True / False (T/F) · Multiple Choice Question (MCQ) 개념 문제', '문제의 핵심 단어로 filter (예: under-determined, causation)']],

  /* ---------- Code ---------- */
  code_builder: [
    ['“Write a Python routine def A1_MatricNumber(X, y) that returns (XᵀX)⁻¹ and w”', 'function name = 학번, <b>add bias 해제</b> (X 그대로), return (XᵀX)⁻¹ 체크, predict 해제'],
    ['“function that trains ridge / polynomial and predicts on test data”', '해당 체크박스 켜기'],
  ],
  code_csv: [['“Download the csv … predict the value for year 2021 using linear regression”', 'file 이름, x 열 (year), y 열, predict 2021']],
  code_split: [['“split [0:1500] for training, the rest for testing; report Mean Squared Error (MSE)”', 'source, separator, target 열, split = index, 1500']],
  code_plot: [['“plot the number of … over the years”', 'file, x 열, y 열 (+ 종류별이면 filter 열과 값들)']],
  code_missing: [['“print summary statistics, count zeros, replace them with NaN (Not a Number)”', 'file, header 여부, 0 = 결측인 열 번호']],
  code_iris: [['“iris … 74% training, one-hot, linear / 2nd-order polynomial, number correctly classified”', 'test_size 0.26, random_state, order 2']],
  code_prob: [['“Python: probability by enumerating dice / scipy stats.norm.cdf”', 'task 선택']],
  code_cheats: [['numpy 함수 이름이 기억 안 날 때', 'Generate code → 원하는 줄 복사']],
};

function guideBox(id) {
  const g = GUIDE[id];
  if (!g || !g.length) return null;
  const t = h('table', { class: 'gtab' },
    ...g.map(([q, a]) => h('tr', null, h('td', { class: 'gq', html: q }), h('td', { class: 'garrow' }, '→'), h('td', { class: 'ga', html: a }))));
  return h('details', { class: 'guide', open: true }, h('summary', null, '문제에서 이렇게 나오면 → 이렇게 넣어'), t);
}
