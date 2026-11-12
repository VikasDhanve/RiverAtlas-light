'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href+'#p6';
test('第二页由鼠标聚焦和点击固定，移开还原且不会自动轮换',async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1920,height:1080},offline:true});
  try {
    await page.goto(url);
    const notice=page.getByRole('button',{name:'固定查看：中标通知书',exact:true});
    const contract=page.getByRole('button',{name:'固定查看：项目合同',exact:true});
    await notice.waitFor();
    assert.equal(await page.locator('#play-button').isDisabled(),true);
    const before=await notice.boundingBox();
    await notice.hover();await page.waitForTimeout(450);
    assert((await notice.boundingBox()).width>before.width*1.2);
    await page.locator('#slide-title').hover();await page.waitForTimeout(450);
    assert(Math.abs((await notice.boundingBox()).width-before.width)<3);
    await contract.click();await page.locator('#slide-title').hover();
    assert.equal(await contract.getAttribute('aria-pressed'),'true');
    const focused=await contract.boundingBox();
    await page.waitForTimeout(3500);
    assert.equal(await contract.getAttribute('aria-pressed'),'true');
    assert(Math.abs((await contract.boundingBox()).width-focused.width)<3);
    assert.equal(await page.locator('#page-count').innerText(),'06 / 30');
    await page.getByRole('button',{name:'恢复全览',exact:true}).click();
    assert.equal(await contract.getAttribute('aria-pressed'),'false');
    await page.getByRole('button',{name:'查看完整原件：项目合同',exact:true}).click();
    await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
    assert.match(await page.locator('#image-title').innerText(),/合同/);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#page-count').innerText(),'06 / 30');
  } finally {await browser.close();}
});
test('键盘和触屏可直接固定/还原，减少动态保留可读内容',async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',offline:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(url);
    const contract=page.getByRole('button',{name:'固定查看：项目合同',exact:true});
    await contract.tap();assert.equal(await contract.getAttribute('aria-pressed'),'true');
    await contract.tap();assert.equal(await contract.getAttribute('aria-pressed'),'false');
    await contract.focus();await page.keyboard.press('Enter');
    assert.equal(await contract.getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'恢复全览',exact:true}).click();
    assert.equal(await contract.getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#play-button').isDisabled(),true);
    assert.equal(await page.locator('.document-card').count(),2);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
