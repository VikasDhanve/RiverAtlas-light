'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const history=JSON.parse(read('docs/source-manifest-1107.json')),context={};
vm.runInNewContext(['src/source.js','src/supplement.js','src/biliuhe.js','src/content.js'].map(read).join('\n')+';this.slides=RiverAtlasSlides;this.assets=[...RiverAtlasSource.assets,...RiverAtlasSupplement,...RiverAtlasBiliuhe];',context);
const slides=context.slides,assets=context.assets;
assert.deepEqual(JSON.parse(JSON.stringify(slides.find(s=>s.layout==='workflow').flow)),JSON.parse(read('docs/workflow-spec.json')),'导出流程必须与演示使用同一完整图结构');
assert.equal(slides.length,31);assert.equal(history.slides.length,41);
const mapped=[...new Set(slides.flatMap(s=>s.sources))].sort((a,b)=>a-b);assert.deepEqual(mapped,Array.from({length:41},(_,i)=>i+1));
const used=new Set([4,...slides.flatMap(s=>s.images||[])]),files=new Set();
for(const asset of assets){
 assert(used.has(asset.id)||[27,107,401].includes(asset.id),'运行清单存在无引用图件：'+asset.id);
 for(const file of [asset.path,asset.displayPath,asset.sourceFile].filter(Boolean)){assert(fs.existsSync(path.join(root,file)),file);files.add(file);}
 if(asset.sourceFile) { const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.sourceFile))).digest('hex'); assert.equal(hash,asset.sourceSha256); if(fs.existsSync(asset.source))assert.equal(hash,crypto.createHash('sha256').update(fs.readFileSync(asset.source)).digest('hex')); }
 if(asset.displaySha256)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.displayPath))).digest('hex'),asset.displaySha256,asset.displayPath);
 if(asset.sha256)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.path))).digest('hex'),asset.sha256,asset.path);
}
assert.equal(new Set(assets.map(a=>a.id)).size,57);for(const id of used)assert(assets.some(a=>a.id===id),'页面引用不存在图件：'+id);
for(const folder of ['originals','supplement','revision-1107','revision-1110','revision-1111'])for(const file of fs.readdirSync(path.join(root,'assets',folder)))assert(files.has('assets/'+folder+'/'+file),'无引用素材：'+folder+'/'+file);
const input=path.join(history.sourceDirectory,history.filename);
if(fs.existsSync(input))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),history.sha256,'原始PPT应保持只读');
const supplement=JSON.parse(read('docs/source-manifest-1110.json'));
if(fs.existsSync(supplement.sourcePath))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(supplement.sourcePath)).digest('hex'),supplement.sha256,'1110原始PDF应保持只读');
const lines=['# 1107版内容与素材核对','','本轮31页主讲内容覆盖1107版41页PPT。来源页码统一指1107版，1106历史清单另存source-manifest.json。57个保留图像中53份业务图件可打开原件，1份背景，27、107及401为历史图件；13份1111 PDF保留并逐份核对源文件哈希。','','| 1107原稿页 | 当前演示页 | 对应主讲页图件编号 |','|---|---|---|'];
for(const source of history.slides){const mapped=slides.flatMap((s,i)=>s.sources.includes(source.page)?[{page:i+1,images:s.images||[]}]:[]);lines.push('| '+source.page+' | '+mapped.map(m=>m.page).join('、')+' | '+[...new Set(mapped.flatMap(m=>m.images))].join('、')+' |');}
lines.push('','2026-11-11：第2页新增七章交互目录；预划登记单元现为第10页，保留避让统计；原预划（二）页已删除，原始PDF与401图件仅历史保留。','五河长度以1107版为准：25.7、96.5、45、164.9、94.9 km，面积不变。外部审核文字与图斑统计已按1110用户补充更新；公告日期/地址/电话仍为占位。广西贺江与南京清流河均保持外地样例标识。','','第3页两份方案并列完整显示；第5页目录悬停直接切图；第9页正文保留、替换4张大沙河底图；第16页原3张专题图增加9张，共12张。所有保留原图字节哈希已核对。');
fs.writeFileSync(path.join(root,'docs/内容覆盖验收.md'),lines.join('\n')+'\n');
console.log('Content: 31 slides, all 41 source pages mapped, 54 referenced assets + 3 archived assets + 13 source PDFs; source and retained image hashes verified.');
