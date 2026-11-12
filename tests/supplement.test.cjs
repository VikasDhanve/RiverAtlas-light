const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'index.html')).href;
const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/content.js'),'utf8')+';this.slides=RiverAtlasSlides',context);
const slides=context.slides,pageOf=title=>slides.findIndex(s=>s.title===title)+1;

test('新增素材可追溯，29页内容、人员两种统计维度与PDF顺序保持一致',()=>{
 assert.equal(slides.length,30);
 assert(!slides[9].points.some(([title])=>title==='图面表达'),'第9页移除图面表达及其说明');
 assert.equal(slides.some(s=>s.layout==='staffing'),false);
 assert.equal(pageOf('项目组织'),0);assert.equal(pageOf('专家论证'),pageOf('主要成果（二）')+1);
 assert.deepEqual(Array.from(slides.find(s=>s.sources.includes(34)).images),[101,102,103,104,105,106]);
 assert.equal(slides.find(s=>s.sources.includes(18)).images[0],516);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/supplement-manifest.json'),'utf8'));
 // 原始资料目录仅在作者工作站可用；移交机器仍验证包内资源完整性。
 if(fs.existsSync(manifest.sourceDirectory))for(const input of manifest.inputs){const raw=fs.readFileSync(path.join(manifest.sourceDirectory,input.file));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),input.sha256);}
 assert.equal(manifest.assets.length,11);// 历史PDF保留来源记录，本轮运行素材由1107清单核验。
});

test('底图、比例展台、专家意见与登记簿切换在离线状态工作',async()=>{
 const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 try{
  await page.goto(url+'#p9');
  const plane=await page.locator('.gallery-spread img').boundingBox();assert(plane.height>plane.width,'工作底图须为直立图幅');
  await page.goto(url+'#p10');assert.equal(await page.locator('.document-board .image-button').count(),2);
  assert.match(await page.locator('.document-board').innerText(),/英那河/);
  await page.goto(url+'#p19');
  assert.equal(await page.locator('.document-board .image-button').count(),3);
  assert.equal(await page.locator('.document-board img').first().evaluate(i=>getComputedStyle(i).transform),'none','EXIF方向不应再叠加旋转');
  await page.goto(url+'#p28');
  for(let i=0;i<6;i++){
   await page.locator('.gallery-tabs button').nth(i).click();
   await page.waitForFunction(()=>{const i=document.querySelector('.gallery-spread img');return i.complete&&i.naturalWidth>0;});
   const dimensions=await page.locator('.gallery-spread img').evaluate(i=>({natural:i.naturalWidth/i.naturalHeight,shown:i.clientWidth/i.clientHeight}));assert(Math.abs(dimensions.natural-dimensions.shown)<.02);
   assert.equal(await page.locator('.gallery-spread img').getAttribute('data-asset'),String(101+i));
  }
  await page.locator('.gallery-spread .image-button').click();await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete;});assert.match(await page.locator('#image-title').innerText(),/清流河登记单元图/);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 }finally{await browser.close();}
});

test('五河属性与动态流程可暂停、分步，删除项目组织后触屏保留其余内容',async()=>{
 const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080},offline:true});
 try{
  await page.goto(url+'#p4');assert.match((await page.locator('.river-map-annotation').allTextContents()).join(' '),/26\.77/);assert.match((await page.locator('.river-map-annotation').allTextContents()).join(' '),/7064.42/);
  await page.getByRole('button',{name:'大沙河 瓦房店市、普兰店区',exact:true}).click();assert.match((await page.locator('.river-map-annotation').allTextContents()).join(' '),/92\.62[\s\S]*3141.83[\s\S]*瓦房店市 普兰店区/);
  await page.goto(url+'#p7');assert.match(await page.locator('.workflow-layout').textContent(),/外业补充调查[\s\S]*划定权属争议区/);
  await page.locator('#play-button').click();await page.waitForFunction(()=>document.querySelector('.workflow-phase.is-current')?.dataset.phase==='1');await page.locator('#pause-button').click();const frozen=await page.locator('#step-description').innerText();await page.waitForTimeout(1650);assert.equal(await page.locator('#step-description').innerText(),frozen);
  await page.locator('#step-button').click();assert.match(await page.locator('#step-description').innerText(),/第3步/);
  await page.goto(url+'#p16');assert.equal(await page.locator('.db-cinema-layer').count(),5);assert.equal(await page.locator('.database-standards').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('play-button').disabled);
  await page.setViewportSize({width:390,height:844});
  for(const n of [3,6,8,9,17,16,20,29]){
   await page.goto(url+'#p'+remainingPage(n>=2&&n<=9?n+1:n));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'小屏水平越界：'+n);
   if(n===8){const rect=await page.locator('.gallery-spread img').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390&&rect.height>250,'小屏主题底图应在可视范围内且可阅读');}
  }
 }finally{await browser.close();}
});
