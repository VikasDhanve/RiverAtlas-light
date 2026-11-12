const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
test('9/11/12默认100%鹰眼与左侧文字，18页每2秒换图并可跳过、暂停、复播和离页清理',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{for(const n of [9,11,12]){await p.goto(url+'#p'+n);await p.locator('.eagle-viewport img').evaluate(i=>i.decode());assert.equal(await p.locator('.eagle-zoom output').innerText(),'100%');assert(await p.locator('.copy-column').isVisible());assert.equal(await p.locator('#media-loupe').count(),0);await p.screenshot({path:`backups/background-tabs-20261112/results-p${n}.png`});}
 await p.goto(url+'#p18');await p.locator('.eagle-viewport img').evaluate(i=>i.decode());assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),'516');assert.equal(await p.locator('.eagle-reader').getAttribute('data-autoplay'),'true');
 await p.waitForTimeout(1100);assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),'516');assert(await p.locator('.gallery-tabs button[aria-pressed="true"] .eagle-thumb-progress').evaluate(n=>n.getAnimations().some(a=>a.playState==='running')));
 await p.waitForTimeout(1100);assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),'301');
 await p.getByRole('button',{name:'跳过动画',exact:true}).click();const id=await p.locator('.eagle-viewport img').getAttribute('data-asset');await p.waitForTimeout(2200);assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),id);
 await p.getByRole('button',{name:'恢复自动',exact:true}).click();await p.waitForTimeout(2100);assert.notEqual(await p.locator('.eagle-viewport img').getAttribute('data-asset'),id);
 await p.locator('#pause-button').click();const frozen=await p.locator('.eagle-viewport img').getAttribute('data-asset');await p.waitForTimeout(2200);assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),frozen);
 await p.locator('#pause-button').click();await p.waitForTimeout(2100);assert.notEqual(await p.locator('.eagle-viewport img').getAttribute('data-asset'),frozen);
 await p.locator('#skip-button').click();assert.equal(await p.locator('.eagle-reader').getAttribute('data-autoplay'),'false');await p.locator('#replay-button').click();assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),'516');
 await p.screenshot({path:'backups/background-tabs-20261112/results-p18.png'});await p.locator('#static-button').click();assert.equal(await p.locator('.eagle-reader').getAttribute('data-autoplay'),'false');
 await p.goto(url+'#p19');await p.waitForTimeout(2200);assert.equal(await p.locator('#slide-title').innerText(),'专家论证');assert.equal(await p.locator('.eagle-reader').count(),0);assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
