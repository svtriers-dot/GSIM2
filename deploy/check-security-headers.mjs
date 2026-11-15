// Verify actual production middleware; never run against a customer's database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profile="gsim";
export async function verifySecurityHeaders(base){
 const database=new URL(process.env.DATABASE_URL||'http://missing');
 assert.ok(['localhost','127.0.0.1'].includes(database.hostname));
 assert.equal(database.pathname,profile==='gsim'?'/gsim_ci':'/ai_registry');
 assert.equal(base,profile==='gsim'?'http://127.0.0.1:5000':'http://127.0.0.1:5002');
 const expected=JSON.parse(await readFile(new URL('./security-headers.expected.json',import.meta.url),'utf8'));
 const paths=profile==='gsim'?[['/api/health',200],['/api/trainer/sessions',401],['/api/teams/check?code=invalid',400]]:[['/healthz',200],['/api/subscriptions',401],['/api/auth/login',400,'POST']];
 let routes=0;
 function check(response){
  for(const [name,value] of Object.entries(expected))assert.equal(response.headers.get(name),value,profile+' '+name);
  for(const name of ['x-powered-by','content-security-policy-report-only','cross-origin-embedder-policy'])assert.equal(response.headers.get(name),null,name+' must not change');
  routes++;
 }
 const home=await fetch(base+'/',{signal:AbortSignal.timeout(10000)});assert.equal(home.status,200);check(home);
 const html=await home.text();
 const assets=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(match=>new URL(match[1],base)).filter(url=>url.origin===base);
 assert.ok(assets.some(url=>url.pathname.endsWith('.js')),'Missing local script');
 for(const extension of ['.js','.css']){
  const asset=assets.find(url=>url.pathname.endsWith(extension));
  if(asset){const response=await fetch(asset,{signal:AbortSignal.timeout(10000)});await response.arrayBuffer();assert.equal(response.status,200);check(response);assert.match(response.headers.get('content-type')||'',extension==='.js'?/(?:text|application)\/javascript/:/text\/css/);}
 }
 for(const [path,status,method='GET'] of paths){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(10000)});
  await response.arrayBuffer();assert.equal(response.status,status,path);check(response);
 }
 const proof={profile,routes,headersPerResponse:Object.keys(expected).length,cspPreserved:true,hsts365Days:true,assetsAndErrorResponses:true,poweredByAbsent:true};
 console.log(JSON.stringify({securityHeaderIntegration:proof}));return proof;
}
