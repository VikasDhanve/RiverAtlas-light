'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
test('第19页意见书完整、两张现场照片等高对齐，裁切展示保留完整原件',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'#p19';
  for(const width of [1920,390]){
   await p.setViewportSize({width,height:width===1920?1080:844});await p.goto(url);
   const imgs=p.locator('.document-board img');
   await imgs.evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
   const sizes=await imgs.evaluateAll(ns=>ns.map(i=>{const r=i.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,fit:getComputedStyle(i).objectFit};}));
   assert.equal(sizes[0].fit,'contain','签字意见书须完整显示');
   for(const photo of sizes.slice(1))assert.equal(photo.fit,'cover','现场照片须裁切填满画框');
   assert(Math.abs(sizes[1].height-sizes[2].height)<1&&Math.abs(sizes[1].width-sizes[2].width)<1,'现场照片同宽同高');
   if(width===1920){
    for(const photo of sizes.slice(1)){
     assert(Math.abs(photo.y-sizes[0].y)<2,'三图顶部对齐');
     assert(Math.abs(photo.height-sizes[0].height)<2,'三图底部对齐');
     assert(photo.height>350,'照片须充分利用展示区高度');
    }
   }else{
    assert(sizes[1].y>sizes[0].y+sizes[0].height,'手机按意见书、现场照片顺序阅读');
    assert(sizes[2].y>sizes[1].y+sizes[1].height);
   }
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  }
  await p.setViewportSize({width:1920,height:1080});await p.goto(url);
  const photo=p.locator('.document-board img').nth(1);await photo.hover();await p.locator('#media-loupe').waitFor();
  assert(Math.abs(await p.locator('#media-loupe img').evaluate(i=>i.clientWidth/i.clientHeight)-await photo.evaluate(i=>i.naturalWidth/i.naturalHeight))<.01,'放大镜保留原图比例');
  for(const control of await p.locator('.document-board .image-button').all()){
   const source=await control.locator('img').getAttribute('src');await control.click();
   await p.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
   assert.equal(await p.locator('#original-image').getAttribute('src'),source,'打开对应完整原件');await p.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
