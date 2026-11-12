'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
let browser;
before(async () => {
  const cache = path.join(os.homedir(), 'AppData/Local/ms-playwright');
  const candidates = [process.env.RIVER_ATLAS_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
  if (fs.existsSync(cache)) for (const n of fs.readdirSync(cache).sort().reverse()) {
    if (/^chromium-\d+$/.test(n)) candidates.push(path.join(cache, n, 'chrome-win64/chrome.exe'));
  }
  const executablePath = candidates.find(p => p && fs.existsSync(p));
  browser = await chromium.launch(executablePath ? { executablePath } : {});
});
after(async () => { await browser?.close(); });
test('离线入口显示业务名称，键盘翻页、首尾及非法页码均安全可用', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url);
    await page.locator('#slide-title').waitFor();
    assert.match(await page.locator('#slide-title').innerText(), /大连市自然资源/);
    assert.equal(await page.locator('.brand').innerText(),'自然资源统一确权登记');
    assert.equal(await page.locator('.brand img').count(),0);
    assert.equal(await page.locator('.brand svg').count(),1);
    assert.equal(await page.locator('.brand').evaluate(n=>getComputedStyle(n).fontSize),'32px');
    assert(Number(await page.locator('.brand').evaluate(n=>getComputedStyle(n).fontWeight))>=700);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#page-count').textContent.includes('02 / 30'));
    await page.keyboard.press('End');
    assert.equal(await page.locator('#page-count').innerText(), '30 / 30');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#page-count').innerText(), '30 / 30');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#page-count').innerText(), '01 / 30');
    await page.goto(url + '#p9999');
    assert.equal(await page.locator('#page-count').innerText(), '30 / 30');
    await page.goto(url + '#<img%20src=x%20onerror=alert(1)>');
    assert.equal(await page.locator('#page-count').innerText(), '01 / 30');
  } finally { await page.close(); }
});

test('当前48份业务与流程图像均可离线打开，缩放关闭保持原页',async()=>{
 const page=await browser.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'}),seen=new Set(),errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 async function open(trigger){
  await trigger.click();await page.waitForFunction(()=>{const i=document.getElementById('original-image');return !i.hidden&&i.complete&&i.naturalWidth>0;});
  seen.add(await page.locator('#original-image').getAttribute('src'));
  if(seen.size===1){const before=await page.locator('#original-image').evaluate(i=>i.clientWidth);await page.getByRole('button',{name:'放大原件',exact:true}).click();assert((await page.locator('#original-image').evaluate(i=>i.clientWidth))>before*1.4);await page.getByRole('button',{name:'适应窗口',exact:true}).click();}
  await page.keyboard.press('Escape');assert.equal(await page.locator('#image-dialog').evaluate(d=>d.open),false);
 }
 try{
  for(let n=1;n<=30;n++){
   await page.goto(url+'#p'+n);if(n===3)await page.getByRole('tab',{name:'政策文件',exact:true}).click();
   if(n===6)for(const name of ['查看完整原件：中标通知书','查看完整原件：项目合同'])await open(page.getByRole('button',{name,exact:true}));
   if(n===5)for(let i=0;i<5;i++){await page.locator('.policy-choice').nth(i).click();await open(page.getByRole('button',{name:'查看完整政策文件',exact:true}));}
   if(n===4)await open(page.getByRole('button',{name:'查看原件',exact:true}));
   if(n===7)await open(page.getByRole('button',{name:'查看流程原图',exact:true}));
   for(const control of await page.locator('.document-board .image-button').all())await open(control);
   if(n===20)await page.getByRole('button',{name:'政策文件',exact:true}).click();
   for(let i=0;i<await page.locator('.gallery-tabs button').count();i++){await page.locator('.gallery-tabs button').nth(i).click();await open(page.locator('.gallery-spread .image-button'));}
   assert.equal(await page.locator('#page-count').innerText(),String(n).padStart(2,'0')+' / 30');
  }
  assert.equal(seen.size,48);assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 }finally{await page.close();}
});

test('七章目录与29页可查找，空结果有反馈，原稿资料入口已移除', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url + '#p21');
    assert.equal(await page.locator('#sources-button,#sources-dialog').count(),0);
    await page.getByRole('button', { name: '全部页面', exact: true }).click();
    assert.equal(await page.locator('.contents-entry').count(), 30);
    await page.getByRole('searchbox').fill('不存在的标题');
    assert.match(await page.locator('#contents-list').innerText(), /没有匹配页面/);
    await page.getByRole('searchbox').fill('内部审核分工');
    await page.locator('.contents-entry').click();
    assert.equal(await page.locator('#page-count').innerText(), '21 / 30');
    for (const [chapter, expected] of [['调查过程','07 / 30'],['专家论证','19 / 30'],['项目审核','20 / 30'],['项目公告','24 / 30'],['项目登簿','27 / 30'],['项目概况','03 / 30']]) {
      await page.getByRole('button', { name: chapter, exact: true }).click();
      assert.equal(await page.locator('#page-count').innerText(), expected);
    }
  } finally { await page.close(); }
});

test('讲解流程支持暂停、继续、逐步、重播、跳过及离页中断', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' });
  try {
    await page.goto(url + '#p16');
    await page.getByRole('button', { name: '播放演示', exact: true }).click();
    await page.waitForTimeout(1700);
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const saved = await page.locator('.db-cinema').getAttribute('data-phase');
    await page.waitForTimeout(1700);
    assert.equal(await page.locator('.db-cinema').getAttribute('data-phase'), saved);
    await page.getByRole('button', { name: '继续', exact: true }).click();
    await page.getByRole('button', { name: '跳过', exact: true }).click();
    assert.equal(await page.locator('.db-cinema').getAttribute('data-phase'), '3');
    await page.getByRole('button', { name: '重播', exact: true }).click();
    await page.waitForFunction(()=>document.querySelector('.db-cinema').dataset.phase==='0');
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    assert.equal(await page.locator('.db-cinema').getAttribute('data-phase'), '1');
    await page.getByRole('button', { name: '操作说明', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#pause-button').getAttribute('aria-pressed'), 'true');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#page-count').innerText(), '24 / 30');
    assert.equal(await page.locator('#slide-title').count(), 1);
  } finally { await page.close(); }
});

test('静态模式与系统减少动态效果保留全部内容，流程可直接分步', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url + '#p20');
    assert.equal(await page.locator('#static-button').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#play-button').isDisabled(), true);
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    assert.match(await page.locator('#step-description').innerText(), /第2步/);
    assert.equal(await page.locator('.process-node').count(), 4);
    assert.match(await page.locator('.slide-lead').innerText(), /省本级/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#static-button').click();
    assert.equal(await page.locator('#static-button').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('a');
    assert.equal(await page.locator('#static-button').getAttribute('aria-pressed'), 'false');
  } finally { await page.close(); }
});

test('全屏能进入并退出，地图聚焦和成果专题能切换', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  try {
    await page.goto(url + '#p4');
    await page.getByRole('button', { name: '英那河 庄河市', exact: true }).click();
    assert.match(await page.locator('.map-attribute-marker:not(.river-label-dimmed)').innerText(), /英那河[\s\S]*庄河市/);
    await page.getByRole('button', { name: '全部 五条河流总览', exact: true }).click();
    await page.getByRole('button', { name: '全屏', exact: true }).click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.getByRole('button', { name: '退出全屏', exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.goto(url + '#p18');
    await page.getByRole('button', { name: '碧流河 · 水流资源专题图', exact: true }).click();
    assert.equal(await page.locator('.gallery-caption').innerText(), '碧流河 · 水流资源专题图');
  } finally { await page.close(); }
});

test('桌面、大屏及小屏全部29页无内容越界，按需保存画面证据', async () => {
  const capture = process.env.RIVER_ATLAS_CAPTURE === '1';
  const captureDir = path.join(root, '.impeccable/review'); fs.mkdirSync(captureDir, { recursive: true });
  const failures = [], errors = [];
  const selected = [1,5,6,8,9,15,16,17,19,21,26,29];
  for (const [width,height] of [[1366,768],[1920,1080],[2560,1440],[3840,2160],[3440,1440],[390,844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion:'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    try {
      for (let p = 1; p <=30; p++) {
        await page.goto(url + '#p' + p);
        await page.locator('#slide-title').waitFor();
        await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('#presentation img')].map(i => i.decode().catch(() => {}))); });
        const bounds = await page.evaluate(() => {
          const content = document.querySelector('.slide-content');
          if (!content) return [];
          const r = content.getBoundingClientRect(), out = [];
          for (const n of content.querySelectorAll('h2,p,td,th,.gallery-tabs,.map-controls,.process-node')) {
            const b = n.getBoundingClientRect();
            const window=n.closest('.notice-table-window,.outfall-table-scroll'),scrollable=window&&window.scrollWidth>window.clientWidth;
            if (b.width && (b.bottom > r.bottom + 3 || !scrollable&&(b.right > r.right + 3 || b.left < r.left - 3))) out.push(n.textContent.slice(0,70));
            if(scrollable){const w=window.getBoundingClientRect();if(w.right>r.right+3||w.left<r.left-3)out.push('公告表格滚动容器越界');}
          }
          if (document.documentElement.scrollWidth > window.innerWidth + 2) out.push('horizontal page overflow');
          return out;
        });
        if (bounds.length) failures.push({width,height,page:p,bounds});
        if (capture && ((width === 1920) || selected.includes(p))) {
          await page.screenshot({ path: path.join(captureDir, `screen-${width}-p${String(p).padStart(2,'0')}.png`), fullPage:true });
        }
        if (capture && p===1 && width===1920) await page.screenshot({path:path.join(captureDir,'desktop.png'),fullPage:true});
        if (capture && p===1 && width===390) await page.screenshot({path:path.join(captureDir,'mobile.png'),fullPage:true});
      }
    } finally { await page.close(); }
  }
  fs.writeFileSync(path.join(root,'docs/layout-check.json'), JSON.stringify({failures,errors},null,2));
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
});
