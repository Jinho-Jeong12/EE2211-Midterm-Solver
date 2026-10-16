'use strict';
/* =====================================================================
   tools_code.js — Python code generator (tutorial / assignment style)
   ===================================================================== */

function codeTool(def) {
  const ex = def.example ? `<details class="example" open><summary>예시 (Load example 누르면 이 값으로 채워져)</summary>${def.example}</details>` : '';
  tool({ ...def, desc: (def.desc || '') + ex, cat: 'code', codeOpen: true, solveLabel: 'Generate code' });
}
function pyList(s) { return '[' + String(s).split(',').map(t => t.trim()).filter(Boolean).map(t => (isNaN(+t) ? `'${t}'` : t)).join(', ') + ']'; }
function codeOut(R, code, note) {
  R.answer('Python code', { html: `<pre class="code big">${esc(code)}</pre>` }, { copy: code, sub: note || '' });
}
/* column reference: names ('year') or 0-based numbers (3) */
function colRefs(s) { return String(s).split(',').map(t => t.trim()).filter(Boolean); }
const isIdx = t => /^\d+$/.test(t);

codeTool({
  id: 'code_builder', name: 'Function builder: “I want a function that…” (X, y → w, ŷ, …)', short: 'Function builder',
  kw: 'code generator function builder def return assignment python numpy template 코드 생성 함수',
  desc: 'Tick what the function must do. You get a clean <code>def</code> + example call (paste your arrays in).',
  example: `<b>문제</b> (L5 예제 1): x = −9, −7, −5, 1, 5, 9 → y = −6, −6, −4, −1, 1, 4. bias 넣고 w를 구하는 함수를 만들어라.<br>
<b>입력</b>: function name <code>my_regression</code> · add bias ✔ · predict on X_test ✔ · return (XᵀX)⁻¹ ✔ · example X <code>[[-9], [-7], [-5], [1], [5], [9]]</code> · example y <code>[-6, -6, -4, -1, 1, 4]</code><br>
<b>실행 결과</b>: <code>InvXTX = [[0.1706, 0.0039], [0.0039, 0.0039]]</code>, <code>w = [-1.4375, 0.5625]</code>, <code>y_test_hat = [-6.5, -5.375]</code>`,
  inputs: [
    { k: 'fname', type: 'text', label: 'function name', def: 'my_regression', hint: '예: my_regression, A1_A1234567R (과제면 학번으로)' },
    { k: 'bias', type: 'check', label: 'add bias column of 1s to X', def: true, hint: 'X에 1 열이 이미 있으면 체크 해제' },
    { k: 'poly', type: 'check', label: 'polynomial features (PolynomialFeatures)', def: false },
    { k: 'order', type: 'int', label: 'polynomial order', def: '2', showIf: r => r.poly, hint: '예: 2 → [1, x, x²],  3 → [1, x, x², x³]' },
    { k: 'ridge', type: 'check', label: 'ridge regularization λ (auto primal/dual)', def: false },
    { k: 'target', type: 'select', label: 'target type', def: 'reg', options: [['reg', 'regression y (continuous)'], ['bin', 'binary classification (±1, sign)'], ['multi', 'multi-class (one-hot Y, argmax)']] },
    { k: 'pred', type: 'check', label: 'predict on X_test', def: true, hint: 'X_test의 ŷ도 계산해서 return' },
    { k: 'mse', type: 'check', label: 'compute Mean Squared Error (MSE) (train & test) / accuracy', def: false },
    { k: 'retinv', type: 'check', label: 'also return (XᵀX)⁻¹ (A1 style)', def: true },
    { k: 'Xex', type: 'text', label: 'example X (optional, raw features)', def: '[[-9], [-7], [-5], [1], [5], [9]]', hint: '예: [[-9], [-7], [-5], [1], [5], [9]]  (feature 2개면 [[1, 2], [3, 4], …])' },
    { k: 'yex', type: 'text', label: 'example y (optional)', def: '[-6, -6, -4, -1, 1, 4]', hint: '예: [-6, -6, -4, -1, 1, 4]' },
  ],
  solve(v, R) {
    const args = ['X', 'y'];
    if (v.pred) args.push('X_test');
    if (v.pred && v.mse) args.push('y_test');
    if (v.poly) args.push('order');
    if (v.ridge) args.push('lam');
    const L = ['import numpy as np', 'from numpy.linalg import inv'];
    if (v.poly) L.push('from sklearn.preprocessing import PolynomialFeatures');
    if (v.target === 'multi') L.push('from sklearn.preprocessing import OneHotEncoder');
    if (v.mse && v.target === 'reg') L.push('from sklearn.metrics import mean_squared_error');
    L.push('', `def ${v.fname}(${args.join(', ')}):`);
    const I = s => L.push('    ' + s);
    I('X = np.array(X, dtype=float)');
    if (v.target === 'multi') {
      I('y = np.array(y).reshape(-1, 1)');
      I('enc = OneHotEncoder(sparse_output=False)');
      I('Y = enc.fit_transform(y)            # one-hot targets, columns = sorted classes');
    } else I('Y = np.array(y, dtype=float)');
    if (v.poly) { I('poly = PolynomialFeatures(order)'); I('P = poly.fit_transform(X)            # includes the bias column'); }
    else if (v.bias) I('P = np.hstack((np.ones((X.shape[0], 1)), X))   # bias column');
    else I('P = X');
    I('m, d = P.shape');
    if (v.ridge) {
      I('if m > d:   # primal');
      I('    w = inv(P.T @ P + lam * np.identity(d)) @ P.T @ Y');
      I('else:       # dual');
      I('    w = P.T @ inv(P @ P.T + lam * np.identity(m)) @ Y');
    } else {
      I('if m >= d:  # even / over-determined -> least squares');
      I('    InvXTX = inv(P.T @ P)');
      I('    w = InvXTX @ P.T @ Y');
      I('else:       # under-determined -> right inverse');
      I('    InvXTX = None');
      I('    w = P.T @ inv(P @ P.T) @ Y');
    }
    const ret = [];
    if (v.retinv && !v.ridge) ret.push('InvXTX');
    ret.push('w');
    if (v.mse) {
      I('Y_train_hat = P @ w');
      if (v.target === 'reg') { I('mse_train = mean_squared_error(Y, Y_train_hat)'); ret.push('mse_train'); }
      else if (v.target === 'bin') { I('acc_train = np.mean(np.where(Y_train_hat >= 0, 1, -1) == Y)'); ret.push('acc_train'); }
      else { I('acc_train = np.mean(np.argmax(Y_train_hat, axis=1) == np.argmax(Y, axis=1))'); ret.push('acc_train'); }
    }
    if (v.pred) {
      I('X_test = np.array(X_test, dtype=float)');
      if (v.poly) I('P_test = poly.transform(X_test)      # SAME expansion as training');
      else if (v.bias) I('P_test = np.hstack((np.ones((X_test.shape[0], 1)), X_test))');
      else I('P_test = X_test');
      I('y_test_hat = P_test @ w');
      ret.push('y_test_hat');
      if (v.target === 'bin') { I('y_class = np.where(y_test_hat >= 0, 1, -1)   # sign, 0 -> +1'); ret.push('y_class'); }
      if (v.target === 'multi') { I('y_class = enc.categories_[0][np.argmax(y_test_hat, axis=1)]'); ret.push('y_class'); }
      if (v.mse) {
        if (v.target === 'reg') { I('mse_test = mean_squared_error(np.array(y_test, dtype=float), y_test_hat)'); ret.push('mse_test'); }
        else if (v.target === 'bin') { I('acc_test = np.mean(y_class == np.array(y_test))'); ret.push('acc_test'); }
        else { I('acc_test = np.mean(y_class == np.array(y_test))'); ret.push('acc_test'); }
      }
    }
    I(`return ${ret.join(', ')}`);
    L.push('', '', '# ---- example ----');
    L.push(`X = np.array(${v.Xex || '[[...]]'})`, `y = np.array(${v.yex || '[...]'})`);
    const call = args.map(a => ({ X: 'X', y: 'y', X_test: 'X_test', y_test: 'y_test', order: String(v.order || 2), lam: '0.1' }[a]));
    if (v.pred) L.push('X_test = X[:2]   # replace with your test data');
    if (v.pred && v.mse) L.push('y_test = y[:2]');
    L.push(`out = ${v.fname}(${call.join(', ')})`, 'for o in out:', '    print(o)');
    codeOut(R, L.join('\n'), v.bias && !v.poly ? 'If your X already contains the 1s column, untick “add bias”.' : '');
  },
});

codeTool({
  id: 'code_csv', name: 'Linear regression from a Comma-Separated Values (CSV) file (+ plot + predict)', short: 'Comma-Separated Values (CSV) regression',
  kw: 'csv pandas read_csv linear regression plot predict year expenditure tutorial 5 q5 file',
  desc: '<b>사용법</b>: ① Comma-Separated Values (CSV) 파일 이름을 적어 (py 파일과 같은 폴더에 있어야 해). ② x 열(입력 feature)과 y 열(맞힐 값)을 적어 — 열 <b>이름</b>(예: <code>year</code>) 또는 열 <b>번호</b>(0부터 셈, 예: <code>0</code>)으로. x가 여러 개면 쉼표로 (<code>3, 4</code>). ③ 예측할 x 값을 적어 (x가 여러 개면 순서대로 쉼표로). ④ <b>Generate code</b> 누르고 copy → 파이썬에 붙여넣고 실행. bias(1 열)는 코드가 알아서 붙여.',
  example: `<b>문제</b> (Tutorial 5 Q5): government-expenditure-on-education.csv로 2021년 교육 지출을 linear regression으로 예측하라.<br>
<b>CSV 모양</b>: <code>year,recurrent_expenditure_total,…</code> / <code>1981,942,…</code> / <code>1982,1044,…</code><br>
<b>입력</b>: file <code>government-expenditure-on-education.csv</code> · x <code>year</code> (번호로는 <code>0</code>) · y <code>recurrent_expenditure_total</code> (번호로는 <code>1</code>) · separator <code>,</code> · predict <code>2021</code><br>
<b>실행 결과</b> (튜토리얼 답): <code>w = [-6.4843247e+08, 3.2683591e+05]</code>, <code>prediction: 12102904.27</code>`,
  inputs: [
    { k: 'file', type: 'text', label: 'Comma-Separated Values (CSV) file name (파일 이름)', def: 'government-expenditure-on-education.csv', hint: '예: government-expenditure-on-education.csv' },
    { k: 'xcol', type: 'text', label: 'x column(s) — 이름 또는 번호(0부터), 쉼표로', def: 'year', ph: 'year  또는  3, 4', hint: '예: year  /  번호로 3, 4  (맨 왼쪽 열 = 0)' },
    { k: 'ycol', type: 'text', label: 'y column — 이름 또는 번호', def: 'recurrent_expenditure_total', hint: '예: recurrent_expenditure_total  /  번호로 1' },
    { k: 'sep', type: 'text', label: 'separator (구분자, 보통 , 또는 ;)', def: ',', hint: '예: ,  (와인 데이터는 ;)' },
    { k: 'header', type: 'check', label: '첫 줄이 열 이름(header)이다', def: true },
    { k: 'xnew', type: 'text', label: 'predict at x = (x 여러 개면 쉼표로)', def: '2021', hint: '예: 2021  /  x가 2개면 2, 5' },
    { k: 'plot', type: 'check', label: 'scatter + fitted line plot (x가 1개일 때만)', def: true },
  ],
  solve(v, R) {
    const xs = colRefs(v.xcol), yc = String(v.ycol).trim();
    if (!xs.length) uerr('x column을 적어줘 (이름 또는 번호)');
    if (!yc) uerr('y column을 적어줘');
    const byIdx = xs.every(isIdx), yIdx = isIdx(yc);
    if (!byIdx && xs.some(isIdx)) uerr('x 열은 전부 이름으로 쓰거나 전부 번호로 써줘 (섞으면 안 돼)');
    if (!v.header && (!byIdx || !yIdx)) uerr('header가 없으면 열 이름이 없으니까 번호(0부터)로 적어줘');
    const xsel = byIdx ? `df.iloc[:, [${xs.join(', ')}]]` : `df[${JSON.stringify(xs).replace(/"/g, "'")}]`;
    const ysel = yIdx ? `df.iloc[:, ${yc}]` : `df['${yc}']`;
    const xn = colRefs(v.xnew);
    if (xn.length && xn.length !== xs.length) uerr(`x 열이 ${xs.length}개니까 예측할 x 값도 ${xs.length}개 적어줘 (지금 ${xn.length}개)`);
    const xlab = byIdx ? `column ${xs[0]}` : xs[0], ylab = yIdx ? `column ${yc}` : yc;
    const code = `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from numpy.linalg import inv

df = pd.read_csv("${v.file}"${v.sep !== ',' ? `, sep='${v.sep}'` : ''}${v.header ? '' : ', header=None'})
x = ${xsel}.to_numpy(dtype=float)      # input feature(s)
y = ${ysel}.to_numpy(dtype=float)      # target

X = np.hstack((np.ones((len(y), 1)), x))    # add bias column
w = inv(X.T @ X) @ X.T @ y
print("w =", w)                               # w[0] = intercept, w[1:] = coefficients
${v.plot && xs.length === 1 ? `
plt.plot(x[:, 0], y, 'o', label='data')
plt.plot(x[:, 0], X @ w, label='fitted line')
plt.xlabel('${xlab}'); plt.ylabel('${ylab}'); plt.legend(); plt.show()
` : ''}${xn.length ? `
x_new = np.array([1, ${xn.join(', ')}])                 # 1 for the bias
print("prediction:", x_new @ w)` : ''}`;
    codeOut(R, code, '이 코드를 copy해서 .py 파일이나 Jupyter에 붙여넣고 실행해. Comma-Separated Values (CSV) 파일은 같은 폴더에 있어야 해.');
  },
});

codeTool({
  id: 'code_split', name: 'Train/test split + Mean Squared Error (MSE) (wine style)', short: 'Split + Mean Squared Error (MSE)',
  kw: 'train test split index slice mse mean squared error wine quality dataset url tutorial 5 q6 sklearn train_test_split',
  example: `<b>문제</b> (Tutorial 5 Q6): red wine 데이터에서 quality를 target으로, 0~1499는 train, 나머지는 test. linear regression 후 test Mean Squared Error (MSE)를 구하라.<br>
<b>입력</b>: source <code>winequality-red.csv URL</code> · separator <code>;</code> · target <code>quality</code> · split <code>by index</code> · <code>1500</code> · λ <code>0</code><br>
<b>실행 결과</b> (튜토리얼 답): <code>test MSE : 0.3435</code>`,
  inputs: [
    { k: 'src', type: 'text', label: 'data source (file or URL)', def: 'https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv', hint: '예: winequality-red.csv 또는 URL' },
    { k: 'sep', type: 'text', label: 'separator', def: ';', hint: '예: ;  (일반 Comma-Separated Values (CSV) 파일은 ,)' },
    { k: 'ycol', type: 'text', label: 'target column', def: 'quality', hint: '예: quality' },
    { k: 'how', type: 'select', label: 'split', def: 'index', options: [['index', 'by index (first N train, rest test)'], ['ratio', 'train_test_split (random)']] },
    { k: 'n', type: 'text', label: 'train end index / test_size', def: '1500', hint: 'index면 train 끝 번호 (예: 1500 → 0~1499 train, 나머지 test). ratio면 test 비율 (예: 0.2)' },
    { k: 'lam', type: 'number', label: 'ridge λ (0 = none)', def: '0', hint: '예: 0 (ridge 없음), 0.1' },
  ],
  solve(v, R) {
    const code = `import numpy as np
import pandas as pd
from numpy.linalg import inv
from sklearn.metrics import mean_squared_error
${v.how === 'ratio' ? 'from sklearn.model_selection import train_test_split\n' : ''}
data = pd.read_csv("${v.src}", sep='${v.sep}')
y = data['${v.ycol}'].to_numpy(dtype=float)
x = data.drop('${v.ycol}', axis=1).to_numpy(dtype=float)
X = np.hstack((np.ones((len(y), 1)), x))        # bias column

${v.how === 'index' ? `train_X, train_y = X[0:${v.n}], y[0:${v.n}]
test_X,  test_y  = X[${v.n}:], y[${v.n}:]` : `train_X, test_X, train_y, test_y = train_test_split(X, y, test_size=${v.n}, random_state=0)`}

lam = ${pyNum(v.lam)}
d = train_X.shape[1]
w = inv(train_X.T @ train_X + lam * np.identity(d)) @ train_X.T @ train_y
print(w)

y_test_hat = test_X @ w
print("test MSE :", mean_squared_error(test_y, y_test_hat))
print("train MSE:", mean_squared_error(train_y, train_X @ w))`;
    codeOut(R, code);
  },
});

codeTool({
  id: 'code_plot', name: 'Read Comma-Separated Values (CSV) & plot columns (optionally filter by category)', short: 'Comma-Separated Values (CSV) plot',
  kw: 'plot matplotlib csv pandas visualization line chart filter category tutorial 2 buses vehicles',
  example: `<b>문제</b> (Tutorial 2 Q2): 연도별 Omnibuses, Excursion buses, Private buses 수를 그래프로 그려라.<br>
<b>CSV 모양</b>: <code>year,category,type,number</code> / <code>2005,Omnibuses,Omnibuses,2952</code> …<br>
<b>입력</b>: x <code>year</code> · y <code>number</code> · filter column <code>type</code> · values <code>Omnibuses, Excursion buses, Private buses</code><br>
<b>결과</b>: 버스 종류별로 선 3개가 있는 그래프 (legend 포함)`,
  inputs: [
    { k: 'file', type: 'text', label: 'Comma-Separated Values (CSV) file', def: 'annual-motor-vehicle-population-by-vehicle-type.csv', hint: '예: annual-motor-vehicle-population-by-vehicle-type.csv' },
    { k: 'x', type: 'text', label: 'x column', def: 'year', hint: '예: year' },
    { k: 'y', type: 'text', label: 'y column', def: 'number', hint: '예: number' },
    { k: 'fcol', type: 'text', label: 'filter column (optional)', def: 'type', hint: '예: type  (비우면 전체를 한 줄로 그림)' },
    { k: 'fvals', type: 'text', label: 'values to plot (comma separated)', def: 'Omnibuses, Excursion buses, Private buses', hint: '예: Omnibuses, Excursion buses, Private buses' },
  ],
  solve(v, R) {
    const vals = v.fvals.split(',').map(s => s.trim()).filter(Boolean);
    const code = v.fcol.trim() ? `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("${v.file}")
for name in ${JSON.stringify(vals)}:
    sub = df.loc[df['${v.fcol}'] == name]
    plt.plot(sub['${v.x}'], sub['${v.y}'], label=name)
plt.xlabel('${v.x}'); plt.ylabel('${v.y}')
plt.title('${v.y} over ${v.x}')
plt.legend(); plt.show()` : `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("${v.file}")
plt.plot(df['${v.x}'], df['${v.y}'], label='${v.y}')
plt.xlabel('${v.x}'); plt.ylabel('${v.y}'); plt.legend(); plt.show()`;
    codeOut(R, code);
  },
});

codeTool({
  id: 'code_missing', name: 'Summary statistics & missing values (zeros → Not a Number (NaN))', short: 'describe / Not a Number (NaN)',
  kw: 'describe summary statistics missing values nan replace zero count pima diabetes isnull',
  example: `<b>문제</b> (Tutorial 2 Q5): Pima diabetes 데이터의 summary 출력, 1~5번 열에서 0의 개수 세기, 0을 NaN (Not a Number)으로 바꾸기.<br>
<b>입력</b>: file <code>pima-indians-diabetes.csv</code> · header 없음 (체크 해제) · columns <code>1, 2, 3, 4, 5</code><br>
<b>실행 결과</b>: 0 개수 → <code>1: 5, 2: 35, 3: 227, 4: 374, 5: 11</code>, 바꾼 뒤 <code>isnull().sum()</code>에 같은 숫자가 나와`,
  inputs: [
    { k: 'file', type: 'text', label: 'Comma-Separated Values (CSV) file', def: 'pima-indians-diabetes.csv', hint: '예: pima-indians-diabetes.csv' },
    { k: 'header', type: 'check', label: 'file has a header row', def: false },
    { k: 'cols', type: 'text', label: 'columns where 0 means missing', def: '1, 2, 3, 4, 5', hint: '예: 1, 2, 3, 4, 5  (0부터 센 열 번호)' },
  ],
  solve(v, R) {
    const cols = pyList(v.cols);
    const code = `import numpy as np
from pandas import read_csv

dataset = read_csv('${v.file}'${v.header ? '' : ', header=None'})
print(dataset.describe())                     # (a) summary statistics
print((dataset[${cols}] == 0).sum())          # (b) number of zeros per column
dataset[${cols}] = dataset[${cols}].replace(0, np.nan)   # (c) zeros -> NaN
print(dataset.head(20))
print(dataset.isnull().sum())
# mean imputation:
# dataset.fillna(dataset.mean(), inplace=True)`;
    codeOut(R, code);
  },
});

codeTool({
  id: 'code_iris', name: 'sklearn dataset (iris) classification: one-hot + linear / polynomial', short: 'Iris classification',
  kw: 'iris load_iris sklearn dataset classification one hot polynomial accuracy train_test_split scatter_matrix tutorial 6 q6',
  example: `<b>문제</b> (Tutorial 6 Q6): iris를 74% train / 26% test로 나누고, one-hot target으로 linear, 2차 polynomial 분류를 해서 맞힌 test 개수를 구하라.<br>
<b>입력</b>: test_size <code>0.26</code> · random_state <code>0</code> · order <code>2</code><br>
<b>실행 결과</b> (직접 실행해서 확인): <code>linear: correct = 30 / 39</code>, <code>poly order 2: correct = 38 / 39</code>`,
  inputs: [
    { k: 'test', type: 'number', label: 'test_size', def: '0.26', hint: '예: 0.26 → 26%를 test로' },
    { k: 'rs', type: 'int', label: 'random_state', def: '0', hint: '예: 0  (같은 숫자면 매번 같은 split)' },
    { k: 'order', type: 'int', label: 'polynomial order (1 = linear only)', def: '2', hint: '예: 2 → 2차 polynomial도 같이 비교' },
    { k: 'scatter', type: 'check', label: 'also scatter-matrix plot', def: false },
  ],
  solve(v, R) {
    const code = `import numpy as np
import pandas as pd
from numpy.linalg import inv
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, PolynomialFeatures

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(iris['data'], iris['target'], test_size=${pyNum(v.test)}, random_state=${v.rs})
${v.scatter ? `
df = pd.DataFrame(X_train, columns=iris.feature_names)
pd.plotting.scatter_matrix(df, c=y_train, figsize=(15, 15), marker='o', hist_kwds={'bins': 20})
` : ''}
enc = OneHotEncoder(sparse_output=False)
Y_train = enc.fit_transform(y_train.reshape(-1, 1))

def fit_predict(P_train, P_test):
    m, d = P_train.shape
    if m > d:
        W = inv(P_train.T @ P_train) @ P_train.T @ Y_train
    else:
        W = P_train.T @ inv(P_train @ P_train.T) @ Y_train
    return np.argmax(P_test @ W, axis=1)

# (c) linear classifier with bias
P1 = np.hstack((np.ones((len(X_train), 1)), X_train))
P1t = np.hstack((np.ones((len(X_test), 1)), X_test))
pred = fit_predict(P1, P1t)
print("linear: correct =", np.sum(pred == y_test), "/", len(y_test))
${v.order > 1 ? `
# (d) polynomial order ${v.order}
poly = PolynomialFeatures(${v.order})
P2 = poly.fit_transform(X_train)
P2t = poly.transform(X_test)
pred2 = fit_predict(P2, P2t)
print("poly order ${v.order}: correct =", np.sum(pred2 == y_test), "/", len(y_test))` : ''}`;
    codeOut(R, code);
  },
});

codeTool({
  id: 'code_prob', name: 'Probability in Python (dice enumeration, normal Cumulative Distribution Function (CDF), Probability Mass Function (PMF))', short: 'Probability code',
  kw: 'probability python dice enumerate defaultdict scipy stats norm cdf pmf expectation code tutorial 3',
  example: `<b>결과 예시</b>: dice → <code>{7: 0.1667, …}</code> (합이 7일 확률 = 1/6) · 3 dice → <code>True: 0.6296</code> · normal (μ=30, σ=1.8, 28~33) → <code>inside: 81.9%  outside: 18.1%</code> · Probability Mass Function (PMF) → <code>mean 3.75, var 1.2875, std 1.1347, Pr[X odd] 0.35</code>`,
  inputs: [{ k: 'which', type: 'select', label: 'task', def: 'dice', options: [['dice', 'dice: distribution of the sum of 2 dice'], ['dice3', '3 dice: half the product > sum'], ['norm', 'normal distribution interval probability'], ['pmf', 'Probability Mass Function (PMF): mean, variance']] }],
  solve(v, R) {
    const C = {
      dice: `from collections import defaultdict
d = {(i, j): i + j for i in range(1, 7) for j in range(1, 7)}
dinv = defaultdict(list)
for pair, s in d.items():
    dinv[s].append(pair)
X = {s: len(pairs) / 36 for s, pairs in dinv.items()}
print(X)           # X[7] = 1/6`,
      dice3: `from collections import defaultdict
d = {(i, j, k): (i * j * k) / 2 > i + j + k for i in range(1, 7) for j in range(1, 7) for k in range(1, 7)}
dinv = defaultdict(list)
for t, ok in d.items():
    dinv[ok].append(t)
print({k: len(v) / 6**3 for k, v in dinv.items()})   # True: 0.6296`,
      norm: `from scipy import stats
mu, sigma = 30, 1.8
x1, x2 = 28, 33
P = stats.norm.cdf(x2, mu, sigma) - stats.norm.cdf(x1, mu, sigma)
print(f"inside: {P*100:.1f}%  outside: {(1-P)*100:.1f}%")`,
      pmf: `import numpy as np
x = np.array([1, 2, 3, 4, 5])
p = np.array([0.1, 0.05, 0.05, 0.6, 0.2])
mean = np.sum(x * p)
var = np.sum(p * (x - mean) ** 2)
print(mean, var, np.sqrt(var))
print(p[x % 2 == 1].sum())      # Pr[X odd]`,
    };
    codeOut(R, C[v.which]);
  },
});

codeTool({
  id: 'code_cheats', name: 'numpy / sklearn cheat sheet (all EE2211 L1–6 one-liners)', short: 'numpy cheat sheet',
  kw: 'numpy cheat sheet functions inv det rank pinv transpose hstack eye argmax sign onehotencoder polynomialfeatures mean_squared_error ddof',
  inputs: [],
  solve(v, R) {
    codeOut(R, `import numpy as np
from numpy.linalg import inv, det, matrix_rank, pinv
A = np.array([[1, 2], [3, 4]])      # matrix (rows = samples)
x = np.array([1, 2])                 # 1-D vector
A.T                                  # transpose
A @ B                                # matrix product  (A * B is ELEMENT-WISE!)
x @ y                                # dot product x^T y
np.linalg.norm(x)                    # Euclidean length
inv(A); det(A); matrix_rank(A); pinv(A)
np.identity(3)                       # I_3
np.hstack((np.ones((X.shape[0], 1)), X))   # add bias column
inv(X.T @ X) @ X.T @ y               # left inverse / least squares (m > d)
X.T @ inv(X @ X.T) @ y               # right inverse (m < d)
inv(X.T @ X + lam * np.identity(X.shape[1])) @ X.T @ y     # ridge primal
X.T @ inv(X @ X.T + lam * np.identity(X.shape[0])) @ y     # ridge dual
np.sign(X_new @ w)                   # binary class (sign(0) = 0 !)
np.argmax(X_new @ W, axis=1)         # multi-class (0-based index)

from sklearn.preprocessing import OneHotEncoder, PolynomialFeatures
Y = OneHotEncoder(sparse_output=False).fit_transform(labels.reshape(-1, 1))
poly = PolynomialFeatures(2); P = poly.fit_transform(X); P_new = poly.transform(X_new)
from sklearn.metrics import mean_squared_error
mean_squared_error(y, y_hat)         # = np.mean((y - y_hat)**2)

np.mean(x); np.median(x); np.var(x); np.std(x)       # population (ddof=0)
np.var(x, ddof=1); np.std(x, ddof=1)                 # sample (ddof=1, pandas default)
np.corrcoef(x, y)[0, 1]                              # Pearson r
from scipy import stats; stats.norm.cdf(x, mu, sigma)`);
  },
});
