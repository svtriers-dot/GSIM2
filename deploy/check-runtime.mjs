// This integration rehearsal is deliberately limited to the disposable CI DB.
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {checkWebSockets} from './check-websockets.mjs';
import {verifyRateLimits} from './check-rate-limits.mjs';
import {verifySecurityHeaders} from './check-security-headers.mjs';
const url=new URL(process.env.DATABASE_URL||'http://missing');
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/gsim_ci')throw Error('Only the disposable gsim_ci database is allowed');
const base='http://127.0.0.1:5000';
const server=spawn(process.execPath,['dist/index.cjs'],{env:{...process.env,NODE_ENV:'production'},stdio:'ignore'});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
let count=0;
async function request(path,method='GET',body,token){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json()};
}
function check(condition,label){if(!condition)throw Error(label);count++;}
try {
 let ready=false;
 for(let n=0;n<30;n++){try{if((await request('/api/health')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw Error('Production dependency runtime did not start');
 const email='ci-'+randomUUID()+'@example.invalid';const password='Synthetic-ci-password-42';
 const invalid=await request('/api/trainer/auth/register','POST',{email,password,name:'Synthetic CI trainer',legalAccepted:false});
 check(invalid.status===400&&invalid.body.details?.legalAccepted?._errors?.length,'validation error contract');
 const registered=await request('/api/trainer/auth/register','POST',{email,password,name:'Synthetic CI trainer',legalAccepted:true,publicProfileConsent:false});
 check(registered.status===200&&registered.body.trainer?.id,'registration');
 check((await request('/api/trainer/sessions','POST',{name:'Forbidden pending session'},registered.body.token)).status===403,'pending role denial');
 await pool.query("UPDATE trainers SET role='active',is_certified=true WHERE id=$1",[registered.body.trainer.id]);
 const login=await request('/api/trainer/auth/login','POST',{email,password});check(login.status===200&&login.body.token,'login');const token=login.body.token;
 check((await request('/api/trainer/auth/me','GET',undefined,token)).status===200,'profile');
 const tourDone=await request('/api/trainer/onboarding/tour-complete','POST',{},token);
 const tourMark=await pool.query('SELECT tour_completed_at IS NOT NULL AS done FROM trainers WHERE id=$1',[registered.body.trainer.id]);
 check(tourDone.status===200&&tourDone.body.ok&&tourMark.rows[0]?.done,'tour completion persisted');
 const publicId='CI-'+randomUUID().slice(0,8);
 await pool.query('INSERT INTO trainer_certifications (trainer_id,public_id,quiz_score,practice_final_cash) VALUES ($1,$2,7,14000)',[registered.body.trainer.id,publicId]);
 const pdf=await fetch(base+'/api/trainer/certification/pdf',{headers:{Authorization:'Bearer '+token}});
 const pdfBytes=Buffer.from(await pdf.arrayBuffer());
 check(pdf.status===200&&pdf.headers.get('content-type')?.includes('application/pdf')&&pdfBytes.subarray(0,5).toString()==='%PDF-'&&pdfBytes.length>2000,'authenticated Cyrillic certificate PDF');
 check((await request('/api/trainer/certification/pdf')).status===401,'unauthenticated PDF denial');
 const created=await request('/api/trainer/sessions','POST',{name:'Synthetic CI session',scenarioPreset:'easy',maxTeams:2},token);
 check(created.status===200&&created.body.session?.id,'session creation');const session=created.body.session;
 check((await request('/api/trainer/sessions','GET',undefined,token)).status===200,'session list');
 const joined=await request('/api/teams/join','POST',{code:session.accessCode,teamName:'Synthetic CI team',members:[{fullName:'Synthetic participant'}],dataBasisConfirmed:true});
 check(joined.status===200,'team join');
 const badTeam=await request('/api/teams/join','POST',{code:session.accessCode,teamName:'No consent',members:[{fullName:'Synthetic participant'}],dataBasisConfirmed:false});
 check(badTeam.status===400&&badTeam.body.details?.dataBasisConfirmed?._errors?.length,'team consent denial');
 await checkWebSockets({base,sessionId:session.id,trainerToken:token,deviceToken:joined.body.team.deviceToken});
 for(const action of ['start','pause','resume','end'])check((await request('/api/trainer/sessions/'+session.id+'/'+action,'POST',{},token)).status===200,action);
 check((await request('/api/trainer/sessions')).status===401,'unauthenticated denial');
 await verifyRateLimits(base);
 await verifySecurityHeaders(base);
 console.log(JSON.stringify({productionDependenciesVerified:true,syntheticApiChecks:count}));
} finally {server.kill('SIGTERM');await pool.end();}
