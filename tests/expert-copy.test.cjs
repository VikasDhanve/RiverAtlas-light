'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
test('第19页完整表达PPT第22页的组织单位、项目与参会专家（按最新文案修订）',async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'});
 try{
  await p.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'#p19');
  const text=await p.locator('#presentation').innerText();
  for(const phrase of ['2025年12月4日','大连市自然资源局组织有关专家','大连市自然资源统一确权登记工作市级确权项目','参加会议的专家有：水务中心专家、空间规划专家以及社会专家。'])assert(text.includes(phrase),phrase);
  assert.equal(await p.locator('.document-board img').count(),3);
 }finally{await b.close();}
});
