const ctx=require('./load')(['core.js','expr.js']);
const {LA,EX,fmtNum}=require('vm').runInContext('({LA,EX,fmtNum})',ctx);
const P=(M)=>M.map?M.map(r=>r.map?r.map(x=>fmtNum(x)).join(' '):fmtNum(r)).join(' | '):fmtNum(M);
const A=[[1,2,3],[0,4,5],[1,0,6]];
console.log('cof',P(LA.cofactors(A)),'det',LA.det(A),'inv',P(LA.inv(A)));
console.log('rank 123',LA.rank([[1,2,3],[4,5,6],[7,8,9]]),LA.rank([[1,2],[3,4]]));
let X=[[1,-9],[1,-7],[1,-5],[1,1],[1,5],[1,9]],y=[[-6],[-6],[-4],[-1],[1],[4]];
let w=LA.mul(LA.mul(LA.inv(LA.mul(LA.T(X),X)),LA.T(X)),y);console.log('L5ex1',P(w));
X=[[1,2,3],[1,-2,3]];y=[[2],[1]];console.log('L4ex3',P(LA.mul(LA.mul(LA.T(X),LA.inv(LA.mul(X,LA.T(X)))),y)));
console.log('pinv',P(LA.pinv([[1,1],[1,-1],[1,0]])));
// deg-8 poly
const xs=[2,6,4,5,7];const Pm=xs.map(x=>Array.from({length:9},(_,k)=>x**k));
console.log('rank P',LA.rank(Pm),'rank PPt',LA.rank(LA.mul(Pm,LA.T(Pm))),'sv',LA.svd(Pm).S.map(s=>s.toExponential(2)).join(','));
const yy=[[-1],[-1],[1],[1],[1]];const wd=LA.mul(LA.mul(LA.T(Pm),LA.inv(LA.mul(Pm,LA.T(Pm)))),yy);
const pt=[Array.from({length:9},(_,k)=>8**k)];console.log('deg8 pred',LA.mul(pt,wd)[0][0],'pinv pred',LA.mul(pt,LA.mul(LA.pinv(Pm),yy))[0][0]);
for (const s of ['x^2-4x+3','x^3/3 - x','sin(x)*x','exp(2x)','(x+1)^2','x1^2+3x1*x2','ln(x)','sqrt(x)','2^x','-x*y','x/(x+1)']){
 const n=EX.parse(s);const v=EX.varList(n);console.log(s,'=>',EX.str(EX.simplify(n)),' d/d'+v[0],EX.str(EX.diff(n,v[0])));}
console.log(EX.realRoots([3,-4,1]),EX.realRoots([0,-1,0,1]),EX.realRoots([1,0,1]));
console.log(EX.evaluate(EX.parse('a+b==7'),{a:3,b:4}),EX.evaluate(EX.parse('(a*b*c)/2 > a+b+c'),{a:1,b:2,c:3}));
