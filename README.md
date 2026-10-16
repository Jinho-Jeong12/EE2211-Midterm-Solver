# EE2211 Solver made by Jeong Jinho

> **Development history:** see [`py/README.md` → Development history](py/README.md#development-history).
> It lists what I built on each date (2 Sep – 16 Oct 2026) and the files that show it.
> The same dates can be checked on my laptop in macOS Finder (select a file → Get Info → Created / Modified).

## How to run it (quick start)

### Web version — `EE2211_Solver_web.html` (the original program, 25 Sep – 15 Oct)
1. On this GitHub page, click **[`EE2211_Solver_web.html`](EE2211_Solver_web.html)** in the file list.
2. Click the **Download raw file** button (the ⬇ icon at the top right of the file view).
3. **Double-click the downloaded file.** It opens in Chrome, Safari or Edge. It works **with no internet and no install**.
4. Pick a topic from the home page or the left menu (or type a keyword in the search box), enter the numbers from the question, and press **Solve** (or `Ctrl / ⌘ + Enter`).
5. Read the yellow **Final Answer** box. The working (Given → Formula → Steps → Check) is shown above and below it.

Example: *Linear Regression → Train + Predict* → paste X and y → tick "add bias" → enter X_new → Solve → the weights w and the prediction ŷ appear in the yellow box.

Notes: inputs are saved automatically in the browser (localStorage). The Slide Finder is empty in this public copy, because the lecture slides belong to the course and are not mine to publish.
The file is built from `src/` by `build_public.py`. Some explanation texts in the web version are in Korean (my first language); I wrote them as study notes while building it.

### Python version — `py/` folder (for the midterm rule: plain scripts, no graphical interface)
1. Download this repository (green **Code** button → **Download ZIP**) and unzip it.
2. Open `py/EE2211_exam.ipynb` in Jupyter or VS Code (needs `numpy`, `scipy`, `sympy`).
3. Run any cell with **Shift + Enter**: every cell loads the solver by itself. Change the numbers to the question's numbers.
4. Read the lines marked `>>> ANSWER`. Details: [`py/README.md`](py/README.md).

## Web version — usage details (Lecture 1–6)
- Pick a solver from the left tree (toggle dropdown), or type in the search box (`/` jumps to search, `Enter` opens the first match).
- Press `Ctrl/⌘ + Enter` to Solve.
- Every result is laid out in the same order: **1 Given → 2 Finding → 3 Formula → 4 Steps → 5 Final Answer (yellow box) → 6 Check → Python code**.
- copy buttons: copy the answer, or copy a matrix as a numpy array.
- Top bar: `Precision` sets decimal places; `fractions` shows 1/3 instead of 0.3333; `dark` toggles dark mode.

## "Question wording → value" tables and Glossary
- Regression, ridge, polynomial, loss, classification, statistics, correlation, PMF/PDF and Gaussian results end with a large table: every name an exam may use (for example "squared error loss", "empirical risk", "sample variance") → meaning in Korean → formula → value (with exact fraction).
- **Glossary** (top bar): type a word from the question to see its meaning, formula, which solver to use, and a link to the lecture slides. Every glossary wording is also searchable from the sidebar search box.

## Merged pages (same input → every result on one page)
- **Matrix A — everything**: rank, invertibility (left / right inverse), determinant, minors, cofactor, adjugate, inverse, transpose, pseudoinverse.
- **Solve Xw = y — everything**: solution w, solution type (rank test), invertibility of X.
- **Train + Predict (Linear / Ridge)**: λ = 0 → least squares (+ normal-equation derivation), λ > 0 → ridge (auto / primal / dual).
- **Function f — everything**: linear/affine, value at a point, derivative or gradient, Hessian, stationary points, min / max.
- **Statistics — everything**: all descriptive statistics, plus Pearson r when a second list is given.
- The absorbed solvers are hidden from the menu; their old links and search words lead to the merged page (`src/tools_merged.js`).

## Slide Finder (top bar button)
- Type a concept keyword (for example "inverse", "variance", or an abbreviation such as MSE / PMF) and every matching lecture or tutorial slide is listed with a thumbnail. Click a card to open that PDF at that page in a separate window. Leave the box empty to browse each lecture's table of contents.
- The PDFs must stay in the folder **above** `EE2211_Solver/` (where they are now); the links are `../<file>.pdf#page=N`.
- After adding or replacing a PDF, run `python3 build_slides.py` (needs `pip install pymupdf`) and then `python3 build.py`. Image-only slides have hand-written keywords in the `MANUAL` table in `build_slides.py`.

## Calculator · Solve · Simultaneous equations (top bar buttons)
- **Calculator**: one calculation per line, results update as you type. Every result shows the decimal **and** the exact form (`10/21`, `√2`, `3π/4`). `a = 3/4` stores a variable; `ans` is the previous line. Extra functions: `fact(n)`, `nCr(n,k)`, `nPr(n,k)`.
- **Solve**: ① type the equation ② type the variable. TI style `solve(x^2-5x+6=0, x)` also works. Polynomials give exact roots (fractions, √, and complex roots for reference); other equations are solved numerically within the search range.
- **Simultaneous equations**: one equation per line, unknowns are detected automatically. Linear systems are solved exactly (fractions, RREF, no / infinite solution detection); nonlinear systems are solved numerically.
- Precision is never below 5 decimal places (default 6).

## Entering matrices
- Buttons: +row / −row / +column / −column, ᵀ (transpose), I (identity), 0 (clear), paste (type or paste as text).
- **Paste straight from Excel or text into the top-left cell and the whole matrix is replaced.** Accepted formats: `1 2; 3 4`, `[[1,2],[3,4]]`, or newline-separated rows.
- Cells accept expressions such as `1/3`, `-2^2`, `sqrt(2)`. Enter moves to the next row and adds a row automatically at the bottom.
- In the regression and classification tools, X and y rows stay in sync automatically.

## Key rules (built in)
- **Bias**: the regression tools prepend a 1s column automatically when "add bias" is ticked. The *Solve Xw = y* tool never adds a bias, because a system of equations has no bias term.
- Formula selection: m = d → X⁻¹, m > d → (XᵀX)⁻¹Xᵀ (least squares), m < d → Xᵀ(XXᵀ)⁻¹ (constrained). For ridge, primal vs dual is picked from the size of P (or X).
- Binary labels: `class1 → +1, class2 → −1`, `{0,1} → 0 = −1, 1 = +1`. Use "+1 label" to override. sign(0) = +1.
- Polynomial column order: sklearn (default) or lecture order (1, x1, x2, x1x2, x1², x2²). Predictions are the same either way; only the order of w changes.

## Verified against (all match)
L4 Ex1–4 · L5 Ex1–4 · L6 Ex1–3 · Tutorial 3 Q1–3 · Tutorial 4 Q1–8 · Tutorial 5 Q1–4, Q9 · Tutorial 6 Q2–5 · Trial Quiz (MCQ1, MCQ4, MCQ6, FIB1–3)

## Editing and rebuilding
Edit the source in `src/`, then run `python3 build.py`. This regenerates `EE2211_Solver.html`.
