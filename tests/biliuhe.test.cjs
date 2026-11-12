'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'index.html')).href;
test('1107版碧流河三张成果图与调查表均可离线查看',async()=>{
 const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 try{
  await page.goto(url+'#p18');assert.equal(await page.locator('.gallery-tabs button').count(),12);
  assert.equal(await page.locator('.gallery-spread img').getAttribute('data-asset'),'516');
  const names=await page.locator('.gallery-tabs button').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label')));
  assert.match(names[1],/登记单元图/);assert.match(names[3],/水流资源/);
  for(const i of [1,2,3]){
   await page.locator('.gallery-tabs button').nth(i).click();await page.locator('.gallery-spread .image-button').click();
   await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
   assert.equal(await page.locator('#image-title').innerText(),names[i]);await page.keyboard.press('Escape');
  }
  await page.goto(url+'#p17');assert.equal(await page.locator('.deliverable-card').count(),6);assert.equal(await page.locator('#presentation img').count(),0);
  for(const id of [28,29,30])assert.equal(await page.locator('#presentation [data-asset="'+id+'"]').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 }finally{await browser.close();}
});
test('原稿资料入口和弹窗逻辑移除，运行素材仅保留当前页面引用',async()=>{
 const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await page.goto(url+'#p18');assert.equal(await page.locator('#sources-button,#sources-dialog,#sources-content').count(),0);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),/renderSources|function imageGrid|source\.slides/);
  const c={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/source.js'),'utf8')+';this.source=RiverAtlasSource',c);
  assert.equal(c.source.slides,undefined);
  const removed=[1,2,3,28,29,30,38,39,40,41,42,43];
  for(const id of removed)assert(!c.source.assets.some(a=>a.id===id),'未引用原件仍在运行清单：'+id);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/source-manifest.json'),'utf8'));
  for(const asset of manifest.assets.filter(a=>removed.includes(a.id)))assert.equal(fs.existsSync(path.join(root,asset.path)),false,'未引用旧图尚未删除：'+asset.path);
  const added=JSON.parse(fs.readFileSync(path.join(root,'docs/biliuhe-manifest.json'),'utf8'));assert.equal(added.inputs.length,8);
  if(fs.existsSync(added.sourceDirectory))for(const input of added.inputs){const data=fs.readFileSync(path.join(added.sourceDirectory,input.file));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),input.sha256);}
 }finally{await browser.close();}
});
