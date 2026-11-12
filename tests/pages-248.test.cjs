const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
test('第4页点击过目录后，鼠标移到另一项仍立即切换右侧对应文件',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url+'#p5');
  const province=p.getByRole('button',{name:'《辽宁省自然资源统一确权登记工作总体方案》',exact:true});
  const city=p.getByRole('button',{name:'《大连市自然资源统一确权登记工作总体方案》',exact:true});
  await province.click();await city.hover();
  assert.equal(await p.locator('.policy-sheet:not([hidden]) img').getAttribute('data-asset'),'11');
  assert.equal(await city.getAttribute('aria-current'),'true');
 }finally{await b.close();}
});
test('第2/8页小屏保留完整文书，触屏与键盘均可打开原件',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true,reducedMotion:'reduce'});
 const errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 try{
  for(const n of [2]){
   await p.goto(url+'#p'+remainingPage(n>=2&&n<=9?n+1:n));if(n===2)await p.getByRole('tab',{name:'政策文件',exact:true}).click();await p.locator('.document-board img').first().evaluate(i=>i.decode());
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   for(const img of await p.locator('.document-board img').all()){
    await img.evaluate(i=>i.decode());
    const dimensions=await img.evaluate(i=>({natural:i.naturalWidth/i.naturalHeight,shown:i.clientWidth/i.clientHeight}));assert(Math.abs(dimensions.natural-dimensions.shown)<.01);
   }
   const control=p.locator('.document-board .image-button').first();await control.tap();
   await p.waitForFunction(()=>document.getElementById('image-dialog').open);await p.keyboard.press('Escape');
   await control.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.getElementById('image-dialog').open);await p.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 }finally{await b.close();}
});
test('第8页按PPT第10页展示编制依据与唯一底图，移除旧图集及描述',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url+'#p9');
  assert.equal(await p.locator('#slide-title').innerText(),'编制工作底图');
  const text=await p.locator('#presentation').innerText();
  for(const term of ['最新正射影像','河流管理范围线','2023年全国国土变更调查成果','集体土地所有权确权登记成果','国有土地使用权确权登记成果','公共管制','特殊保护','预划登记单元'])assert(text.includes(term),term);
  assert.equal(await p.locator('.gallery-tabs button').count(),4);
  assert.equal(await p.locator('.gallery-spread img').count(),1);
  assert.equal(await p.locator('.gallery-spread img').getAttribute('data-asset'),'501');
  assert.doesNotMatch(text,/前期资料|资料组织|卫星 \/|权属与成果|管制与保护/);
  await p.locator('.gallery-spread .image-button').click();
  await p.waitForFunction(()=>{const n=document.getElementById('original-image');return !n.hidden&&n.complete&&n.naturalWidth>0;});
  assert.match(await p.locator('#image-title').innerText(),/工作底图/);
 }finally{await b.close();}
});
test('第2页两份方案同时完整显示，原件可打开且没有缩略图选择区',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url+'#p3');assert.equal(await p.getByRole('tab').count(),2);assert(await p.locator('.background-deployment').isVisible());assert.match(await p.locator('.background-deployment').innerText(),/归属清晰、权责明确、保护严格、流转顺畅、监管有效/);await p.getByRole('tab',{name:'政策文件',exact:true}).click();
  assert.equal(await p.locator('.document-board img').count(),2);
  assert.equal(await p.locator('.gallery-tabs').count(),0);
  const pictures=p.locator('.document-board img');
  for(let i=0;i<2;i++){
   await pictures.nth(i).evaluate(n=>n.decode());
   const r=await pictures.nth(i).boundingBox();assert(r.height>500&&r.width>300);
  }
  const a=await pictures.nth(0).boundingBox(),c=await pictures.nth(1).boundingBox();assert(a.x+a.width<=c.x+1);
  for(const button of await p.locator('.document-board .image-button').all()){
   await button.click();await p.waitForFunction(()=>{const n=document.getElementById('original-image');return !n.hidden&&n.complete&&n.naturalWidth>0;});
   await p.keyboard.press('Escape');
  }
 }finally{await b.close();}
});
