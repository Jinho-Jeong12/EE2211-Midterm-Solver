// node tests/t3.js — calculator / solve / simultaneous equations
const ctx = require('./load')(['core.js', 'expr.js', 'ui.js', 'tools_calc.js', 'tools_basic.js']);
const vm = require('vm');
const { TOOL_BY_ID } = vm.runInContext('({TOOL_BY_ID})', ctx);
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
function run(id, v) {
  const out = [];
  const R = new Proxy({}, { get: (_, k) => (...a) => { if (['answer', 'step', 'check', 'text'].includes(k)) out.push(k + ': ' + strip(a[0]) + (a[1] !== undefined ? ' = ' + (typeof a[1] === 'number' ? vm.runInContext('fmtNum', ctx)(a[1]) : strip(a[1])) : '') + (a[2] && a[2].sub ? '  [' + strip(a[2].sub) + ']' : '') + (a[2] && a[2].note ? '  {' + strip(a[2].note) + '}' : '')); return R; } });
  try { TOOL_BY_ID[id].solve(v, R); } catch (e) { out.push('ERR ' + e.message); }
  console.log(`--- ${id} ${JSON.stringify(v)}\n  ` + out.join('\n  '));
}
const calc = l => {
  const html = [];
  const R = new Proxy({}, { get: (_, k) => (...a) => { if (k === 'text') html.push(strip(a[0].replace(/<\/div><div class="tape/g, '\n<').replace(/copy/g, ''))); if (k === 'answer') html.push('ANS ' + strip(a[2].sub)); return R; } });
  try { TOOL_BY_ID.calc.solve({ lines: l }, R); } catch (e) { html.push('ERR ' + e.message); }
  console.log('--- calc\n' + html.join('\n'));
};
calc(TOOL_BY_ID.calc.inputs[0].def + '\n1/0\nsqrt(-1)\nfoo + 1\n0.1+0.2\npi/4\nsin(pi/6)\n2^(1/2)\n8^(1/3)\n123/4567\nexp(1)\n1e-9\nfact(20)\nnCr(52,5)\n2/3=');
run('eqsolve', { eq: '2x^2 - 3x - 2 = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: 'x^2 - 2 = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: 'x^2 + x + 1', x: '', known: '', range: '' });
run('eqsolve', { eq: 'solve(x^3 - 6x^2 + 11x - 6 = 0, x)', x: '', known: '', range: '' });
run('eqsolve', { eq: 'x^4 - 5x^2 + 4 = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: 'x^3 - 2 = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: '(x-1)^2 (x+2) = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: 'exp(x) = 3', x: 'x', known: '', range: '-1000, 1000' });
run('eqsolve', { eq: 'sin(x) = 0.5', x: 'x', known: '', range: '0, 7' });
run('eqsolve', { eq: '1/x = 2', x: 'x', known: '', range: '-1000, 1000' });
run('eqsolve', { eq: 'a x^2 + b x + c = 0', x: 'x', known: 'a=1, b=-3, c=2', range: '' });
run('eqsolve', { eq: 'a x + b = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: 'x/3 + x/7 = 1', x: 'x', known: '', range: '' });
run('eqsolve', { eq: '(x-2)^2 = 0', x: 'x', known: '', range: '' });
run('eqsolve', { eq: '0.5x^2 - 0.1 = 0', x: 'x', known: '', range: '' });
run('eqsystem', { eqs: TOOL_BY_ID.eqsystem.inputs[0].def, vars: '', known: '' });
run('eqsystem', { eqs: 'x + y = 1\n2x + 2y = 2', vars: '', known: '' });
run('eqsystem', { eqs: 'x + y = 1\nx + y = 3', vars: '', known: '' });
run('eqsystem', { eqs: 'x/3 + y = 1\nx - y/7 = 2', vars: '', known: '' });
run('eqsystem', { eqs: 'x^2 + y^2 = 25\nx + y = 7', vars: '', known: '' });
run('eqsystem', { eqs: 'x*y = 2\nx + y = 3', vars: '', known: '' });
run('eqsystem', { eqs: 'w0 + 2w1 = 3\nw0 - w1 = 0\nw0 + w1 = 2', vars: '', known: '' });
