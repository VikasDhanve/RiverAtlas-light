const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;

test('第15页只展示上图文字，第18页完整接收12张专题图并复用鹰眼',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{await p.goto(url+'#p15');assert.equal(await p.locator('#slide-title').innerText(),'调查成果上图');assert.equal(await p.locator('#presentation img').count(),0);
 const text=await p.locator('#presentation').innerText();for(const term of ['登记单元范围界线','自然资源权属范围线','行政管辖界线','公共管制信息','地类图斑','地类编码','界址点坐标','所有权主体','所有权代理行使主体'])assert(text.includes(term),term);
 await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#slide-title').innerText(),'数据建库');
 await p.goto(url+'#p17');assert.equal(await p.locator('#slide-title').innerText(),'主要成果（一）');assert.equal(await p.locator('.deliverable-card').count(),6);assert.equal(await p.locator('#presentation img').count(),0);
 await p.goto(url+'#p18');assert.equal(await p.locator('#slide-title').innerText(),'主要成果（二）');assert.deepEqual(await p.locator('.gallery-tabs button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.asset))),[516,301,302,303,512,514,515,517,518,519,513,511]);
 for(const id of [301,302,303,519]){await p.locator('.gallery-tabs button[data-asset="'+id+'"]').click();assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),String(id));}
 await p.getByRole('button',{name:'查看原图',exact:true}).click();await p.locator('#original-image').evaluate(i=>i.decode());assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');
 await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#slide-title').innerText(),'专家论证');assert.equal(await p.locator('#page-count').innerText(),'19 / 30');
 }finally{await b.close();}
});
test('第18页手动切换、专注与手机完整图保留，零悬浮镜',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:390,height:844},offline:true,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.goto(url+'#p18');await p.locator('.gallery-tabs button[data-asset="303"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.gallery-spread img').getAttribute('data-asset'),'303');await p.locator('.focus-media').click();assert.equal(await p.locator('.gallery-layout').getAttribute('data-focus'),'true');await p.locator('.focus-media').click();assert.equal(await p.locator('#media-loupe').count(),0);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);}finally{await b.close();}
});
