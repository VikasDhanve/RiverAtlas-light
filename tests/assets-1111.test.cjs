const remainingPage=n=>{const p=n-(n>15?1:0)-(n>19?1:0);return p+(p>=18?1:0);};
const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
test('第9页四图与第16页十二图可切换、悬停放大、使用与第05页一致的原图弹窗',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce',offline:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try {
 for(const [n,count,start] of [[9,4,0],[18,12,3]]){
  await p.goto(pathToFileURL(path.resolve('index.html')).href+'#p'+n);
  assert.equal(await p.locator('.gallery-tabs button').count(),count);
  for(let i=start;i<count;i++){
   await p.locator('.gallery-tabs button').nth(i).click();
   const img=p.locator('.gallery-spread img');await img.evaluate(i=>i.decode());
   await img.hover();if(n===9||n===18){assert.equal(await p.locator('#media-loupe').count(),0);assert.equal(await p.locator('.eagle-lens').count(),1);}else await p.waitForSelector('#media-loupe');
   assert.equal(await p.getByRole('link',{name:'查看源文件（PDF）'}).count(),0);
   await p.getByRole('button',{name:'查看原图',exact:true}).click();
   await p.locator('#original-image').evaluate(i=>i.decode());assert(await p.locator('#image-dialog').isVisible());
   await p.keyboard.press('Escape');
  }
  await p.mouse.move(10,10);await p.screenshot({path:'backups/basemap-20261111/page-'+n+'.png'});
  await p.setViewportSize({width:390,height:844});
  await p.locator('.gallery-tabs button').last().click();
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await p.screenshot({path:'backups/basemap-20261111/mobile-'+n+'.png',fullPage:true});
  await p.setViewportSize({width:1920,height:1080});
 }
 assert.deepEqual(errors,[]);
 } finally {await b.close();}
});
