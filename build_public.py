#!/usr/bin/env python3
"""Public build: same as build.py, but without the lecture-slide data -> EE2211_Solver_web.html"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
JS = ['core.js', 'expr.js', 'matexpr.js', 'ui.js', 'guides.js', 'common.js',
      'tools_smart.js', 'tools_matrix.js', 'tools_calc.js', 'tools_basic.js', 'tools_reg.js',
      'tools_prob.js', 'tools_code.js', 'textinput.js', 'tools_merged.js', 'slides_data.js', 'tools_slides.js', 'tools_glossary.js']
js = '\n'.join(('const SLIDE_FILES = [], SLIDES = [], SLIDE_THUMBS = [];  /* lecture slides removed in the public copy */\n' if f == 'slides_data.js' else '') + f'/* ==== {f} ==== */\n' + ((src / f).read_text() if f != 'slides_data.js' else '') for f in JS if (src / f).exists() or f == 'slides_data.js')
js = js.replace("if (typeof module !== 'undefined')", "if (false)")
css = (src / 'style.css').read_text()
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EE2211 Solver</title>
<style>
{css}
</style>
</head>
<body>
<noscript>This solver needs JavaScript.</noscript>
<script>
{js}
App.init();
</script>
</body>
</html>
"""
out = root / 'EE2211_Solver_web.html'
out.write_text(html)
print(out, len(html) // 1024, 'KB')
