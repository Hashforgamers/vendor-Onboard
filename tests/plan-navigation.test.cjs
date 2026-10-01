const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/page.tsx'),'utf8');
const tree=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declaration(name){let result;function visit(node){if((ts.isVariableDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.getText(tree)===name)result=node;ts.forEachChild(node,visit);}visit(tree);return result;}
test('both subscription screens are reachable from the rendered sidebar and hash navigation',()=>{
 const nav=declaration('navItems');const context={module:{exports:{}},Grid2X2:1,Store:1,ClipboardCheck:1,Gamepad2:1,CreditCard:1,SlidersHorizontal:1,Monitor:1,Handshake:1,Package:1,Mail:1};
 vm.runInNewContext(ts.transpileModule('const '+nav.getText(tree)+';module.exports=navItems;',{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,context);
 const entries=context.module.exports;
 assert.equal(entries.find(n=>n.id==='plans').label,'Subscription Plans');
 assert.equal(entries.find(n=>n.id==='subscriptions').label,'Cafe Subscriptions');
 assert.match(declaration('Sidebar').getText(tree),/navItems\.map/);
 assert.match(declaration('HomePage').getText(tree),/active === 'plans'.*<PlanModelsPage/);
});
test('new packages start hidden and paid feature labels are explicit',()=>{
 const plan=declaration('PlanModelsPage').getText(tree);
 assert.match(plan,/enabled: false/);
 assert.match(plan,/Active — available to cafes/);
 assert.match(plan,/total package prices, not automatic per-feature surcharges/);
 const labels=declaration('PLAN_FEATURE_LABELS').getText(tree);
 assert.match(labels,/food: 'Extra Services'/);assert.match(labels,/tournaments: 'Tournaments'/);
});
