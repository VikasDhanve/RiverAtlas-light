'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),c={};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/content.js'),'utf8')+';this.slides=RiverAtlasSlides',c);
const pageNumber=c.slides.findIndex(s=>s.title==='大沙河首次登记公告草案')+1;
const originals=require('../docs/source-manifest-1107.json').slides.find(s=>s.page===31).texts.slice(1);
const compact=s=>s.replace(/\s/g,'');
test('大沙河公告以正文、完整合并表格和异议联系方式展示，逐段保留PPT第31页原文',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce',offline:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(pathToFileURL(path.join(root,'index.html')).href+'#p'+pageNumber);
  assert.equal(await p.locator('.notice-document table').count(),1,'公告需要完整登记信息表');
  const text=compact(await p.locator('.notice-document').innerText());
  for(const original of originals)assert(text.includes(compact(original)),original);
  assert.equal(await p.locator('.notice-document tbody tr').count(),6);
  assert.equal(await p.locator('.notice-document [rowspan="3"]').count(),2);
  assert.equal(await p.locator('.notice-document [colspan="5"]').count(),1);
  assert.equal(await p.locator('.area-chart,.notice-tabs').count(),0);
  assert.match(await p.locator('.status-label').innerText(),/草案/);
  for(const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160],[3440,1440],[390,844]]){
   await p.setViewportSize({width,height});
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert(await p.locator('.notice-document').isVisible());
   assert(await p.evaluate(()=>{
    const r=document.querySelector('.slide-content').getBoundingClientRect();
    return [...document.querySelectorAll('.notice-document h2,.notice-document p,.notice-table-window,.notice-document td,.notice-document th')].every(n=>{const b=n.getBoundingClientRect(),window=n.closest('.notice-table-window'),scrollable=window&&window.scrollWidth>window.clientWidth;return !b.width||b.bottom<=r.bottom+3&&(scrollable&&n!==window||b.right<=r.right+3&&b.left>=r.left-3);})&&document.documentElement.scrollWidth<=innerWidth+2;
   }),`${width}×${height}完整可读，无内容越界`);
  }
  const region=p.getByRole('region',{name:'登记信息表；窄屏可左右滚动查看全部六列'});
  await region.focus();await p.keyboard.press('End');
  assert(await region.evaluate(n=>n.scrollLeft>0&&n.scrollLeft+n.clientWidth>=n.scrollWidth-2),'手机可滚动到表格最右侧');
  assert.match(await p.locator('#slide-title').innerText(),/大沙河/,'表格滚动不触发演示翻页');
  assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
