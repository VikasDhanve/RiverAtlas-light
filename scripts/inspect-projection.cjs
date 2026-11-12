const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{pathToFileURL}=require('url');const root=path.resolve(__dirname,'..'),out=root+'/backups/light-projection-20261112';
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1920,height:1080},offline:true,reducedMotion:'reduce'}),errors=[],remote=[],pages=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
try{for(let n=1;n<=30;n++){await p.goto(pathToFileURL(root+'/index.html').href+'#p'+n);await p.evaluate(async()=>Promise.all([...document.querySelectorAll('#presentation img')].map(i=>i.decode().catch(()=>{}))));
 const result=await p.evaluate(()=>{
  const rgba=s=>{const m=s.match(/[\d.]+/g);return m?[...m.slice(0,3).map(Number),m.length>3?+m[3]:1]:[0,0,0,0]};
  const blend=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3]));const lum=a=>a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const lows=[];let checked=0;for(const node of document.querySelectorAll('#presentation *, .topbar *, .toolbar *')){
   if(![...node.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||node.matches('button:disabled,button:disabled *')||node.closest('[hidden],[aria-hidden="true"]'))continue;
   const rect=node.getBoundingClientRect(),s=getComputedStyle(node);if(!rect.width||!rect.height||s.display==='none'||s.visibility==='hidden')continue;
   const chain=[];let a=node;while(a){chain.push(a);a=a.parentElement;}let bg=[243,247,250];for(const el of chain.reverse()){const c=rgba(getComputedStyle(el).backgroundColor);if(c[3])bg=blend(c,bg);}
   const raw=rgba(node instanceof SVGElement?s.fill:s.color);if(!raw[3])continue;let fg=blend(raw,bg);let opacity=1;for(const el of chain)opacity*=+getComputedStyle(el).opacity;fg=fg.map((v,i)=>v*opacity+bg[i]*(1-opacity));const aa=lum(fg),bb=lum(bg),contrast=(Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05);checked++;
   if(contrast<4.5)lows.push({tag:node.tagName,class:node.getAttribute('class'),text:node.textContent.trim().slice(0,55),color:s.color,fill:s.fill,bg:s.backgroundColor,ratio:+contrast.toFixed(2),opacity});
  }return {title:document.getElementById('slide-title').textContent,count:document.getElementById('page-count').textContent,checked,lows};
 });pages.push({page:n,...result});await p.screenshot({path:out+'/p'+String(n).padStart(2,'0')+'.png'});}
fs.writeFileSync(out+'/contrast-audit.json',JSON.stringify({pages,errors,remote},null,2));console.log(JSON.stringify({pages:pages.length,checked:pages.reduce((a,p)=>a+p.checked,0),low:pages.reduce((a,p)=>a+p.lows.length,0),errors,remote,findings:pages.filter(p=>p.lows.length).map(p=>({page:p.page,lows:p.lows}))}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
