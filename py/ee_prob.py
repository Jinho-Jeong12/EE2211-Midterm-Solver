# =====================================================================
# EE2211 Solver made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_prob.py — Lectures 2-3: statistics and probability.

Main functions
  desc_stats(x)                 mean, median, mode, variance / standard deviation (sample n-1 AND population n), range, quartiles
  pearson(x, y)                 Pearson correlation r = cov(x, y) / (s_x s_y)
  corr_features(X, y)           r of every feature column with y (feature ranking)
  normalize(x)                  min-max and z-score
  pmf(values, probs)            E[X], Var(X); probs may contain the symbol 'k' to solve sum = 1
  pdf(expr, a, b)               find c so the integral is 1, Pr[lo <= X <= hi], E[X], Var(X)
  normal_prob(mu, sigma, lo, hi)  Gaussian probabilities with the Cumulative Distribution Function (CDF)
  bayes(p_b_given_a, p_a, p_b_given_not_a)     P(A|B)
  bayes_multi(priors, likelihoods)             several hypotheses (boxes / machines)
  joint_table(T)                marginals and conditionals of a joint probability table
  dice(cond, n_dice, sides)     Pr(condition) by enumerating all outcomes
  exactly_k(probs, k)           Pr(exactly k of several independent events)
  draws(counts, seq, replace)   sequential draws with / without replacement

Libraries
  numpy  -> numeric statistics (mean, var, percentiles)
  sympy  -> exact symbolic maths (solve for an unknown k or c, integrate a PDF exactly)
  scipy.stats.norm -> the normal Cumulative Distribution Function (CDF)
  Fraction -> exact probabilities such as 1/6 instead of 0.1666667
"""
from fractions import Fraction
from itertools import product, combinations      # product = every dice outcome; combinations = which k events happen
import numpy as np
import sympy as sp
from scipy import stats
from ee_utils import Report, fmt


# =====================================================================
# 1. Descriptive statistics (Lecture 2)
# =====================================================================
def desc_stats(x, show=True):
    """All the usual summary numbers of one data list.
    Watch out: SAMPLE variance divides by n-1, POPULATION variance divides by n.
    numpy's var()/std() use n (ddof=0) unless ddof=1 is given."""
    x = np.array(x, float)
    vals, cnt = np.unique(x, return_counts=True)       # distinct values and how often each appears (for the mode)
    out = {
        "n": len(x), "sum": x.sum(), "mean": x.mean(), "median": np.median(x),
        "mode": vals[cnt == cnt.max()].tolist(),       # every value with the highest count (can be more than one)
        "sample variance (n-1)": x.var(ddof=1), "sample standard deviation (n-1)": x.std(ddof=1),
        "population variance (n)": x.var(), "population standard deviation (n)": x.std(),
        "min": x.min(), "max": x.max(), "range": x.max() - x.min(),
        "Q1 (numpy)": np.percentile(x, 25), "Q3 (numpy)": np.percentile(x, 75),
        "interquartile range (IQR)": np.percentile(x, 75) - np.percentile(x, 25),
    }
    R = Report("Descriptive statistics", show).given("x", x)
    R.note("numpy var() / std() default is population (ddof=0); pandas .var() / .std() default is sample (ddof=1)")
    for k, v in out.items():
        R.answer(k, v)
    return out


def pearson(x, y, show=True):
    """r = sum (x - mean x)(y - mean y) / sqrt(sum (x - mean x)^2 * sum (y - mean y)^2).
    r is between -1 and 1: +1 perfect increasing line, -1 perfect decreasing line, 0 no linear relation.
    (The n-1 factors in covariance and standard deviations cancel, so they do not appear here.)"""
    x, y = np.array(x, float), np.array(y, float)
    dx, dy = x - x.mean(), y - y.mean()                # deviations from the mean
    r = (dx @ dy) / np.sqrt((dx @ dx) * (dy @ dy))     # @ on two vectors = sum of products
    R = Report("Pearson correlation coefficient r", show).given("x", x).given("y", y)
    R.formula("r = sum(dx*dy) / sqrt(sum(dx^2) * sum(dy^2)),  dx = x - mean(x)")
    R.step("sum dx*dy", dx @ dy).step("sum dx^2", dx @ dx).step("sum dy^2", dy @ dy)
    R.step("sample covariance (n-1)", (dx @ dy) / (len(x) - 1))
    R.answer("r", r)
    return r


def corr_features(X, y, show=True):
    """Pearson r of every feature column of X with y, printed from strongest |r| to weakest.
    Used for questions like "which feature is most correlated with the target?"."""
    X = np.atleast_2d(np.array(X, float))
    rs = [pearson(X[:, j], y, show=False) for j in range(X.shape[1])]   # X[:, j] = column j
    R = Report("Correlation of each feature with y", show)
    for j in np.argsort(-np.abs(rs)):                  # indices sorted by |r|, largest first
        R.answer(f"feature x{j + 1}: r", rs[j])
    return rs


def normalize(x, show=True):
    """min-max scaling to [0, 1] and z-score standardisation (mean 0, standard deviation 1).
    Both z-score versions are shown because questions differ in using n-1 or n."""
    x = np.array(x, float)
    mm = (x - x.min()) / (x.max() - x.min())
    z = (x - x.mean()) / x.std(ddof=1)                 # sample standard deviation
    zp = (x - x.mean()) / x.std()                      # population standard deviation
    R = Report("Normalization", show).given("x", x)
    R.answer("min-max (x - min) / (max - min)", mm)
    R.answer("z-score with sample standard deviation (n-1)", z)
    R.answer("z-score with population standard deviation (n)", zp)
    return {"minmax": mm, "z_sample": z, "z_population": zp}


# =====================================================================
# 2. Random variables (Lecture 3): PMF, PDF, Gaussian
# =====================================================================
def pmf(values, probs, show=True):
    """Probability Mass Function. probs may be strings with an unknown k, e.g. ['k', '2*k', '0.4'].
    Steps: (1) if k appears, solve sum p(x) = 1 for k  (2) E[X] = sum x p(x)
           (3) E[X^2] = sum x^2 p(x)  (4) Var(X) = E[X^2] - E[X]^2."""
    k = sp.Symbol("k")
    P = [sp.nsimplify(sp.sympify(p)) for p in probs]   # text -> sympy expression; nsimplify turns 0.25 into 1/4
    R = Report("Probability Mass Function (PMF)", show).given("values", list(values)).given("probabilities", [str(p) for p in P])
    if any(p.free_symbols for p in P):                 # some probability still contains the unknown k
        sol = sp.solve(sp.Eq(sum(P), 1), k)            # all probabilities must add up to 1
        R.formula("sum of all probabilities = 1  ->  solve for k").answer("k", str(sol[0]))
        P = [p.subs(k, sol[0]) for p in P]             # put the value of k back in
    P = [sp.nsimplify(p) for p in P]
    v = [sp.nsimplify(x) for x in values]
    E = sum(a * b for a, b in zip(v, P))               # expected value
    E2 = sum(a ** 2 * b for a, b in zip(v, P))         # second moment
    var = E2 - E ** 2
    out = {"probs": P, "E[X]": E, "E[X^2]": E2, "Var(X)": var, "std": sp.sqrt(var)}
    R.formula("E[X] = sum x p(x),  Var(X) = E[X^2] - (E[X])^2")
    for key in ["E[X]", "E[X^2]", "Var(X)", "std"]:
        R.answer(key, f"{out[key]} = {float(out[key]):.6g}")   # exact value = decimal value
    return out


def pdf(expr, a, b, lo=None, hi=None, show=True):
    """Probability Density Function f(x) = expr on [a, b] (e.g. 'c*x**2', 0, 3).
    Finds c (if present) so the total integral is 1, then Pr[lo <= X <= hi], E[X], Var(X).
    Same idea as the PMF but sums become integrals."""
    x, c = sp.symbols("x c")
    f = sp.sympify(expr)
    a, b = sp.sympify(a), sp.sympify(b)                # support [a, b]; can be 'oo' for infinity
    R = Report("Probability Density Function (PDF)", show).given("f(x)", str(f)).given("support", f"[{a}, {b}]")
    out = {}
    if c in f.free_symbols:                            # unknown constant c in the density
        cv = sp.solve(sp.Eq(sp.integrate(f, (x, a, b)), 1), c)[0]   # integral of f over [a, b] = 1
        R.formula("integral of f over the support = 1  ->  solve for c").answer("c", f"{cv} = {float(cv):.6g}")
        f = f.subs(c, cv)
        out["c"] = cv
    E = sp.simplify(sp.integrate(x * f, (x, a, b)))            # E[X] = integral x f(x) dx
    E2 = sp.simplify(sp.integrate(x ** 2 * f, (x, a, b)))      # E[X^2]
    out.update({"f": f, "E[X]": E, "Var(X)": sp.simplify(E2 - E ** 2)})
    R.answer("E[X] = integral x f(x) dx", f"{E} = {float(E):.6g}")
    R.answer("Var(X) = E[X^2] - E[X]^2", f"{out['Var(X)']} = {float(out['Var(X)']):.6g}")
    if lo is not None:
        # clip [lo, hi] to the support, because f is 0 outside [a, b]
        p = sp.integrate(f, (x, max(sp.sympify(lo), a), min(sp.sympify(hi), b)))
        out["prob"] = p
        R.answer(f"Pr[{lo} <= X <= {hi}]", f"{p} = {float(p):.6g}")
    return out


def normal_prob(mu, sigma, lo=-np.inf, hi=np.inf, show=True):
    """Pr[lo <= X <= hi] for X ~ Normal(mu, sigma^2). sigma is the STANDARD DEVIATION
    (if a question gives the variance, pass its square root).
    CDF(t) = Pr[X <= t], so Pr[lo <= X <= hi] = CDF(hi) - CDF(lo)."""
    p = stats.norm.cdf(hi, mu, sigma) - stats.norm.cdf(lo, mu, sigma)
    R = Report("Gaussian / Normal probability", show).given("mu, sigma", (mu, sigma))
    R.formula("Pr = CDF(hi) - CDF(lo),  z = (x - mu) / sigma")
    for v in (lo, hi):
        if np.isfinite(v):                             # skip -inf / +inf
            R.step(f"z({v})", (v - mu) / sigma)        # standardised value, for checking with a z-table
    R.answer(f"Pr[{lo} <= X <= {hi}]", p)
    return p


# =====================================================================
# 3. Events and Bayes (Lecture 3)
# =====================================================================
def bayes(p_b_given_a, p_a, p_b_given_not_a=None, p_b=None, show=True):
    """P(A|B) = P(B|A) P(A) / P(B),  P(B) = P(B|A)P(A) + P(B|not A)P(not A).
    Typical use: A = has the disease, B = test is positive.
    Give either p_b directly, or p_b_given_not_a so P(B) is built by the law of total probability."""
    f = lambda v: Fraction(str(v))                     # str() first so 0.1 becomes exactly 1/10
    if p_b is None:
        p_b = f(p_b_given_a) * f(p_a) + f(p_b_given_not_a) * (1 - f(p_a))   # total probability
    post = f(p_b_given_a) * f(p_a) / f(p_b)
    R = Report("Bayes' rule", show).formula("P(A|B) = P(B|A) P(A) / P(B)")
    R.step("P(B) (total probability)", f(p_b)).answer("P(A|B)", post)
    return post


def bayes_multi(priors, likelihoods, show=True):
    """Several hypotheses H_i: posterior_i = P(E|H_i) P(H_i) / sum_j P(E|H_j) P(H_j).
    Example: 3 machines make 50 / 30 / 20 % of items with defect rates 1 / 2 / 3 %;
    given a defect E, which machine made it?  bayes_multi([0.5, 0.3, 0.2], [0.01, 0.02, 0.03])."""
    pr = [Fraction(str(p)) for p in priors]
    lk = [Fraction(str(p)) for p in likelihoods]
    joint = [a * b for a, b in zip(pr, lk)]            # P(E and H_i)
    tot = sum(joint)                                   # P(E), total probability
    post = [j / tot for j in joint]                    # normalise so the posteriors add up to 1
    R = Report("Bayes with several hypotheses", show)
    R.step("P(E and H_i) = P(E|H_i) P(H_i)", joint).step("P(E) = sum", tot).answer("P(H_i | E)", post)
    return {"P(E)": tot, "posterior": post}


def joint_table(T, show=True):
    """Rows = values of X, columns = values of Y. Returns marginals and conditionals.
    Marginal P(X) = row sums, P(Y) = column sums.
    Conditional P(Y|X) = each row divided by its row sum.
    Independent iff every cell P(x, y) = P(x) P(y)."""
    T = np.array([[Fraction(str(v)) for v in r] for r in T], dtype=object)   # dtype=object keeps Fractions exact
    px, py = T.sum(axis=1), T.sum(axis=0)              # axis=1 sums across a row, axis=0 down a column
    out = {"P(X)": px, "P(Y)": py, "P(Y|X) rows": T / px[:, None], "P(X|Y) columns": T / py[None, :],
           "independent?": all(T[i, j] == px[i] * py[j] for i in range(T.shape[0]) for j in range(T.shape[1]))}
    R = Report("Joint probability table", show).given("P(X, Y)", T)
    for k, v in out.items():
        R.answer(k, v)
    return out


def dice(cond, n_dice=2, sides=6, show=True):
    """Enumerate every outcome. cond is a function of the tuple, e.g. lambda o: sum(o) == 7.
    Pr = (number of outcomes where cond is True) / (total number of outcomes) — all outcomes equally likely."""
    all_o = list(product(range(1, sides + 1), repeat=n_dice))   # e.g. (1,1), (1,2), ..., (6,6) for two dice
    good = [o for o in all_o if cond(o)]
    p = Fraction(len(good), len(all_o))
    Report("Probability by counting outcomes", show).step(f"{len(good)} favourable out of {len(all_o)}").answer("Pr", p)
    return p


def exactly_k(probs, k, show=True):
    """Independent events with probabilities probs: Pr(exactly k of them happen).
    Sum over every choice S of k events: product of p_i for i in S times (1 - p_i) for i not in S."""
    ps = [Fraction(str(p)) for p in probs]
    n = len(ps)
    tot = Fraction(0)
    for S in combinations(range(n), k):                # every set of k events that happen
        term = Fraction(1)
        for i in range(n):
            term *= ps[i] if i in S else 1 - ps[i]     # happens -> p_i, does not happen -> 1 - p_i
        tot += term
    Report(f"Pr(exactly {k} of {n} independent events)", show).answer("Pr", tot)
    return tot


def draws(counts, seq, replace=False, show=True):
    """counts = {'red': 3, 'blue': 2}; seq = ['red', 'blue'] -> Pr of drawing that sequence in order.
    Multiply the probability of each draw; without replacement the drawn ball is removed first."""
    c = dict(counts)                                   # copy, so the caller's dictionary is not changed
    p = Fraction(1)
    R = Report(f"Sequential draws ({'with' if replace else 'without'} replacement)", show)
    for s in seq:
        tot = sum(c.values())                          # balls left in the bag
        step = Fraction(c[s], tot)                     # chance this draw is colour s
        R.step(f"draw {s}: {c[s]}/{tot}", step)
        p *= step
        if not replace:
            c[s] -= 1                                  # that ball is now out of the bag
    R.answer("Pr(sequence)", p)
    return p
