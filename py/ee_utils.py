# =====================================================================
# EE2211 Midterm Solver — made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_utils.py — small helpers shared by every module (printing, fractions).

Every solver function prints its work in the same order as the web version:
  Given -> Formula -> Steps -> Final answer
and RETURNS the numbers, so the result can be reused in the next cell.
Pass show=False to any solver to silence the printing.
"""
from fractions import Fraction
import numpy as np

np.set_printoptions(precision=6, suppress=True, linewidth=120)
print("EE2211 Midterm Solver — made by Jeong Jinho (A0286635R)")   # shown once, on the first import


def frac(x, max_den=1000):
    """Float -> nearest simple fraction, e.g. 0.333333 -> 1/3 (for reading off exact answers)."""
    return Fraction(float(x)).limit_denominator(max_den)


def to_frac_matrix(A):
    """Any 2-D list / array -> list of lists of Fraction (exact arithmetic)."""
    return [[Fraction(x).limit_denominator(10**9) if not isinstance(x, Fraction) else x for x in row] for row in np.atleast_2d(A).tolist()]


def fmt(x):
    """Number -> short string: '0.333333 (1/3)' when a simple fraction exists."""
    if isinstance(x, Fraction):
        return str(x) if x.denominator == 1 else f"{float(x):.6g} ({x})"
    try:
        x = float(x)
    except (TypeError, ValueError):
        return str(x)                      # symbols such as 'k'
    if abs(x) < 1e-12:
        x = 0.0                            # hide rounding noise like 1.8e-16
    f = frac(x)
    if abs(float(f) - x) < 1e-9 and f.denominator != 1:
        return f"{x:.6g} ({f})"
    return f"{x:.6g}"


def show_matrix(name, A):
    """Print a matrix (list / numpy / Fraction) row by row."""
    A = np.atleast_2d(np.array(A, dtype=object))
    cells = [[fmt(v) for v in row] for row in A]
    w = max(len(c) for row in cells for c in row)
    print(f"{name} ({A.shape[0]}x{A.shape[1]}):")
    for row in cells:
        print("   [ " + "  ".join(c.rjust(w) for c in row) + " ]")


class Report:
    """Prints the sections in a fixed order. Used as: R = Report('Title', show)."""

    def __init__(self, title, show=True):
        self.show = show
        if show:
            print("=" * 70 + f"\n{title}\n" + "=" * 70)

    def given(self, name, value):
        if self.show:
            self._value("[Given] " + name, value)
        return self

    def formula(self, text, note=""):
        if self.show:
            print(f"[Formula] {text}" + (f"\n          {note}" if note else ""))
        return self

    def step(self, name, value=None, note=""):
        if self.show:
            self._value("[Step] " + name, value)
            if note:
                print("        " + note)
        return self

    def answer(self, name, value):
        if self.show:
            self._value(">>> ANSWER: " + name, value)
        return self

    def note(self, text):
        if self.show:
            print("  note: " + text)
        return self

    def _value(self, name, value):
        if value is None:
            print(name)
        elif isinstance(value, (list, tuple, np.ndarray)) and np.ndim(np.array(value, dtype=object)) == 2:
            show_matrix(name, value)
        elif isinstance(value, (list, tuple, np.ndarray)):
            print(f"{name} = [" + ", ".join(fmt(v) for v in np.ravel(np.array(value, dtype=object))) + "]")
        elif isinstance(value, (int, float, Fraction, np.floating, np.integer)):
            print(f"{name} = {fmt(value)}")
        else:
            print(f"{name}: {value}")
