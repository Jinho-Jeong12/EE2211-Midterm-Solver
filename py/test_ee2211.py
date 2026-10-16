# =====================================================================
# EE2211 Solver made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""test_ee2211.py — checks every module against independent numpy / scipy answers
(lecture and tutorial examples). Run:  python3 test_ee2211.py"""
from fractions import Fraction
import numpy as np
from ee_matrix import det, inverse, rank, solve_system, solution_type, lin_indep, pinv
from ee_regression import linreg, polyreg, binary_class, multi_class, loss_at, errors, num_params, poly_features
from ee_prob import desc_stats, pearson, pmf, pdf, normal_prob, bayes, bayes_multi, dice, exactly_k, draws
from ee_calculus import gradient, hessian, stationary, min_max_1d, linear_or_affine, solve_eq, solve_system_eq

ok = 0


def check(name, got, want, tol=1e-6):
    global ok
    g, w = np.array(got, dtype=float).ravel(), np.array(want, dtype=float).ravel()
    assert g.shape == w.shape and np.allclose(g, w, atol=tol), f"{name}: got {g}, want {w}"
    ok += 1


ones = lambda X: np.hstack([np.ones((len(X), 1)), np.array(X, float)])
lsq = lambda X, y: np.linalg.solve(X.T @ X, X.T @ y)
q = dict(show=False)

# ---- matrix ----
A = [[2, 1, 3], [0, -1, 4], [1, 2, 0]]
check("det", float(det(A, **q)), np.linalg.det(A))
check("inverse", np.array(inverse(A, **q), dtype=float), np.linalg.inv(A))
assert inverse([[1, 2], [2, 4]], **q) is None
check("rank", rank([[1, 2, 3], [2, 4, 6], [1, 0, 1]], **q), 2)
assert det([[1, 2], [3, 4]], **q) == Fraction(-2)
X = [[1, 1], [1, -1], [1, 0]]; y = [1, 0, 2]
check("solve over-determined", np.array(solve_system(X, y, **q), dtype=float), lsq(np.array(X, float), np.array(y, float)))
Xw = [[1, 2, 3], [0, 1, 1]]; yw = [1, 2]
Xw_ = np.array(Xw, float)
check("solve under-determined", np.array(solve_system(Xw, yw, **q), dtype=float), Xw_.T @ np.linalg.solve(Xw_ @ Xw_.T, yw))
assert solution_type([[1, 2], [2, 4]], [1, 3], **q) == "no solution"
assert solution_type([[1, 2], [2, 4]], [1, 2], **q) == "infinitely many solutions"
assert solution_type([[1, 0], [0, 1]], [1, 2], **q) == "unique solution"
assert lin_indep([[1, 0, 0], [0, 1, 0]], **q) and not lin_indep([[1, 2], [2, 4]], **q)
check("pinv", np.array(pinv(X, **q), dtype=float), np.linalg.pinv(np.array(X, float)))

# ---- regression (cases copied from tests/make_cases.py) ----
X = np.array([[1, 2], [0, 6], [1, 0], [0, 5], [1, 7]], float); y = np.arange(1, 6, dtype=float)
w = lsq(ones(X), y); e = ones(X) @ w - y
r = linreg(X, y, X_new=[[1, 3]], **q)
check("linreg w", r["w"], w); check("linreg SSE", r["SSE"], e @ e); check("linreg MSE", r["MSE"], e @ e / 5)
check("linreg predict", r["pred"], [np.array([1, 1, 3]) @ w])
check("linreg no bias", linreg(X, y, bias=False, **q)["w"], lsq(X, y))
XL = np.array([[-9], [-7], [-5], [1], [5], [9]], float); yL = np.array([-6, -6, -4, -1, 1, 4], float)
check("Lecture 5 example", linreg(XL, yL, **q)["w"], lsq(ones(XL), yL))
Aridge = ones(XL); wr = np.linalg.solve(Aridge.T @ Aridge + 0.1 * np.eye(2), Aridge.T @ yL)
r = linreg(XL, yL, lam=0.1, **q)
check("ridge primal", r["w"], wr); check("ridge J", r["ridge_J"], ((Aridge @ wr - yL) ** 2).sum() + 0.1 * wr @ wr)
XT = np.array([[1, 0, 1], [2, -1, 1], [1, 1, 5]], float); yT = np.array([1, 2, 3], float); B = ones(XT)
wd = B.T @ np.linalg.solve(B @ B.T + 0.1 * np.eye(3), yT)
check("ridge dual (Tutorial 5)", linreg(XT, yT, lam=0.1, **q)["w"], wd)
xp = np.array([-10, -8, -3, -1, 2, 8], float); yp = np.array([5, 5, 4, 3, 2, 2], float)
P = np.vstack([xp ** k for k in range(4)]).T; wp = lsq(P, yp)
r = polyreg(xp[:, None], yp, 3, X_new=[[9]], **q)
check("polynomial order 3", r["w"], wp); check("poly predict", r["pred"], [np.array([9.0 ** k for k in range(4)]) @ wp])
P2, names = poly_features([[2, 3]], 2)
assert names == ["1", "x1", "x2", "x1*x1", "x1*x2", "x2*x2"]; check("poly features", P2, [[1, 2, 3, 4, 6, 9]])
check("number of parameters", num_params(3, 2, **q), 10)
wb = lsq(ones(XL), np.array([-1, -1, -1, 1, 1, 1], float))
r = binary_class(XL, [-1, -1, -1, 1, 1, 1], X_new=[[-2]], **q)
check("binary w", r["w"], wb); assert r["pred_class"] == [-1] and r["accuracy"] == 1.0
x2 = [[0, 0], [1, 1], [1, 0], [0, 1]]
r = binary_class(x2, [-1, -1, 1, 1], deg=2, X_new=[[0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]], **q)
assert r["pred_class"] == [-1, -1, 1, 1], r["pred_class"]
Xc = np.array([[1, 1], [-1, 1], [1, 3], [1, 0]], float); Yc = np.eye(3)[[0, 1, 0, 2]]
Wc = lsq(ones(Xc), Yc); Sn = ones([[6, 8], [0, -1]]) @ Wc
r = multi_class(Xc, [1, 2, 1, 3], X_new=[[6, 8], [0, -1]], **q)
check("multi-class W", r["W"] if "W" in r else r["w"], Wc); assert r["pred_class"] == [int(i) + 1 for i in np.argmax(Sn, 1)]
wg = np.array([-1.4375, 0.5625]); eg = ones(XL) @ wg - yL
check("loss at given w", loss_at(XL, yL, wg, lam=0.5, **q)["ridge_J"], eg @ eg + 0.5 * wg @ wg)
check("errors MSE", errors([3, -0.5, 2, 7], [2.5, 0, 2, 8], **q)["MSE"], 0.375)

# ---- probability / statistics ----
s = desc_stats([2, 4, 4, 4, 5, 5, 7, 9], **q)
check("mean", s["mean"], 5); check("population std", s["population standard deviation (n)"], 2)
check("sample var", s["sample variance (n-1)"], np.var([2, 4, 4, 4, 5, 5, 7, 9], ddof=1))
check("pearson", pearson([1, 2, 3, 4], [2, 4, 5, 9], **q), np.corrcoef([1, 2, 3, 4], [2, 4, 5, 9])[0, 1])
p = pmf([0, 1, 2], ["k", "2*k", "3*k"], **q); check("pmf E", float(p["E[X]"]), 8 / 6)
d = pdf("c*x**2", 0, 3, 1, 2, **q); check("pdf c", float(d["c"]), 1 / 9); check("pdf prob", float(d["prob"]), 7 / 27)
check("pdf mean", float(d["E[X]"]), 9 / 4)
check("normal", normal_prob(0, 1, -1.96, 1.96, **q), 0.9500042, tol=1e-6)
check("bayes", float(bayes(0.99, 0.01, 0.05, **q)), 0.99 * 0.01 / (0.99 * 0.01 + 0.05 * 0.99))
check("bayes multi", [float(v) for v in bayes_multi([0.5, 0.3, 0.2], [0.01, 0.02, 0.03], **q)["posterior"]], np.array([0.005, 0.006, 0.006]) / 0.017)
check("dice sum 7", float(dice(lambda o: sum(o) == 7, **q)), 1 / 6)
check("exactly 1", float(exactly_k([0.5, 0.5], 1, **q)), 0.5)
check("draws", float(draws({"r": 3, "b": 2}, ["r", "b"], **q)), 3 / 5 * 2 / 4)

# ---- calculus ----
assert list(gradient("x1**2 + 3*x1*x2", **q)) == list(gradient("x1**2 + 3*x1*x2", **q))
check("gradient at", [float(v) for v in gradient("x1**2 + 3*x1*x2", at=[1, 2], **q).subs({"x1": 1, "x2": 2})], [8, 3])
check("hessian", np.array(hessian("x1**2 + 3*x1*x2", **q).tolist(), dtype=float), [[2, 3], [3, 0]])
st = stationary("x1**2 + x2**2 - 2*x1", **q); assert st[0]["type"] == "minimum" and st[0]["point"] == [1, 0]
pts = min_max_1d("x**3 - 3*x", a=-2, b=3, **q); assert {float(t[0]) for t in pts} == {-1.0, 1.0}
assert linear_or_affine("2*x1 + 3*x2", **q) == "linear" and linear_or_affine("2*x1 + 1", **q).startswith("affine")
assert linear_or_affine("x1*x2", **q).startswith("neither")
assert sorted(solve_eq("x^2 - 5*x + 6 = 0", **q)) == [2, 3]
assert solve_system_eq(["2*a + b = 3", "a - b = 0"], **q)[0] == {__import__("sympy").Symbol("a"): 1, __import__("sympy").Symbol("b"): 1}

print(f"all {ok} numeric checks + assertions passed")
