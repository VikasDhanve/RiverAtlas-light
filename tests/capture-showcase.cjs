'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const out=path.resolve('.impeccable/review/showcase');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1920,height:1080},offline:true,recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:720}}});
 const page=await context.newPage(),url=pathToFileURL(path.resolve('index.html')).href;
 await page.goto(url+'#p4');await page.waitForTimeout(1300);await page.screenshot({path:path.join(out,'policy-large-clean.png')});
 await page.mouse.move(1820,180);await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'starfield-right.png')});
 await page.goto(url+'#p5');await page.waitForTimeout(1300);await page.screenshot({path:path.join(out,'documents-clean.png')});
 await page.goto(url+'#p8');await page.waitForTimeout(1600);await page.screenshot({path:path.join(out,'layers-expanded.png')});
 await page.getByRole('button',{name:'权属与成果',exact:true}).click();await page.waitForTimeout(700);await page.screenshot({path:path.join(out,'layers-ownership.png')});
 await page.mouse.move(1700,400);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'layers-orbit.png')});
 await page.getByRole('button',{name:'单图',exact:true}).click();await page.waitForTimeout(800);await page.screenshot({path:path.join(out,'layers-collapsed.png')});
 const video=page.video();await page.close();await context.close();await video.saveAs(path.join(out,'RiverAtlas-v1.4-preview.webm'));
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',offline:true});
 for(const n of [3,7]){await mobile.goto(url+'#p'+n);await mobile.waitForTimeout(600);await mobile.screenshot({path:path.join(out,'mobile-p'+n+'.png'),fullPage:true});}
 await browser.close();console.log('Clean presentation, pointer starfield and populated 3D layers captured.');
})().catch(e=>{console.error(e);process.exitCode=1;});
