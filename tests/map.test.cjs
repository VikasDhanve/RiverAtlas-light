'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const path=require('node:path');const {pathToFileURL}=require('node:url');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;

test('第4页地图铺满右栏，五河属性以图上标注显示且选择与移动端一致',async()=>{
 const b=await chromium.launch({channel:'chrome'}),expected=[['登沙河','26.77','327.98'],['大沙河','92.62','3141.83'],['浮渡河','39.39','476.21'],['碧流河','85.37','7064.42'],['英那河','78.53','3770.22']];
 try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]){
 const p=await b.newPage({viewport,offline:true,reducedMotion:'reduce'});await p.goto(url+'#p4');await p.locator('.river-map-annotation').first().waitFor();assert.equal(await p.locator('#page-count').innerText(),'04 / 30');assert.equal(await p.locator('.river-attribute-table').count(),0);assert.equal(await p.locator('.map-attribute-values:visible').count(),0);assert.equal(await p.locator('.map-controls button').count(),1);assert.equal(await p.locator('.map-controls button').innerText(),'查看原件');assert.equal(await p.locator('.map-controls span').count(),0);const box=await p.locator('.map-window').boundingBox(),figure=await p.locator('.map-figure').boundingBox();assert(box.height/figure.height>.98);
 for(const [i,[name,length,area]] of expected.entries()){const card=p.locator('.river-map-annotation').nth(i);assert.match(await card.textContent(),new RegExp(name));assert((await card.textContent()).includes(length));assert((await card.textContent()).includes(area));await p.locator(`.river-choice[data-river="${i}"]`).click();const selected=p.locator('.map-attribute-marker:not(.river-label-dimmed)');assert.equal(await selected.count(),1);const values=selected.locator('dd');assert.equal(await values.nth(0).innerText(),length+' km');assert.equal(await values.nth(1).innerText(),area+' 公顷');}
 await p.locator('.river-all').click();assert.equal(await p.locator('.map-attribute-values:visible').count(),0);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.close();}
 }finally{await b.close();}
});

test('第五页为离线真实坐标地图，全部与五河选择定位、高亮和原件可用',async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});const errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 try{
  await p.goto(url+'#p4');await p.locator('.leaflet-container').waitFor({timeout:2500});
  assert.equal(await p.locator('.river-choice').count(),6);assert.equal(await p.getByRole('button',{name:'全部 五条河流总览',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await p.locator('.river-flow').count(),5);assert.equal(await p.locator('.map-window img').count(),0);
  assert(await p.locator('.river-channel').evaluateAll(ns=>ns.length===5&&ns.every(n=>parseFloat(getComputedStyle(n).strokeWidth)>3.6)),'五条河流均应比原线宽更清晰');
  const before=await p.locator('.river-channel[data-river="4"]').getAttribute('d');
  await p.getByRole('button',{name:'英那河 庄河市',exact:true}).click();assert.equal(await p.getByRole('button',{name:'英那河 庄河市',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await p.locator('.map-attribute-marker:not(.river-label-dimmed)').innerText(),/英那河[\s\S]*庄河市/);assert.notEqual(await p.locator('.river-channel[data-river="4"]').getAttribute('d'),before);
  assert.equal(await p.locator('.river-flow:not(.river-dimmed)').count(),1);
  for(const name of ['登沙河 普兰店区、金普新区','大沙河 瓦房店市、普兰店区','浮渡河 瓦房店市','碧流河 庄河市、普兰店区'])await p.getByRole('button',{name,exact:true}).click();
  await p.getByRole('button',{name:'全部 五条河流总览',exact:true}).click();assert.equal(await p.locator('.river-flow:not(.river-dimmed)').count(),5);
  await p.getByRole('button',{name:'查看原件',exact:true}).click();await p.waitForFunction(()=>document.getElementById('original-image').naturalWidth>0);assert.match(await p.locator('#image-title').innerText(),/五河空间/);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 }finally{await b.close();}
});
test('动态河流暂停和静态可控，地图键盘平移不翻页，离页返回可重建',async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await p.goto(url+'#p4');await p.locator('.leaflet-container').waitFor();
  const pane=p.locator('.leaflet-map-pane'),beforeDrag=await pane.getAttribute('style'),box=await p.locator('.leaflet-container').boundingBox();
  await p.mouse.move(box.x+180,box.y+160);await p.mouse.down();await p.mouse.move(box.x+240,box.y+185,{steps:5});await p.mouse.up();assert.notEqual(await pane.getAttribute('style'),beforeDrag);
  const beforeZoom=await p.locator('.river-channel[data-river="4"]').getAttribute('d');await p.getByRole('button',{name:'放大地图',exact:true}).click();
  await p.waitForFunction(before=>document.querySelector('.river-channel[data-river="4"]').getAttribute('d')!==before,beforeZoom);
  const offset=()=>p.locator('.river-flow').first().evaluate(n=>getComputedStyle(n).strokeDashoffset);
  await p.keyboard.press('p');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const paused=await offset();await p.waitForTimeout(200);assert.equal(await offset(),paused);
  await p.keyboard.press('p');await p.waitForTimeout(180);assert.notEqual(await offset(),paused);
  await p.keyboard.press('a');const still=await offset();await p.waitForTimeout(180);assert.equal(await offset(),still);
  await p.locator('.leaflet-container').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#page-count').innerText(),'04 / 30');
  await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#page-count').innerText(),'05 / 30');await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('.leaflet-container').count(),1);
 }finally{await b.close();}
});
test('地图库缺失时回退原图，触屏与减少动态仍可选择河流',async()=>{
 const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(url+'#p4');await p.getByRole('button',{name:'浮渡河 瓦房店市',exact:true}).tap();assert.match(await p.locator('.map-attribute-marker:not(.river-label-dimmed)').innerText(),/浮渡河/);
  await p.route('**/leaflet.js',r=>r.abort());await p.reload();await p.waitForFunction(()=>{const i=document.querySelector('.map-window img');return i&&i.complete&&i.naturalWidth>0;});
  await p.getByRole('button',{name:'查看原件',exact:true}).tap();await p.waitForFunction(()=>document.getElementById('original-image').naturalWidth>0);
 }finally{await b.close();}
});

test('工作目标PC端延展为两行，保留原文字号与手机自然换行',async()=>{
 const b=await chromium.launch({channel:'chrome'});
 try{
  const p=await b.newPage({offline:true,reducedMotion:'reduce'});await p.goto(url+'#p4');
  const inspect=()=>p.locator('.slide-lead').evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);return {lines:r.getClientRects().length,font:getComputedStyle(n).fontSize,text:n.textContent};});
  const text=(await inspect()).text;
  for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3440,1440],[3840,2160]]){
   await p.setViewportSize({width,height});const result=await inspect();assert.equal(result.lines,2);assert.equal(result.font,'26px');assert.equal(result.text,text);
  }
  await p.setViewportSize({width:390,height:844});const mobile=await inspect();assert(mobile.lines>2);assert.equal(mobile.font,'18px');assert.equal(mobile.text,text);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }finally{await b.close();}
});
