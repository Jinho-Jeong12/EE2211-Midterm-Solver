const ctx=require('./load')(['core.js','expr.js','matexpr.js']);
const {MX,fmtNum}=require('vm').runInContext('({MX,fmtNum})',ctx);
const env={X:[[1,-9],[1,-7],[1,-5],[1,1],[1,5],[1,9]],y:[[-6],[-6],[-4],[-1],[1],[4]],A:[[1,2],[3,4]]};
const show=r=>r.k==='s'?fmtNum(r.v):r.v.map(q=>q.map(x=>fmtNum(x)).join(' ')).join(' | ');
for(const e of ["inv(X'X)X'y","X.T@X","A^-1","det(A)","A^T A + 2I","2*I(2)+A","X*A","X^+ y","rank(A)","A^2","inv(X)"]){try{console.log(e,'=>',show(MX.evaluate(e,env)))}catch(err){console.log(e,'ERR',err.message)}}
