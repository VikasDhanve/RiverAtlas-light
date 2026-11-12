'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'index.html')).href,c={};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/content.js'),'utf8')+';this.slides=RiverAtlasSlides',c);
const pages=c.slides.flatMap((s,i)=>s.sources.includes(29)?[i+1]:[]);
test('原23/24页合为第23页，主体、两种审核形式及七项要点同页可用',async()=>{
 assert.deepEqual(Array.from(pages),[23]);assert.equal(c.slides.length,30);
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce',offline:true});
 try{
  await p.goto(url+'#p'+pages[0]);assert.equal(await p.locator('.registration-subject').count(),1);assert.equal(await p.locator('.registration-method').count(),2);assert.equal(await p.locator('.review-choice').count(),7);
  const text=await p.locator('#presentation').innerText();
  for(const phrase of ['登记机构是审核主体','组织审核登记事项及相关材料，形成审核意见','登记机构可以就地籍调查成果数据征求相关部门意见','自然资源确权登记信息平台','暂不具备线上审核条件','自然资源确权登记审核表'])assert(text.includes(phrase),phrase);
  await p.locator('.registration-method').nth(1).click();assert.equal(await p.locator('.registration-method').nth(1).getAttribute('aria-pressed'),'true');
  assert(await p.locator('.registration-method').first().isVisible());assert.doesNotMatch(await p.locator('#presentation').innerText(),/已完成|审核通过|已审核/);
  await p.getByRole('button',{name:'恢复首项',exact:true}).click();assert.equal(await p.locator('.registration-method').first().getAttribute('aria-pressed'),'true');
  await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#slide-title').innerText(),'公告发布要求');assert.equal(await p.locator('#page-count').innerText(),'24 / 30');
 }finally{await b.close();}
});
test('合页的选中底板跟随条款，快选、暂停/静态、手机点选及离页重入可恢复',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await p.goto(url+'#p23');const choices=p.locator('.review-choice');
  for(const i of [6,0,4,2])await choices.nth(i).click();await p.waitForTimeout(360);
  const marker=await p.locator('.review-selection').boundingBox(),selected=await choices.nth(2).boundingBox();assert(Math.abs(marker.x-selected.x)<1&&Math.abs(marker.y-selected.y)<1,'选中底板与当前条款对齐');
  await choices.last().click();await p.getByRole('button',{name:'暂停',exact:true}).click();
  const pose=()=>p.locator('.review-clause:not([hidden])').getAttribute('style');const before=await pose();await p.waitForTimeout(100);assert.equal(await pose(),before,'暂停冻结条款过渡');
  await p.getByRole('button',{name:'静态',exact:true}).click();await choices.nth(4).click();
  const panel=p.locator('.review-clause:not([hidden])');assert.equal(await panel.evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await panel.evaluate(n=>getComputedStyle(n).clipPath),'none');
  await p.locator('.registration-method').last().click();assert.equal(await choices.nth(4).getAttribute('aria-pressed'),'true','审核形式切换不改变当前审核条款');
  await p.locator('#slide-title').hover();await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowLeft');assert.equal(await choices.first().getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.registration-method').first().getAttribute('aria-pressed'),'true');
  const touch=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true,reducedMotion:'reduce'});await touch.goto(url+'#p23');await touch.locator('.review-choice').last().tap();assert.equal(await touch.locator('.review-position').innerText(),'07 / 07');await touch.locator('.registration-method').last().tap();assert.equal(await touch.locator('.registration-method').last().getAttribute('aria-pressed'),'true');assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await touch.close();
 }finally{await b.close();}
});
test('七项要点逐项显示PPT原句，悬停/键盘/分步/快速切换及手机完整可用',async()=>{
 const originals=require('../docs/source-manifest-1107.json').slides.find(s=>s.page===29).texts.filter(t=>/^[a-g]\)/.test(t)).map(t=>t.replace(/^[a-g]\)\s*/,''));
 assert.equal(originals.length,7);
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(url+'#p'+pages[0]);assert.equal(await p.locator('.review-choice').count(),7);
  for(let i=0;i<7;i++){
   await p.locator('.review-choice').nth(i).click();
   assert.equal(await p.locator('.review-clause:not([hidden]) .review-clause-text').innerText(),originals[i]);
   assert.equal(await p.locator('.review-position').innerText(),String(i+1).padStart(2,'0')+' / 07');
  }
  await p.getByRole('button',{name:'下一项',exact:true}).click();assert.match(await p.locator('.review-position').innerText(),/01/);
  await p.locator('.review-choice').first().focus();await p.keyboard.press('ArrowDown');assert.match(await p.locator('.review-position').innerText(),/02/);
  await p.getByRole('button',{name:'下一步',exact:true}).click();assert.match(await p.locator('.review-position').innerText(),/03/);
  for(const i of [6,0,4,1]){await p.locator('.review-choice').nth(i).focus();await p.keyboard.press('Enter');}
  await p.waitForTimeout(250);assert.equal(await p.locator('.review-clause:not([hidden]) .review-clause-text').innerText(),originals[1]);
  await p.emulateMedia({reducedMotion:'reduce'});await p.setViewportSize({width:390,height:844});
  for(let i=0;i<7;i++){await p.locator('.review-choice').nth(i).click();assert.equal(await p.locator('.review-clause:not([hidden]) .review-clause-text').innerText(),originals[i]);}
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.doesNotMatch(await p.locator('#presentation').innerText(),/已完成|已通过|已审核/);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
