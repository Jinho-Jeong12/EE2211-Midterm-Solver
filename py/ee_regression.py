# =====================================================================
# EE2211 Solver made by Jeong Jinho (A0286635R)
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

Notation used in the comments
  m = number of samples (rows of X), d = number of parameters (columns of the design matrix)
  h = number of outputs (columns of Y; h = 1 for an ordinary y vector)
  D = design matrix (X with a bias column, or the polynomial matrix P)
  W = learned weights (d x h), w when h = 1
"""
from itertools import combinations_with_replacement   # all ways to pick features WITH repetition -> polynomial terms
from math import comb                                  # comb(n, k) = n choose k, for counting parameters
import numpy as np
from ee_utils import Report, fmt                       # Report prints Given / Formula / Steps / ANSWER; fmt formats numbers


# =====================================================================
# 1. Design matrices
# =====================================================================
def add_bias(X):
    """Put a column of 1s in front of X, so w0 (the bias / intercept) is learned like any other weight.
    Example: X = [[2], [5]]  ->  [[1, 2], [1, 5]]   so  y_hat = w0 * 1 + w1 * x."""
    X = np.atleast_2d(np.array(X, float))              # list -> float matrix; atleast_2d turns [1, 2] into [[1, 2]]
    return np.hstack([np.ones((X.shape[0], 1)), X])    # hstack = glue side by side: [ 1s column | X ]


def poly_features(X, deg, show=False):
    """Polynomial expansion in sklearn PolynomialFeatures order:
    degree 0, then degree 1 (x1, x2, ...), then degree 2 (x1^2, x1x2, x2^2), ...
    Number of columns = C(d + deg, deg).

    Example, 2 features and deg = 2:  [x1, x2]  ->  [1, x1, x2, x1*x1, x1*x2, x2*x2]
    """
    X = np.atleast_2d(np.array(X, float))
    m, d = X.shape                                     # m samples, d raw features
    # terms = list of index tuples. () means the constant 1, (0,) means x1, (0, 1) means x1*x2, (1, 1) means x2^2 ...
    # For each degree p = 0, 1, ..., deg, combinations_with_replacement gives every product of p features once.
    terms = [t for p in range(deg + 1) for t in combinations_with_replacement(range(d), p)]
    # For each sample row, multiply the features named in each term. np.prod of an empty list is 1 -> bias column.
    P = np.array([[np.prod([row[i] for i in t]) for t in terms] for row in X])
    # Human-readable column names, e.g. "1", "x1", "x1*x2"
    names = ["1" if not t else "*".join(f"x{i + 1}" for i in t) for t in terms]
    Report(f"Polynomial features (order {deg})", show).step("columns: " + ", ".join(names)).answer("P", P)
    return P, names


def num_params(d, deg, show=True):
    """Number of polynomial parameters for d features and order deg = C(d + deg, deg).
    Example: d = 2, deg = 2 -> C(4, 2) = 6  (1, x1, x2, x1^2, x1x2, x2^2)."""
    n = comb(d + deg, deg)
    Report("Number of parameters", show).formula(f"C(d + p, p) = C({d} + {deg}, {deg})").answer("number of parameters", n)
    return n


# =====================================================================
# 2. The shared solver: picks the right formula from the shape of D
#    (this is the core rule of Lectures 5-6)
# =====================================================================
def solve_weights(D, Y, lam=0.0, mode="auto", R=None, name="X"):
    """Least squares / ridge with automatic primal-dual choice. D: m x d, Y: m x h.

    Decision table
      lam > 0, m >= d  -> ridge PRIMAL  w = (D^T D + lam I_d)^-1 D^T y     (I is d x d)
      lam > 0, m <  d  -> ridge DUAL    w = D^T (D D^T + lam I_m)^-1 y     (I is m x m)
      lam = 0, m =  d, invertible   -> w = D^-1 y                          (exact solution)
      lam = 0, m >  d, rank = d     -> w = (D^T D)^-1 D^T y   left inverse, least squares
      lam = 0, m <  d, rank = m     -> w = D^T (D D^T)^-1 y   right inverse, minimum-norm solution
      otherwise (rank deficient)    -> w = pinv(D) y          Moore-Penrose pseudoinverse
    Why primal vs dual: both give the same w; we invert whichever matrix is SMALLER
    (D^T D is d x d, D D^T is m x m). The lecture uses dual when m < d.
    """
    R = R or Report("", show=False)                    # if no printer is passed in, use a silent one
    m, d = D.shape                                     # m rows (samples), d columns (parameters)
    rk = np.linalg.matrix_rank(D)                      # rank tells us whether D^T D or D D^T is invertible
    sys = "even-determined (m = d)" if m == d else ("over-determined (m > d)" if m > d else "under-determined (m < d)")
    R.step(f"{name} is {m} x {d} -> {sys}, rank = {rk}")
    # dual = True when the user forces it, or (auto) when there are fewer samples than parameters
    dual = mode == "dual" or (mode == "auto" and m < d)
    if lam > 0:
        # ----- ridge regression: lambda > 0 adds lambda * I, which always makes the matrix invertible -----
        if not dual:
            R.formula(f"w = ({name}^T {name} + lambda I)^-1 {name}^T y", f"ridge PRIMAL, I is {d}x{d}")
            A = D.T @ D + lam * np.eye(d)              # d x d matrix  D^T D + lambda I   (@ = matrix multiply)
            R.step(f"{name}^T {name} + lambda I", A)
            W = np.linalg.solve(A, D.T @ Y)            # solve(A, b) = A^-1 b, but more accurate than inv(A) @ b
        else:
            R.formula(f"w = {name}^T ({name} {name}^T + lambda I)^-1 y", f"ridge DUAL, I is {m}x{m}")
            A = D @ D.T + lam * np.eye(m)              # m x m matrix  D D^T + lambda I
            R.step(f"{name} {name}^T + lambda I", A)
            W = D.T @ np.linalg.solve(A, Y)            # D^T (D D^T + lambda I)^-1 y
    elif m == d and rk == d and mode == "auto":
        # ----- square and full rank: exactly one solution, D w = y holds exactly -----
        R.formula(f"w = {name}^-1 y", "square and invertible -> exact solution")
        W = np.linalg.solve(D, Y)                      # D^-1 y
    elif not dual and rk == d:
        # ----- more samples than parameters: no exact solution, take the least squares one -----
        R.formula(f"w = ({name}^T {name})^-1 {name}^T y", "least squares (left inverse)")
        R.step(f"{name}^T {name}", D.T @ D)
        W = np.linalg.solve(D.T @ D, D.T @ Y)          # normal equation (D^T D) w = D^T y
    elif dual and rk == m:
        # ----- fewer samples than parameters: infinitely many solutions, take the smallest-norm one -----
        R.formula(f"w = {name}^T ({name} {name}^T)^-1 y", "minimum-norm solution (right inverse)")
        R.step(f"{name} {name}^T", D @ D.T)
        W = D.T @ np.linalg.solve(D @ D.T, Y)
    else:
        # ----- rank deficient: neither D^T D nor D D^T can be inverted, fall back to numpy's pseudoinverse -----
        R.formula(f"w = pinv({name}) y", "rank deficient -> Moore-Penrose pseudoinverse")
        W = np.linalg.pinv(D) @ Y
    return W                                           # d x h matrix of weights


def _design(X, bias, deg):
    """Build the design matrix D and its column names.
    deg given  -> polynomial matrix P (it already contains the 1s column)
    bias=True  -> [1 | X]
    bias=False -> X unchanged (for example Solve Xw = y questions have no bias)."""
    if deg:
        return poly_features(X, deg)
    X = np.atleast_2d(np.array(X, float))
    if bias:
        return add_bias(X), ["1"] + [f"x{i + 1}" for i in range(X.shape[1])]
    return X, [f"x{i + 1}" for i in range(X.shape[1])]


# =====================================================================
# 3. fit = train + (optional) predict. Every public function below calls this.
# =====================================================================
def fit(X, Y, bias=True, lam=0.0, deg=None, mode="auto", X_new=None, title="Linear regression", show=True):
    """Generic train + predict. Returns dict with W, design matrix, training fit and predictions.

    Steps: (1) design matrix D  (2) W from solve_weights  (3) training fit D W and errors  (4) predict D_new W
    """
    Y = np.array(Y, float)
    vec = Y.ndim == 1                                  # True when y is a plain vector (one output)
    Y2 = Y.reshape(-1, 1) if vec else Y                # turn y into an m x 1 column so the matrix maths is the same
    R = Report(title, show).given("X", np.atleast_2d(np.array(X, float))).given("y" if vec else "Y", Y)
    # (1) design matrix
    D, names = _design(X, bias, deg)
    nm = "P" if deg else "X"                           # name used in the printout: P for polynomial, X otherwise
    R.step(f"design matrix {nm}  (columns: {', '.join(names)})", D)
    # (2) learn the weights
    W = solve_weights(D, Y2, lam, mode, R, nm)
    R.answer("w" if vec else "W", W.ravel() if vec else W)     # ravel = flatten m x 1 back to a vector for printing
    # (3) how well it fits the TRAINING data
    F = D @ W                                          # fitted values y_hat on the training samples
    E = F - Y2                                         # residuals e = y_hat - y
    out = {"w": W.ravel() if vec else W, "D": D, "names": names, "fit": F.ravel() if vec else F, "residuals": E.ravel() if vec else E}
    out.update(_error_terms(E, lam, W, R))             # adds SSE, MSE, RMSE, MAE (and ridge J) to the result
    # (4) predict new samples: build THE SAME kind of design matrix (bias / polynomial) for X_new, then multiply
    if X_new is not None:
        Dn, _ = _design(X_new, bias, deg)
        Yn = Dn @ W                                    # y_hat_new = X_new w
        R.step(f"{nm}_new", Dn)
        R.answer("prediction y_hat = " + nm + "_new w", Yn.ravel() if vec else Yn)
        out["pred"] = Yn.ravel() if vec else Yn
    return out


def _error_terms(E, lam, W, R):
    """All the error numbers an exam may ask for, from the residual matrix E (m x h)."""
    m = E.shape[0]                                     # number of samples
    sse = float((E ** 2).sum())                        # Sum of Squared Errors = e^T e (squared error loss)
    out = {"SSE": sse, "MSE": sse / m, "RMSE": np.sqrt(sse / m), "MAE": float(np.abs(E).sum() / m)}
    R.step("Sum of Squared Errors (SSE) = squared error loss = sum (y_hat - y)^2", sse)
    R.step("Mean Squared Error (MSE) = SSE / m", sse / m)
    R.step("Root Mean Squared Error (RMSE)", out["RMSE"])
    if lam > 0:
        pen = lam * float((W ** 2).sum())              # ridge penalty lambda * w^T w (the lecture penalises w0 too)
        out["penalty"], out["ridge_J"] = pen, sse + pen
        R.step("penalty lambda * w^T w", pen).step("ridge objective J = SSE + lambda w^T w", sse + pen)
    return out


# =====================================================================
# 4. Public functions (what I call in the notebook)
# =====================================================================
def linreg(X, y, bias=True, lam=0.0, mode="auto", X_new=None, show=True):
    """Linear regression (lam = 0) or ridge regression (lam > 0). y may be m x h for multiple outputs.
    Example: linreg([[1], [2], [3]], [2, 4, 7], X_new=[[4]])"""
    t = "Ridge regression" if lam > 0 else "Linear regression (least squares)"
    return fit(X, y, bias, lam, None, mode, X_new, t, show)


def polyreg(X, y, deg, lam=0.0, mode="auto", X_new=None, show=True):
    """Polynomial regression of order deg: expand X to P, then the same least squares / ridge as above.
    X_new must be RAW features (it is expanded the same way inside fit)."""
    return fit(X, y, True, lam, deg, mode, X_new, f"Polynomial regression (order {deg})", show)


def _sign(s):
    """sign function used for binary classification."""
    return np.where(s >= 0, 1, -1)          # EE2211 convention: sign(0) = +1


def binary_labels(labels, pos=None):
    """Map two labels to +1 / -1. Default: {-1,1} or {0,1} -> 1 is +1; otherwise the first (sorted) label is +1.
    Returns (vector of +1/-1, the label that became +1, the label that became -1)."""
    # sorted unique labels; numbers come before strings so mixed labels do not crash
    u = sorted(set(labels), key=lambda v: (not isinstance(v, (int, float)), v))
    if len(u) != 2:
        raise ValueError(f"need exactly 2 classes, got {u}")
    if pos is None:
        pos = 1 if set(u) in ({-1, 1}, {0, 1}) else u[0]   # choose which label is the +1 class
    neg = [v for v in u if v != pos][0]                     # the other label is -1
    return np.array([1.0 if v == pos else -1.0 for v in labels]), pos, neg


def binary_class(X, labels, bias=True, lam=0.0, deg=None, X_new=None, pos=None, show=True):
    """Binary classification: regress on +1/-1 labels, then class = sign(x^T w).
    Steps: labels -> +1/-1, train with least squares (fit), score = x^T w, class = sign(score)."""
    y, p, n = binary_labels(list(labels), pos)
    out = fit(X, y, bias, lam, deg, "auto", X_new, f"Binary classification (+1 = {p}, -1 = {n})", show)
    train = _sign(out["fit"])                               # predicted class (+1/-1) of every training sample
    out["train_class"] = [p if s > 0 else n for s in train] # back to the original label names
    out["accuracy"] = float((train == y).mean())            # fraction of training samples classified correctly
    if show:
        print(f">>> training accuracy = {fmt(out['accuracy'])}")
    if X_new is not None:
        s = _sign(out["pred"])                              # sign of each new score
        out["pred_class"] = [p if v > 0 else n for v in s]
        if show:
            print(">>> ANSWER: predicted class = sign(score):", out["pred_class"])
    return out


def one_hot(labels, classes=None):
    """One-hot encoding: label c_k -> row with 1 in column k and 0 elsewhere.
    Example: labels [1, 2, 1, 3] -> [[1,0,0], [0,1,0], [1,0,0], [0,0,1]]."""
    classes = classes or sorted(set(labels))               # column order = sorted class names
    return np.array([[1.0 if l == c else 0.0 for c in classes] for l in labels]), classes


def multi_class(X, labels, bias=True, lam=0.0, deg=None, X_new=None, show=True):
    """Multi-class: one-hot Y, W = least squares, class = argmax of each row of X_new W.
    Each column of W is a separate regression model for one class; the class with the largest score wins."""
    Y, classes = one_hot(list(labels))
    if show:
        print("one-hot Y columns = classes", classes)
    out = fit(X, Y, bias, lam, deg, "auto", X_new, "Multi-class classification (one-hot + argmax)", show)
    tr = [classes[i] for i in np.argmax(out["fit"], axis=1)]   # argmax along each row = index of the biggest score
    out["classes"], out["train_class"] = classes, tr
    out["accuracy"] = float(np.mean([a == b for a, b in zip(tr, labels)]))
    if show:
        print(f">>> training accuracy = {fmt(out['accuracy'])}")
    if X_new is not None:
        out["pred_class"] = [classes[i] for i in np.argmax(out["pred"], axis=1)]
        if show:
            print(">>> ANSWER: predicted class = argmax of each row:", out["pred_class"])
    return out


# =====================================================================
# 5. Loss / error helpers (when the question GIVES w or y_hat)
# =====================================================================
def errors(y, y_hat, show=True):
    """Error measures between actual y and prediction y_hat.
    SSE = sum e^2, MSE = SSE / m, RMSE = sqrt(MSE), MAE = mean |e|."""
    e = np.array(y_hat, float) - np.array(y, float)        # residuals
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
    e = D @ w - np.array(y, float)                          # e = Xw - y
    out = {"residuals": e, "SSE": e @ e, "MSE": e @ e / len(e), "penalty": lam * w @ w, "ridge_J": e @ e + lam * w @ w}
    R = Report("Loss at a given w", show).step("design matrix", D).step("e = Xw - y", e)
    R.answer("Sum of Squared Errors (SSE)", out["SSE"]).answer("Mean Squared Error (MSE)", out["MSE"])
    if lam > 0:
        R.answer("lambda w^T w", out["penalty"]).answer("ridge objective J(w)", out["ridge_J"])
    return out


def predict(w, X_new, bias=True, show=True):
    """y_hat = X_new w for a GIVEN w (adds the bias column first when bias=True)."""
    D = add_bias(X_new) if bias else np.atleast_2d(np.array(X_new, float))
    yh = D @ np.array(w, float)
    Report("Predict y_hat = X_new w", show).step("X_new", D).answer("y_hat", yh)
    return yh


def compare_lambda(X, y, lams, bias=True, show=True):
    """Ridge for several lambda values: w shrinks toward 0 as lambda grows (and training SSE goes up)."""
    rows = []
    for lam in lams:
        r = linreg(X, y, bias, lam, show=False)
        rows.append((lam, r["w"], r["SSE"], float(r["w"] @ r["w"])))
    if show:
        print("lambda | w | SSE | w^T w")
        for lam, w, sse, ww in rows:
            print(f"{lam:>6} | {np.round(w, 6)} | {sse:.6g} | {ww:.6g}")
    return rows
