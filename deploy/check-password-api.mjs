import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function verifyPasswordApi({base,pool,trainerId,email}){
 const url=new URL(process.env.DATABASE_URL||'http://missing');
 assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/gsim_ci');
 assert.equal(url.port,'5432');assert.equal(process.env.CI,'true');
 assert.equal(process.env.JWT_SECRET,'synthetic-ci-only-not-a-production-key');
 assert.equal(base,'http://127.0.0.1:5000');
 const fixture=JSON.parse(await readFile(new URL('./fixtures/bcrypt-legacy.json',import.meta.url),'utf8')).fixtures.find(value=>value.name==='unicode12');
 let checks=0,requests=0;
 const check=(condition,label)=>{assert.ok(condition,label);checks++;};
 async function post(path,body,token){
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':'192.0.2.'+(80+requests++),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  return {status:response.status,body:await response.json()};
 }
 async function stored(id){return (await pool.query('SELECT password_hash,role FROM trainers WHERE id=$1',[id])).rows[0];}
 const original=await stored(trainerId);check(/^\$2b\$12\$/.test(original.password_hash),'registration hash and cost');
 try{
  await pool.query('UPDATE trainers SET password_hash=$1 WHERE id=$2',[fixture.hash,trainerId]);
  const login=await post('/api/trainer/auth/login',{email,password:fixture.password});
  check(login.status===200&&login.body.token,'legacy 2a Unicode login');
  check((await stored(trainerId)).password_hash===fixture.hash,'legacy login keeps stored hash');
  check((await post('/api/trainer/auth/login',{email,password:'wrong-password-42'})).status===401,'wrong password denied');
  const targetEmail='reset-'+randomUUID()+'@example.invalid';const oldPassword='Synthetic target password-42';
  const registered=await post('/api/trainer/auth/register',{email:targetEmail,password:oldPassword,name:'Synthetic reset target',legalAccepted:true,publicProfileConsent:false});
  check(registered.status===200&&registered.body.trainer?.id,'reset target registration');
  const targetId=registered.body.trainer.id;const targetBefore=await stored(targetId);
  const path='/api/admin/trainers/'+targetId+'/reset-password';const newPassword='Новый пароль тренера 🔐-42';
  check((await post(path,{newPassword})).status===401,'unauthenticated reset denied');
  check((await post(path,{newPassword},login.body.token)).status===403,'active trainer cannot reset another password');
  check((await stored(targetId)).password_hash===targetBefore.password_hash,'denied resets do not change hash');
  await pool.query("UPDATE trainers SET role='super_admin' WHERE id=$1",[trainerId]);
  const admin=await post('/api/trainer/auth/login',{email,password:fixture.password});check(admin.status===200&&admin.body.token,'synthetic admin login');
  check((await post(path,{newPassword:'short'},admin.body.token)).status===400,'weak new password denied');
  check((await post(path,{newPassword},admin.body.token)).status===200,'authorized admin reset');
  check(/^\$2b\$12\$/.test((await stored(targetId)).password_hash),'reset hash and work factor 12');
  check((await post('/api/trainer/auth/login',{email:targetEmail,password:oldPassword})).status===401,'old password denied after reset');
  const next=await post('/api/trainer/auth/login',{email:targetEmail,password:newPassword});
  check(next.status===200&&next.body.token&&!('passwordHash' in next.body.trainer),'new password accepted without hash disclosure');
  console.log(JSON.stringify({passwordApiChecks:checks,legacyLogin:true,adminReset:true,resetAuthorization:true,oldPasswordDenied:true,syntheticOnly:true}));
 }finally{await pool.query('UPDATE trainers SET password_hash=$1,role=$2 WHERE id=$3',[original.password_hash,original.role,trainerId]);}
}
