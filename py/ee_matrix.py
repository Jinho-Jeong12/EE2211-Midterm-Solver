# =====================================================================
# EE2211 Solver made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_matrix.py — Lecture 4 (linear algebra) and systems of linear equations.

All matrix work here is EXACT (Python Fraction), so 1/3 stays 1/3.
Method used everywhere: Gauss-Jordan row reduction (rref) for rank / inverse,
and cofactor (Laplace) expansion along row 1 for the determinant.

Main functions
  det(A)            determinant (cofactor expansion along the first row)
  minor(A,i,j)      minor M_ij (1-based i, j)
  cofactor_matrix(A), adjugate(A), inverse(A)   A^-1 = adj(A) / det(A)
  rref(A), rank(A)  reduced row echelon form, rank = number of pivots
  matrix_report(A)  everything at once
  lin_indep(vectors)            are the vectors linearly independent?
  solution_type(X, y)           unique / infinite / none (rank test)
  solve_system(X, y)            w for Xw = y, picks X^-1 / left inverse / right inverse
  pinv(X)           left inverse (X^T X)^-1 X^T  or  right inverse X^T (X X^T)^-1
"""
from fractions import Fraction
import numpy as np
from ee_utils import Report, to_frac_matrix


# ---------------- basic exact helpers ----------------
def _mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def _T(A):
    return [list(r) for r in zip(*A)]


def _eye(n):
    return [[Fraction(int(i == j)) for j in range(n)] for i in range(n)]


def _sub_matrix(A, i, j):
    """Delete row i and column j (0-based)."""
    return [row[:j] + row[j + 1:] for k, row in enumerate(A) if k != i]


# ---------------- determinant family ----------------
def det(A, show=True):
    """Determinant by cofactor expansion along row 1: det A = sum_j (-1)^(1+j) a_1j M_1j."""
    A = to_frac_matrix(A)
    n = len(A)
    if n != len(A[0]):
        raise ValueError("det needs a square matrix")
    R = Report("Determinant det(A)", show).given("A", A)
    if n == 1:
        R.answer("det(A)", A[0][0])
        return A[0][0]
    if n == 2:
        d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
        R.formula("det = a11*a22 - a12*a21", f"= {A[0][0]}*{A[1][1]} - {A[0][1]}*{A[1][0]}")
        R.answer("det(A)", d)
        return d
    R.formula("det(A) = sum_j (-1)^(1+j) * a_1j * M_1j   (expansion along row 1)")
    total = Fraction(0)
    for j in range(n):
        m = det(_sub_matrix(A, 0, j), show=False)
        term = (-1) ** j * A[0][j] * m
        R.step(f"j={j + 1}: (-1)^{1 + j} * {A[0][j]} * M_1{j + 1}({m})", term)
        total += term
    R.answer("det(A)", total)
    return total


def minor(A, i, j, show=True):
    """Minor M_ij = det of A with row i and column j removed (i, j start at 1)."""
    A = to_frac_matrix(A)
    S = _sub_matrix(A, i - 1, j - 1)
    m = det(S, show=False)
    Report(f"Minor M_{i}{j}", show).given("A", A).step(f"delete row {i}, column {j}", S).answer(f"M_{i}{j}", m)
    return m


def cofactor(A, i, j, show=True):
    """Cofactor C_ij = (-1)^(i+j) M_ij."""
    c = (-1) ** (i + j) * minor(A, i, j, show=False)
    Report(f"Cofactor C_{i}{j}", show).formula("C_ij = (-1)^(i+j) * M_ij").answer(f"C_{i}{j}", c)
    return c


def minors_matrix(A, show=True):
    A = to_frac_matrix(A)
    n = len(A)
    M = [[det(_sub_matrix(A, i, j), show=False) for j in range(n)] for i in range(n)]
    Report("Matrix of minors", show).given("A", A).answer("M", M)
    return M


def cofactor_matrix(A, show=True):
    A = to_frac_matrix(A)
    n = len(A)
    C = [[(-1) ** (i + j) * det(_sub_matrix(A, i, j), show=False) for j in range(n)] for i in range(n)]
    Report("Cofactor matrix C", show).given("A", A).formula("C_ij = (-1)^(i+j) M_ij").answer("C", C)
    return C


def adjugate(A, show=True):
    C = cofactor_matrix(A, show=False)
    adj = _T(C)
    Report("Adjugate adj(A) = C^T", show).step("C", C).answer("adj(A)", adj)
    return adj


def inverse(A, show=True):
    """A^-1 = adj(A) / det(A). Returns None when det(A) = 0 (singular)."""
    A = to_frac_matrix(A)
    R = Report("Inverse A^-1 = adj(A) / det(A)", show).given("A", A)
    d = det(A, show=False)
    R.step("det(A)", d)
    if d == 0:
        R.answer("A^-1", "does NOT exist (det = 0, A is singular)")
        return None
    adj = adjugate(A, show=False)
    R.step("adj(A)", adj)
    inv = [[x / d for x in row] for row in adj]
    R.answer("A^-1", inv)
    R.step("check A A^-1 = I", _mul(A, inv))
    return inv


# ---------------- rank / row reduction ----------------
def rref(A, show=False):
    """Gauss-Jordan elimination. Returns (RREF matrix, list of pivot columns)."""
    M = to_frac_matrix(A)
    rows, cols = len(M), len(M[0])
    pivots, r = [], 0
    R = Report("Row reduction (RREF)", show).given("A", M)
    for c in range(cols):
        p = next((i for i in range(r, rows) if M[i][c] != 0), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]                     # swap pivot row up
        pv = M[r][c]
        M[r] = [x / pv for x in M[r]]               # scale pivot to 1
        for i in range(rows):                       # clear the column
            if i != r and M[i][c] != 0:
                f = M[i][c]
                M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        R.step(f"pivot in column {c + 1}", [row[:] for row in M])
        pivots.append(c)
        r += 1
        if r == rows:
            break
    return M, pivots


def rank(A, show=True):
    """rank = number of pivots after row reduction."""
    E, piv = rref(A, show=False)
    Report("Rank", show).given("A", to_frac_matrix(A)).step("RREF", E).answer("rank(A)", len(piv))
    return len(piv)


def invertibility(A, show=True):
    """Square: invertible iff det != 0. m x d: left inverse iff rank = d, right inverse iff rank = m."""
    A = to_frac_matrix(A)
    m, d = len(A), len(A[0])
    r = rank(A, show=False)
    R = Report("Invertibility", show).given("A", A).step(f"size m x d = {m} x {d}, rank = {r}")
    out = {"square": m == d, "rank": r, "invertible": m == d and r == m,
           "left_inverse": r == d, "right_inverse": r == m}
    if m == d:
        R.answer("invertible?", f"{'YES' if r == m else 'NO'} (det {'!=' if r == m else '='} 0)")
    R.answer("left inverse (X^T X)^-1 X^T exists?", "YES (full column rank)" if r == d else "NO")
    R.answer("right inverse X^T (X X^T)^-1 exists?", "YES (full row rank)" if r == m else "NO")
    return out


def matrix_report(A, show=True):
    """Everything about one matrix at once."""
    A = to_frac_matrix(A)
    out = {"transpose": _T(A), "rank": rank(A, show), **invertibility(A, show=False)}
    if show:
        Report("Transpose A^T").answer("A^T", out["transpose"])
    if len(A) == len(A[0]):
        out["det"] = det(A, show)
        out["minors"] = minors_matrix(A, show)
        out["cofactor"] = cofactor_matrix(A, show)
        out["adj"] = adjugate(A, show)
        out["inverse"] = inverse(A, show)
    out["pinv"] = pinv(A, show)
    return out


def lin_indep(vectors, show=True):
    """Vectors are linearly independent iff rank([v1 v2 ...]) = number of vectors."""
    V = _T(to_frac_matrix(vectors))      # vectors become columns
    r = rank(V, show=False)
    ind = r == len(V[0])
    R = Report("Linear independence", show).step("matrix with the vectors as columns", V)
    R.step("rank", r).answer("linearly independent?", f"{'YES' if ind else 'NO'} (rank {r} vs {len(V[0])} vectors)")
    return ind


# ---------------- systems Xw = y ----------------
def solution_type(X, y, show=True):
    """rank(X) vs rank([X|y]):  different -> no solution;  equal = d -> unique;  equal < d -> infinite."""
    X = to_frac_matrix(X)
    y = [Fraction(v).limit_denominator(10**9) for v in np.ravel(y)]
    aug = [row + [b] for row, b in zip(X, y)]
    rX, rA, d = rank(X, show=False), rank(aug, show=False), len(X[0])
    kind = "no solution" if rX != rA else ("unique solution" if rX == d else "infinitely many solutions")
    m = len(X)
    sys = "even-determined (m = d)" if m == d else ("over-determined (m > d)" if m > d else "under-determined (m < d)")
    R = Report("Solution type of Xw = y", show).given("X", X).given("y", y)
    R.step(f"m = {m} equations, d = {d} unknowns -> {sys}")
    R.step(f"rank(X) = {rX}, rank([X|y]) = {rA}")
    R.answer("solution type", kind)
    return kind


def pinv(X, show=True):
    """Left inverse (X^T X)^-1 X^T when rank = d (tall), right inverse X^T (X X^T)^-1 when rank = m (wide)."""
    X = to_frac_matrix(X)
    m, d = len(X), len(X[0])
    r = rank(X, show=False)
    R = Report("Pseudoinverse X^+", show).given("X", X)
    if m == d and r == m:
        P = inverse(X, show=False)
        R.formula("square + invertible: X^+ = X^-1")
    elif r == d:
        P = _mul(inverse(_mul(_T(X), X), show=False), _T(X))
        R.formula("left inverse X^+ = (X^T X)^-1 X^T", "full column rank")
    elif r == m:
        P = _mul(_T(X), inverse(_mul(X, _T(X)), show=False))
        R.formula("right inverse X^+ = X^T (X X^T)^-1", "full row rank")
    else:
        P = np.linalg.pinv(np.array(X, dtype=float))
        R.formula("rank deficient: Moore-Penrose pseudoinverse (numpy.linalg.pinv)")
    R.answer("X^+", P)
    return P


def solve_system(X, y, show=True):
    """Solve Xw = y. No bias column is added (a system of equations has no bias).
    m = d -> w = X^-1 y ;  m > d -> least squares w = (X^T X)^-1 X^T y ;  m < d -> w = X^T (X X^T)^-1 y."""
    Xf = to_frac_matrix(X)
    yf = [[Fraction(v).limit_denominator(10**9)] for v in np.ravel(y)]
    m, d = len(Xf), len(Xf[0])
    R = Report("Solve Xw = y", show).given("X", Xf).given("y", [v[0] for v in yf])
    kind = solution_type(X, y, show=False)
    R.step(f"m = {m}, d = {d}, solution type: {kind}")
    r = rank(Xf, show=False)
    if m == d and r == d:
        R.formula("w = X^-1 y")
        W = _mul(inverse(Xf, show=False), yf)
    elif m > d and r == d:
        R.formula("w = (X^T X)^-1 X^T y", "over-determined: least squares approximation (left inverse)")
        W = _mul(pinv(Xf, show=False), yf)
    elif m < d and r == m:
        R.formula("w = X^T (X X^T)^-1 y", "under-determined: minimum-norm solution (right inverse)")
        W = _mul(pinv(Xf, show=False), yf)
    else:
        R.formula("rank deficient -> numpy.linalg.pinv(X) @ y (minimum-norm least squares)")
        W = (np.linalg.pinv(np.array(Xf, dtype=float)) @ np.array(yf, dtype=float)).tolist()
    w = [row[0] for row in W]
    R.answer("w", w)
    R.step("check Xw", [row[0] for row in _mul(Xf, [[Fraction(v).limit_denominator(10**9)] for v in w])])
    return w


# ---------------- quick numpy helpers (float) ----------------
def vec_ops(x, y, show=True):
    """Dot product, norms, angle between two vectors."""
    x, y = np.array(x, float), np.array(y, float)
    dot = x @ y
    cos = dot / (np.linalg.norm(x) * np.linalg.norm(y))
    out = {"x+y": x + y, "x-y": x - y, "dot x^T y": dot, "||x||": np.linalg.norm(x), "||y||": np.linalg.norm(y),
           "angle (degrees)": np.degrees(np.arccos(np.clip(cos, -1, 1))), "orthogonal?": abs(dot) < 1e-12}
    R = Report("Vector operations", show)
    for k, v in out.items():
        R.answer(k, v)
    return out


def set_ops(A, B, show=True):
    A, B = set(A), set(B)
    out = {"A ∩ B": A & B, "A ∪ B": A | B, "A - B": A - B, "B - A": B - A}
    R = Report("Set operations", show)
    for k, v in out.items():
        R.answer(k, sorted(v))
    return out
