const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={console,Math,module:undefined};vm.createContext(ctx);
for(const f of process.argv.slice(2).length?[]:[]){}
function load(files){for(const f of files){vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),ctx,{filename:f});}return ctx;}
module.exports=load;
