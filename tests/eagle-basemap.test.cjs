const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path');
test('第9页鹰眼联动固定局部图，比例准确、无悬浮放大镜且支持切图键盘手机',async()=>{
 const b=await chromium.launch({channel:'chrome'}),errors=[];
 try{for(const width of [1920,1366,390]){
  const p=await b.newPage({viewport:{width,height:width===390?844:Math.round(width*9/16)},offline:true,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p9');await p.locator('.eagle-sheet img').evaluate(i=>i.decode());await p.locator('.eagle-viewport img').evaluate(i=>i.decode());
  assert.equal(await p.locator('.gallery-tabs button').count(),4);
  const image=p.locator('.eagle-sheet img');await image.scrollIntoViewIfNeeded();const r=await image.boundingBox();
  await p.mouse.move(r.x+r.width*.3,r.y+r.height*.25);const before=await p.locator('.eagle-lens').getAttribute('style');
  await p.mouse.move(r.x+r.width*.7,r.y+r.height*.75);assert.notEqual(await p.locator('.eagle-lens').getAttribute('style'),before);
  assert.equal(await p.locator('#media-loupe').count(),0);
  const values=await p.locator('.eagle-viewport').evaluate(n=>{const i=n.querySelector('img'),lens=document.querySelector('.eagle-lens'),mini=document.querySelector('.eagle-sheet');return {ratio:i.clientWidth/i.clientHeight,natural:i.naturalWidth/i.naturalHeight,coverage:lens.offsetWidth/mini.clientWidth,expected:n.clientWidth/i.clientWidth,width:i.clientWidth,viewport:n.clientWidth}});
  assert(Math.abs(values.ratio-values.natural)<.01);assert(Math.abs(values.coverage-values.expected)<.04);assert(values.width>=values.viewport*.99);
  await p.locator('.eagle-viewport').focus();const center=await p.locator('.eagle-viewport').getAttribute('data-center');await p.keyboard.press('ArrowUp');assert.notEqual(await p.locator('.eagle-viewport').getAttribute('data-center'),center);assert.equal(await p.locator('#page-count').innerText(),'09 / 30');
  await p.locator('.eagle-zoom-in').click();assert.equal(await p.locator('.eagle-zoom output').innerText(),'125%');
  await p.getByRole('button',{name:'适应全图',exact:true}).click();assert(await p.locator('.eagle-viewport').evaluate(n=>{const i=n.querySelector('img');return i.clientWidth<=n.clientWidth+1&&i.clientHeight<=n.clientHeight+1}));
  for(let i=0;i<4;i++){await p.locator('.gallery-tabs button').nth(i).click();await image.evaluate(i=>i.decode());assert.equal(await p.locator('.eagle-viewport img').getAttribute('data-asset'),String(501+i));}
  await p.locator('.eagle-zoom-in').click();await p.screenshot({path:`backups/background-tabs-20261112/eagle-${width}.png`,fullPage:width===390});
  await p.getByRole('button',{name:'查看原图',exact:true}).click();await p.locator('#original-image').evaluate(i=>i.decode());assert(await p.locator('#image-dialog').isVisible());await p.keyboard.press('Escape');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.close();
 }assert.deepEqual(errors,[]);}finally{await b.close();}
});
