'use strict';
const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
  const out=path.resolve('.impeccable/review/exhibit');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1920,height:1080},offline:true,
    recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:720}}});
  const page=await context.newPage();await page.goto(pathToFileURL(path.resolve('index.html')).href+'#p5');
  await page.waitForTimeout(1400);await page.screenshot({path:path.join(out,'overview.png')});
  await page.getByRole('button',{name:'固定查看：中标通知书',exact:true}).hover();await page.waitForTimeout(700);
  await page.screenshot({path:path.join(out,'notice-hover.png')});await page.waitForTimeout(1000);
  await page.locator('.document-card').first().locator('.document-fragment').nth(1).hover();await page.waitForTimeout(600);
  await page.screenshot({path:path.join(out,'signature-hover.png')});await page.waitForTimeout(1000);
  await page.getByRole('button',{name:'固定查看：项目合同',exact:true}).hover();await page.waitForTimeout(700);
  await page.screenshot({path:path.join(out,'contract-hover.png')});
  await page.getByRole('button',{name:'固定查看：项目合同',exact:true}).click();
  await page.locator('#slide-title').hover();await page.waitForTimeout(800);
  await page.screenshot({path:path.join(out,'contract-pinned.png')});await page.waitForTimeout(1600);
  await page.getByRole('button',{name:'恢复全览',exact:true}).click();await page.waitForTimeout(600);
  await page.screenshot({path:path.join(out,'restored.png')});
  const video=page.video();await page.close();await context.close();await video.saveAs(path.join(out,'RiverAtlas-page2-hover-preview.webm'));
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',offline:true});
  await mobile.goto(pathToFileURL(path.resolve('index.html')).href+'#p5');await mobile.waitForTimeout(500);
  await mobile.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await browser.close();
  console.log('Captured manual hover/pin/reset and touch layout.');
})().catch(e=>{console.error(e);process.exitCode=1;});
