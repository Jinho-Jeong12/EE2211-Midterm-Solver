# =====================================================================
# EE2211 Midterm Solver — made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_regression.py — Lectures 5-6: linear regression, ridge, polynomial, classification.

One engine (fit) does all of them:
  1. build the design matrix  (bias column of 1s, or polynomial features P)
  2. choose the formula from the size m x d of that matrix
       lambda = 0 : m = d -> X^-1 y ; m > d -> (X^T X)^-1 X^T y ; m < d -> X^T (X X^T)^-1 y
       lambda > 0 : primal (X^T X + lambda I)^-1 X^T y   when m >= d
                    dual   X^T (X X^T + lambda I)^-1 y   when m <  d
  3. predict  y_hat = X_new w   (binary: sign(score), multi-class: argmax of the row)

Main functions
  linreg(X, y, bias=True, lam=0, X_new=None)         linear / ridge regression (y can be a matrix -> multi-output)
  polyreg(X, y, deg, lam=0, X_new=None)              polynomial regression
  binary_class(X, labels, bias=True, deg=None, ...)  linear regression + sign
  multi_class(X, labels, bias=True, deg=None, ...)   one-hot + argmax
  poly_features(X, deg)                              P matrix (sklearn column order)
  errors(y, y_hat)                                   SSE, MSE, RMSE, MAE
  loss_at(X, y, w, bias, lam)                        loss / ridge objective for a GIVEN w
  compare_lambda(X, y, lams)                         ridge shrinkage table
  num_params(d, deg)                                 C(d + p, p)
"""
from itertools import combinations_with_replacement
from math import comb
import numpy as np
from ee_utils import Report, fmt


# ---------------- design matrices ----------------
def add_bias(X):
    X = np.atleast_2d(np.array(X, float))
    return np.hstack([np.ones((X.shape[0], 1)), X])


def poly_features(X, deg, show=False):
    """Polynomial expansion in sklearn PolynomialFeatures order:
    degree 0, then degree 1 (x1, x2, ...), then degree 2 (x1^2, x1x2, x2^2), ...
    Number of columns = C(d + deg, deg)."""
    X = np.atleast_2d(np.array(X, float))
    m, d = X.shape
    terms = [t for p in range(deg + 1) for t in combinations_with_replacement(range(d), p)]
    P = np.array([[np.prod([row[i] for i in t]) for t in terms] for row in X])
    names = ["1" if not t else "*".join(f"x{i + 1}" for i in t) for t in terms]
    Report(f"Polynomial features (order {deg})", show).step("columns: " + ", ".join(names)).answer("P", P)
    return P, names


def num_params(d, deg, show=True):
    """Number of polynomial parameters for d features and order deg = C(d + deg, deg)."""
    n = comb(d + deg, deg)
    Report("Number of parameters", show).formula(f"C(d + p, p) = C({d} + {deg}, {deg})").answer("number of parameters", n)
    return n


# ---------------- the shared solver ----------------
def solve_weights(D, Y, lam=0.0, mode="auto", R=None, name="X"):
    """Least squares / ridge with automatic primal-dual choice. D: m x d, Y: m x h."""
    R = R or Report("", show=False)
    m, d = D.shape
    rk = np.linalg.matrix_rank(D)
    sys = "even-determined (m = d)" if m == d else ("over-determined (m > d)" if m > d else "under-determined (m < d)")
    R.step(f"{name} is {m} x {d} -> {sys}, rank = {rk}")
    dual = mode == "dual" or (mode == "auto" and m < d)
    if lam > 0:
        if not dual:
            R.formula(f"w = ({name}^T {name} + lambda I)^-1 {name}^T y", f"ridge PRIMAL, I is {d}x{d}")
            A = D.T @ D + lam * np.eye(d)
            R.step(f"{name}^T {name} + lambda I", A)
            W = np.linalg.solve(A, D.T @ Y)
        else:
            R.formula(f"w = {name}^T ({name} {name}^T + lambda I)^-1 y", f"ridge DUAL, I is {m}x{m}")
            A = D @ D.T + lam * np.eye(m)
            R.step(f"{name} {name}^T + lambda I", A)
            W = D.T @ np.linalg.solve(A, Y)
    elif m == d and rk == d and mode == "auto":
        R.formula(f"w = {name}^-1 y", "square and invertible -> exact solution")
        W = np.linalg.solve(D, Y)
    elif not dual and rk == d:
        R.formula(f"w = ({name}^T {name})^-1 {name}^T y", "least squares (left inverse)")
        R.step(f"{name}^T {name}", D.T @ D)
        W = np.linalg.solve(D.T @ D, D.T @ Y)
    elif dual and rk == m:
        R.formula(f"w = {name}^T ({name} {name}^T)^-1 y", "minimum-norm solution (right inverse)")
        R.step(f"{name} {name}^T", D @ D.T)
        W = D.T @ np.linalg.solve(D @ D.T, Y)
    else:
        R.formula(f"w = pinv({name}) y", "rank deficient -> Moore-Penrose pseudoinverse")
        W = np.linalg.pinv(D) @ Y
    return W


def _design(X, bias, deg):
    if deg:
        return poly_features(X, deg)
    X = np.atleast_2d(np.array(X, float))
    if bias:
        return add_bias(X), ["1"] + [f"x{i + 1}" for i in range(X.shape[1])]
    return X, [f"x{i + 1}" for i in range(X.shape[1])]


def fit(X, Y, bias=True, lam=0.0, deg=None, mode="auto", X_new=None, title="Linear regression", show=True):
    """Generic train + predict. Returns dict with W, design matrix, training fit and predictions."""
    Y = np.array(Y, float)
    vec = Y.ndim == 1
    Y2 = Y.reshape(-1, 1) if vec else Y
    R = Report(title, show).given("X", np.atleast_2d(np.array(X, float))).given("y" if vec else "Y", Y)
    D, names = _design(X, bias, deg)
    nm = "P" if deg else "X"
    R.step(f"design matrix {nm}  (columns: {', '.join(names)})", D)
    W = solve_weights(D, Y2, lam, mode, R, nm)
    R.answer("w" if vec else "W", W.ravel() if vec else W)
    F = D @ W
    E = F - Y2
    out = {"w": W.ravel() if vec else W, "D": D, "names": names, "fit": F.ravel() if vec else F, "residuals": E.ravel() if vec else E}
    out.update(_error_terms(E, lam, W, R))
    if X_new is not None:
        Dn, _ = _design(X_new, bias, deg)
        Yn = Dn @ W
        R.step(f"{nm}_new", Dn)
        R.answer("prediction y_hat = " + nm + "_new w", Yn.ravel() if vec else Yn)
        out["pred"] = Yn.ravel() if vec else Yn
    return out


def _error_terms(E, lam, W, R):
    m = E.shape[0]
    sse = float((E ** 2).sum())
    out = {"SSE": sse, "MSE": sse / m, "RMSE": np.sqrt(sse / m), "MAE": float(np.abs(E).sum() / m)}
    R.step("Sum of Squared Errors (SSE) = squared error loss = sum (y_hat - y)^2", sse)
    R.step("Mean Squared Error (MSE) = SSE / m", sse / m)
    R.step("Root Mean Squared Error (RMSE)", out["RMSE"])
    if lam > 0:
        pen = lam * float((W ** 2).sum())
        out["penalty"], out["ridge_J"] = pen, sse + pen
        R.step("penalty lambda * w^T w", pen).step("ridge objective J = SSE + lambda w^T w", sse + pen)
    return out


# ---------------- public wrappers ----------------
def linreg(X, y, bias=True, lam=0.0, mode="auto", X_new=None, show=True):
    """Linear regression (lam = 0) or ridge regression (lam > 0). y may be m x h for multiple outputs."""
    t = "Ridge regression" if lam > 0 else "Linear regression (least squares)"
    return fit(X, y, bias, lam, None, mode, X_new, t, show)


def polyreg(X, y, deg, lam=0.0, mode="auto", X_new=None, show=True):
    return fit(X, y, True, lam, deg, mode, X_new, f"Polynomial regression (order {deg})", show)


def _sign(s):
    return np.where(s >= 0, 1, -1)          # EE2211 convention: sign(0) = +1


def binary_labels(labels, pos=None):
    """Map two labels to +1 / -1. Default: {-1,1} or {0,1} -> 1 is +1; otherwise the first (sorted) label is +1."""
    u = sorted(set(labels), key=lambda v: (not isinstance(v, (int, float)), v))
    if len(u) != 2:
        raise ValueError(f"need exactly 2 classes, got {u}")
    if pos is None:
        pos = 1 if set(u) in ({-1, 1}, {0, 1}) else u[0]
    neg = [v for v in u if v != pos][0]
    return np.array([1.0 if v == pos else -1.0 for v in labels]), pos, neg


def binary_class(X, labels, bias=True, lam=0.0, deg=None, X_new=None, pos=None, show=True):
    """Binary classification: regress on +1/-1 labels, then class = sign(x^T w)."""
    y, p, n = binary_labels(list(labels), pos)
    out = fit(X, y, bias, lam, deg, "auto", X_new, f"Binary classification (+1 = {p}, -1 = {n})", show)
    train = _sign(out["fit"])
    out["train_class"] = [p if s > 0 else n for s in train]
    out["accuracy"] = float((train == y).mean())
    if show:
        print(f">>> training accuracy = {fmt(out['accuracy'])}")
    if X_new is not None:
        s = _sign(out["pred"])
        out["pred_class"] = [p if v > 0 else n for v in s]
        if show:
            print(">>> ANSWER: predicted class = sign(score):", out["pred_class"])
    return out


def one_hot(labels, classes=None):
    classes = classes or sorted(set(labels))
    return np.array([[1.0 if l == c else 0.0 for c in classes] for l in labels]), classes


def multi_class(X, labels, bias=True, lam=0.0, deg=None, X_new=None, show=True):
    """Multi-class: one-hot Y, W = least squares, class = argmax of each row of X_new W."""
    Y, classes = one_hot(list(labels))
    if show:
        print("one-hot Y columns = classes", classes)
    out = fit(X, Y, bias, lam, deg, "auto", X_new, "Multi-class classification (one-hot + argmax)", show)
    tr = [classes[i] for i in np.argmax(out["fit"], axis=1)]
    out["classes"], out["train_class"] = classes, tr
    out["accuracy"] = float(np.mean([a == b for a, b in zip(tr, labels)]))
    if show:
        print(f">>> training accuracy = {fmt(out['accuracy'])}")
    if X_new is not None:
        out["pred_class"] = [classes[i] for i in np.argmax(out["pred"], axis=1)]
        if show:
            print(">>> ANSWER: predicted class = argmax of each row:", out["pred_class"])
    return out


# ---------------- loss / error helpers ----------------
def errors(y, y_hat, show=True):
    """Error measures between actual y and prediction y_hat."""
    e = np.array(y_hat, float) - np.array(y, float)
    out = {"SSE": e @ e, "MSE": e @ e / len(e), "RMSE": np.sqrt(e @ e / len(e)), "MAE": np.abs(e).mean()}
    R = Report("Error measures", show).given("residuals e = y_hat - y", e)
    for k, full in [("SSE", "Sum of Squared Errors (SSE)"), ("MSE", "Mean Squared Error (MSE)"),
                    ("RMSE", "Root Mean Squared Error (RMSE)"), ("MAE", "Mean Absolute Error (MAE)")]:
        R.answer(full, out[k])
    return out


def loss_at(X, y, w, bias=True, lam=0.0, show=True):
    """Loss for a GIVEN w (no training): SSE, MSE, and ridge objective SSE + lambda w^T w."""
    D = add_bias(X) if bias else np.atleast_2d(np.array(X, float))
    w = np.array(w, float)
    e = D @ w - np.array(y, float)
    out = {"residuals": e, "SSE": e @ e, "MSE": e @ e / len(e), "penalty": lam * w @ w, "ridge_J": e @ e + lam * w @ w}
    R = Report("Loss at a given w", show).step("design matrix", D).step("e = Xw - y", e)
    R.answer("Sum of Squared Errors (SSE)", out["SSE"]).answer("Mean Squared Error (MSE)", out["MSE"])
    if lam > 0:
        R.answer("lambda w^T w", out["penalty"]).answer("ridge objective J(w)", out["ridge_J"])
    return out


def predict(w, X_new, bias=True, show=True):
    D = add_bias(X_new) if bias else np.atleast_2d(np.array(X_new, float))
    yh = D @ np.array(w, float)
    Report("Predict y_hat = X_new w", show).step("X_new", D).answer("y_hat", yh)
    return yh


def compare_lambda(X, y, lams, bias=True, show=True):
    """Ridge for several lambda values: w shrinks toward 0 as lambda grows."""
    rows = []
    for lam in lams:
        r = linreg(X, y, bias, lam, show=False)
        rows.append((lam, r["w"], r["SSE"], float(r["w"] @ r["w"])))
    if show:
        print("lambda | w | SSE | w^T w")
        for lam, w, sse, ww in rows:
            print(f"{lam:>6} | {np.round(w, 6)} | {sse:.6g} | {ww:.6g}")
    return rows
