const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
test('第三页去掉重复标题和提示，纸面高度增加；其他页不显示讲解操作提示',async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await page.goto(url+'#p5');
  assert.match(await page.title(),/RiverAtlas/);
  assert.equal(await page.locator('.policy-page-title,.policy-page-meta,.policy-selection-state,.policy-reader-hint').count(),0);
  assert((await page.locator('.policy-sheet:not([hidden])').boundingBox()).height>620);
  for(const n of [2,3,8,16,21]){
   await page.goto(url+'#p'+remainingPage(n>=2&&n<=9?n+1:n));
   const visible=await page.locator('#presentation').evaluate(root=>[...root.querySelectorAll('p,span')].filter(n=>{
    const b=n.getBoundingClientRect(),s=getComputedStyle(n);return b.width>4&&b.height>4&&s.display!=='none'&&s.visibility!=='hidden';
   }).map(n=>n.textContent).join('\n'));
   assert.doesNotMatch(visible,/移入目录|点击固定|移入聚焦|移动鼠标|点击“播放演示”|高亮表示讲解位置/);
  }
 }finally{await browser.close();}
});
test('浅色投影版无鼠标星空干扰，正文与标题使用高对比深色',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});try{await p.goto(url+'#p5');assert.equal(await p.locator('#starfield').count(),0);await p.mouse.move(400,200);await p.mouse.move(1400,500);assert.equal(await p.locator('#starfield').count(),0);assert.equal(await p.locator('#slide-title').evaluate(n=>getComputedStyle(n).color),'rgb(23, 56, 79)');assert.equal(await p.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(243, 247, 250)');}finally{await b.close();}
});
test('浅色背景保持安静，正文和原件不做反色滤镜',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});try{await p.goto(url+'#p9');await p.locator('.eagle-viewport img').evaluate(i=>i.decode());for(const img of await p.locator('#presentation img').all())assert.equal(await img.evaluate(n=>getComputedStyle(n).filter),'none');await p.locator('.gallery-source').click();await p.locator('#original-image').evaluate(i=>i.decode());assert.equal(await p.locator('#original-image').evaluate(n=>getComputedStyle(n).filter),'none');assert(await p.locator('#image-dialog').isVisible());}finally{await b.close();}
});
