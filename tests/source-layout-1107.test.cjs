const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
test('第9页双图并列、避让内容完整，后续图文按新稿分组且原件可查看',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  for(const [page,ids] of [[9,[14,13]],[11,[15,16]],[12,[17,18]],[13,[19]],[14,[20,21,22,23]],[20,[31,34,33]],[27,[37]]]){
   await p.goto(url+'#p'+remainingPage(page>=2&&page<=9?page+1:page));if([11,12].includes(page)){assert.deepEqual(await p.locator('.gallery-tabs button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.asset))),ids);for(const id of ids){await p.locator('.gallery-tabs button[data-asset="'+id+'"]').click();await p.locator('.eagle-viewport img').evaluate(i=>i.decode());assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),String(id));}continue;}await p.locator('.document-board img').first().waitFor();
   assert.deepEqual(await p.locator('.document-board img').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.asset))),ids);
   for(const image of await p.locator('.document-board img').all()){
    await image.evaluate(i=>i.decode());assert(await image.isVisible());
    const r=await image.boundingBox();assert(r.width>100&&r.height>100);
   }
   if(page===9){
    assert.equal(await p.locator('#slide-title').innerText(),'预划登记单元');
    const text=await p.locator('#presentation').innerText();
    for(const term of ['基于工作底图','永久基本农田','城镇开发边界','2103处','457.04公顷','23处','15.43公顷'])assert(text.includes(term),term);
    assert.doesNotMatch(text,/编码|一河一单元|每条河流自然资源划为一个登记单元|对位于河流管理范围线附近/);
    assert.equal(await p.locator('.slide-lead').count(),2);
    assert.equal(await p.locator('.copy-point').count(),0);
    const [left,right]=await p.locator('.document-window').all();
    assert((await left.boundingBox()).x<(await right.boundingBox()).x);
   }
   await p.locator('.document-board .image-button').first().click();
   assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');
  }
  await p.goto(url+'#p18');assert.equal(await p.locator('.gallery-tabs button').count(),12);
  await p.goto(url+'#p17');assert.equal(await p.locator('.deliverable-card').count(),6);
  await p.goto(url+'#p22');assert.match(await p.locator('#presentation').innerText(),/未提供/);
  assert.doesNotMatch(await p.locator('#presentation').innerText(),/送生态环境/);
  await p.goto(url+'#p25');
  assert.match(await p.locator('.notice-table').innerText(),/南：黄海/);
  assert.equal(await p.locator('.notice-table tbody tr').count(),6);
  assert(await p.locator('.notice-document-footer').isVisible());
 }finally{await b.close();}
});
