const {test}=require('node:test');const assert=require('node:assert/strict');
const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto').webcrypto;
function load(env){const m={exports:{}};const source=fs.readFileSync(require('node:path').join(__dirname,'../app/lib/admin-auth.ts'),'utf8');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,process:{env},crypto,atob,TextEncoder,Uint8Array});return m.exports.authorizedAdmin;}
test('missing configuration, API keys and incorrect credentials cannot access admin proxy',async()=>{
 assert.equal(await load({})(null),false);
 const check=load({SUPER_ADMIN_DASHBOARD_USERNAME:'hash',SUPER_ADMIN_DASHBOARD_PASSWORD:'test-strong-password'});
 assert.equal(await check('Bearer backend-api-key'),false);assert.equal(await check('Basic '+btoa('hash:incorrect')),false);assert.equal(await check('Basic %!'),false);
 assert.equal(await check('Basic '+btoa('hash:test-strong-password')),true);
});

test('proxy authenticates before forwarding the server key and rejects foreign-origin writes',async()=>{
 const env={SUPER_ADMIN_DASHBOARD_USERNAME:'hash',SUPER_ADMIN_DASHBOARD_PASSWORD:'test-strong-password',SUPER_ADMIN_API_KEY:'server-only-api-key',ONBOARD_BACKEND_URL:'https://backend.test'};
 const authorize=load(env);const calls=[];const m={exports:{}};
 const source=fs.readFileSync(require('node:path').join(__dirname,'../app/api/backend/[...path]/route.ts'),'utf8');
 class NextResponse extends Response{static json(body,init){return new NextResponse(JSON.stringify(body),init);}}
 const requireMock=name=>name==='next/server'?{NextResponse}:name.endsWith('admin-auth')?{authorizedAdmin:authorize}:require(name);
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require:requireMock,process:{env},Headers,URL,fetch:async(url,options)=>{calls.push({url,options});return new Response('{}',{status:200,headers:{'content-type':'application/json'}});}});
 const context={params:Promise.resolve({path:['admin','subscription-models']})};
 assert.equal((await m.exports.GET(new Request('https://admin.test/api/backend/admin/subscription-models'),context)).status,401);
 assert.equal(calls.length,0);
 const authorization='Basic '+btoa('hash:test-strong-password');
 assert.equal((await m.exports.GET(new Request('https://admin.test/api/backend/admin/subscription-models',{headers:{authorization}}),context)).status,200);
 assert.equal(calls[0].options.headers.get('x-admin-key'),'server-only-api-key');
 assert.equal(calls[0].options.headers.has('authorization'),false);
 assert.equal((await m.exports.POST(new Request('https://admin.test/api/backend/admin/subscription-models',{method:'POST',headers:{authorization,origin:'https://foreign.test'}}),context)).status,403);
 assert.equal(calls.length,1);
});
