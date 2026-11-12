'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),c={};
vm.runInNewContext(['source','content'].map(n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')).join('\n')+';this.slides=RiverAtlasSlides;this.chapters=RiverAtlasChapters;this.source=RiverAtlasSource;',c);
test('1107事实更新、缺项及原稿41页去向完整且不混入旧长度或资质',()=>{
 const {slides,chapters,source}=c,m=JSON.parse(fs.readFileSync(path.join(root,'docs/source-manifest-1107.json'),'utf8'));
 assert.equal(slides.length,30);assert.equal(chapters.length,7);assert.equal(chapters[1],'调查过程');assert.equal(chapters[6],'工作总结');
 assert.deepEqual(Array.from(slides.find(s=>s.layout==='map').riverAttributes,r=>r[1]),['26.77','92.62','39.39','85.37','78.53']);
 assert.deepEqual([...new Set(slides.flatMap(s=>Array.from(s.sources)))].sort((a,b)=>a-b),Array.from({length:41},(_,i)=>i+1).filter(n=>![16,21].includes(n)));
 for(const original of m.slides)assert.deepEqual(original.presentationPages,Array.from(slides.flatMap((s,i)=>s.sources.includes(original.page)?[i+1]:[])));
 assert.equal(slides[28].title,'工作总结');assert.equal(slides[28].points.length,3);
 assert.equal(slides[7].table.rows.length,8);assert.match(JSON.stringify(slides[8].points),/2023/);
 assert.match(slides.find(s=>s.title==='外部审核').points[1][1],/未提供/);
 assert.match(slides.find(s=>s.sources.includes(32)).note,/省内.*广西/);
 assert(!source.assets.some(a=>a.id===32));assert(!source.assets.some(a=>a.id>=201&&a.id<=208));
 assert.doesNotMatch(JSON.stringify(slides),/28\.4|82\.4|39\.6|62\.1|70\.9|划清四类边界/);
 for(const a of source.assets.filter(a=>a.path.startsWith('assets/revision-1107/'))){
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.path))).digest('hex');
  assert.equal(hash,a.sha256);assert(m.assets.some(original=>original.sha256===hash),'新图必须来自1107原件');
 }
});
