const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;

test('第12页自然资源和权属调查改为左文右鹰眼，切图与原件均可用',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{await p.goto(url+'#p12');assert.match(await p.locator('#slide-title').innerText(),/自然资源.*权属/);assert.deepEqual(await p.locator('.gallery-tabs button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.asset))),[17,18]);
 const text=await p.locator('#presentation').innerText();for(const term of ['全国第三次国土调查','坐落','空间范围','面积','权属资料','初步调查成果'])assert(text.includes(term),term);
 for(const id of [17,18]){await p.locator('.gallery-tabs button[data-asset="'+id+'"]').click();await p.locator('.eagle-viewport img').evaluate(i=>i.decode());await p.getByRole('button',{name:'查看原图',exact:true}).click();await p.locator('#original-image').evaluate(i=>i.decode());assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');}
 await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');assert.match(await p.locator('#slide-title').innerText(),/公共管制/);assert.equal(await p.locator('#page-count').innerText(),'13 / 30');}finally{await b.close();}
});
