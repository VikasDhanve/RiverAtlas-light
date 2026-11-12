'use strict';
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..'), out = path.join(root, '.impeccable/review');
  fs.mkdirSync(out, { recursive:true });
  const browser = await chromium.launch({ channel:'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width:1920, height:1080 }, reducedMotion:'no-preference' });
    const url = pathToFileURL(path.join(root,'index.html')).href;
    await page.goto(url + '#p17');
    await page.getByRole('button', {name:'播放演示',exact:true}).click();
    await page.waitForTimeout(800);
    await page.screenshot({path:path.join(out,'motion-process-0800.png')});
    await page.waitForTimeout(1000);
    await page.getByRole('button', {name:'暂停',exact:true}).click();
    await page.screenshot({path:path.join(out,'motion-process-paused.png')});
    await page.goto(url + '#p27');
    await page.getByRole('button', {name:'播放演示',exact:true}).click();
    await page.waitForTimeout(250);
    await page.screenshot({path:path.join(out,'motion-chart-0250.png')});
    await page.goto(url + '#p30');
    await page.locator('.image-button').click();
    await page.waitForFunction(() => { const i=document.getElementById('original-image');return i.complete&&i.naturalWidth>0&&!i.hidden; });
    await page.getByRole('button',{name:'放大原件',exact:true}).click();
    await page.screenshot({path:path.join(out,'original-zoom.png')});
    await page.close();
  } finally { await browser.close(); }
  console.log('Captured motion and original-zoom evidence.');
})().catch(e=>{console.error(e);process.exitCode=1;});
