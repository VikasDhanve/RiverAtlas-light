'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'#p5';
const names=['《自然资源统一确权登记暂行办法》','《自然资源统一确权登记操作指南（试行）》','《自然资源确权登记规程》','《辽宁省自然资源统一确权登记工作总体方案》','《大连市自然资源统一确权登记工作总体方案》'];
test('第4页完整政策目录悬停切换，离开保留当前文件且不自动播放',async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},offline:true});
 try {
  await page.goto(url);
  for(const name of names)await page.getByRole('button',{name,exact:true}).waitFor();
  assert((await page.locator('.policy-directory').boundingBox()).width>=700);
  assert.equal(await page.locator('#play-button').isDisabled(),true);
  await page.getByRole('button',{name:names[3],exact:true}).hover();
  assert.match(await page.locator('.policy-choice[aria-current="true"] .policy-choice-name').innerText(),/辽宁省/);
  await page.getByRole('button',{name:names[3],exact:true}).click();
  await page.getByRole('button',{name:names[4],exact:true}).hover();
  assert.match(await page.locator('.policy-choice[aria-current="true"] .policy-choice-name').innerText(),/大连市/);
  await page.locator('#slide-title').hover();await page.waitForTimeout(3500);
  assert.match(await page.locator('.policy-choice[aria-current="true"] .policy-choice-name').innerText(),/大连市/);
  assert.equal(await page.locator('#page-count').innerText(),'05 / 30');
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();
  assert.match(await page.locator('.policy-choice[aria-current="true"] .policy-choice-name').innerText(),/确权登记规程/);
  const picture=page.locator('.policy-sheet:not([hidden]) img');
  const frame=await page.locator('.policy-window').boundingBox(),sheet=await page.locator('.policy-sheet:not([hidden])').boundingBox();assert(Math.abs(frame.width-sheet.width)<2);assert(Math.abs(frame.height-sheet.height)<2);assert.equal(await picture.evaluate(n=>getComputedStyle(n).objectFit),'cover');
  const before=await picture.boundingBox();await picture.hover();await page.waitForTimeout(400);
  assert((await picture.boundingBox()).width>before.width*1.3);
  await page.getByRole('button',{name:'查看完整政策文件',exact:true}).click();
  await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#page-count').innerText(),'05 / 30');
 }finally{await browser.close();}
});
test('五份政策均可在触屏/键盘及减少动态模式选择并打开完整原件',async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',offline:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);
  for(const name of names){
   const choice=page.getByRole('button',{name,exact:true});await choice.tap();
   assert.equal(await choice.getAttribute('aria-pressed'),'true');
   await page.getByRole('button',{name:'查看完整政策文件',exact:true}).click();
   await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
   await page.keyboard.press('Escape');assert.equal(await page.locator('#page-count').innerText(),'05 / 30');
  }
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();
  const target=page.getByRole('button',{name:names[1],exact:true});await target.focus();await page.keyboard.press('Enter');
  assert.equal(await target.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#play-button').isDisabled(),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
