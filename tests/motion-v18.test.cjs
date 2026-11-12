'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;

test('第六页为三栏完整流程，流光沿路径移动，暂停冻结且静态保留全图',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await p.goto(url+'#p7');const columns=await p.locator('.workflow-panel').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right};}));
  assert.equal(columns.length,3);assert(columns[0].right<columns[1].x&&columns[1].right<columns[2].x);assert(Math.abs(columns[0].y-columns[2].y)<2);
  const positions=()=>p.locator('.workflow-particle').evaluateAll(ns=>ns.filter(n=>Number(getComputedStyle(n).opacity)>.5).map(n=>n.getAttribute('transform')));
  await p.waitForFunction(()=>[...document.querySelectorAll('.workflow-particle')].some(n=>Number(getComputedStyle(n).opacity)>.5),null,{timeout:3000});
  const before=await positions();
  await p.waitForFunction(before=>{const now=[...document.querySelectorAll('.workflow-particle')].filter(n=>Number(getComputedStyle(n).opacity)>.5).map(n=>n.getAttribute('transform'));return now.length>0&&JSON.stringify(now)!==JSON.stringify(before);},before,{timeout:3000});
  await p.keyboard.press('p');const frozen=await positions();await p.waitForTimeout(200);assert.deepEqual(await positions(),frozen);
  await p.keyboard.press('a');assert.equal((await positions()).length,0);assert.equal(await p.locator('.workflow-node').count(),21);assert.equal(await p.locator('.workflow-route').count(),22);
  await p.emulateMedia({reducedMotion:'reduce'});await p.reload();await p.waitForTimeout(180);assert.equal((await positions()).length,0);
 }finally{await b.close();}
});

test('第6页退出静态及系统减少动态后恢复流光，手动暂停仍需继续',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'no-preference'});
 const visible=()=>p.locator('.workflow-particle').evaluateAll(ns=>ns.filter(n=>Number(getComputedStyle(n).opacity)>.5).map(n=>n.getAttribute('transform')));
 async function assertMoving(){
  await p.waitForFunction(()=>[...document.querySelectorAll('.workflow-particle')].some(n=>Number(getComputedStyle(n).opacity)>.5),null,{timeout:3000});
  const before=await visible();
  await p.waitForFunction(before=>{const now=[...document.querySelectorAll('.workflow-particle')].filter(n=>Number(getComputedStyle(n).opacity)>.5).map(n=>n.getAttribute('transform'));return now.length>0&&JSON.stringify(now)!==JSON.stringify(before);},before,{timeout:3000});
 }
 try{
  await p.goto(url+'#p7');await assertMoving();
  await p.locator('#static-button').click();assert.deepEqual(await visible(),[]);
  await p.locator('#static-button').click();await assertMoving();
  await p.locator('#pause-button').click();await p.locator('#static-button').click();await p.locator('#static-button').click();
  assert.equal(await p.locator('#pause-button').getAttribute('aria-pressed'),'true');assert.deepEqual(await visible(),[]);
  await p.locator('#pause-button').click();await assertMoving();
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.body.classList.contains('static-mode'));assert.deepEqual(await visible(),[]);
  await p.emulateMedia({reducedMotion:'no-preference'});await assertMoving();
 }finally{await b.close();}
});
