const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;

test('成果与登记簿图集悬停缩略图即选图，同步高亮且同一缩略图内移动不重播',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  for(const page of [18,28]){
   await p.goto(url+'#p'+page);const tabs=p.locator('.gallery-tabs button');
   for(let i=0;i<await tabs.count();i++){
    const thumb=tabs.nth(i),id=await thumb.getAttribute('data-asset');await thumb.hover();
    assert.equal(await p.locator('.gallery-spread img').getAttribute('data-asset'),id,'悬停应选中：'+page+'/'+i);
    assert.equal(await thumb.getAttribute('aria-pressed'),'true');
   }
   const last=tabs.last();await p.locator('.gallery-spread').evaluate(n=>window.lastImage=n.firstElementChild);
   const r=await last.boundingBox();for(let i=0;i<5;i++)await p.mouse.move(r.x+r.width/2+(i%2?3:-3),r.y+r.height/2);
   assert.equal(await p.locator('.gallery-spread').evaluate(n=>n.firstElementChild===window.lastImage),true);
  }
 }finally{await b.close();}
});

test('悬停手动接管图集播放，键盘和触屏点击仍可切换，触屏主图不弹跟随窗',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await p.goto(url+'#p18');await p.locator('#play-button').click();const last=p.locator('.gallery-tabs button').last();await last.hover();const id=await last.getAttribute('data-asset');
  await p.waitForTimeout(3400);assert.equal(await p.locator('.gallery-spread img').getAttribute('data-asset'),id);
  const first=p.locator('.gallery-tabs button').first();await first.focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.gallery-spread img').getAttribute('data-asset'),'516');
  const touch=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true});await touch.goto(url+'#p18');const thumb=touch.locator('.gallery-tabs button').nth(2);const target=await thumb.getAttribute('data-asset');await thumb.tap();assert.equal(await touch.locator('.gallery-spread img').getAttribute('data-asset'),target);assert.equal(await touch.locator('#media-loupe').count(),0);await touch.close();
 }finally{await b.close();}
});
