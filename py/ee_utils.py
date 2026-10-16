# =====================================================================
# EE2211 Solver made by Jeong Jinho (A0286635R)
# Python version of my own web solver (../src/*.js), Lectures 1-6
# =====================================================================
"""ee_utils.py — small helpers shared by every module (printing, fractions).

Every solver function prints its work in the same order as the web version:
  Given -> Formula -> Steps -> Final answer
and RETURNS the numbers, so the result can be reused in the next cell.
Pass show=False to any solver to silence the printing.

Nothing in this file does EE2211 maths; it only formats numbers and prints.
"""
from fractions import Fraction
import numpy as np

# numpy printing: 6 decimals, no scientific notation for small numbers, wide lines so matrices do not wrap
np.set_printoptions(precision=6, suppress=True, linewidth=120)
print("EE2211 Solver made by Jeong Jinho (A0286635R)")   # shown once, on the first import


def frac(x, max_den=1000):
    """Float -> nearest simple fraction, e.g. 0.333333 -> 1/3 (for reading off exact answers).
    limit_denominator(1000) = the closest fraction whose denominator is at most 1000."""
    return Fraction(float(x)).limit_denominator(max_den)


def to_frac_matrix(A):
    """Any 2-D list / array -> list of lists of Fraction (exact arithmetic).
    Used by ee_matrix so that determinants and inverses come out as exact fractions."""
    # atleast_2d turns a single row [1, 2] into [[1, 2]]; .tolist() gives plain Python numbers
    return [[Fraction(x).limit_denominator(10**9) if not isinstance(x, Fraction) else x for x in row] for row in np.atleast_2d(A).tolist()]


def fmt(x):
    """Number -> short string: '0.333333 (1/3)' when a simple fraction exists.
    Showing both forms means I can match either a decimal or a fraction in the answer options."""
    if isinstance(x, Fraction):
        return str(x) if x.denominator == 1 else f"{float(x):.6g} ({x})"
    try:
        x = float(x)
    except (TypeError, ValueError):
        return str(x)                      # symbols such as 'k'
    if abs(x) < 1e-12:
        x = 0.0                            # hide rounding noise like 1.8e-16
    f = frac(x)
    if abs(float(f) - x) < 1e-9 and f.denominator != 1:   # only add the fraction if it is (almost) exact
        return f"{x:.6g} ({f})"
    return f"{x:.6g}"                       # .6g = 6 significant digits


def show_matrix(name, A):
    """Print a matrix (list / numpy / Fraction) row by row, with the columns lined up."""
    A = np.atleast_2d(np.array(A, dtype=object))         # dtype=object keeps Fractions as Fractions
    cells = [[fmt(v) for v in row] for row in A]         # every entry as text
    w = max(len(c) for row in cells for c in row)        # widest entry -> column width
    print(f"{name} ({A.shape[0]}x{A.shape[1]}):")
    for row in cells:
        print("   [ " + "  ".join(c.rjust(w) for c in row) + " ]")   # rjust = right-align to width w


class Report:
    """Prints the sections in a fixed order. Used as: R = Report('Title', show).
    Every method returns self, so calls can be chained: R.step(...).step(...).answer(...).
    When show=False nothing is printed (used when one solver calls another internally)."""

    def __init__(self, title, show=True):
        self.show = show
        if show:
            print("=" * 70 + f"\n{title}\n" + "=" * 70)   # title bar

    def given(self, name, value):
        """The question's input data."""
        if self.show:
            self._value("[Given] " + name, value)
        return self

    def formula(self, text, note=""):
        """The formula chosen (and why, in the note)."""
        if self.show:
            print(f"[Formula] {text}" + (f"\n          {note}" if note else ""))
        return self

    def step(self, name, value=None, note=""):
        """An intermediate result (for checking the working)."""
        if self.show:
            self._value("[Step] " + name, value)
            if note:
                print("        " + note)
        return self

    def answer(self, name, value):
        """A final answer, marked with >>> so it is easy to spot."""
        if self.show:
            self._value(">>> ANSWER: " + name, value)
        return self

    def note(self, text):
        """A warning or reminder."""
        if self.show:
            print("  note: " + text)
        return self

    def _value(self, name, value):
        """Choose how to print a value: matrix, vector, single number, or anything else as text."""
        if value is None:
            print(name)
        elif isinstance(value, (list, tuple, np.ndarray)) and np.ndim(np.array(value, dtype=object)) == 2:
            show_matrix(name, value)                     # 2-D -> matrix layout
        elif isinstance(value, (list, tuple, np.ndarray)):
            print(f"{name} = [" + ", ".join(fmt(v) for v in np.ravel(np.array(value, dtype=object))) + "]")
        elif isinstance(value, (int, float, Fraction, np.floating, np.integer)):
            print(f"{name} = {fmt(value)}")
        else:
            print(f"{name}: {value}")                    # text, sympy expressions, dictionaries ...
