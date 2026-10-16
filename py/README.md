# EE2211 Solver made by Jeong Jinho

> **Development history:** see the [Development history](#development-history) section at the bottom of this page.
> The dates come from the files' Created / Modified times on my laptop (macOS Finder → Get Info).

A set of plain Python functions for the EE2211 Lecture 1–6 topics, which I prepared for the midterm.
It follows the midterm rule: **plain `.py` files only. No graphical user interface (GUI), no web page, and no AI tool runs inside it.**
It needs only `numpy`, `scipy` and `sympy`.

## What it does
Each function takes a question's numbers (a matrix, data X and y, a probability table, a function f…).
It prints the working in a fixed order, **Given → Formula → Steps → ANSWER**, and returns the values so they can be reused.
The methods are the ones taught in the lectures and tutorials. The code mainly calls numpy / scipy / sympy, plus a few small exact (fraction) routines I wrote myself.

```python
from ee_matrix import *; from ee_regression import *; from ee_prob import *; from ee_calculus import *

det([[2, 1, 3], [0, -1, 4], [1, 2, 0]])        # cofactor expansion along row 1 -> -9
r = linreg(X, y, lam=0.1, X_new=[[-1]])        # ridge regression: r["w"], r["pred"], r["MSE"]
```
`show=False` turns the printing off.

## Files and methods
| File | Topic | Method |
|---|---|---|
| `ee_utils.py` | printing, fractions | `Report` prints the sections in order; `fmt` shows `0.333333 (1/3)` |
| `ee_matrix.py` | Lecture 4: determinant, minors, cofactor, adjugate, inverse, rank, invertibility, linear independence, Xw = y, solution type, pseudoinverse | exact `Fraction` arithmetic; determinant by cofactor expansion along row 1; rank by Gauss–Jordan row reduction (number of pivots); solution type from rank(X) vs rank([X\|y]) |
| `ee_regression.py` | Lectures 5–6: linear, ridge and polynomial regression, binary and multi-class classification, loss values | one engine `fit`: build the design matrix (bias column, or polynomial features) → choose the formula from m × d → predict |
| `ee_prob.py` | Lectures 2–3: descriptive statistics, Pearson r, normalization, Probability Mass Function (PMF), Probability Density Function (PDF), Gaussian, Bayes, joint tables, counting | numpy / scipy for numbers, sympy for exact k, c, E[X], Var(X) |
| `ee_calculus.py` | Lecture 4: derivative, gradient, Hessian, Jacobian, stationary points, minimum / maximum, linear vs affine, solving equations | sympy differentiation; Hessian eigenvalues decide minimum / maximum / saddle |
| `test_ee2211.py` | self-check | compares every module with independent numpy answers from lecture and tutorial examples: `python3 test_ee2211.py` |

## The main rule (`solve_weights` in `ee_regression.py`)
- λ = 0: m = d and invertible → w = X⁻¹y; m > d → w = (XᵀX)⁻¹Xᵀy (least squares, left inverse); m < d → w = Xᵀ(XXᵀ)⁻¹y (minimum norm, right inverse)
- λ > 0: m ≥ d → primal (XᵀX + λI)⁻¹Xᵀy; m < d → dual Xᵀ(XXᵀ + λI)⁻¹y
- Binary classification: labels → ±1 ({0,1} or {−1,1}: 1 is +1), class = sign(xᵀw), sign(0) = +1
- Multi-class: one-hot Y, class = argmax of each row of X_new W
- Polynomial features: 1, x1, x2, x1², x1x2, x2², … (sklearn `PolynomialFeatures` order), C(d + p, p) columns

## Development history
I did not use Git, so the dates below come from the files' own creation and modification times on my laptop (macOS Finder → Get Info shows the same dates).

| Date (2026) | What I did | Files (evidence) |
|---|---|---|
| 2 Sep | Course start: my own study notes and practice code for Lectures 1–4 and Assignment 1 | `study_notes_linear_systems.py` (in my separate study folder on my laptop, outside this repository) (the m = d / m > d / m < d cases for Xw = y), `EE2211_master_code.ipynb`, `classification_Lec12_annotated.ipynb`, `A1_A0286635R.py` |
| 25 Sep | First version of my web solver: core, matrix, calculus, probability and code tools, plus the first tests | `../src/core.js`, `expr.js`, `common.js`, `tools_matrix.js`, `tools_calc.js`, `tools_prob.js`, `tools_code.js`, `../tests/t1.js`, `t2.js`, `../EE2211_Solver.html` |
| 26–27 Sep | A tool map slide deck and step-by-step guides | `../EE2211_Solver_Tool_Map.pptx`, `../src/guides.js` |
| 30 Sep | Text / paste input for matrices, a build script that bundles everything into one file | `../src/textinput.js`, `../build.py`, `../deck/build_deck.js` |
| 5 Oct | Updated the input handling and the tool map | `textinput.js`, `EE2211_Solver_Tool_Map.pptx` |
| 15 Oct | Large update: rewrote the regression / classification tools, added merged pages, glossary and slide finder, independent numpy checks for every tool | `../src/tools_reg.js`, `tools_merged.js`, `tools_glossary.js`, `tools_slides.js`, `../tests/make_cases.py`, `cases.json` |
| 16 Oct | After the midterm announcement, I moved the solving logic into plain Python functions (this folder), so the program has no GUI or web page. I used an AI coding assistant to help with this conversion, then checked the results against the lecture and tutorial examples with `test_ee2211.py` (all pass) | `py/*.py` |

The web version (`../src/`, about 6,800 lines) is kept unchanged, so it can be compared with this Python version.
The method in each Python function is the same as in the matching JavaScript tool (for example `solve_weights` ↔ `lsqSolve` in `../src/common.js`).

## Verified against
Lecture 4 Examples 1–4 · Lecture 5 Examples 1–4 · Lecture 6 Examples 1–3 · Tutorial 3–6 questions · Trial Quiz (from the web version), and `test_ee2211.py` for the Python version.
