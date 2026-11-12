'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const source=require('../docs/source-manifest-1107.json').slides.find(s=>s.page===40).texts.slice(1).filter(t=>t.trim());
test('第26页完整原件与公告要点分栏铺满阅读区，原件和放大仍可用',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url+'#p26');await p.locator('.document-board img').evaluate(i=>i.decode());
  const image=await p.locator('.document-board .image-button').boundingBox(),copy=await p.locator('.source-board-layout > .copy-column').boundingBox(),content=await p.locator('.slide-content').boundingBox();
  assert(image.x+image.width<copy.x,'原件在左，要点在右');assert(image.height>content.height*.88,'原件充分利用页面高度');assert(image.width>content.width*.48,'完整原件有足够阅读宽度');
  assert.match(await p.locator('.status-label').innerText(),/外地样例/);
  await p.locator('.document-board .image-button').click();assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert(await p.locator('.document-board img').isVisible());
 }finally{await b.close();}
});
test('第30页首项采用用户修订、其余两项保留PPT40全文，同屏可读并支持聚焦、键盘、分步及触屏',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(url+'#p29');assert.equal(await p.locator('.summary-choice').count(),3);
  for(let i=0;i<3;i++){
   assert.equal(await p.locator('.summary-choice h2').nth(i).innerText(),source[i*2].trim());
   assert.equal(await p.locator('.summary-row > p').nth(i).innerText(),(i===0?"确权登记工作启动以来，市局领导高度重视，将其作为重点工作任务统筹推进。根据自然资源确权登记工作整体部署，多次组织召开进度协调会议，研究解决工作推进中存在的困难和问题，并对下一步工作提出指导意见，多次与省级确权处沟通并带队赴省交流学习，寻求解决方案。":source[i*2+1]));
   assert(await p.locator('.summary-row > p').nth(i).isVisible());
  }
  const choices=p.locator('.summary-choice');await choices.nth(1).hover();assert.equal(await choices.nth(1).getAttribute('aria-pressed'),'true');
  await choices.nth(1).focus();await p.keyboard.press('ArrowDown');assert.equal(await choices.nth(2).getAttribute('aria-pressed'),'true');
  await p.keyboard.press('Home');assert.equal(await choices.first().getAttribute('aria-pressed'),'true');
  await p.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await choices.nth(1).getAttribute('aria-pressed'),'true');
  await p.getByRole('button',{name:'恢复首项',exact:true}).click();assert.equal(await choices.first().getAttribute('aria-pressed'),'true');
  assert.equal(await p.locator('.summary-row > p:visible').count(),3);
  const touch=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true,reducedMotion:'reduce'});
  await touch.goto(url+'#p29');await touch.locator('.summary-choice').last().tap();assert.equal(await touch.locator('.summary-choice').last().getAttribute('aria-pressed'),'true');
  assert.equal(await touch.locator('.summary-row > p:visible').count(),3);assert(await touch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await touch.close();assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
