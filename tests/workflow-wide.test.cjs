'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'#p7';
test('第6页三栏占满可用宽度，底部阶段悬停切换且同项内移动不重播',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url);const bounds=await p.locator('.workflow-viewport').boundingBox(),columns=await p.locator('.workflow-panel').all();
  const left=await columns[0].boundingBox(),right=await columns[2].boundingBox();
  assert((right.x+right.width-left.x)/bounds.width>.94,'三栏须占可用宽度94%以上');assert(left.x>=bounds.x-2&&right.x+right.width<=bounds.x+bounds.width+2);
  const phases=p.locator('.workflow-phase-controls button');for(const i of [1,2,0]){await phases.nth(i).hover();assert.equal(await phases.nth(i).getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.workflow-phase.is-current').getAttribute('data-phase'),String(i));}
  assert.equal(await p.locator('.workflow-node').count(),21);assert.equal(await p.locator('.workflow-route').count(),22);
  await p.emulateMedia({reducedMotion:'no-preference'});await phases.nth(1).hover();await p.waitForTimeout(1350);const before=await p.locator('.workflow-scenario').innerText();const r=await phases.nth(1).boundingBox();await p.mouse.move(r.x+r.width/2+2,r.y+r.height/2);await p.waitForTimeout(100);assert.equal(await p.locator('.workflow-scenario').innerText(),before);
  const t=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true,reducedMotion:'reduce'});await t.goto(url);await t.getByRole('button',{name:'数据建库',exact:true}).last().tap();assert.equal(await t.locator('.workflow-phase.is-current').getAttribute('data-phase'),'2');assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await t.close();
 }finally{await b.close();}
});
test('流程节点有厚度与抬升反馈，流光有尾迹，暂停和静态保留完整关系',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await p.goto(url);const face=p.locator('[data-node="database"] .workflow-node-face');const before=await face.boundingBox();await p.mouse.move(before.x+before.width/2,before.y+before.height-1);await p.waitForTimeout(260);assert((await face.boundingBox()).y<before.y-2,'悬停时前景轻抬升，边缘命中区保持稳定');
  const depth=await p.locator('[data-node="database"] .workflow-node-depth').boundingBox();const raised=await face.boundingBox();assert(depth.y>raised.y+2,'节点前景与厚度层分离');
  assert(await p.locator('.workflow-trail').count()>0);await p.keyboard.press('p');const pose=()=>p.locator('[data-node="database"] .workflow-node-surface').getAttribute('style');const frozen=await pose();await p.waitForTimeout(120);assert.equal(await pose(),frozen);
  await p.locator('.workflow-phase-controls button').last().hover();await p.keyboard.press('p');await p.waitForTimeout(220);assert.equal(await p.locator('.workflow-phase.is-current').getAttribute('data-phase'),'2');assert(await p.locator('.workflow-particle').evaluateAll(ns=>ns.some(n=>Number(getComputedStyle(n).opacity)>.5)),'暂停时换阶段，继续后须播放新阶段');
  await p.keyboard.press('a');assert.equal(await p.locator('.workflow-node').count(),21);assert.equal(await p.locator('.workflow-route').count(),22);assert.equal(await p.locator('.workflow-particle').evaluateAll(ns=>ns.filter(n=>Number(getComputedStyle(n).opacity)>.5).length),0);
 }finally{await b.close();}
});
