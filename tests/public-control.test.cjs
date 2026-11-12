'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
test('第13页矿业与7处排污口原文、河流筛选、聚焦、键盘及原图完整可用',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
 await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p13');
 assert.match(await p.locator('.outfall-summary').innerText(),/英那河存在1处矿业数据，庄河市大顶山-老虎山金矿/);
 assert.match(await p.locator('.outfall-summary').innerText(),/关联排污口信息共7处/);
 const original=p.locator('.document-board img');await original.evaluate(i=>i.decode());
 assert((await original.boundingBox()).height>450);
 await original.hover();await p.waitForSelector('#media-loupe');
 await p.getByRole('button',{name:'查看原图',exact:true}).click();assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');
 await p.mouse.move(10,10);await p.screenshot({path:'backups/basemap-20261111/page-13-map.png'});
 await p.getByRole('tab',{name:'排污口详情',exact:true}).click();
 assert.equal(await p.locator('.outfall-row').count(),7);
 const expected=require('../docs/public-control-1111.json').outfalls.rows;
 assert.deepEqual(await p.locator('.outfall-row').evaluateAll(rs=>rs.map(r=>[...r.cells].map(c=>c.textContent))),expected);
 assert(!await p.getByRole('heading',{name:'河流—矿业',exact:true}).count());
 for(const [river,count] of [['大沙河',1],['浮渡河',2],['登沙河',1],['英那河',3]]){
  await p.getByRole('button',{name:river+' '+count,exact:true}).click();
  assert.equal(await p.locator('.outfall-row:visible').count(),count);
 }
 await p.getByRole('button',{name:'全部 7',exact:true}).click();
 await p.locator('.outfall-row').first().hover();assert.match(await p.locator('.outfall-status').innerText(),/岭东污水处理厂/);
 await p.locator('.outfall-row').first().focus();await p.keyboard.press('ArrowDown');
 assert.equal(await p.locator('.outfall-row').nth(1).evaluate(n=>n===document.activeElement),true);
 await p.keyboard.press('End');assert.equal(await p.locator('.outfall-row').last().evaluate(n=>n===document.activeElement),true);
 const last=await p.locator('.outfall-row').last().boundingBox(),box=await p.locator('.outfall-table-scroll').boundingBox();
 assert(last.y+last.height<=box.y+box.height+2,'大屏7行应完整可见');

 await p.mouse.move(10,10);await p.screenshot({path:'backups/basemap-20261111/page-13.png'});
 await p.setViewportSize({width:390,height:844});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await p.getByRole('button',{name:'英那河 3',exact:true}).click();assert.equal(await p.locator('.outfall-row:visible').count(),3);
 await p.getByRole('button',{name:'全部 7',exact:true}).click();await p.screenshot({path:'backups/basemap-20261111/mobile-13.png',fullPage:true});
 await p.getByRole('tab',{name:'调查图件',exact:true}).click();await p.getByRole('button',{name:'查看原图',exact:true}).click();assert(await p.locator('#image-dialog').isVisible());
 }finally{await b.close();}
});
