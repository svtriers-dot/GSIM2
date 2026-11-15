import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import {hashPassword,verifyPassword} from '../server/lib/passwords';
const ROUNDS=12;
const legacy=JSON.parse(await readFile(new URL('../deploy/fixtures/bcrypt-legacy.json',import.meta.url),'utf8'));
assert.equal(legacy.syntheticOnly,true);
for(const fixture of legacy.fixtures){
 test('legacy 2.4.3 '+fixture.name+' accepts 2a/2b/2y and rejects a wrong password',async()=>{
  for(const prefix of ['$2a$','$2b$','$2y$']){
   const hash=prefix+fixture.hash.slice(4);
   assert.equal(bcrypt.getRounds(hash),fixture.rounds);
   assert.equal(await verifyPassword(fixture.password,hash),true);
   assert.equal(await verifyPassword('!'+fixture.password.slice(1),hash),false);
  }
 });
}
test('new hashes preserve the application work factor, use 2b, and have unique salts',async()=>{
 const password='Синтетический новый пароль 🔐-42';
 const first=await hashPassword(password),second=await hashPassword(password);
 assert.equal(first.slice(0,4),'$2b$');assert.equal(bcrypt.getRounds(first),ROUNDS);assert.equal(first.length,60);
 assert.notEqual(first,second);assert.equal(await verifyPassword(password,first),true);assert.equal(await verifyPassword(password+'!',first),false);
});
test('malformed hashes never authenticate',async()=>{assert.equal(await verifyPassword('synthetic','not-a-bcrypt-hash'),false);});
test('UTF8 byte boundaries retain legacy bcrypt semantics',async()=>{
 assert.equal(bcrypt.truncates('я'.repeat(36)),false);
 assert.equal(bcrypt.truncates('я'.repeat(37)),true);
 const fixture=legacy.fixtures.find((value: {name:string,password:string,hash:string})=>value.name==='long');
 assert.equal(await verifyPassword(fixture.password.slice(0,72)+'different-tail',fixture.hash),true);
});
