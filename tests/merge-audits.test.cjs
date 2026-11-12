const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path'),fs=require('fs'),vm=require('vm');const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href,c={};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/content.js'),'utf8')+';this.rows=RiverAtlasSlides[20].table.rows',c);

test('第21页保留两源页九组完整审核职责，改为索引阅读且下一页仍为外部审核',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{for(const width of [1920,390]){await p.setViewportSize({width,height:width===1920?1080:844});await p.goto(url+'#p21');assert.equal(await p.locator('#slide-title').innerText(),'内部审核分工');assert.equal(await p.locator('.audit-department-choice').count(),9);for(let i=0;i<9;i++){await p.locator('.audit-department-choice').nth(i).click();assert.equal(await p.locator('.audit-detail:not([hidden]) .review-clause-text').textContent(),c.rows[i][2]);}assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 await p.setViewportSize({width:1920,height:1080});await p.locator('#slide-title').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#slide-title').innerText(),'外部审核');assert.equal(await p.locator('#page-count').innerText(),'22 / 30');await p.getByRole('button',{name:'全部页面',exact:true}).click();assert.equal(await p.locator('.contents-entry').count(),30);
 }finally{await b.close();}
});
