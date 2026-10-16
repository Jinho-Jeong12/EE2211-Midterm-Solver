// node tests/t4.js — slide finder ranking
const ctx = require('./load')(['core.js', 'expr.js', 'ui.js', 'slides_data.js', 'tools_slides.js']);
const vm = require('vm');
const { searchSlides, SLIDES, SLIDE_FILES } = vm.runInContext('({searchSlides, SLIDES, SLIDE_FILES})', ctx);
for (const q of ['left inverse', 'over-determined', '역행렬', 'mse', 'ridge', 'bayes', 'one-hot', 'pmf', 'NOIR', 'gradient', 'pearson correlation', '분산', 'causation', 'missing data', 'polynomial', 'supervised', 'determinant', 'rank', 'xyzzy']) {
  const r = searchSlides(q, 'all');
  console.log(`${q.padEnd(20)} ${String(r.list.length).padStart(3)}  ` + r.list.slice(0, 4).map(x => `${SLIDE_FILES[SLIDES[x.i][0]].label.split(' — ')[0].replace('Lecture ', 'L').replace('Tutorial ', 'T')}p${SLIDES[x.i][1]} "${SLIDES[x.i][2].slice(0, 28)}"`).join(' | '));
}
