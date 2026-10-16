# =====================================================================
# EE2211 Midterm Solver — made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_calculus.py — Lecture 4 calculus part + equation solving (symbolic, sympy).

Functions are given as strings in x1, x2, ... (or x), e.g. "x1**2 + 3*x1*x2".

Main functions
  func_report(f, at=None)   value, gradient, Hessian, stationary points and their type
  derivative(f, var='x', at=None)
  gradient(f, at=None)      column vector of partial derivatives
  hessian(f, at=None)       matrix of second derivatives + convexity from eigenvalues
  jacobian(fs, at=None)
  stationary(f)             solve grad f = 0, classify with the Hessian
  min_max_1d(f, a=None, b=None)   local / global minimum and maximum of one variable
  linear_or_affine(f)       f(x) = a^T x (linear), a^T x + b (affine) or neither
  solve_eq(eq, var='x')     solve one equation, e.g. "x**2 - 5*x + 6 = 0"
  solve_system_eq(eqs)      simultaneous equations
"""
import sympy as sp
from ee_utils import Report


def _parse(f):
    f = sp.sympify(f.replace("^", "**")) if isinstance(f, str) else f
    vs = sorted(f.free_symbols, key=lambda s: s.name)
    return f, vs


def _at(expr, vs, at):
    return expr.subs(dict(zip(vs, at))) if at is not None else None


def derivative(f, var="x", at=None, show=True):
    f, _ = _parse(f)
    v = sp.Symbol(var)
    d1, d2 = sp.diff(f, v), sp.diff(f, v, 2)
    R = Report(f"Derivative d/d{var}", show).given("f", f).answer("f'", d1).answer("f''", d2)
    out = {"f'": d1, "f''": d2}
    if at is not None:
        out["f'(at)"] = d1.subs(v, at)
        R.answer(f"f'({at})", out["f'(at)"])
    return out


def gradient(f, at=None, show=True):
    f, vs = _parse(f)
    g = sp.Matrix([sp.diff(f, v) for v in vs])
    R = Report("Gradient (column vector)", show).given("f", f).step("variables", vs).answer("grad f", list(g))
    if at is not None:
        R.answer(f"grad f at {at}", list(_at(g, vs, at)))
    return g


def hessian(f, at=None, show=True):
    f, vs = _parse(f)
    H = sp.hessian(f, vs)
    R = Report("Hessian", show).given("f", f).answer("H", H.tolist())
    Hv = _at(H, vs, at) if at is not None else H
    if at is not None:
        R.answer(f"H at {at}", Hv.tolist())
    if not Hv.free_symbols:
        ev = list(Hv.eigenvals().keys())
        R.step("eigenvalues", [sp.nsimplify(e) for e in ev])
        if all(e > 0 for e in ev):
            R.answer("definiteness", "positive definite -> convex (strictly), stationary point = minimum")
        elif all(e < 0 for e in ev):
            R.answer("definiteness", "negative definite -> concave, stationary point = maximum")
        elif any(e > 0 for e in ev) and any(e < 0 for e in ev):
            R.answer("definiteness", "indefinite -> saddle point")
        else:
            R.answer("definiteness", "semidefinite (some eigenvalue = 0) -> test is inconclusive")
    return H


def jacobian(fs, at=None, show=True):
    exprs = [sp.sympify(f.replace("^", "**")) for f in fs]
    vs = sorted(set().union(*[e.free_symbols for e in exprs]), key=lambda s: s.name)
    J = sp.Matrix(exprs).jacobian(vs)
    R = Report("Jacobian", show).step("variables", vs).answer("J", J.tolist())
    if at is not None:
        R.answer(f"J at {at}", _at(J, vs, at).tolist())
    return J


def stationary(f, show=True):
    """Solve grad f = 0 and classify each point with the Hessian eigenvalues."""
    f, vs = _parse(f)
    g = [sp.diff(f, v) for v in vs]
    sols = sp.solve(g, vs, dict=True)
    H = sp.hessian(f, vs)
    R = Report("Stationary points (grad f = 0)", show).given("f", f).step("grad f", g)
    out = []
    for s in sols:
        Hs = H.subs(s)
        ev = list(Hs.eigenvals().keys())
        kind = ("minimum" if all(e > 0 for e in ev) else "maximum" if all(e < 0 for e in ev)
                else "saddle" if any(e > 0 for e in ev) and any(e < 0 for e in ev) else "inconclusive")
        pt = [s.get(v, v) for v in vs]
        R.answer(f"point {pt}", f"f = {f.subs(s)}, Hessian eigenvalues {ev} -> {kind}")
        out.append({"point": pt, "value": f.subs(s), "type": kind})
    if not sols:
        R.answer("stationary points", "none")
    return out


def min_max_1d(f, var="x", a=None, b=None, show=True):
    """One variable: f'(x) = 0, second-derivative test, and (on [a, b]) compare with the end points."""
    f, _ = _parse(f)
    x = sp.Symbol(var)
    d1, d2 = sp.diff(f, x), sp.diff(f, x, 2)
    crit = [c for c in sp.solve(d1, x) if c.is_real]
    if a is not None:
        crit = [c for c in crit if a <= c <= b]
    R = Report("Minimum / maximum (one variable)", show).given("f", f).step("f'", d1).step("f''", d2)
    pts = []
    for c in crit:
        s = d2.subs(x, c)
        kind = "local minimum" if s > 0 else "local maximum" if s < 0 else "inconclusive (f'' = 0)"
        pts.append((c, f.subs(x, c), kind))
        R.step(f"x = {c}", note=f"f = {f.subs(x, c)}, f'' = {s} -> {kind}")
    if a is not None:
        cand = pts + [(a, f.subs(x, a), "end point"), (b, f.subs(x, b), "end point")]
        lo = min(t[1] for t in cand)
        hi = max(t[1] for t in cand)
        # list EVERY x that reaches the min / max (ties happen, e.g. x^3 - 3x on [-2, 3])
        R.answer("global minimum on [a, b]", f"min = {lo}, argmin = {sorted({t[0] for t in cand if t[1] == lo})}")
        R.answer("global maximum on [a, b]", f"max = {hi}, argmax = {sorted({t[0] for t in cand if t[1] == hi})}")
    else:
        lim_lo, lim_hi = sp.limit(f, x, -sp.oo), sp.limit(f, x, sp.oo)
        R.step(f"limits: x -> -inf: {lim_lo}, x -> +inf: {lim_hi}")
        vals = [p[1] for p in pts]
        if vals and lim_lo != -sp.oo and lim_hi != -sp.oo:
            m = min(pts, key=lambda t: t[1])
            R.answer("global minimum", f"min = {m[1]}, argmin = {m[0]}")
        if vals and lim_lo != sp.oo and lim_hi != sp.oo:
            M = max(pts, key=lambda t: t[1])
            R.answer("global maximum", f"max = {M[1]}, argmax = {M[0]}")
    return pts


def linear_or_affine(f, show=True):
    """Linear: f(x) = a^T x (no constant). Affine: a^T x + b. Otherwise neither."""
    f, vs = _parse(f)
    poly = sp.Poly(f, *vs) if vs else None
    if poly is None or poly.total_degree() > 1 or any(sp.diff(f, v).free_symbols for v in vs):
        kind = "neither (not degree 1 in the variables)"
    else:
        kind = "linear" if f.subs({v: 0 for v in vs}) == 0 else "affine (linear + constant, not linear)"
    Report("Linear vs affine", show).given("f", f).answer("type", kind)
    return kind


def solve_eq(eq, var="x", show=True):
    """Solve one equation, e.g. 'x**2 - 5*x + 6 = 0'. Exact roots when possible."""
    eq = eq.replace("^", "**")
    lhs, rhs = eq.split("=") if "=" in eq else (eq, "0")
    x = sp.Symbol(var)
    e = sp.sympify(lhs) - sp.sympify(rhs)
    sols = sp.solve(e, x)
    Report("Solve equation", show).given("equation", f"{lhs} = {rhs}").answer(var, ", ".join(f"{s} ({sp.N(s, 6)})" for s in sols))
    return sols


def solve_system_eq(eqs, show=True):
    """Simultaneous equations as strings, e.g. ['2*a + b = 3', 'a - b = 0']."""
    exprs = []
    for q in eqs:
        q = q.replace("^", "**")
        lhs, rhs = q.split("=") if "=" in q else (q, "0")
        exprs.append(sp.sympify(lhs) - sp.sympify(rhs))
    vs = sorted(set().union(*[e.free_symbols for e in exprs]), key=lambda s: s.name)
    sols = sp.solve(exprs, vs, dict=True)
    R = Report("Simultaneous equations", show).step("unknowns", vs)
    if not sols:
        R.answer("solution", "no solution")
    for s in sols:
        R.answer("solution", {str(k): v for k, v in s.items()})
    return sols


def func_report(f, at=None, show=True):
    """Everything about f at once: value, gradient, Hessian, stationary points, linear / affine."""
    fe, vs = _parse(f)
    out = {"vars": vs}
    if at is not None:
        out["value"] = _at(fe, vs, at)
        Report("Value", show).answer(f"f{tuple(at)}", out["value"])
    out["type"] = linear_or_affine(f, show)
    out["grad"] = gradient(f, at, show)
    out["hessian"] = hessian(f, at, show)
    out["stationary"] = stationary(f, show)
    return out
