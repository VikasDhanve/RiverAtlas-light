const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
test('目录位于封面后，与顶部七章一致并支持悬停、键盘、点击及小屏',async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p2');
 assert.equal(await p.locator('#slide-title').innerText(),'汇报目录');
 assert.equal(await p.evaluate(()=>RiverAtlasSlides.some(s=>s.title.includes('预划登记单元（二）'))),false);
 assert.equal(await p.evaluate(()=>RiverAtlasSlides.find(s=>s.board==='unit-boundaries').title),'预划登记单元');
 const names=await p.locator('.chapter-button').allTextContents();
 assert.deepEqual(await p.locator('.agenda-name').allTextContents(),names);
 for(let i=0;i<7;i++){
  await p.locator('.agenda-choice').nth(i).hover();
  assert.equal(await p.locator('.agenda-preview-title').innerText(),names[i]);
  assert.equal(await p.locator('.chapter-button.is-agenda-preview').innerText(),names[i]);
  await p.locator('.agenda-choice').nth(i).click();
  const viaAgenda=await p.locator('#slide-title').innerText();
  await p.locator('.chapter-button').nth(i).click();
  assert.equal(await p.locator('#slide-title').innerText(),viaAgenda);
  await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p2');
 }
 await p.locator('.agenda-choice').nth(3).focus();
 assert.equal(await p.locator('.agenda-preview-title').innerText(),names[3]);
 await p.keyboard.press('Enter');
 assert.equal(await p.locator('.chapter-button[aria-current="true"]').innerText(),names[3]);
 await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p2');
 await p.screenshot({path:'backups/contents-20261111/desktop.png'});
 assert(await p.locator('.agenda-choice').last().evaluate(n=>n.getBoundingClientRect().bottom<document.querySelector('.toolbar').getBoundingClientRect().top));
 await p.setViewportSize({width:390,height:844});
 await p.screenshot({path:'backups/contents-20261111/mobile.png',fullPage:true});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('.agenda-choice').last().click();
 assert.equal(await p.locator('.chapter-button[aria-current="true"]').innerText(),names[6]);
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
