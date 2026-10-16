#!/usr/bin/env python3
"""Index every lecture / tutorial PDF page (title + text + thumbnail) into src/slides_data.js.
PDFs live in the parent folder of EE2211_Solver/. Needs PyMuPDF (pip install pymupdf).
Run this whenever a PDF is added or replaced, then run build.py."""
import base64, json, pathlib, re, unicodedata
import pymupdf

root = pathlib.Path(__file__).parent
pdf_dir = root.parent
FILES = [  # (file name, short label, lecture number for sorting)
    ('Lec_0.pdf', 'Lecture 0 — Course Introduction', 0),
    ('Lec_1_Annotated_Xinchao_AY2627Sem1.pdf', 'Lecture 1 — Introduction to Machine Learning', 1),
    ('Lec_2_Annotated_Xinchao_AY2627Sem1.pdf', 'Lecture 2 — Data Engineering', 2),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 'Lecture 3 — Probability, Statistics, Linear Algebra', 3),
    ('EE2211 Lecture 4_Annotated (1).pdf', 'Lecture 4 — Systems of Linear Equations', 4),
    ('EE2211 Lecture 5_Annotated.pdf', 'Lecture 5 — Calculus, Optimisation, Linear Regression', 5),
    ('EE2211 Lecture 6_JZ_annotated.pdf', 'Lecture 6 — Ridge, Polynomial Regression, Classification', 6),
    ('Tutorial 1 Q&A.pdf', 'Tutorial 1 — Questions & Answers', 11),
    ('Tutorial 2 Q&A.pdf', 'Tutorial 2 — Questions & Answers', 12),
    ('Tutorial 3 Q&A.pdf', 'Tutorial 3 — Questions & Answers', 13),
    ('Tutorial4-Q_A.pdf', 'Tutorial 4 — Questions & Answers', 14),
    ('Tutorial5-Q_A.pdf', 'Tutorial 5 — Questions & Answers', 15),
    ('Tutorial6-Questions.pdf', 'Tutorial 6 — Questions', 16),
]
# pages whose content is an image (no text layer): keywords read from the slide by eye
MANUAL = {
    ('EE2211 Lecture 4_Annotated (1).pdf', 7): ('Operations on Vectors and Matrices', 'operations on vectors scalar multiplication a x = [a x1, a x2] scalar division 1/a x'),
    ('EE2211 Lecture 4_Annotated (1).pdf', 10): ('Operations on Vectors and Matrices', 'matrix-vector product W x = [w11 x1 + w12 x2 + w13 x3, w21 x1 + w22 x2 + w23 x3] 2x3 times 3x1 dimensions'),
    ('EE2211 Lecture 4_Annotated (1).pdf', 36): ('Poll: over-determined system', 'poll true false 100 elderly participants brain imaging cognitive decline ageing 10 brain measures predict cognition over-determined system tall'),
    ('EE2211 Lecture 4_Annotated (1).pdf', 37): ('Poll: even-determined system', 'poll true false 100 older adults 100 brain and body measures even-determined system square approximated solution'),
    ('EE2211 Lecture 4_Annotated (1).pdf', 38): ('Poll: under-determined system', 'poll true false subset 40 older adults 100 measures under-determined system less unknowns than equations right inverse predict cognition'),
    ('EE2211 Lecture 5_Annotated.pdf', 11): ('Poll: linear function', 'poll true false suppose y = a + b + 2c + 3 linear function affine offset'),
    ('EE2211 Lecture 5_Annotated.pdf', 12): ('Poll: derivative of scalar function', 'poll true false g(x) scalar function of d variables x d x 1 vector outcome of differentiation with respect to w.r.t. x is a d x 1 vector gradient'),
    ('EE2211 Lecture 5_Annotated.pdf', 13): ('Questions?', 'questions'),
    ('EE2211 Lecture 5_Annotated.pdf', 33): ('Poll: multiple-output parameter matrix', 'poll true false linear regression 5 input brain measures simultaneously predict age and sex parameter matrix W dimension 5 x 2 multiple outputs bias 6 x 2'),
    ('EE2211 Lecture 5_Annotated.pdf', 34): ('Poll: multiple-output parameter matrix (results)', 'poll results linear regression 5 input brain measures predict age and sex parameter matrix W dimension 5 x 2'),
    ('EE2211 Lecture 5_Annotated.pdf', 35): ('Poll: multiple-output parameter matrix (results)', 'poll results linear regression 5 input brain measures predict age and sex parameter matrix W dimension 5 x 2'),
    ('EE2211 Lecture 5_Annotated.pdf', 37): ('Questions?', 'questions'),
    ('EE2211 Lecture 6_JZ_annotated.pdf', 26): ('Poll: polynomial nonlinear decision boundary', 'poll true false polynomial model can solve problems with nonlinear decision boundary XOR'),
    ('EE2211 Lecture 6_JZ_annotated.pdf', 27): ('Poll: number of polynomial parameters', 'poll true false full third-order polynomial model one input feature single output three parameters to learn (answer: four parameters w0 w1 w2 w3)'),
    ('EE2211 Lecture 6_JZ_annotated.pdf', 28): ('Poll: second-order polynomial system type', 'poll true false four data samples two input features full second-order polynomial model over-determined system (6 parameters, under-determined)'),
    ('Lec_0.pdf', 1): ('Welcome', 'welcome course introduction'),
    ('Lec_1_Annotated_Xinchao_AY2627Sem1.pdf', 3): ("World's Largest Selfie", 'world largest selfie crowd photo face detection people counting computer vision example'),
    ('Lec_1_Annotated_Xinchao_AY2627Sem1.pdf', 4): ("World's Largest Selfie", 'world largest selfie face detection bounding boxes people counting machine learning application'),
    ('Lec_1_Annotated_Xinchao_AY2627Sem1.pdf', 37): ('Thank you', 'thank you end'),
    ('Lec_2_Annotated_Xinchao_AY2627Sem1.pdf', 5): ('Types of Data', 'types of data what is data numbers statistics text records figures facts'),
    ('Lec_2_Annotated_Xinchao_AY2627Sem1.pdf', 29): ('Data Integrity', 'data integrity credit card number check digit Luhn algorithm issuer number bank number account number divisible by 10 valid'),
    ('Lec_2_Annotated_Xinchao_AY2627Sem1.pdf', 30): ('Data Visualization', 'data visualization chart types graphical representation of data bar column line pie scatter histogram comparison relationship distribution composition'),
    ('Lec_2_Annotated_Xinchao_AY2627Sem1.pdf', 36): ('Thank you', 'thank you end'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 10): ('Notations, Vectors, Matrices', 'notations capital sigma summation over a collection sum starting index ending index capital pi product over a collection'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 12): ('Systems of Linear Equations', 'geometry of dependency and independence linearly dependent vectors beta1 a + beta2 b = 0 linearly independent vectors in 3D'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 13): ('Systems of Linear Equations', 'matrix-vector notation X w = y data matrix X m x d features samples target vector y unknown vector of parameters w to be learnt rank(X) maximal number of linearly independent columns rows'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 31): ('Discrete random variable', 'discrete random variable k possible values expectation E(X) = sum x_i Pr(X = x_i) probability mass function pmf mean average expected value mu'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 32): ('Discrete random variable', 'standard deviation sigma = sqrt(E[(X - mu)^2]) variance sigma^2 var(X) = E[(X - mu)^2] discrete random variable standard deviation formula'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 34): ('Continuous random variable', 'continuous random variable expectation E[X] = integral x f_X(x) dx probability density function pdf variance sigma^2 = integral (x - mu)^2 f_X(x) dx integral area under the curve equals 1'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 35): ('Mean and Standard Deviation of a Gaussian Distribution', 'mean and standard deviation of a gaussian normal distribution 1D bell curve mu sigma 2.5% tails 2D ellipse 90% 95% contours'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 39): ('Two Basic Rules', 'two basic rules sum rule Pr(X = x) = sum over y Pr(X = x, Y = y) marginal product rule Pr(X = x, Y = y) = Pr(Y = y | X = x) Pr(X = x) joint conditional'),
    ('Lec_3_Annotated_Xinchao_AY2627Sem1.pdf', 44): ('Thank you', 'thank you end'),
}
JUNK = re.compile(r'©\s*Copyright EE, NUS\. All Rights Reserved\.?')


def norm(s):
    s = unicodedata.normalize('NFKC', s)
    s = JUNK.sub(' ', s)
    s = s.replace('−', '-').replace('�', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def page_title(page):
    best, size = '', 0
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            txt = norm(''.join(sp['text'] for sp in l['spans']))
            sz = max((sp['size'] for sp in l['spans']), default=0)
            if len(re.findall(r'[A-Za-z]', txt)) < 3 or 'Copyright' in txt or l['bbox'][1] > page.rect.height * 0.35:
                continue
            if sz > size + 0.5:
                best, size = txt, sz
            elif abs(sz - size) <= 0.5 and len(best) < 60:
                best = (best + ' ' + txt).strip()
    return re.sub(r'^[•\-–\s]+', '', best)[:90]


slides, thumbs, files = [], [], []
for fi, (name, label, order) in enumerate(FILES):
    path = pdf_dir / name
    if not path.exists():
        print('skip (missing):', name)
        continue
    doc = pymupdf.open(path)
    files.append({'name': name, 'label': label, 'order': order, 'pages': doc.page_count})
    for i, page in enumerate(doc):
        text = norm(page.get_text())
        title = page_title(page)
        man = MANUAL.get((name, i + 1))
        if man:
            title = man[0]
            text = (text + ' ' + man[1]).strip()
        text = re.sub(r'(^| )\d{1,2}( |$)', ' ', text).strip()  # drop bare page numbers
        slides.append([len(files) - 1, i + 1, title, text[:3000]])
        pix = page.get_pixmap(dpi=32)
        thumbs.append(base64.b64encode(pix.tobytes('jpeg', jpg_quality=50)).decode())
    print(f'{name}: {doc.page_count} pages')

out = root / 'src' / 'slides_data.js'
out.write_text(
    "'use strict';\n/* generated by build_slides.py — do not edit by hand */\n"
    f"const SLIDE_FILES = {json.dumps(files, ensure_ascii=False)};\n"
    f"const SLIDES = {json.dumps(slides, ensure_ascii=False)};\n"
    f"const SLIDE_THUMBS = {json.dumps(thumbs)};\n")
print(out, out.stat().st_size // 1024, 'KB,', len(slides), 'slides')
