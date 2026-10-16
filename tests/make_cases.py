#!/usr/bin/env python3
"""Independent expected values (numpy / scipy) for the browser check tests/check.html.
Writes tests/cases.json: [{id, set: {key: value}, expect: [numbers], text: [substrings]}]"""
import json, math, itertools, pathlib
import numpy as np
from scipy import stats, integrate
C = []
def case(id, set, expect=(), text=(), note=''):
    C.append({'id': id, 'set': set, 'expect': [float(x) for x in np.ravel(expect)], 'text': list(text), 'note': note})
M = lambda A: [[str(x) for x in r] for r in A]
V = lambda v: [str(x) for x in v]
def lsq(X, y): return np.linalg.solve(X.T @ X, X.T @ y)
ones = lambda X: np.hstack([np.ones((X.shape[0], 1)), X])

# ---------- linear regression ----------
X = np.array([[1, 2], [0, 6], [1, 0], [0, 5], [1, 7]], float); y = np.arange(1, 6, dtype=float)
Xb = ones(X); w = lsq(Xb, y); e = Xb @ w - y
case('lrtrain', {'X': M(X), 'y': V(y), 'bias': True, 'doPred': True, 'Xnew': M([[1, 3]]), 'lam': '0'},
     [*w, e @ e, e @ e / 5, math.sqrt(e @ e / 5), np.abs(e).mean(), np.array([1, 1, 3]) @ w, *(e ** 2)], ['Squared error loss', 'Mean Squared Error (MSE)', 'Normal equation'], 'midterm-style Q5 with bias')
w2 = lsq(X, y); e2 = X @ w2 - y
case('lrtrain', {'X': M(X), 'y': V(y), 'bias': False, 'doPred': True, 'Xnew': M([[1, 3]]), 'lam': '0'}, [*w2, e2 @ e2, e2 @ e2 / 5, np.array([1, 3]) @ w2], [], 'Q5 without bias')
XL = np.array([[-9], [-7], [-5], [1], [5], [9]], float); yL = np.array([-6, -6, -4, -1, 1, 4], float)
wL = lsq(ones(XL), yL)
case('lrtrain', {'X': M(XL), 'y': V(yL), 'bias': True, 'doPred': True, 'Xnew': M([[-1]]), 'lam': '0'}, [*wL, wL @ [1, -1]], [], 'Lecture 5 example')
# ridge primal (bias penalised like the lecture: I is d×d over all of w)
lam = 0.1; A = ones(XL)
wr = np.linalg.solve(A.T @ A + lam * np.eye(2), A.T @ yL); er = A @ wr - yL
case('lrtrain', {'X': M(XL), 'y': V(yL), 'bias': True, 'doPred': True, 'Xnew': M([[-1]]), 'lam': '0.1', 'mode': 'auto'}, [*wr, wr @ [1, -1], er @ er, er @ er + lam * wr @ wr], ['Ridge PRIMAL'], 'ridge primal λ=0.1')
XT = np.array([[1, 0, 1], [2, -1, 1], [1, 1, 5]], float); yT = np.array([1, 2, 3], float); B = ones(XT)
wd = B.T @ np.linalg.solve(B @ B.T + lam * np.eye(3), yT); Xn = ones(np.array([[-1, 2, 8], [1, 5, -1]], float))
case('lrtrain', {'X': M(XT), 'y': V(yT), 'bias': True, 'doPred': True, 'Xnew': M([[-1, 2, 8], [1, 5, -1]]), 'lam': '0.1', 'mode': 'auto'}, [*wd, *(Xn @ wd)], ['Ridge DUAL'], 'ridge dual λ=0.1 (Tutorial 5 data)')
# loss for a given w
wg = np.array([-1.4375, 0.5625]); eg = ones(XL) @ wg - yL
case('lrloss', {'X': M(XL), 'y': V(yL), 'bias': True, 'w': V(wg), 'lam': '0'}, [eg @ eg, eg @ eg / 6, *eg], [], 'loss at given w')
case('lrloss', {'X': M(XL), 'y': V(yL), 'bias': True, 'w': V(wg), 'lam': '0.5'}, [eg @ eg, 0.5 * wg @ wg, eg @ eg + 0.5 * wg @ wg], [], 'ridge objective at given w')
ya, yh = np.array([3, -0.5, 2, 7]), np.array([2.5, 0, 2, 8]); d = yh - ya
case('mse', {'y': V(ya), 'yh': V(yh)}, [d @ d / 4, d @ d, math.sqrt(d @ d / 4), np.abs(d).mean()], [], 'error measures')
case('lrpredict', {'w': V([-1.4375, 0.5625]), 'Xnew': M([[-1], [2]]), 'bias': True}, [-2, -0.3125], [], 'predict')
# multi-output
XM = np.array([[3], [4], [10], [6], [7]], float); YM = np.array([[0, 5], [1.5, 4], [-3, 8], [-4, 10], [1, 6]]); WM = lsq(ones(XM), YM)
case('lrmulti', {'X': M(XM), 'Y': M(YM), 'bias': True, 'doPred': True, 'Xnew': M([[2]])}, [*WM.ravel(), *(np.array([1, 2]) @ WM)], [], 'multi-output')

# ---------- polynomial ----------
xp = np.array([-10, -8, -3, -1, 2, 8], float); yp = np.array([5, 5, 4, 3, 2, 2], float)
P = np.vstack([xp ** k for k in range(4)]).T; wp = lsq(P, yp)
case('polytrain', {'X': M(xp[:, None]), 'y': V(yp), 'deg': '3', 'lam': '0', 'doPred': True, 'Xnew': M([[9]])}, [*wp, np.array([9.0 ** k for k in range(4)]) @ wp], [], 'polynomial order 3')
x2 = np.array([[0, 0], [1, 1], [1, 0], [0, 1]], float); pf = lambda r: [1, r[0], r[1], r[0] ** 2, r[0] * r[1], r[1] ** 2]
P2 = np.array([pf(r) for r in x2]); yb = np.array([-1, -1, 1, 1], float)
wp2 = P2.T @ np.linalg.solve(P2 @ P2.T, yb)  # m < d → dual / right inverse
case('polybin', {'X': M(x2), 'labels': '-1, -1, 1, 1', 'deg': '2', 'lam': '0', 'doPred': True, 'Xnew': M([[0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]])},
     [np.array(pf(r)) @ wp2 for r in [[0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]]], [], 'XOR order 2 (dual)')

# ---------- classification ----------
wb = lsq(ones(XL), np.array([-1, -1, -1, 1, 1, 1], float))
case('bintrain', {'X': M(XL), 'labels': '-1, -1, -1, 1, 1, 1', 'bias': True, 'lam': '0', 'doPred': True, 'Xnew': M([[-2]])}, [*wb, wb @ [1, -2], 1.0], ['−1'], 'binary sign')
Xc = np.array([[1, 1], [-1, 1], [1, 3], [1, 0]], float); Yc = np.array([[1, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]], float)
Wc = lsq(ones(Xc), Yc); Sn = ones(np.array([[6, 8], [0, -1]], float)) @ Wc
case('multitrain', {'X': M(Xc), 'labels': '1, 2, 1, 3', 'bias': True, 'lam': '0', 'doPred': True, 'Xnew': M([[6, 8], [0, -1]])}, [*Wc.ravel(), *Sn.ravel()], [f'Class {np.argmax(Sn[0]) + 1}', f'Class {np.argmax(Sn[1]) + 1}'], 'multi-class one-hot')

# ---------- linear systems ----------
Xs = np.array([[1, 4], [2, 7], [-3, 11]], float); ys = np.array([1, 2.5, 4])
case('solve', {'form': 'Xw', 'X': M(Xs), 'y': V(ys)}, [*lsq(Xs, ys)], ['NO exact solution', 'over-determined'], 'over-determined, inconsistent')
Xq = np.array([[2, 1], [1, 3]], float); yq = np.array([3, 5], float)
case('solve', {'form': 'Xw', 'X': M(Xq), 'y': V(yq)}, [*np.linalg.solve(Xq, yq)], ['unique'], 'square')
Xw = np.array([[1, 1, 1], [1, -1, 2]], float); yw = np.array([3, 1], float)
case('solve', {'form': 'Xw', 'X': M(Xw), 'y': V(yw)}, [*(Xw.T @ np.linalg.solve(Xw @ Xw.T, yw))], ['infinitely many'], 'under-determined (right inverse)')
Xr = np.array([[1, 2], [2, 4], [1, -1]], float); yc = Xr @ np.array([1, 2.0])
case('solve', {'form': 'Xw', 'X': M(Xr), 'y': V(yc)}, [1, 2], ['unique'], 'tall but consistent (rank test exception)')
XwT = np.array([[1, 2], [3, 4], [5, 6]], float); yT2 = np.array([7, 8], float)  # wᵀX = yᵀ  ⇔  Xᵀw = y
case('solve', {'form': 'wX', 'X': M(XwT), 'y': V(yT2)}, [*(XwT @ np.linalg.solve(XwT.T @ XwT, yT2))], [], 'wᵀX = yᵀ form')

# ---------- matrix ----------
A3 = np.array([[1, 2, 3], [0, 4, 5], [1, 0, 6]], float)
minors = np.array([[np.linalg.det(np.delete(np.delete(A3, i, 0), j, 1)) for j in range(3)] for i in range(3)])
cof = minors * np.array([[(-1) ** (i + j) for j in range(3)] for i in range(3)])
case('report', {'A': M(A3)}, [np.linalg.det(A3), *np.linalg.inv(A3).ravel(), *minors.ravel(), *cof.ravel(), *cof.T.ravel()], ['Rank', 'Inverse'], '3×3 everything')
A32 = np.array([[1, 2], [2, 4], [1, -1]], float)
case('report', {'A': M(A32)}, [*np.linalg.pinv(A32).ravel(), *(A32.T @ A32).ravel()], [], '3×2 rank 2')
A_sing = np.array([[1, 2], [2, 4]], float)
case('report', {'A': M(A_sing)}, [0, *np.linalg.pinv(A_sing).ravel()], ['singular'], 'singular 2×2')
case('linindep', {'V': M([[1, 2], [1, 2], [0, 1]]), 'as': 'cols'}, [], ['independent'], 'independent columns')

# ---------- statistics ----------
xs = np.array([1, 3, 4, 6, 6, 7, 8], float); ys2 = np.array([2, 4, 5, 7, 6, 9, 9], float)
r = np.corrcoef(xs, ys2)[0, 1]
case('descstats', {'x': '1, 3, 4, 6, 6, 7, 8', 'y': '2, 4, 5, 7, 6, 9, 9'},
     [xs.mean(), 6, xs.var(), xs.std(), xs.var(ddof=1), xs.std(ddof=1), 3, 7, 4, 7, r, r * r, np.cov(xs, ys2, bias=True)[0, 1], np.cov(xs, ys2)[0, 1]], [], 'descriptive + Pearson')
xa = np.array([36, 28, 35, 39, 30, 30, 31, 38, 36, 38, 29, 26], float); ya2 = np.array([31, 29, 34, 35, 29, 30, 30, 38, 34, 33, 29, 26], float)
case('descstats', {'x': ', '.join(map(str, xa.astype(int))), 'y': ', '.join(map(str, ya2.astype(int)))}, [np.corrcoef(xa, ya2)[0, 1]], [], 'lecture Pearson data')
Xn2 = np.array([[1.2234, 30033.81], [1.3456, np.nan], [0.9988, 36034.33], [1.1858, 34037.35]])
case('normalize', {}, [np.nanmean(Xn2[:, 1])], [], 'NA filled with mean (default example)')

# ---------- probability ----------
px = np.array([1, 2, 3, 4, 5.]); pp = np.array([0.1, 0.05, 0.05, 0.6, 0.2]); E = px @ pp; E2 = px ** 2 @ pp
case('pmf', {'xs': '1, 2, 3, 4, 5', 'ps': '0.1, 0.05, 0.05, 0.6, k', 'cond': 'x % 2 == 1'}, [0.2, E, E2, E2 - E * E, math.sqrt(E2 - E * E), 0.35], [], 'PMF unknown k')
nn = np.arange(0, 3); pn = 0.5 ** nn; c = 1 / pn.sum()
case('pmf', {'xs': '0..2', 'ps': 'c*(1/2)^n', 'cond': 'n <= 1'}, [c, c * (1 + 0.5)], [], 'P_N(n) = c(1/2)^n')
f = lambda t: 0.5 * t; Ep = integrate.quad(lambda t: t * f(t), 0, 2)[0]; E2p = integrate.quad(lambda t: t * t * f(t), 0, 2)[0]
case('pdf', {'f': 'c*x', 'a': '0', 'b': '2', 'lo': '-1/2', 'hi': '1/2'}, [0.5, integrate.quad(f, 0, 0.5)[0], Ep, E2p - Ep ** 2], [], 'PDF c·x on [0,2]')
Fa, Fb = stats.norm.cdf(28, 30, 1.8), stats.norm.cdf(33, 30, 1.8)
case('gauss', {'mu': '30', 's': '1.8', 'a': '28', 'b': '33', 'p': ''}, [Fb - Fa, 1 - (Fb - Fa), Fa, 1 - Fb], [], 'Tutorial 3 resistor')
case('bayes', {'mode': 'pa', 'ab': '0.6', 'b': '0.3', 'a': '0.78'}, [0.6 * 0.3 / 0.78], [], 'Bayes')
case('bayes', {'mode': 'pnb', 'ab': '0.6', 'b': '0.3', 'anb': '0.85'}, [0.6 * 0.3 + 0.85 * 0.7, 0.18 / (0.18 + 0.85 * 0.7)], [], 'Bayes via total probability')
case('bayesmulti', {'names': 'red, blue', 'prior': '0.4, 0.6', 'lik': '0.75, 0.25'}, [0.45, 0.3 / 0.45, 0.15 / 0.45], [], 'Bayes multi')
case('probrules', {'a': '0.5', 'b': '0.4', 'ab': '0.2', 'list': ''}, [0.7, 0.5, 0.4], ['YES'], 'union / conditional / independence')
case('joint', {'P': M([[0.1, 0.2], [0.3, 0.4]])}, [0.3, 0.7, 0.4, 0.6, 0.1 / 0.3, 0.2 / 0.6], [], 'joint table')
two = [(a, b) for a in range(1, 7) for b in range(1, 7)]
case('dice', {'n': '2', 'sides': '1,2,3,4,5,6', 'cond': 's == 7'}, [sum(a + b == 7 for a, b in two) / 36], [], '2 dice sum 7')
three = list(itertools.product(range(1, 7), repeat=3))
case('dice', {'n': '3', 'sides': '1,2,3,4,5,6', 'cond': 'p/2 > s'}, [sum(a * b * c / 2 > a + b + c for a, b, c in three) / 216], [], 'Tutorial 3: half product > sum')
case('indep', {'p': '7/8, 6/8, 3/8'}, [7/8*6/8*5/8 + 7/8*2/8*3/8 + 1/8*6/8*3/8], [], 'exactly 2 of 3 urns')

# ---------- calculator / equations ----------
case('calc', {'lines': '1/3 + 1/7\nsqrt(8)/2\nnCr(10, 3) * 0.5^10\n(1/2 + 1/3) / (1/4)'}, [10/21, math.sqrt(2), 120/1024, 10/3], ['10/21', '√2', '15/128', '10/3'], 'calculator')
case('eqsolve', {'eq': '2x^2 - 3x - 2 = 0', 'x': 'x', 'known': '', 'range': ''}, [-0.5, 2], ['−1/2'], 'quadratic')
case('eqsolve', {'eq': 'solve(x^3 - 6x^2 + 11x - 6 = 0, x)', 'x': '', 'known': '', 'range': ''}, [1, 2, 3], [], 'cubic, TI syntax')
case('eqsolve', {'eq': 'exp(x) = 3', 'x': 'x', 'known': '', 'range': '-1000, 1000'}, [math.log(3)], [], 'exp')
case('eqsolve', {'eq': 'x^2 - 2 = 0', 'x': 'x', 'known': '', 'range': ''}, [-math.sqrt(2), math.sqrt(2)], ['√2'], 'surd roots')
case('eqsystem', {'eqs': '2x + 3y - z = 5\nx - y + 2z = 3\n3x + y + z = 10', 'vars': '', 'known': ''}, [*np.linalg.solve([[2, 3, -1], [1, -1, 2], [3, 1, 1]], [5, 3, 10])], ['23/5', '−9/5'], 'linear 3×3 exact')
case('eqsystem', {'eqs': 'x^2 + y^2 = 25\nx + y = 7', 'vars': '', 'known': ''}, [3, 4], ['Solution 2'], 'nonlinear')
case('eqsystem', {'eqs': 'x + y = 1\nx + y = 3', 'vars': '', 'known': ''}, [], ['no solution'], 'inconsistent')

# ---------- functions ----------
case('func', {'f': 'x^3 - 6x^2 + 9x + 1', 'pt': 'x=2', 'dom': '[0, 5]'}, [3, -3, 0, 5, 21], ['local max', 'local min'], '1-D: value, derivative, extrema')
H = np.array([[2, 1], [1, 4]], float); s = np.linalg.solve(H, [4, 0]); fmin = s[0] ** 2 + s[0] * s[1] + 2 * s[1] ** 2 - 4 * s[0]
case('func', {'f': 'x1^2 + x1*x2 + 2x2^2 - 4x1', 'pt': 'x1=1, x2=2', 'dom': ''}, [7, 0, 9, 2, 1, 4, *s, fmin], ['convex'], 'multivariable: gradient, Hessian, stationary point')
case('func', {'f': '2.3 - 2x1 + 1.3x2 - x3', 'pt': '', 'dom': ''}, [2.3], ['AFFINE but NOT linear'], 'affine check')

json.dump(C, open(pathlib.Path(__file__).with_name('cases.json'), 'w'), indent=1)
print(len(C), 'cases')
