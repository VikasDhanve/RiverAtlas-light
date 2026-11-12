/* 本地静态演示。所有来源文本均以DOM textContent显示，不解析用户HTML。 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = RiverAtlasSource;
  const slides = RiverAtlasSlides;
  const assets = new Map([...source.assets, ...RiverAtlasSupplement, ...RiverAtlasBiliuhe].map(a => [a.id, a]));
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pageIndex = parseHash(), currentStep = 0, timeline = null;
  let landscape = null, activeGallery = null, mediaTween = null, stepTween = null, exhibitView = null, workflowView=null;
  let paused = false, manualStatic = false, imageId = null, zoom = 1, fittedWidth = 0, messageTimer;
  let loupe=null,loupeImage=null,loupeMark=null,loupeFrame=0,loupeTarget=null,loupePoint=null;
  let lastMousePoint=null;const loupeMoves=new WeakSet();
  const motionOff = () => reduceQuery.matches || manualStatic || typeof gsap === 'undefined';
  const starfield=null;
  const pad = n => String(n).padStart(2, '0');
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, action, className = '') {
    const n = el('button', className, text);
    n.type = 'button'; n.addEventListener('click', action); return n;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(svg.namespaceURI, 'path');
    p.setAttribute('d', { team:'M8 8a3 3 0 1 0 0-.01M2 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m0 3a5 5 0 0 1 5 5v2', shield:'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7ZM8 12l3 3 5-6', board:'M3 4h18v13H3ZM7 8h10M7 12h7M7 17v4m10-4v4', browser:'M3 4h18v16H3ZM3 9h18M6 6.5h.1m3 0h.1M7 13h10M7 16h6', calendar:'M4 5h16v16H4ZM8 2v6m8-6V2M4 10h16M8 14h2m4 0h2m-8 3h2m4 0h2', prev:'M14 5 7 12l7 7', next:'m10 5 7 7-7 7', help:'M9.3 8.5a3 3 0 0 1 5.7 1.3c0 2-3 2-3 4.2m0 3.5v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0' }[name]);
    svg.append(p); return svg;
  }
  function parseHash() {
    const m = /^#p(\d+)$/.exec(location.hash);
    const n = m ? Number(m[1]) : 1;
    return Number.isFinite(n) ? Math.max(0, Math.min(slides.length - 1, n - 1)) : 0;
  }
  function notify(text) {
    clearTimeout(messageTimer); $('message').textContent = text; $('message').classList.add('visible');
    messageTimer = setTimeout(() => $('message').classList.remove('visible'), 4500);
  }
  function fitStage() {
    if (window.innerWidth < 768) return;
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    document.documentElement.style.setProperty('--stage-scale', scale);
    document.documentElement.style.setProperty('--stage-left', (window.innerWidth - 1600 * scale) / 2 + 'px');
    document.documentElement.style.setProperty('--stage-top', (window.innerHeight - 900 * scale) / 2 + 'px');
  }
  function copyPoints(points, className = 'copy-column') {
    const c = el('div', className);
    for (const [heading, text] of points || []) {
      const item = el('section', 'copy-point'); item.append(el('h2', '', heading), el('p', '', text)); c.append(item);
    }
    return c;
  }
  function assetImage(id, className = '', display = false) {
    const a = assets.get(id); if (!a) return el('p', '', '原件未找到，请核对配套资源。');
    const img = el('img', className); img.src = display && a.displayPath ? a.displayPath : a.path; img.alt = RiverAtlasCaptions[id] || a.caption || '原稿图像';
    img.decoding = 'async'; img.dataset.asset = id;
    if (a.rotation) img.style.transform = 'rotate(' + a.rotation + 'deg)';
    img.addEventListener('error', () => notify('图像加载失败，请保留完整assets配套目录并重新打开。'));
    return img;
  }
  function hideLoupe(){
    cancelAnimationFrame(loupeFrame);loupeFrame=0;loupeTarget=null;loupePoint=null;
    loupe?.remove();loupe=null;loupeImage=null;loupeMark=null;
  }
  function moveLoupe(event,img){
    if(event.pointerType!=='mouse'||!loupeMoves.has(event)||!matchMedia('(hover: hover) and (pointer: fine)').matches||document.querySelector('dialog[open]')||!img.naturalWidth)return;
    loupeTarget=img;loupePoint={x:event.clientX,y:event.clientY};
    if(!loupe){
      loupe=el('div','media-loupe');loupe.id='media-loupe';loupe.setAttribute('aria-hidden','true');
      const surface=el('div','media-loupe-surface'),windowEl=el('div','media-loupe-window'),footer=el('div','media-loupe-footer');
      loupeImage=el('img');loupeImage.alt='';loupeImage.src=img.currentSrc||img.src;
      loupeMark=el('span','media-loupe-reticle');windowEl.append(loupeImage,loupeMark);
      footer.append(el('span','',img.alt),el('strong','','2.5×'));surface.append(windowEl,footer);loupe.append(surface);document.body.append(loupe);
    }
    if(loupeFrame)return;
    loupeFrame=requestAnimationFrame(()=>{
      loupeFrame=0;if(!loupe||!loupeTarget?.isConnected||!loupePoint)return;
      const rect=loupeTarget.getBoundingClientRect(),point=loupePoint;
      const width=Math.max(280,Math.min(480,300*(Number(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale'))||1)));
      const height=Math.round(width*.68),totalHeight=height+32,magnification=2.5;
      loupe.style.width=width+'px';loupe.style.setProperty('--loupe-height',height+'px');
      const left=Math.max(12,Math.min(innerWidth-width-12,point.x+width+32<innerWidth?point.x+28:point.x-width-28));
      const top=Math.max(12,Math.min(innerHeight-totalHeight-12,point.y-totalHeight*.42));
      loupe.style.transform=`translate3d(${left}px,${top}px,0)`;
      const cover=getComputedStyle(loupeTarget).objectFit==='cover';
      const imageScale=cover?Math.max(rect.width/loupeTarget.naturalWidth,rect.height/loupeTarget.naturalHeight):1;
      const imageWidth=cover?loupeTarget.naturalWidth*imageScale:rect.width,imageHeight=cover?loupeTarget.naturalHeight*imageScale:rect.height;
      const x=Math.max(0,Math.min(rect.width,point.x-rect.left))+(imageWidth-rect.width)/2;
      const y=Math.max(0,Math.min(rect.height,point.y-rect.top))+(imageHeight-rect.height)/2;
      const scaledWidth=imageWidth*magnification,scaledHeight=imageHeight*magnification;
      const offsetX=Math.max(Math.min(0,width-scaledWidth),Math.min(0,width/2-x*magnification));
      const offsetY=Math.max(Math.min(0,height-scaledHeight),Math.min(0,height/2-y*magnification));
      loupeImage.style.width=scaledWidth+'px';loupeImage.style.height=scaledHeight+'px';loupeImage.style.transform=`translate3d(${offsetX}px,${offsetY}px,0)`;
      loupeMark.style.transform=`translate(${x*magnification+offsetX}px,${y*magnification+offsetY}px)`;
    });
  }
  function gallery(ids, autoAdvance=0) {
    const c = el('div', 'gallery'), spread = el('div', 'gallery-spread');
    const caption = el('p', 'gallery-caption'), tabs = el('div', 'gallery-tabs');
    const sourceLink = button('查看原图', () => openImage(active), 'gallery-source');
    sourceLink.hidden = !ids.some(id => assets.get(id).sourceFile);
    const footer = el('div', 'gallery-footer'); footer.append(caption, sourceLink);
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '选择业务图像');
    let active = ids[0],autoTimer=null,autoProgress=null,manual=false,disposed=false;
    const auto=autoAdvance===2000,autoToggle=button('暂停轮播',()=>{manual=!manual;syncAuto();},'gallery-auto-toggle');
    if(auto){c.classList.add('gallery-auto');footer.append(autoToggle);}
    function stopAuto(){clearTimeout(autoTimer);autoTimer=null;autoProgress?.cancel();autoProgress=null;c.dataset.autoplay='false';}
    function syncAuto(){
      autoToggle.textContent=manual?'继续轮播':'暂停轮播';autoToggle.setAttribute('aria-pressed',String(manual));
      if(!auto||disposed||manual||paused||motionOff()||document.hidden||!c.getClientRects().length){stopAuto();return;}
      if(autoTimer)return;c.dataset.autoplay='true';
      autoProgress=tabs.querySelector('[aria-pressed="true"] .gallery-thumb-progress').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:2000,easing:'linear',fill:'forwards'});
      autoTimer=setTimeout(()=>{autoTimer=null;autoProgress?.cancel();autoProgress=null;if(disposed)return;select(ids[(ids.indexOf(active)+1)%ids.length]);syncAuto();},2000);
    }
    function manualSelect(id){stopTimeline();if(auto){manual=true;syncAuto();}if(active!==id)select(id);}
    function fit() {
      const sheet=spread.firstElementChild,img=sheet?.firstElementChild;
      if(!img?.naturalWidth||!spread.clientHeight)return;
      const scale=Math.min(spread.clientWidth/img.naturalWidth,spread.clientHeight/img.naturalHeight);
      sheet.style.width=img.naturalWidth*scale+'px';sheet.style.height=img.naturalHeight*scale+'px';
    }
    function select(id, animate = true) {
      hideLoupe();
      const direction=ids.indexOf(id)>=ids.indexOf(active)?1:-1;
      active = id;
      mediaTween?.progress(1).kill();
      spread.replaceChildren(...[id].map(asset => {
        const b = button('', () => openImage(asset), 'image-button');
        if ([24,25,26,33,34].includes(asset)) b.classList.add('photo-surface');
        b.dataset.asset = asset; b.setAttribute('aria-label', '查看原件：' + (RiverAtlasCaptions[asset] || assets.get(asset).caption));
        const img=assetImage(asset,'',true);img.addEventListener('load',fit);
        b.addEventListener('pointermove',event=>moveLoupe(event,img));b.addEventListener('pointerleave',hideLoupe);
        b.append(img);return b;
      }));
      caption.textContent = RiverAtlasCaptions[id] || assets.get(id).caption;
      for (const b of tabs.children) b.setAttribute('aria-pressed', String(Number(b.dataset.asset) === id));
      if(auto){const b=tabs.querySelector('[aria-pressed="true"]');if(b)tabs.scrollTo({left:Math.max(0,b.offsetLeft-tabs.clientWidth/2+b.clientWidth/2),behavior:motionOff()?'instant':'smooth'});}
      if (animate && !motionOff() && !paused) {
        mediaTween = gsap.fromTo(spread.children, { opacity:.45, x:direction*28, scale:.985, clipPath:direction>0?'inset(0 0 0 9%)':'inset(0 9% 0 0)' },
          { opacity:1, x:0, scale:1, clipPath:'inset(0 0 0 0)', duration:.28, ease:'power3.out', clearProps:'transform,opacity,clipPath' });
      }
      fit();
    }
    ids.forEach((id, i) => {
      const label = RiverAtlasCaptions[id] || assets.get(id).caption;
      const b = button('', () => manualSelect(id));
      b.addEventListener('pointerenter',event=>{
        if(event.pointerType!=='mouse'||!matchMedia('(hover: hover) and (pointer: fine)').matches)return;
        manualSelect(id);
      });
      b.append(assetImage(id,'gallery-thumbnail',true),el('span','gallery-tab-number',pad(i+1)));if(auto)b.append(el('span','gallery-thumb-progress'));
      b.dataset.asset = id; b.title = label; b.setAttribute('aria-label', label); tabs.append(b);
    });
    const tools = el('div', 'gallery-tools');
    const focus = button('专注图件', () => {
      const layout = c.closest('.gallery-layout'); if (!layout) return;
      const on = layout.dataset.focus !== 'true'; layout.dataset.focus = String(on);
      layout.closest('.slide')?.classList.toggle('media-focus',on);
      focus.textContent = on ? '显示讲解' : '专注图件'; focus.setAttribute('aria-pressed', String(on));
      fit();
    }, 'focus-media'); focus.setAttribute('aria-pressed','false');
    const previous=button('',()=>manualSelect(ids[(ids.indexOf(active)+ids.length-1)%ids.length]),'gallery-previous');previous.append(icon('prev'));previous.setAttribute('aria-label','上一张图件');
    const next=button('',()=>manualSelect(ids[(ids.indexOf(active)+1)%ids.length]),'gallery-next');next.append(icon('next'));next.setAttribute('aria-label','下一张图件');
    tools.append(previous,tabs,next,focus);c.append(spread,tools,footer);select(active,false);
    activeGallery = { element:c, ids, select, refit:fit,setState:syncAuto,destroy:()=>{disposed=true;stopAuto();},finish:()=>{if(auto){manual=true;syncAuto();}},play:auto?()=>{stopAuto();manual=false;select(ids[0],false);syncAuto();}:null };
    return c;
  }
  function renderBasemap(s) {
    const layout=el('div','gallery-layout basemap-layout'),reader=el('div','gallery eagle-reader');layout.dataset.focus='false';
    if([15,17].includes(s.images[0]))layout.classList.add('eagle-natural-copy');
    const views=el('div','eagle-views'),overview=el('section','eagle-overview'),detail=el('section','eagle-detail');
    const spread=el('div','gallery-spread'),overviewButton=button('',()=>openImage(active),'image-button eagle-sheet');
    const lens=el('span','eagle-lens'),viewport=el('div','eagle-viewport'),detailImage=assetImage(s.images[0]);
    viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','局部放大，方向键移动视角');
    overviewButton.setAttribute('aria-label','查看完整原件');lens.setAttribute('aria-hidden','true');
    const zoomTools=el('div','eagle-zoom'),level=el('output'),tabs=el('div','gallery-tabs'),footer=el('div','gallery-footer'),caption=el('p','gallery-caption');
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','选择业务图像');
    let active=s.images[0],overviewImage=null,cx=.5,cy=.4,factor=1,fitBoth=false;
    let autoTimer=null,progress=null,skipped=false,disposed=false;
    const auto=s.autoAdvance===2000,autoToggle=button('跳过动画',()=>{skipped=!skipped;syncAuto();},'eagle-autoplay-toggle');
    function stopAuto(){clearTimeout(autoTimer);autoTimer=null;progress?.cancel();progress=null;reader.dataset.autoplay='false';}
    function syncAuto(){
      autoToggle.textContent=skipped?'恢复自动':'跳过动画';autoToggle.setAttribute('aria-pressed',String(skipped));
      if(!auto||disposed||skipped||paused||motionOff()||document.hidden){stopAuto();return;}
      if(autoTimer)return;
      reader.dataset.autoplay='true';
      const selected=tabs.querySelector('[aria-pressed="true"]');
      progress=selected.querySelector('.eagle-thumb-progress').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:2000,easing:'linear',fill:'forwards'});
      autoTimer=setTimeout(()=>{autoTimer=null;progress?.cancel();progress=null;if(disposed)return;select(s.images[(s.images.indexOf(active)+1)%s.images.length]);syncAuto();},2000);
    }
    function manualSelect(id){stopTimeline();if(auto){skipped=true;syncAuto();}if(active!==id)select(id);}
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    function fit(){
      if(!overviewImage?.naturalWidth||!viewport.clientWidth)return;
      const nw=overviewImage.naturalWidth,nh=overviewImage.naturalHeight;
      const miniScale=Math.min(spread.clientWidth/nw,spread.clientHeight/nh),mw=nw*miniScale,mh=nh*miniScale;
      overviewButton.style.width=mw+'px';overviewButton.style.height=mh+'px';
      const scale=fitBoth?Math.min(viewport.clientWidth/nw,viewport.clientHeight/nh):viewport.clientWidth/nw*factor;
      const w=nw*scale,h=nh*scale,vw=viewport.clientWidth,vh=viewport.clientHeight;
      const x=w>vw?clamp(cx*w-vw/2,0,w-vw):0,y=h>vh?clamp(cy*h-vh/2,0,h-vh):0;
      detailImage.style.width=w+'px';detailImage.style.height=h+'px';
      detailImage.style.transform=`translate3d(${w<vw?(vw-w)/2:-x}px,${h<vh?(vh-h)/2:-y}px,0)`;
      lens.style.cssText=`left:${x/w*mw}px;top:${y/h*mh}px;width:${Math.min(1,vw/w)*mw}px;height:${Math.min(1,vh/h)*mh}px`;
      level.textContent=Math.round(scale/(vw/nw)*100)+'%';
      viewport.dataset.center=cx.toFixed(3)+','+cy.toFixed(3);
    }
    function point(event){
      if(event.pointerType!=='mouse'&&event.type==='pointermove'&&!event.buttons)return;
      const r=overviewButton.getBoundingClientRect();cx=clamp((event.clientX-r.left)/r.width,0,1);cy=clamp((event.clientY-r.top)/r.height,0,1);fit();
    }
    overviewButton.addEventListener('pointermove',point);overviewButton.addEventListener('pointerdown',point);
    viewport.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'&&!event.buttons)return;
      const r=viewport.getBoundingClientRect();cx=clamp((event.clientX-r.left)/r.width,0,1);cy=clamp((event.clientY-r.top)/r.height,0,1);fit();
    });
    viewport.addEventListener('keydown',event=>{
      const moves={ArrowLeft:[-.06,0],ArrowRight:[.06,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]};
      if(!moves[event.key])return;event.preventDefault();event.stopPropagation();cx=clamp(cx+moves[event.key][0],0,1);cy=clamp(cy+moves[event.key][1],0,1);fit();
    });
    function select(id){
      hideLoupe();active=id;cx=.5;cy=.4;
      overviewImage=assetImage(id,'',true);overviewImage.addEventListener('load',fit);
      overviewButton.replaceChildren(overviewImage,lens);overviewButton.dataset.asset=id;
      detailImage.src=assets.get(id).path;detailImage.alt=overviewImage.alt;detailImage.dataset.asset=id;detailImage.addEventListener('load',fit,{once:true});
      caption.textContent=RiverAtlasCaptions[id]||assets.get(id).caption;
      for(const b of tabs.children)b.setAttribute('aria-pressed',String(Number(b.dataset.asset)===id));
      const selected=tabs.querySelector('[aria-pressed="true"]');if(auto&&selected)tabs.scrollTo({left:Math.max(0,selected.offsetLeft-tabs.clientWidth/2+selected.clientWidth/2),behavior:motionOff()?'instant':'smooth'});fit();
    }
    s.images.forEach((id,i)=>{
      const b=button('',()=>manualSelect(id));b.dataset.asset=id;
      b.setAttribute('aria-label',RiverAtlasCaptions[id]||assets.get(id).caption);
      b.append(assetImage(id,'gallery-thumbnail',true),el('span','gallery-tab-number',pad(i+1)));if(auto)b.append(el('span','eagle-thumb-progress'));
      b.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)manualSelect(id);});tabs.append(b);
    });
    function changeZoom(delta){factor=clamp((fitBoth?1:factor)+delta,1,3);fitBoth=false;fit();}
    zoomTools.append(button('−',()=>changeZoom(-.25),'eagle-zoom-out'),level,button('+',()=>changeZoom(.25),'eagle-zoom-in'),button('适应全图',()=>{fitBoth=true;fit();}));
    zoomTools.querySelector('.eagle-zoom-out').setAttribute('aria-label','缩小局部视图');zoomTools.querySelector('.eagle-zoom-in').setAttribute('aria-label','放大局部视图');
    spread.append(overviewButton);if(s.showViewTitles!==false)overview.append(el('h2','','完整图件'));overview.append(spread);
    viewport.append(detailImage);if(s.showViewTitles!==false)detail.append(el('h2','','局部放大'));detail.append(viewport,zoomTools);views.append(overview,detail);
    const focus=button('专注图件',()=>{const on=layout.dataset.focus!=='true';layout.dataset.focus=String(on);layout.closest('.slide')?.classList.toggle('media-focus',on);focus.textContent=on?'显示讲解':'专注图件';focus.setAttribute('aria-pressed',String(on));fit();},'focus-media');focus.setAttribute('aria-pressed','false');
    const tools=el('div','eagle-tools');tools.append(focus);
    footer.append(tabs,caption);if(auto)footer.append(autoToggle);footer.append(button('查看原图',()=>openImage(active),'gallery-source'));
    reader.append(tools,views,footer);if(s.points?.length)layout.append(copyPoints(s.points),reader);else{layout.classList.add('eagle-image-only');layout.append(reader);}select(active);
    activeGallery={element:reader,ids:s.images,select,refit:fit,setState:syncAuto,destroy:()=>{disposed=true;stopAuto();},finish:()=>{if(auto){skipped=true;syncAuto();}},play:auto?()=>{stopAuto();skipped=false;select(s.images[0]);syncAuto();}:null};return layout;
  }

  function mediaLayout(s) {
    if(s.images?.[0]===501)return renderBasemap(s);
    const c = el('div', 'gallery-layout'); c.dataset.focus='false';
    c.append(copyPoints(s.points), gallery(s.images,s.autoAdvance)); return c;
  }
  function renderBackgroundTabs(s) {
    const layout=el('div','background-tabs-layout'),tabs=el('div','program-tabs');
    layout.style.cssText='height:100%;display:grid;grid-template-rows:auto minmax(0,1fr);gap:18px;min-height:0';
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','工作背景');
    const deployment=el('section','background-deployment'),documents=renderDocumentBoard(s),view=exhibitView;
    documents.style.minHeight='0';

    deployment.style.cssText='overflow:auto;padding:clamp(16px,2vw,36px);border:1px solid #88a5b6;border-radius:12px;background:#ffffffee';
    deployment.append(el('h2','','国家部署'));
    for(const text of ["开展自然资源统一确权登记，是深化生态文明体制改革、建设美丽中国、落实党中央治国理政新理念新思想新战略的一项重要举措，党中央、国务院高度重视。","为贯彻落实党中央、国务院关于生态文明建设决策部署，建立和实施自然资源统一确权登记制度，推进自然资源确权登记法治化，推动建立归属清晰、权责明确、保护严格、流转顺畅、监管有效的自然资源资产产权制度，实现山水林田湖草整体保护、系统修复、综合治理。辽宁省人民政府办公厅和大连市人民政府办公室先后印发了自然资源统一确权登记工作总体方案。"]) {
      const paragraph=el('p','',text);paragraph.style.cssText='font-size:clamp(18px,1.55vw,30px);line-height:1.9;margin:18px 0';deployment.append(paragraph);
    }
    const panels=[deployment,documents];
    function select(index) {
      panels.forEach((panel,i)=>{panel.hidden=i!==index;panel.style.display=i===index?(i===1?'grid':'block'):'none';});
      [...tabs.children].forEach((control,i)=>{control.setAttribute('aria-selected',String(i===index));control.setAttribute('aria-pressed',String(i===index));control.tabIndex=i===index?0:-1;});
      if(index===1)requestAnimationFrame(()=>view.refit());
    }
    ['国家部署','政策文件'].forEach((name,i)=>{
      const control=button(name,()=>select(i));control.id='background-tab-'+i;control.setAttribute('role','tab');control.setAttribute('aria-controls','background-panel-'+i);
      panels[i].id='background-panel-'+i;panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',control.id);
      control.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?0:event.key==='End'?1:1-i;select(next);tabs.children[next].focus();});tabs.append(control);
    });
    layout.append(tabs,...panels);select(0);
    exhibitView={...view,reset:()=>{select(0);view.reset();}};return layout;
  }
  function renderDocumentBoard(s) {
    const layout=el('div','gallery-layout'),board=el('div','document-board'),documents=[];
    if(s.interaction==='source-board'){
      layout.classList.add('source-board-layout');layout.dataset.board=s.board;
      board.dataset.count=String(s.images.length);
    }
    board.classList.toggle('single-document',s.images.length===1);
    function fit(){
      for(const {windowEl,control,img} of documents){
        const reference=s.board==='photos'?documents[0].img:img;
        if(!reference.naturalWidth||!windowEl.clientHeight)continue;
        if(s.board==='expert'&&control.classList.contains('photo-surface')){
          control.style.width=windowEl.clientWidth+'px';control.style.height=windowEl.clientHeight+'px';continue;
        }
        const scale=Math.min(windowEl.clientWidth/reference.naturalWidth,windowEl.clientHeight/reference.naturalHeight);
        control.style.width=reference.naturalWidth*scale+'px';control.style.height=reference.naturalHeight*scale+'px';
      }
    }
    for(const id of s.images){
      const label=RiverAtlasCaptions[id]||assets.get(id).caption,figure=el('figure','document-figure');
      const windowEl=el('div','document-window'),control=button('',()=>openImage(id),'image-button'),img=assetImage(id,'',s.board==='deliverables');
      control.dataset.asset=id;control.setAttribute('aria-label','查看原件：'+label);
      if([24,26,33,34].includes(id))control.classList.add('photo-surface');
      img.addEventListener('load',fit);control.addEventListener('pointermove',event=>moveLoupe(event,img));control.addEventListener('pointerleave',hideLoupe);
      control.append(img);windowEl.append(control);
      const caption=el('figcaption','',label);
      if(s.board==='protected-units'){
        caption.classList.add('document-original-caption');
        caption.append(button('查看原图',()=>openImage(id),'plain-button'));
      }
      figure.append(windowEl,caption);board.append(figure);
      documents.push({windowEl,control,img});
    }
    if(s.board==='announcement-sample')layout.append(board);
    if(s.board==='protected-units'){
      const copy=el('div','protected-unit-copy');
      const [principle,cases]=s.lead.split('其中');
      copy.append(el('p','protected-unit-principle',principle));
      for(const [index,text] of cases.split('；').entries())copy.append(el('p','protected-unit-case',(index===0?'其中':'')+text+(index===0?'；':'')));
      layout.append(copy);
    }
    if(s.table)layout.append(renderTable(s.table,'audit-table'));
    else if(s.points?.length)layout.append(copyPoints(s.points));
    if(s.board!=='announcement-sample')layout.append(board);
    exhibitView={refit:fit,resetLabel:'恢复原图',reset:()=>{hideLoupe();fit();}};
    return layout;
  }
  function renderPolicyLibrary(s) {
    const layout=el('div','policy-library'), directory=el('div','policy-directory');
    const reader=el('section','policy-reader');
    const windowEl=el('div','policy-window'), footer=el('div','policy-reader-footer');
    const entries=[
      {id:7,name:'《自然资源统一确权登记暂行办法》',title:'统一确权登记暂行办法',detail:'自然资源统一确权登记工作依据'},
      {id:8,name:'《自然资源统一确权登记操作指南（试行）》',title:'操作指南（试行）',detail:'自然资源统一确权登记'},
      {id:9,name:'《自然资源确权登记规程》',title:'自然资源确权登记规程',detail:'TD/T 1112—2025'},
      {id:10,name:'《辽宁省自然资源统一确权登记工作总体方案》',title:'辽宁省总体方案',detail:'自然资源统一确权登记工作总体方案'},
      {id:11,name:'《大连市自然资源统一确权登记工作总体方案》',title:'大连市总体方案',detail:'自然资源统一确权登记工作总体方案'}
    ];
    let active=9,motion=null,zoomTween=null,disposed=false;
    const controls=new Map(), sheets=new Map();
    function fit() {
      const sheet=sheets.get(active); if(!sheet)return;
      const img=sheet.firstElementChild; if(!img.naturalWidth || !windowEl.clientHeight)return;
      sheet.style.width=windowEl.clientWidth+'px';sheet.style.height=windowEl.clientHeight+'px';
    }
    function camera(scale) {
      const img=sheets.get(active)?.firstElementChild;if(!img)return;
      zoomTween?.kill();
      if(typeof gsap==='undefined')img.style.transform='scale('+scale+')';
      else if(motionOff()||paused)gsap.set(img,{scale});
      else zoomTween=gsap.to(img,{scale,duration:.25,ease:'power3.out',overwrite:true});
    }
    function select(id,animate=true) {
      if(disposed)return;
      motion?.kill();zoomTween?.kill();active=id;
      for(const item of entries) {
        const b=controls.get(item.id),sheet=sheets.get(item.id);sheet.hidden=item.id!==id;
        b.setAttribute('aria-current',String(item.id===id));b.setAttribute('aria-pressed',String(item.id===id));
      }
      const sheet=sheets.get(id);fit();
      if(typeof gsap!=='undefined') {
        gsap.set(sheet.firstElementChild,{scale:1});
        if(animate&&!motionOff()&&!paused)motion=gsap.fromTo(sheet,{opacity:.55,x:12},{opacity:1,x:0,duration:.28,ease:'power3.out'});
        else gsap.set(sheet,{opacity:1,x:0});
      }
    }
    for(const [title,items] of [['国家规范',entries.slice(0,3)],['省市方案',entries.slice(3)]]) {
      const group=el('section','policy-group');group.append(el('h2','',title));
      for(const item of items) {
        const b=button('',()=>select(item.id),'policy-choice');
        const text=el('span','policy-choice-text');text.append(el('span','policy-choice-name',item.name));
        if(item.id===9)text.append(el('span','policy-standard','TD/T 1112—2025'));
        b.append(text);b.dataset.asset=item.id;b.setAttribute('aria-label',item.name);
        b.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover) and (pointer: fine)').matches)select(item.id);});
        b.addEventListener('focus',()=>select(item.id,false));
        controls.set(item.id,b);group.append(b);
      }
      directory.append(group);
    }
    const support=el('section','policy-support');support.append(el('h2','','配套依据'),el('p','',s.points[2][1]));directory.append(support);
    entries.forEach(item=>{
      const sheet=el('div','policy-sheet'),img=assetImage(item.id);sheet.dataset.asset=item.id;sheet.hidden=item.id!==active;
      sheet.append(img);sheets.set(item.id,sheet);windowEl.append(sheet);
      img.addEventListener('load',fit);
      sheet.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover) and (pointer: fine)').matches)camera(1.42);});
      sheet.addEventListener('pointermove',event=>{
        const rect=sheet.getBoundingClientRect();
        const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
        img.style.transformOrigin=(x*100)+'% '+(y*100)+'%';
      });
      sheet.addEventListener('pointerleave',()=>camera(1));
    });
    footer.append(button('查看完整政策文件',()=>openImage(active),'policy-original'));
    reader.append(windowEl,footer);
    layout.append(directory,reader);
    exhibitView={resetLabel:'恢复默认',reset:()=>select(9),refit:fit,pause:()=>{motion?.pause();zoomTween?.pause();},resume:()=>{motion?.resume();zoomTween?.resume();},finish:()=>{motion?.progress(1).pause();zoomTween?.progress(1).pause();},destroy:()=>{disposed=true;motion?.kill();zoomTween?.kill();}};
    select(9,false);return layout;
  }
  function renderDocumentExhibit(s) {
    const layout=el('div','exhibit-layout'), stage=el('div','document-exhibit');
    layout.append(copyPoints(s.points),stage); stage.dataset.active='';
    let active=-1, pinned=-1, motion=null, disposed=false;
    const crops=[], cards=[], toggles=[];
    const definitions=[
      {id:5,title:'中标通知书',regions:[['承接内容',[.11,.065,.78,.385]],['签章与日期',[.13,.45,.74,.22]]]},
      {id:6,title:'项目合同',regions:[['合同名称',[.045,.10,.92,.16]],['签订信息',[.045,.735,.94,.215]]]}
    ];
    function positionCrops(animate) {
      for (const crop of crops) {
        const {img,window:box,region,index}=crop;
        if (!img.naturalWidth || !box.clientWidth) continue;
        const [rx,ry,rw,rh]=region, nw=img.naturalWidth, nh=img.naturalHeight;
        const scale=Math.min(box.clientWidth/(rw*nw),box.clientHeight/(rh*nh));
        img.style.width=nw+'px'; img.style.height=nh+'px';
        const values={x:box.clientWidth/2-(rx+rw/2)*nw*scale,y:box.clientHeight/2-(ry+rh/2)*nh*scale,scale};
        if (typeof gsap==='undefined') img.style.transform='translate('+values.x+'px,'+values.y+'px) scale('+scale+')';
        else if (animate && motion) motion.to(img,{...values,duration:.35,ease:'power3.out'},0);
        else gsap.set(img,values);
      }
    }
    function select(index, animate=true) {
      if (disposed) return;
      const first=cards.map(card=>card.getBoundingClientRect());
      motion?.kill();
      if (typeof gsap!=='undefined') gsap.set(cards,{clearProps:'transform'});
      active=index; stage.dataset.active=index<0?'':String(index);
      cards.forEach((card,i)=>{
        card.classList.toggle('is-active',i===active);
        if (i!==active) delete card.dataset.reading;
        toggles[i].setAttribute('aria-pressed',String(i===pinned));
        toggles[i].querySelector('.document-pin-state').textContent=i===pinned?'已固定':'';
      });
      const moving=animate && !motionOff() && !paused;
      if (moving) {
        motion=gsap.timeline();
        cards.forEach((card,i)=>{
          const last=card.getBoundingClientRect(), before=first[i];
          const ratio=last.width ? before.width/last.width:1;
          motion.fromTo(card,{x:(before.left-last.left)/(window.innerWidth<768?1:Number(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale'))||1),scaleX:ratio},
            {x:0,scaleX:1,duration:.35,ease:'power3.out'},0);
        });
      } else motion=null;
      positionCrops(moving);
    }
    function pin(index) { pinned=pinned===index?-1:index; select(pinned); }
    definitions.forEach((d,index)=>{
      const card=el('section','document-card'); card.dataset.asset=d.id;
      const toggle=button('',()=>pin(index),'document-select');
      toggle.append(el('h2','',d.title),el('span','document-pin-state'));
      toggle.setAttribute('aria-label','固定查看：'+d.title); toggle.setAttribute('aria-pressed','false');
      toggle.addEventListener('focus',()=>{if(pinned<0)select(index,false);});
      const body=el('div','document-fragments');
      d.regions.forEach(([name,region],part)=>{
        const fragment=el('div','document-fragment'), box=el('div','document-crop'), img=assetImage(d.id);
        img.classList.add('document-crop-image'); box.append(img);
        fragment.append(el('h3','',name),box); body.append(fragment);
        fragment.addEventListener('pointerenter',()=>{
          if (active===index && matchMedia('(hover: hover) and (pointer: fine)').matches) { card.dataset.reading=String(part); select(index); }
        });
        crops.push({img,window:box,region,index});
        img.addEventListener('load',()=>positionCrops(false));
      });
      const original=button('查看完整原件',()=>openImage(d.id),'document-original');
      original.setAttribute('aria-label','查看完整原件：'+d.title);
      card.append(toggle,body,original);
      card.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover) and (pointer: fine)').matches && pinned<0)select(index);});
      card.addEventListener('click',event=>{if(!event.target.closest('button'))pin(index);});
      cards.push(card);toggles.push(toggle);stage.append(card);
    });
    stage.addEventListener('pointerleave',()=>{if(pinned<0)select(-1);});
    stage.addEventListener('focusout',event=>{if(!stage.contains(event.relatedTarget) && pinned<0)select(-1,false);});
    exhibitView={
      reset:()=>{pinned=-1;select(-1);},
      refit:()=>positionCrops(false),
      pause:()=>motion?.pause(),resume:()=>{motion?.resume();if(!motionOff()&&!paused&&(!timeline||timeline.paused()))playDemonstration();},finish:()=>motion?.progress(1).pause(),
      destroy:()=>{disposed=true;motion?.kill();}
    };
    return layout;
  }
  function renderProgram(s) {
    const c = el('div','program-layout'), tabs = el('div','program-tabs');
    const process = renderProcess(s), docs = renderBasemap({images:s.images,points:[
      ['适用语境','辽宁省本级自然资源统一确权登记暂行管理办法。'],
      ['审核程序','预审、内部审核、外部审核与登簿审核。'],
      ['办理方式','登簿审核依托登记信息系统线上办理；此前三类审核按文件线下进行。']
    ]}); docs.hidden = true;
    function select(showDocs) {
      stopTimeline(); process.hidden=showDocs; docs.hidden=!showDocs;
      c.classList.toggle('show-documents',showDocs);
      if(showDocs)requestAnimationFrame(()=>activeGallery?.refit());
      c.closest('.slide')?.classList.toggle('media-focus',showDocs && docs.dataset.focus==='true');
      for (const b of tabs.children) b.setAttribute('aria-pressed',String(b.dataset.documents===String(showDocs)));
    }
    for (const [name,on] of [['程序演示',false],['政策文件',true]]) {
      const b=button(name,()=>select(on)); b.dataset.documents=String(on); b.setAttribute('aria-pressed',String(!on)); tabs.append(b);
    }
    c.append(tabs,process,docs); return c;
  }
  function renderMap(s) {
    const layout=el('div','map-layout'),list=el('div','river-list'),figure=el('div','map-figure');
    const windowEl=el('div','map-window river-map'),controls=el('div','map-controls');
    windowEl.setAttribute('role','region');windowEl.setAttribute('aria-label','五河地理地图');windowEl.tabIndex=0;
    let view;
    function select(index){view?.select(index);}
    const all=button('',()=>select(null),'river-choice river-all');all.dataset.river='all';
    all.append(el('strong','','全部'),el('span','','五条河流总览'));list.append(all);
    s.rivers.forEach((river,index)=>{
      const choice=button('',()=>select(index),'river-choice');choice.dataset.river=String(index);
      choice.append(el('strong','',river[0]),el('span','',river[1]));list.append(choice);
    });
    function selected(index){
      for(const choice of list.children)choice.setAttribute('aria-pressed',String(choice.dataset.river===(index===null?'all':String(index))));


    }
    const original=button('查看原件',()=>openImage(12));original.dataset.asset='12';
    controls.append(original);figure.append(windowEl,controls);layout.append(list,figure);selected(null);
    if(typeof RiverAtlasMap!=='undefined'&&typeof L!=='undefined'&&typeof RiverAtlasGeography!=='undefined'){
      view=RiverAtlasMap.create(windowEl,{onSelect:selected,attributes:s.riverAttributes,rivers:s.rivers});
      exhibitView={...view,resetLabel:'显示全部',reset(){select(null);}};
    }else{
      windowEl.append(assetImage(12));windowEl.setAttribute('aria-label','地图资源未加载，已保留原稿分布图');
      for(const choice of list.children)choice.disabled=true;
    }
    return layout;
  }
  function renderLayers(s) {
    const layout=el('div','atlas-layers-layout'),list=el('div','atlas-layer-list'),display=el('div','atlas-layer-display');
    const scene=el('div','atlas-layer-scene'),stack=el('div','atlas-stack'),controls=el('div','atlas-layer-controls'),previews=el('div','atlas-preview-rail');
    previews.setAttribute('role','group');previews.setAttribute('aria-label','专题图预览');
    let selected=0,expanded=true,motion=null;
    const planes=[],choices=[],thumbnails=[];
    const small=()=>window.innerWidth<768;
    function fit(){
      const scale=Math.max(.25,Math.min(1,scene.clientWidth/(small()?500:1040),scene.clientHeight/(small()?640:540)));
      stack.style.transform='translate(-50%,-50%) scale('+scale+')';
    }
    function select(index){if(index===selected)return;stopTimeline();highlightStep(index);}
    function hoverSelect(node,index){
      node.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(hover: hover) and (pointer: fine)').matches)select(index);});
    }
    function paint(animate=true){
      hideLoupe();
      motion?.kill();
      const moving=animate&&!motionOff()&&!paused;
      motion=moving?gsap.timeline():null;
      planes.forEach((plane,i)=>{
        const current=i===selected;
        plane.classList.toggle('active',current);plane.inert=!current;plane.style.zIndex=current?'2':'1';
        choices[i].setAttribute('aria-pressed',String(current));thumbnails[i].setAttribute('aria-pressed',String(current));
        const values={x:small()?0:-88,y:0,z:0,rotationY:0,scale:1,opacity:current?1:0};
        if(typeof gsap==='undefined'){plane.style.transform=`translate(-50%,-50%) translate(${values.x}px,0)`;plane.style.opacity=String(values.opacity);}
        else if(moving){
          // Only reset a fully invisible sheet; interruptions continue from the live presentation.
          if(current&&Number(gsap.getProperty(plane,'opacity'))<.002)gsap.set(plane,{...values,y:12,scale:.985,opacity:0});
          motion.to(plane,{...values,y:current?0:-8,scale:current?1:1.01,duration:current?.52:.24,ease:'power2.out'},0);
        }else gsap.set(plane,values);
      });
      previews.hidden=!expanded;expand.setAttribute('aria-pressed',String(expanded));collapse.setAttribute('aria-pressed',String(!expanded));
    }
    s.points.forEach(([title,text],i)=>{
      const choice=button('',()=>select(i),'atlas-layer-choice');choice.setAttribute('aria-label',title);
      choice.append(el('span','atlas-layer-index',pad(i+1)),el('h2','',title),el('p','',text));choices.push(choice);list.append(choice);hoverSelect(choice,i);
      const plane=button('',()=>openImage(s.images[i]),'atlas-plane');plane.dataset.layer=i;plane.setAttribute('aria-label','查看'+title+'图件');
      const box=el('div','atlas-raster-frame'),img=assetImage(s.images[i],'atlas-raster',true);box.append(img);
      plane.addEventListener('pointermove',event=>{if(i===selected)moveLoupe(event,img);});plane.addEventListener('pointerleave',hideLoupe);
      plane.append(box,el('span','atlas-plane-label',title));planes.push(plane);stack.append(plane);
      const thumbnail=button('',()=>select(i),'atlas-preview');thumbnail.dataset.layer=i;thumbnail.setAttribute('aria-label','预览：'+title);
      const label=el('span','atlas-preview-name');label.append(el('span','',pad(i+1)),el('span','atlas-preview-title',' '+['影像底图','范围现势','权属成果','管制保护'][i]));
      thumbnail.append(assetImage(s.images[i],'',true),label);hoverSelect(thumbnail,i);thumbnails.push(thumbnail);previews.append(thumbnail);
      if(typeof gsap!=='undefined')gsap.set(plane,{xPercent:-50,yPercent:-50});
    });
    const expand=button('图集',()=>{expanded=true;paint(false);},'atlas-mode'),collapse=button('单图',()=>{expanded=false;paint(false);},'atlas-mode');
    controls.append(el('span','atlas-unit','大沙河 · 210200331000003'),expand,collapse,button('查看图件',()=>openImage(s.images[selected]),'atlas-open'));
    stack.append(previews);scene.append(stack);display.append(scene,controls);layout.append(list,display);
    exhibitView={resetLabel:'复位图层',reset:()=>{expanded=true;highlightStep(0);},selectStep:index=>{selected=index;paint();},refit:()=>{fit();paint(false);},
      pause:()=>motion?.pause(),resume:()=>{motion?.resume();if(!motionOff()&&!paused&&(!timeline||timeline.paused()))playDemonstration();},finish:()=>motion?.progress(1).pause(),destroy:()=>motion?.kill()};
    paint(false);return layout;
  }
  function renderWorkflow(s){
    const layout=el('div','workflow-layout'),viewport=el('div','workflow-viewport');
    const horizontalScale=1.22,elevations=new Map();let activePhase=0;
    const ns='http://www.w3.org/2000/svg';
    function svg(tag,attributes={},text){const n=document.createElementNS(ns,tag);for(const [name,value] of Object.entries(attributes))n.setAttribute(name,String(value));if(text!==undefined)n.textContent=text;return n;}
    const diagram=svg('svg',{class:'workflow-diagram',viewBox:'0 0 '+1800*horizontalScale+' 780',role:'group','aria-labelledby':'workflow-svg-title'});
    diagram.append(svg('title',{id:'workflow-svg-title'},'自然资源地籍调查实施流程：准备、地籍调查、数据建库'));
    const defs=svg('defs');
    for(const [id,top,bottom] of [['flow-panel','#f3f8fa','#e6eff4'],['flow-node','#ffffff','#e5f0f3'],['flow-header','#d6e9ee','#edf5f8']]){
      const gradient=svg('linearGradient',{id,x1:0,y1:0,x2:0,y2:1});gradient.append(svg('stop',{offset:0,'stop-color':top}),svg('stop',{offset:1,'stop-color':bottom}));defs.append(gradient);
    }
    const grid=svg('pattern',{id:'flow-grid',width:30,height:30,patternUnits:'userSpaceOnUse'});grid.append(svg('path',{d:'M30 0H0V30',fill:'none',stroke:'#08778b','stroke-opacity':.045,'stroke-width':1}));defs.append(grid);
    for(const [name,color] of [['main','#006d7a'],['condition','#966624']]){
      const marker=svg('marker',{id:'flow-arrow-'+name,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse',markerUnits:'strokeWidth'});
      marker.append(svg('path',{d:'M1 1L9 5L1 9',fill:'none',stroke:color,'stroke-width':1.4}));defs.append(marker);
    }diagram.append(defs,svg('rect',{width:1800,height:780,fill:'url(#flow-grid)','pointer-events':'none'}));
    const phases=[],signals=[],choices=[];
    s.flow.bands.forEach((band,i)=>{
      const group=svg('g',{class:'workflow-phase','data-phase':i});
      group.append(svg('rect',{x:band.x+8,y:band.y+10,width:band.w,height:band.height,rx:12,class:'workflow-panel-depth'}));
      group.append(svg('rect',{x:band.x,y:band.y,width:band.w,height:band.height,rx:12,class:'workflow-panel'}));
      group.append(svg('rect',{x:band.x,y:band.y,width:band.w,height:68,rx:12,class:'workflow-panel-header'}));
      group.append(svg('text',{x:band.x+28,y:band.y+45,class:'flow-phase-number'},pad(i+1)));
      group.append(svg('text',{x:band.x+98,y:band.y+45,class:'flow-phase-name'},band.lines[0]));phases.push(group);diagram.append(group);
    });
    const lines=svg('g',{class:'workflow-lines'}),labels=svg('g',{class:'workflow-edge-labels'}),nodeLayer=svg('g',{class:'workflow-nodes'});
    s.flow.edges.forEach(edge=>{
      const attrs={d:edge.d,class:'workflow-route '+edge.kind,'data-from':edge.from,'data-to':edge.to,'data-label':edge.label,'data-phase':edge.phase};
      if(edge.kind!=='branch')attrs['marker-end']='url(#flow-arrow-'+(edge.kind==='condition'?'condition':'main')+')';
      lines.append(svg('path',attrs));
      const signal=svg('path',{d:edge.d,class:'workflow-signal '+edge.kind,'data-phase':edge.phase,'data-from':edge.from,'data-to':edge.to});lines.append(signal);signals.push(signal);
      if(edge.labelAt){
        const [x,y]=edge.labelAt,text=svg('text',{x,y,class:'workflow-edge-label '+edge.kind,'text-anchor':edge.anchor||'middle'});
        (edge.lines||[edge.label]).forEach((line,i)=>text.append(svg('tspan',{x,dy:i?26:0},line)));labels.append(text);
      }
    });
    s.flow.nodes.forEach(node=>{
      const group=svg('g',{class:'workflow-node '+node.kind,transform:`translate(${node.x} ${node.y})`,'data-node':node.id,'data-phase':node.phase,role:'button',tabindex:0,'aria-label':node.label});
      if(node.kind==='main')group.append(svg('rect',{x:-5,y:-5,width:node.w+10,height:node.h+10,rx:12,class:'workflow-halo'}));
      group.append(svg('rect',{width:node.w,height:node.h,rx:9,class:'workflow-node-face'}));
      const compact=['organization','technical','materials'].includes(node.id),main=node.kind==='main'||node.id==='acceptance';
      const x=main?66:node.w/2,y=node.id==='prepare'?42:node.h/2+9-(node.lines.length-1)*15;
      const text=svg('text',{x,y,'text-anchor':main?'start':'middle',class:compact?'workflow-pill-label':''});
      node.lines.forEach((line,i)=>text.append(svg('tspan',{x,dy:i?30:0},line)));group.append(text);
      if(main){
        const iconPaths={database:'M-14-9c0-8 28-8 28 0s-28 8-28 0v20c0 8 28 8 28 0V-9m-28 10c0 8 28 8 28 0',revision:'M-10 6 6-10l6 6L-4 12l-9 2 3-8m4-12h-10v26h24V8',acceptance:'M0-17 15-10v12c0 10-15 17-15 17S-15 12-15 2v-12Zm-7 17 5 5 10-11',mapping:'M-16-3 0-12 16-3 0 6Zm0 9 16 9 16-9m-32 9 16 9 16-9'};
        const icon=svg('g',{class:'workflow-icon',transform:`translate(32 ${node.id==='prepare'?34:node.h/2})`});
        icon.append(svg('path',{d:iconPaths[node.id]||'M-10-14H5l7 7v22h-24v-29m17 0v8h7m-18 6H5m-11 7H5'}));group.append(icon);
      }
      const surface=svg('g',{class:'workflow-node-surface'});
      for(const child of [...group.children])surface.append(child);
      surface.insertBefore(svg('rect',{width:node.w,height:node.h,rx:9,class:'workflow-node-arrival'}),surface.querySelector('text'));
      group.append(svg('rect',{width:node.w+4,height:node.h+7,rx:9,fill:'transparent','pointer-events':'all','aria-hidden':'true'}),svg('rect',{x:4,y:7,width:node.w,height:node.h,rx:9,class:'workflow-node-depth'}),surface);
      group.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!motionOff()&&!paused)elevate(surface,-7);});
      group.addEventListener('pointerleave',()=>{if(!motionOff()&&!paused)elevate(surface,node.phase===activePhase?-3:0);});
      group.addEventListener('click',()=>{stopTimeline();highlightStep(node.phase);});
      group.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();stopTimeline();highlightStep(node.phase);}});nodeLayer.append(group);
    });
    const particles=svg('g',{class:'workflow-particles','aria-hidden':'true'}),dots=new Map();
    for(const path of signals){const dot=svg('g',{class:'workflow-particle '+(path.classList.contains('condition')?'condition':''),opacity:0});dot.append(svg('ellipse',{cx:-10,rx:15,ry:2.5,class:'workflow-trail'}),svg('circle',{r:10,class:'workflow-dot-aura'}),svg('circle',{r:4}));dots.set(path,dot);particles.append(dot);}
    diagram.append(lines,particles,nodeLayer,labels);
    const scene=svg('g',{class:'workflow-scene',transform:'scale('+horizontalScale+' 1)'});
    for(const child of [...diagram.children])if(!['title','defs'].includes(child.tagName))scene.append(child);
    scene.querySelectorAll('text').forEach(text=>{const x=Number(text.getAttribute('x')||0);text.setAttribute('transform','translate('+x+' 0) scale('+1/horizontalScale+' 1) translate('+-x+' 0)');});
    scene.querySelectorAll('.workflow-icon').forEach(icon=>icon.setAttribute('transform',icon.getAttribute('transform')+' scale('+1/horizontalScale+' 1)'));
    diagram.append(scene);viewport.append(diagram);
    const footer=el('div','workflow-footer'),tabs=el('div','workflow-phase-controls'),scenario=el('p','workflow-scenario');scenario.setAttribute('aria-live','polite');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','流程阶段');
    const choosePhase=i=>{stopTimeline();if(currentStep!==i)highlightStep(i);};
    s.flow.bands.forEach((band,i)=>{
      const b=button(band.name,()=>choosePhase(i));
      b.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)choosePhase(i);});
      b.addEventListener('focus',()=>choosePhase(i));choices.push(b);tabs.append(b);
    });
    const desc=el('p','step-description sr-only');desc.id='step-description';desc.setAttribute('aria-live','polite');
    footer.append(tabs,scenario,desc,button('查看流程原图',()=>openImage(111),'workflow-original'));layout.append(viewport,footer);
    let animation=null,flowMotion=null,motionPhase=-1;
    function elevate(surface,y,animate=true){
      elevations.get(surface)?.kill();
      if(animate&&!motionOff()&&!paused)elevations.set(surface,gsap.to(surface,{y,duration:.22,ease:'power3.out'}));
      else if(typeof gsap!=='undefined')gsap.set(surface,{y});
      else surface.setAttribute('transform','translate(0 '+y+')');
    }
    function refreshDepth(){for(const node of nodeLayer.children)elevate(node.querySelector('.workflow-node-surface'),node.matches(':hover')&&!motionOff()&&!paused?-7:Number(node.dataset.phase)===activePhase?-3:0);}
    workflowView={
      selectStep(index){
        activePhase=index;refreshDepth();
        animation?.kill();flowMotion?.kill();animation=null;flowMotion=null;motionPhase=-1;for(const dot of dots.values())dot.style.opacity='0';
        nodeLayer.querySelectorAll('.workflow-node-arrival').forEach(n=>n.style.opacity='0');
        nodeLayer.querySelectorAll('.workflow-halo').forEach(n=>n.style.opacity='0');
        scenario.textContent='';phases.forEach((phase,i)=>phase.classList.toggle('is-current',i===index));choices.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
        for(const n of nodeLayer.children)n.classList.toggle('is-current',Number(n.dataset.phase)===index);
        for(const path of signals){path.style.opacity=Number(path.dataset.phase)===index?'1':'0';path.style.strokeDashoffset='0';}
        if(!motionOff()&&!paused){
          motionPhase=index;
          animation=gsap.timeline({defaults:{ease:'power2.out'}});
          flowMotion=gsap.timeline({repeat:-1});
          const active=signals.filter(p=>Number(p.dataset.phase)===index);
          const travel=(target,path,time,duration)=>{
            const dot=dots.get(path),meter={t:0},length=path.getTotalLength();let previous=null;
            target.call(()=>previous=null,[],time).set(dot,{opacity:.95},time).fromTo(meter,{t:0},{t:1,duration,ease:'none',immediateRender:false,onUpdate:()=>{const p=path.getPointAtLength(meter.t*length),angle=previous?Math.atan2(p.y-previous.y,p.x-previous.x)*180/Math.PI:0;dot.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`);previous=p;}},time).set(dot,{opacity:0},time+duration);
            const arrival=nodeLayer.querySelector('[data-node="'+path.dataset.to+'"] .workflow-node-arrival');
            if(arrival)target.fromTo(arrival,{opacity:.2},{opacity:0,duration:.45,ease:'power2.out',immediateRender:false},time+duration);
          };
          const draw=(path,time,duration=.7)=>{const length=path.getTotalLength();path.style.strokeDasharray=String(length);animation.set(path,{opacity:1},time).fromTo(path,{strokeDashoffset:length},{strokeDashoffset:0,duration,immediateRender:false},time);if(path.classList.contains('condition')||(path.dataset.from==='verify'&&path.dataset.to==='mapping'))travel(animation,path,time,duration);};
          const forks=active.filter(p=>p.classList.contains('condition')||(p.dataset.from==='verify'&&p.dataset.to==='mapping'));
          active.filter(p=>!forks.includes(p)&&!['organization','technical','materials'].includes(p.dataset.to)).forEach((path,i)=>travel(flowMotion,path,i*.08,3.2));
          const halos=nodeLayer.querySelectorAll('.workflow-node.is-current .workflow-halo');
          flowMotion.fromTo(halos,{opacity:.08},{opacity:.48,duration:1.8,ease:'sine.inOut'},0).to(halos,{opacity:.08,duration:1.8,ease:'sine.inOut'},1.8);
          if(index===1){
            const path=(from,to)=>active.find(p=>p.dataset.from===from&&p.dataset.to===to);
            const direct=path('verify','mapping'),out=path('verify','supplement'),solved=path('supplement','mapping'),unresolved=path('supplement','dispute'),dispute=path('dispute','mapping');
            const forks=[direct,out,solved,unresolved,dispute];forks.forEach(p=>p.style.opacity='0');
            active.filter(p=>!forks.includes(p)).forEach((p,i)=>draw(p,i*.045));
            animation.call(()=>scenario.textContent='成果无异议：直接上图',[],1.15);draw(direct,1.15,.65);animation.to(direct,{opacity:0,duration:.15},1.95);
            animation.call(()=>scenario.textContent='补充调查后成果上图',[],2.2);draw(out,2.2,.55);draw(solved,2.8,.65);animation.to([out,solved],{opacity:0,duration:.15},3.85);
            animation.call(()=>scenario.textContent='划定权属争议区：争议解决或成果完善后上图',[],4.2);draw(out,4.2,.55);draw(unresolved,4.8,.55);draw(dispute,5.4,.65);animation.to([out,unresolved,dispute],{opacity:0,duration:.15},6.25);animation.call(()=>scenario.textContent='',[],6.5);
          }else active.forEach((p,i)=>draw(p,i*.065));
        }
      },pause:()=>{animation?.pause();flowMotion?.pause();for(const motion of elevations.values())motion.pause();},resume:()=>{if(motionPhase!==activePhase){workflowView.selectStep(activePhase);return;}animation?.resume();flowMotion?.resume();refreshDepth();},finish:()=>{motionPhase=-1;animation?.progress(1).pause();flowMotion?.pause();for(const motion of elevations.values())motion.progress(1).pause();for(const dot of dots.values())dot.style.opacity='0';nodeLayer.querySelectorAll('.workflow-node-arrival').forEach(n=>n.style.opacity='0');},destroy:()=>{animation?.kill();flowMotion?.kill();for(const motion of elevations.values())motion.kill();}
    };
    return layout;
  }
  function renderDatabaseAnimation(s){
    const layout=el('div','db-cinema');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1200 450');svg.setAttribute('role','img');svg.setAttribute('aria-label','三类基础成果汇入五类登记单元数据，经软件质检、不合格逐条修改和复检直至合格。');
    function shape(tag,attrs,text,parent=svg){const n=document.createElementNS(svg.namespaceURI,tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;parent.append(n);return n;}
    const signals=[],dots=[],groups=[];
    function line(d,phase){const p=shape('path',{d,class:'db-cinema-wire','data-phase':phase,fill:'none'});signals.push(p);dots.push(shape('circle',{r:4,class:'db-cinema-packet','data-phase':phase,opacity:0,'aria-hidden':'true'}));}
    line('M280 140H305V243H340',0);line('M280 220H305',0);line('M280 300H305V243',0);
    line('M750 243H870',1);line('M950 305V424H305V351H340',2);line('M1030 243H1140V330',3);
    shape('text',{x:10,y:36,class:'db-cinema-heading'},'成果基础');
    s.foundations.forEach((text,i)=>{const g=shape('g',{'data-phase':0,class:'db-cinema-source'});shape('path',{d:`M10 ${158+i*80}h255`,class:'db-cinema-rule'},undefined,g);shape('text',{x:10,y:140+i*80,class:'db-cinema-source-text'},text,g);groups.push(g);});
    shape('text',{x:545,y:36,'text-anchor':'middle',class:'db-cinema-heading'},'自然资源登记单元');shape('text',{x:545,y:70,'text-anchor':'middle',class:'db-cinema-subtitle'},'以单元为单位组织数据库');
    s.categories.forEach((text,i)=>{const g=shape('g',{class:'db-cinema-layer','data-phase':0});const y=110+i*54;shape('path',{d:`M340 ${y}H750V${y+36}H340Z`,class:'db-cinema-plane'},undefined,g);shape('path',{d:`M340 ${y+36}l8 7h410v-36l-8-7v36Z`,class:'db-cinema-edge'},undefined,g);shape('text',{x:545,y:y+25,'text-anchor':'middle',class:'db-cinema-category'},text,g);groups.push(g);});
    const scan=shape('path',{d:'M350 110H740',class:'db-cinema-scan',opacity:0,'aria-hidden':'true'});svg.insertBefore(scan,svg.querySelector('.db-cinema-layer'));
    const gate=shape('g',{'data-phase':1,class:'db-cinema-gate'});shape('path',{d:'M870 190h160v115H870zM890 190v-16h120v16',class:'db-cinema-gate-outline'},undefined,gate);shape('text',{x:950,y:235,'text-anchor':'middle',class:'db-cinema-heading'},'软件质检',gate);shape('text',{x:950,y:272,'text-anchor':'middle',class:'db-cinema-subtitle'},'检查数据成果',gate);groups.push(gate);
    const amend=shape('g',{'data-phase':2});shape('text',{x:650,y:409,'text-anchor':'middle',class:'db-cinema-amend'},'不合格 → 逐条修改 → 重新检查',amend);groups.push(amend);
    const done=shape('g',{'data-phase':3});shape('path',{d:'M1104 350h72m-36-24v48',class:'db-cinema-result-mark'},undefined,done);shape('text',{x:1140,y:395,'text-anchor':'middle',class:'db-cinema-result'},'复检合格',done);groups.push(done);
    let motion=null;
    function finish(){motion?.kill();motion=null;dots.forEach(dot=>dot.style.opacity='0');scan.style.opacity='0';}
    function selectStep(index){finish();layout.dataset.phase=index;groups.forEach(g=>g.classList.toggle('is-current',Number(g.dataset.phase)===index));signals.forEach(p=>p.classList.toggle('is-current',Number(p.dataset.phase)===index));
      if(motionOff()||paused)return;motion=gsap.timeline();signals.forEach((p,i)=>{if(Number(p.dataset.phase)!==index)return;const meter={t:0},dot=dots[i],length=p.getTotalLength(),start=index===0?i*.12:0;motion.set(dot,{opacity:0},start).to(dot,{opacity:1,duration:.2},start).fromTo(meter,{t:0},{t:1,duration:2.3,ease:'sine.inOut',immediateRender:false,onUpdate:()=>{const point=p.getPointAtLength(length*meter.t);dot.setAttribute('transform',`translate(${point.x} ${point.y})`);}},start).to(dot,{opacity:0,duration:.25},start+2.05);});
      if(index===1)motion.set(scan,{opacity:0,y:0},0).to(scan,{opacity:.45,duration:.2},0).to(scan,{y:250,duration:2.3,ease:'sine.inOut'},0).to(scan,{opacity:0,duration:.25},2.05);
    }
    const view={selectStep,pause:()=>motion?.pause(),resume:()=>{motion?.resume();if(!motionOff()&&!paused&&(!timeline||timeline.paused()))playDemonstration();},finish,destroy:finish,play:()=>{timeline=gsap.timeline({repeat:-1,repeatDelay:2});for(let i=0;i<4;i++)timeline.call(()=>highlightStep(i),[],i*3.2);timeline.to({},{duration:12.8},0).call(finish,[],12.8);}};workflowView=view;
    const scene=el('div','db-cinema-scene');scene.tabIndex=0;scene.setAttribute('aria-label','建库示意图，窄屏可横向滚动');scene.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))event.stopPropagation();});scene.append(svg);
    layout.append(el('p','db-cinema-hint','左右滑动查看完整建库示意'),scene);requestAnimationFrame(()=>{if(layout.isConnected&&workflowView===view&&!motionOff()&&!paused)playDemonstration();});return layout;
  }

  function renderDatabase(s){
    if(s.interaction==='database-cinematic')return renderDatabaseAnimation(s);
    const layout=el('div','database-layout'),standards=el('div','database-standards');
    standards.append(el('strong','','数据建库依据'));s.standards.forEach(text=>standards.append(el('span','',text)));
    const flow=el('div','database-organization'),foundation=el('section','database-foundation');foundation.append(el('h2','','成果基础'));
    s.foundations.forEach(text=>foundation.append(el('p','',text)));
    const unit=el('section','database-unit');unit.append(el('h2','','自然资源\n登记单元'),el('p','','以单元为单位组织'));
    const contents=el('section','database-contents');contents.append(el('h2','','自然资源数据库内容'));
    s.categories.forEach((text,i)=>{const row=el('div','database-category');row.append(el('span','',pad(i+1)),el('p','',text));contents.append(row);});
    flow.append(foundation,unit,contents);layout.append(standards,flow,renderProcess(s));return layout;
  }
  function renderStaffing(s){
    const layout=el('div','staff-layout'),organization=el('section','staff-organization'),qualifications=el('section','staff-qualifications');
    const heading=el('div','staff-heading');heading.append(el('h2','','岗位配置'),el('span','staff-participant-note',s.total+'名项目参与人员'));organization.append(heading);
    const leaders=el('div','staff-leaders');s.roles.slice(0,2).forEach(([name,count])=>{const row=el('div','staff-role');row.append(el('span','',name),el('strong','',count+'人'));leaders.append(row);});organization.append(leaders);
    const branches=el('div','staff-branches');
    for(const [title,roles] of [['内业组',s.roles.slice(2,4)],['外业组',s.roles.slice(4,6)],['质量检查',s.roles.slice(6)]]){
      const branch=el('section','staff-branch');const heading=el('div','staff-card-heading');heading.append(icon(title==='质量检查'?'shield':'team'),el('h3','',title),el('strong','staff-team-count',roles.reduce((sum,role)=>sum+role[1],0)+'人'));branch.append(heading);
      roles.forEach(([name,count])=>{const row=el('div','staff-role');row.append(el('span','',name),el('strong','',count+'人'));branch.append(row);});branches.append(branch);
    }
    const temporary=el('div','staff-temporary');temporary.append(el('span','','临时抽调'),el('strong','',s.temporary+'人'),el('span','','配合项目实施'));
    organization.append(branches,temporary);
    qualifications.append(el('h2','','职称构成'));
    const qualificationGrid=el('div','staff-qualification-grid');
    s.qualifications.forEach(([name,count],i)=>{
      const group=button('',()=>{stopTimeline();highlightStep(i);},'staff-qualification');group.dataset.staffStep=i;
      const label=el('div','staff-qualification-label');label.append(el('span','',name),el('strong','',count+'人'));
      const seats=el('div','staff-seats');seats.setAttribute('aria-hidden','true');
      for(let j=0;j<count;j++)seats.append(el('span','staff-seat'));
      group.append(label,seats);qualificationGrid.append(group);
    });
    qualifications.append(qualificationGrid);
    const desc=el('p','step-description sr-only');desc.id='step-description';desc.setAttribute('aria-live','polite');
    layout.append(organization,qualifications,desc);return layout;
  }
  function renderProcess(s) {
    const c = el('div', 'process-layout'), track = el('div', 'process-track'), fill = el('span');
    fill.id = 'process-fill'; track.append(fill);
    const nodes = el('div', 'process-nodes');
    s.steps.forEach(([title, text], i) => {
      const n = button('', () => { stopTimeline(); highlightStep(i); }, 'process-node');
      n.dataset.step = i;
      n.append(el('span', 'step-number', pad(i + 1)), el('h2', '', title), el('p', '', text)); nodes.append(n);
    });
    const desc = el('p', 'step-description sr-only');
    desc.id = 'step-description'; desc.setAttribute('aria-live', 'polite');
    c.append(track, nodes, desc); return c;
  }
  function renderNotice(s) {
    const d=s.document,article=el('article','notice-document'),table=el('table','notice-table'),body=el('tbody');
    article.setAttribute('aria-label','大沙河首次登记公告草案全文');
    article.append(el('h2','notice-document-title',d.heading),el('p','notice-document-subtitle',d.subtitle),el('p','notice-document-intro',d.intro));
    table.append(el('caption','sr-only','大沙河自然资源登记信息'));
    const columns=el('colgroup');
    for(const width of [17,13,16,11,15,28]){const column=el('col');column.style.width=width+'%';columns.append(column);}
    table.append(columns);
    for(const cells of d.rows){
      const row=el('tr');
      for(const data of cells){
        const cell=el(data.header?'th':'td','',data.text);
        if(data.colSpan)cell.colSpan=data.colSpan;
        if(data.rowSpan)cell.rowSpan=data.rowSpan;
        if(data.header)cell.scope=data.rowSpan?'rowgroup':'row';
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    const window=el('div','notice-table-window');window.tabIndex=0;window.setAttribute('role','region');window.setAttribute('aria-label','登记信息表；窄屏可左右滚动查看全部六列');
    window.addEventListener('keydown',event=>{
      if(window.scrollWidth<=window.clientWidth||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      window.scrollLeft=event.key==='Home'?0:event.key==='End'?window.scrollWidth:window.scrollLeft+(event.key==='ArrowRight'?160:-160);
    });
    window.append(table);article.append(el('p','notice-scroll-hint','左右滑动查看完整登记信息表'),window);
    const footer=el('div','notice-document-footer');
    d.footer.forEach(text=>footer.append(el('p','',text)));article.append(footer);return article;
  }
  function renderChart(s) {
    const c = el('div', 'chart-layout'),copy=copyPoints(s.points);c.append(copy);
    const chart = el('div', 'area-chart'), heading = el('h2', 'chart-title', '自然资源类型构成');
    heading.append(el('span', '', '单位：公顷')); chart.append(heading);
    for (const [name, value, color] of s.chart) {
      const row = el('div', 'area-row'), label = el('div', 'area-label');
      label.append(el('span', '', name), el('span', '', value.toFixed(2)));
      const track = el('div', 'area-track'), fill = el('div', 'area-fill');
      fill.style.width = (value / 3141.83 * 100) + '%'; fill.style.backgroundColor = color;
      fill.setAttribute('aria-hidden', 'true'); track.append(fill); row.append(label, track); chart.append(row);
    }
    chart.append(el('p', 'chart-total', '合计3141.83公顷 · 大沙河公告草案'));
    c.append(chart); return c;
  }
  function renderTable(table, className) {
    const t = el('table', className);
    if (table.heads) {
      const head = el('thead'), row = el('tr');
      for (const title of table.heads) { const cell = el('th', '', title); cell.scope = 'col'; row.append(cell); }
      head.append(row); t.append(head);
    }
    const body = el('tbody');
    for (const data of table.rows) {
      const row = el('tr'); for (const text of data) row.append(el('td', '', text || '—（原稿空白）')); body.append(row);
    }
    t.append(body); return t;
  }
  function renderAudit(s) {
    const layout=el('div','audit-reader-layout review-layout'),nav=el('section','audit-department-index'),reader=el('section','review-reader audit-detail-reader');
    const heads=el('div','audit-index-heads'),options=el('div','audit-index-options'),choices=[],panels=[];
    const progress=el('p','review-position');progress.setAttribute('aria-live','polite');
    heads.append(el('span','',s.table.heads[0]),el('span','',s.table.heads[1]));
    options.setAttribute('role','group');options.setAttribute('aria-label','内部审核处室索引');reader.setAttribute('aria-label','对应审核要点');
    let selected=-1;
    function select(index){
      selected=Math.max(0,Math.min(s.table.rows.length-1,index));
      choices.forEach((c,i)=>{c.classList.toggle('is-current',i===selected);c.setAttribute('aria-pressed',String(i===selected));c.setAttribute('aria-current',String(i===selected));c.tabIndex=i===selected?0:-1;});
      panels.forEach((p,i)=>p.hidden=i!==selected);progress.textContent=pad(selected+1)+' / '+pad(choices.length);
    }
    s.table.rows.forEach(([department,province,text],i)=>{
      const control=button('',()=>select(i),'audit-department-choice');control.setAttribute('aria-controls','audit-detail-'+i);
      control.setAttribute('aria-label',department+'；省级部门（参照）：'+province);
      control.append(el('span','audit-department-name',department),el('span','audit-province-name',province));
      control.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)select(i);});
      control.addEventListener('focus',()=>select(i));choices.push(control);options.append(control);
      const panel=el('section','review-clause audit-detail');panel.id='audit-detail-'+i;panel.setAttribute('aria-label',department);
      panel.append(el('h2','',department),el('p','audit-detail-province','省级部门（参照）：'+province),el('span','review-clause-letter','审核要点'),el('p','review-clause-text',text));panels.push(panel);reader.append(panel);
    });
    options.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;const i=choices.indexOf(event.target);if(i<0)return;
      const next={ArrowDown:(i+1)%choices.length,ArrowUp:(i+choices.length-1)%choices.length,Home:0,End:choices.length-1}[event.key];
      if(next!==undefined){event.preventDefault();event.stopPropagation();choices[next].focus();}
    });
    const tools=el('div','review-reader-tools');tools.append(button('上一项',()=>select((selected+choices.length-1)%choices.length)),progress,button('下一项',()=>select((selected+1)%choices.length)));
    nav.append(heads,options);reader.append(tools);layout.append(nav,reader);
    exhibitView={resetLabel:'恢复首项',reset:()=>select(0)};select(0);return layout;
  }

  function renderRegistration(s) {
    const layout=el('div','registration-combined'),context=el('section','registration-context');
    const choices=[],panels=[],methods=[],count=s.points.length;
    const marker=el('div','review-selection'),progress=el('p','review-position');marker.setAttribute('aria-hidden','true');progress.setAttribute('aria-live','polite');
    let selected=-1,selectedMethod=-1,motion=null,markerMotion=null,methodMotion=null;
    function moveMarker(animate=false){
      const control=choices[selected];if(!control?.offsetWidth)return;markerMotion?.kill();
      marker.style.width=control.offsetWidth+'px';marker.style.height=control.offsetHeight+'px';
      const position={x:control.offsetLeft,y:control.offsetTop};
      if(animate&&!motionOff()&&!paused)markerMotion=gsap.to(marker,{...position,duration:.3,ease:'power3.out'});
      else if(typeof gsap!=='undefined')gsap.set(marker,position);
      else marker.style.transform='translate('+position.x+'px,'+position.y+'px)';
    }
    function select(index,animate=true){
      const next=Math.max(0,Math.min(count-1,index));if(selected===next)return;
      const direction=next>=selected?1:-1;selected=next;currentStep=next;motion?.kill();
      choices.forEach((control,i)=>{control.classList.toggle('is-current',i===next);control.setAttribute('aria-pressed',String(i===next));});
      panels.forEach((panel,i)=>{panel.hidden=i!==next;panel.style.opacity='1';panel.style.transform='none';panel.style.clipPath='none';});
      progress.textContent=pad(next+1)+' / '+pad(count);moveMarker(animate);
      if(animate&&!motionOff()&&!paused)motion=gsap.fromTo(panels[next],{opacity:.5,y:direction*12,clipPath:'inset(0 0 8% 0)'},{opacity:1,y:0,clipPath:'inset(0 0 0 0)',duration:.32,ease:'power3.out',clearProps:'opacity,transform,clipPath'});
    }
    function selectMethod(index,animate=true){
      if(selectedMethod===index)return;selectedMethod=index;methodMotion?.kill();
      methods.forEach((control,i)=>{control.classList.toggle('is-current',i===index);control.setAttribute('aria-pressed',String(i===index));control.lastElementChild.style.opacity='1';});
      if(animate&&!motionOff()&&!paused)methodMotion=gsap.fromTo(methods[index].lastElementChild,{opacity:.5},{opacity:1,duration:.24,ease:'power2.out',clearProps:'opacity'});
    }
    function bindChoice(control,index,selectItem){
      control.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches)selectItem(index);});
      control.addEventListener('focus',()=>selectItem(index,false));
    }
    const subject=el('section','registration-subject');subject.append(el('h2','','登记机构'),el('p','registration-duty',s.subject),el('p','registration-consultation',s.consultation));
    const form=el('section','registration-form');form.setAttribute('aria-label','审核形式与适用条件');form.append(el('h2','','审核形式'));
    s.methods.forEach((p,i)=>{const control=button('',()=>selectMethod(i),'registration-method');control.setAttribute('aria-label',p[0]);control.append(el('span','registration-method-title',p[0]),el('span','registration-method-text',p[1]));methods.push(control);bindChoice(control,i,selectMethod);form.append(control);});
    context.append(subject,form);
    const review=el('div','registration-review'),nav=el('section','review-directory'),options=el('div','review-options'),reader=el('section','review-reader');
    nav.append(el('h2','','七项审核要点'));options.setAttribute('role','group');options.setAttribute('aria-label','登簿审核要点');options.append(marker);reader.setAttribute('aria-label','审核条款原文');
    s.points.forEach((p,i)=>{
      const letter=String.fromCharCode(97+i),control=button('',()=>select(i),'review-choice');control.setAttribute('aria-label',p[0]);control.append(el('span','review-letter',letter),el('span','review-choice-title',p[0]));choices.push(control);bindChoice(control,i,select);options.append(control);
      const panel=el('section','review-clause');panel.setAttribute('aria-label',p[0]);panel.append(el('span','review-clause-letter','审核条款 '+letter.toUpperCase()),el('h2','',p[0]),el('p','review-clause-text',p[1]));panels.push(panel);reader.append(panel);
    });
    options.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;const index=choices.indexOf(event.target);if(index<0)return;
      const next={ArrowDown:(index+1)%count,ArrowUp:(index+count-1)%count,Home:0,End:count-1}[event.key];
      if(next!==undefined){event.preventDefault();event.stopPropagation();choices[next].focus();}
    });
    nav.append(options);const tools=el('div','review-reader-tools');tools.append(button('上一项',()=>select((selected+count-1)%count)),progress,button('下一项',()=>select((selected+1)%count)));
    reader.append(el('p','review-basis','依据《自然资源确权登记规程》'),tools);review.append(nav,reader);layout.append(context,review);
    exhibitView={resetLabel:'恢复首项',reset:()=>{select(0);selectMethod(0);},selectStep:n=>select(n),refit:()=>moveMarker(),pause:()=>{motion?.pause();markerMotion?.pause();methodMotion?.pause();},resume:()=>{motion?.resume();markerMotion?.resume();methodMotion?.resume();},finish:()=>{motion?.progress(1).pause();markerMotion?.progress(1).pause();methodMotion?.progress(1).pause();},destroy:()=>{motion?.kill();markerMotion?.kill();methodMotion?.kill();}};
    select(0,false);selectMethod(0,false);return layout;
  }
  function renderSummary(s) {
    const layout=el('div','summary-focus'),controls=[],rows=[];
    function select(index){
      currentStep=index;
      controls.forEach((control,i)=>{control.setAttribute('aria-pressed',String(i===index));control.tabIndex=i===index?0:-1;rows[i].classList.toggle('is-current',i===index);});
    }
    s.points.forEach(([title,text],index)=>{
      const row=el('section','summary-row'),control=button('',()=>select(index),'summary-choice');
      const paragraph=el('p','',text);paragraph.id='summary-text-'+index;control.setAttribute('aria-describedby',paragraph.id);control.append(el('h2','',title));
      control.addEventListener('focus',()=>select(index));
      row.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')select(index);});
      controls.push(control);rows.push(row);row.append(control,paragraph);layout.append(row);
    });
    layout.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      const index=controls.indexOf(event.target);if(index<0)return;
      const next={ArrowDown:(index+1)%controls.length,ArrowUp:(index+controls.length-1)%controls.length,Home:0,End:controls.length-1}[event.key];
      if(next!==undefined){event.preventDefault();event.stopPropagation();controls[next].focus();}
    });
    exhibitView={resetLabel:'恢复首项',reset:()=>select(0),selectStep:select};select(0);return layout;
  }
  function chapterStart(chapter) {
    return slides.findIndex(s => s.chapter === chapter && !['cover','closing','agenda'].includes(s.layout));
  }
  function renderAgenda() {
    const layout = el('div', 'agenda-layout');
    const preview = el('section', 'agenda-preview');
    const number = el('span', 'agenda-preview-number');
    number.setAttribute('aria-hidden', 'true');
    const label = el('p', 'agenda-preview-label', '篇章导览');
    const title = el('h2', 'agenda-preview-title');
    const topics = el('ul', 'agenda-preview-topics');
    const range = el('p', 'agenda-preview-range');
    preview.append(number, label, title, topics, range);
    const choices = el('nav', 'agenda-choices');
    choices.setAttribute('aria-label', '选择汇报篇章');
    function select(chapter) {
      document.querySelectorAll('.chapter-button').forEach((node, i) => node.classList.toggle('is-agenda-preview', i === chapter));
      number.textContent = pad(chapter + 1);
      title.textContent = RiverAtlasChapters[chapter];
      const pages = slides.map((s, i) => ({s, i})).filter(({s}) => s.chapter === chapter && !['cover','closing'].includes(s.layout));
      topics.replaceChildren(...pages.slice(0, 3).map(({s}) => el('li', '', s.title)));
      range.textContent = '第 ' + pad(pages[0].i + 1) + ' — ' + pad(pages.at(-1).i + 1) + ' 页 · ' + pages.length + ' 页内容';
      [...choices.children].forEach((choice, i) => choice.classList.toggle('is-preview', i === chapter));
    }
    RiverAtlasChapters.forEach((name, chapter) => {
      const entry = button('', () => showPage(chapterStart(chapter), {keyboard:true}), 'agenda-choice');
      const index = el('span', 'agenda-index', pad(chapter + 1));
      const arrow = el('span', 'agenda-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
      entry.append(index, el('span', 'agenda-name', name), el('span', 'agenda-page', '第 ' + pad(chapterStart(chapter) + 1) + ' 页'), arrow);
      entry.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') select(chapter); });
      entry.addEventListener('focus', () => select(chapter));
      choices.append(entry);
    });
    layout.append(preview, choices);
    select(0);
    exhibitView = {reset:() => select(0), resetLabel:'恢复目录'};
    return layout;
  }
  function renderOutfalls(s) {
    const layout = el('div', 'outfall-layout'), summary = el('aside', 'outfall-summary');
    summary.append(copyPoints(s.points));
    const original = renderDocumentBoard({...s, interaction:'source-board', points:[]});
    original.className = 'outfall-original';
    original.append(button('查看原图',()=>openImage(s.images[0]),'policy-original'));
    const register = el('section', 'outfall-register'), filters = el('div', 'outfall-filters');
    filters.setAttribute('role','group'); filters.setAttribute('aria-label','按受纳水体筛选排污口');
    const table = el('table','outfall-table'), head = el('thead'), heading = el('tr'), body = el('tbody');
    const caption = el('caption','','排污口详情'); table.append(caption);
    s.outfalls.heads.forEach(text => { const th=el('th','',text); th.scope='col'; heading.append(th); });
    head.append(heading); table.append(head,body);
    const status = el('p','outfall-status','全部 7 处排污口 · 悬停或键盘聚焦查看明细');
    status.setAttribute('role','status');
    const rows=s.outfalls.rows.map(data=>{
      const row=el('tr','outfall-row'); row.tabIndex=0; row.dataset.river=data[3];
      data.forEach(text=>row.append(el('td','',text)));
      const focus=()=>{ body.querySelectorAll('tr').forEach(n=>n.classList.toggle('is-current',n===row)); status.textContent=data[2]+' / '+data[3]+' / '+data[4]; };
      row.addEventListener('pointerenter',focus);row.addEventListener('focus',focus);
      row.addEventListener('click',()=>{row.focus({preventScroll:true});focus();});body.append(row);return row;
    });
    function filter(river) {
      let count=0;rows.forEach(row=>{row.hidden=river!=='全部'&&row.dataset.river!==river;row.classList.remove('is-current');if(!row.hidden)count++;});
      [...filters.children].forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.river===river)));
      status.textContent=river+' · '+count+' 处排污口';
    }
    ['全部','大沙河','浮渡河','登沙河','英那河'].forEach(river=>{
      const count=river==='全部'?rows.length:rows.filter(r=>r.dataset.river===river).length;
      const control=button(river+' '+count,()=>filter(river),'outfall-filter');control.dataset.river=river;control.setAttribute('aria-pressed',String(river==='全部'));filters.append(control);
    });
    body.addEventListener('keydown',e=>{
      if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();const visible=rows.filter(r=>!r.hidden),index=visible.indexOf(document.activeElement);
      const next=e.key==='Home'?0:e.key==='End'?visible.length-1:Math.max(0,Math.min(visible.length-1,index+(e.key==='ArrowDown'?1:-1)));
      visible[next]?.focus({preventScroll:true});
    });
    const scroll=el('div','outfall-table-scroll');scroll.append(table);
    register.append(filters,scroll,status);
    const board=exhibitView, overview=el('section','outfall-overview'), panels=el('div','outfall-panels'), tabs=el('div','program-tabs outfall-tabs');
    overview.append(summary,original);panels.append(overview,register);
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','公共管制调查视图');
    const views=[overview,register];
    function select(index,animate=true){
      hideLoupe();views.forEach((panel,i)=>panel.hidden=i!==index);
      [...tabs.children].forEach((control,i)=>{control.setAttribute('aria-selected',String(i===index));control.setAttribute('aria-pressed',String(i===index));control.tabIndex=i===index?0:-1;});
      board.refit();
      mediaTween?.progress(1).kill();
      if(animate&&!motionOff()&&!paused)mediaTween=gsap.fromTo(views[index],{opacity:.5,y:8},{opacity:1,y:0,duration:.25,ease:'power2.out',clearProps:'opacity,transform'});
    }
    ['调查图件','排污口详情'].forEach((name,i)=>{
      const control=button(name,()=>select(i));control.setAttribute('role','tab');control.id='outfall-tab-'+i;
      control.setAttribute('aria-controls','outfall-panel-'+i);
      views[i].id='outfall-panel-'+i;views[i].setAttribute('role','tabpanel');views[i].setAttribute('aria-labelledby',control.id);
      control.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?1:1-i;select(next);tabs.children[next].focus();});
      tabs.append(control);
    });
    layout.append(tabs,panels);select(0,false);
    exhibitView={...board,resetLabel:'恢复全览',reset:()=>{filter('全部');select(0);}};
    return layout;
  }
  function renderDeliverables(s){
    const layout=el('div','deliverables-showcase'),cards=[];
    let active=0,timer=null,progress=null,sweep=null,entry=null,disposed=false,stopped=false;
    function stop(){clearTimeout(timer);timer=null;progress?.cancel();progress=null;sweep?.cancel();sweep=null;}
    function select(index){active=index;cards.forEach((card,i)=>card.classList.toggle('is-current',i===active));}
    function sync(){
      if(disposed||stopped||paused||motionOff()||document.hidden){stop();entry?.pause();return;}
      entry?.resume();if(timer)return;
      progress=cards[active].querySelector('.deliverable-progress').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:2800,easing:'linear',fill:'forwards'});
      sweep=cards[active].querySelector('.deliverable-sheen').animate([{transform:'translateX(-150%) skewX(-18deg)',opacity:0},{opacity:.16,offset:.4},{transform:'translateX(400%) skewX(-18deg)',opacity:0}],{duration:2800,easing:'linear'});
      timer=setTimeout(()=>{timer=null;progress?.cancel();progress=null;sweep?.cancel();sweep=null;if(disposed)return;select((active+1)%cards.length);sync();},2800);
    }
    s.table.rows.forEach(([label,format],i)=>{
      const split=label.indexOf('：'),title=split<0?label:label.slice(0,split),detail=split<0?'':label.slice(split+1);
      const card=el('section','deliverable-card'),top=el('div','deliverable-card-top'),visual=el('div','deliverable-emblem');
      top.append(el('span','deliverable-number',pad(i+1)),el('span','deliverable-format',format));
      visual.append(icon(['browser','board','board','board','calendar','shield'][i]));
      card.append(el('span','deliverable-sheen'),top,visual,el('h2','',title),el('p','deliverable-description',detail),el('span','deliverable-progress'));cards.push(card);layout.append(card);
    });
    exhibitView={autoplay:true,reset:()=>{stop();stopped=false;select(0);sync();},setState:sync,pause:()=>{stop();entry?.pause();},resume:sync,finish:()=>{stopped=true;stop();entry?.progress(1).pause();},destroy:()=>{disposed=true;stop();entry?.kill();}};
    requestAnimationFrame(()=>{
      if(disposed)return;
      if(!motionOff()&&!paused)entry=gsap.fromTo(cards,{opacity:.4,y:18},{opacity:1,y:0,duration:.5,stagger:.06,ease:'power3.out',clearProps:'opacity,transform'});
    });
    select(0);return layout;
  }

  function renderBody(s) {
    if(s.interaction==='deliverables-showcase')return renderDeliverables(s);
    if(s.interaction==='eagle')return renderBasemap(s);
    if(s.interaction==='mapping-copy')return copyPoints(s.points,'mapping-text-only');
    if (s.interaction === 'outfall-register') return renderOutfalls(s);
    if (s.layout === 'agenda') return renderAgenda();
    if(s.interaction==='summary-focus')return renderSummary(s);
    if(s.interaction==='audit-focus')return renderAudit(s);
    if(s.interaction?.startsWith('registration-'))return renderRegistration(s);
    if (s.layout === 'workflow') return renderWorkflow(s);
    if (s.layout === 'database') return renderDatabase(s);
    if (s.layout === 'staffing') return renderStaffing(s);
    if (s.interaction === 'document-exhibit') return renderDocumentExhibit(s);
    if (s.interaction === 'policy-library') return renderPolicyLibrary(s);
    if (s.interaction==='document-board' && s===slides[2]) return renderBackgroundTabs(s);
    if (['document-board','source-board'].includes(s.interaction)) return renderDocumentBoard(s);
    if (s.layout === 'gallery' || s.layout === 'expert') {
      return mediaLayout(s);
    }
    if (s.layout === 'boundaries') {
      const c = el('div', 'boundary-grid');
      for (const p of s.points) { const item = el('section', 'boundary-item'); item.append(el('h2', '', p[0]), el('p', '', p[1])); c.append(item); }
      return c;
    }
    if (s.layout === 'map') return renderMap(s);
    if (s.layout === 'collection') {
      const c = el('div', 'collection-layout'), lanes = el('div', 'collection-lanes');
      for (const p of s.points) { const lane = el('section', 'collection-lane'); lane.append(el('h2', '', p[0]), el('p', '', p[1])); lanes.append(lane); }
      const target = el('div', 'collection-target'); target.append(el('h2', '', '工作底图'), el('p', '', '范围\n权属\n管制'));
      c.append(lanes, target); return c;
    }
    if (s.layout === 'layers') return renderLayers(s);
    if (s.layout === 'mapping') {
      const c = el('div', 'mapping-layout'), groups = el('div', 'mapping-groups');
      for (const p of s.points) { const g = el('section', 'mapping-group'); g.append(el('h2', '', p[0]), el('p', '', p[1])); groups.append(g); }
      c.append(groups, el('p', 'mapping-result', '按统一规格整理、上图')); return c;
    }
    if (s.layout === 'process') return s.images?.length ? renderProgram(s) : renderProcess(s);
    if (s.layout === 'deliverables') {
      const c = el('div', 'deliverable-grid');
      for (const p of s.points) { const item = el('section', 'deliverable'); item.append(el('h2', '', p[0]), el('p', '', p[1])); c.append(item); }
      return c;
    }
    if (s.layout === 'audit') return renderTable(s.table, 'audit-table');
    if (s.layout === 'summary') return copyPoints(s.points, 'summary-layout');
    if (s.layout === 'requirements') return copyPoints(s.points, 'requirements-grid');
    if (s.layout === 'register') return copyPoints(s.points, 'register-layout');
    if (s.layout === 'checklist') {
      const c = el('div', 'checklist');
      s.points.forEach((p, i) => { const item = el('section', 'check-item'); item.append(el('span', 'item-number', String(i + 1)), copyPoints([p])); c.append(item); }); return c;
    }
    if (s.layout === 'announcement') {
      const c = el('div', 'announcement-layout'), number = el('div', 'notice-duration');
      number.append(icon('calendar'),el('span', '', '公告期不少于'), el('strong', '', '15'), el('span', '', '个工作日'));
      const channels=copyPoints(s.points);Array.from(channels.children).forEach((card,i)=>card.prepend(icon(i===0?'board':'browser')));
      c.append(number,channels); return c;
    }
    if (s.layout === 'notice') return renderNotice(s);
    if (s.layout === 'chart') return renderChart(s);
    if (s.layout === 'status') {
      const c = el('div', 'status-layout'), conclusion = el('section', 'status-conclusion');
      conclusion.append(el('h2', '', s.points[0][0]), el('p', '', s.points[0][1]));
      c.append(conclusion, copyPoints(s.points.slice(1))); return c;
    }
    return copyPoints(s.points);
  }
  function stopTimeline() { timeline?.progress(1,true).kill(); timeline = null; mediaTween?.progress(1).kill(); mediaTween=null; stepTween?.progress(1).kill(); stepTween=null; }
  function highlightStep(n) {
    const s = slides[pageIndex], total = s.steps?.length || s.points?.length || 1;
    currentStep = Math.max(0, Math.min(total - 1, n));
    document.querySelectorAll('.process-node').forEach((node, i) => {
      node.classList.toggle('active', i === currentStep); node.setAttribute('aria-pressed', String(i === currentStep));
    });
    document.querySelectorAll('.layer-plane').forEach(node => node.classList.toggle('active', Number(node.dataset.layer) === currentStep));
    if (!motionOff() && !paused) {
      stepTween?.progress(1).kill(); stepTween=gsap.timeline();
      const node=document.querySelector('.process-node.active');
      if (node) stepTween.fromTo(node,{y:9},{y:0,duration:.55,ease:'power3.out'});
      document.querySelectorAll('.layer-plane').forEach(plane=> {
        const selected=Number(plane.dataset.layer)===currentStep;
        stepTween.to(plane,{x:selected ? -22:0,scale:selected ? 1.045:1,duration:.7,ease:'power3.out'},0);
      });
    }
    exhibitView?.selectStep?.(currentStep);
    workflowView?.selectStep(currentStep);
    document.querySelectorAll('[data-staff-step]').forEach((node,i)=>{node.classList.toggle('is-current',i===currentStep);node.setAttribute('aria-pressed',String(i===currentStep));});
    if(stepTween){
      const staffSeats=document.querySelectorAll('.staff-qualification.is-current .staff-seat');
      if(staffSeats.length)stepTween.fromTo(staffSeats,{opacity:.4},{opacity:1,duration:.25,stagger:.035},0);
    }
    const desc = $('step-description');
    if (desc && s.steps) desc.textContent = '当前讲解第' + (currentStep + 1) + '步：' + s.steps[currentStep][0] + '。';
    const fill = $('process-fill'); if (fill) {
      const progress=currentStep / Math.max(1,total-1);
      if (!motionOff() && !paused && stepTween) stepTween.to(fill,{scaleX:progress,duration:.85,ease:'power3.inOut'},0);
      else fill.style.transform='scaleX('+progress+')';
    }
  }
  function updateControls() {
    const manualView=Boolean(exhibitView&&!exhibitView.autoplay);
    $('pause-button').textContent = paused ? '继续' : '暂停';
    $('pause-button').setAttribute('aria-pressed', String(paused));
    $('static-button').setAttribute('aria-pressed', String(motionOff()));
    $('static-button').disabled = reduceQuery.matches;
    $('play-button').disabled = motionOff() || manualView;
    $('play-button').title = manualView ? '本页由鼠标或点击控制，不自动播放' : '';
    $('skip-button').disabled = manualView;
    $('replay-button').textContent = manualView ? (exhibitView.resetLabel || '恢复全览') : '重播';
    $('pause-button').disabled = motionOff();
    $('replay-button').disabled = !exhibitView && motionOff();
    $('static-button').title = reduceQuery.matches ? '系统已启用减少动态效果，当前静态显示' : '切换静态模式（A）';
    document.body.classList.toggle('static-mode', motionOff());
    document.body.classList.toggle('motion-paused',paused);
    starfield?.setState({paused,staticMode:motionOff()});
    exhibitView?.setState?.({paused,staticMode:motionOff()});activeGallery?.setState?.();
    $('stage').dataset.paused = String(paused);
  }
  function intro(animate, direction = 1) {
    if (motionOff() || paused || !animate || typeof gsap === 'undefined') return;
    timeline = gsap.timeline({ paused, defaults: { ease:'power3.out' } });
    const cover = document.querySelector('.cover-content');
    if (cover) {
      timeline.fromTo(cover.children, { y:32, opacity:0 }, { y:0, opacity:1, duration:1.1, stagger:.18 });
      timeline.fromTo('.cover-rule', { scaleX:0 }, { scaleX:1, duration:1.2 },.5);
      return;
    }
    timeline.fromTo('.slide-heading, .slide-lead', { y:18, opacity:0 }, { y:0, opacity:1, duration:.65, stagger:.12 });
    const selectors = '.copy-point, .boundary-item, .collection-lane, .collection-target, .mapping-group, .mapping-result, .process-node, .deliverable, .requirements-grid > section, .check-item, .notice-duration, .area-row, .status-conclusion, .audit-table tbody tr';
    const nodes = [...document.querySelectorAll(selectors)].filter(n=>n.getClientRects().length && !n.parentElement.closest('.copy-point'));
    if (nodes.length) timeline.fromTo(nodes, { y:26, opacity:0 }, { y:0, opacity:1, duration:.7, stagger:.09 },.17);
    const media = document.querySelector('.gallery-spread, .map-window');
    if (media) timeline.fromTo(media,{ y:30, scale:.965, opacity:0 },{ y:0, scale:1, opacity:1, duration:1.05 },.2);
    const planes = document.querySelectorAll('.layer-plane');
    if (planes.length) timeline.fromTo(planes,{ opacity:0, x:90 },{ opacity:1, x:0, duration:1.2, stagger:.18 },.25);
    if (document.querySelector('.area-fill')) timeline.fromTo('.area-fill',{scaleX:0},{scaleX:1,duration:1.4,stagger:.16,ease:'power2.inOut'},.25);
    const workflow=document.querySelector('.workflow-diagram');
    if(workflow)timeline.fromTo(workflow,{opacity:.6},{opacity:1,duration:.65},.15);
    const seats=document.querySelectorAll('.staff-seat');
    if(seats.length)timeline.fromTo(seats,{opacity:.2,scale:.9},{opacity:1,scale:1,duration:.45,stagger:.035},.25);
  }
  function showPage(index, { animate = true, keyboard = false } = {}) {
    hideLoupe();
    document.querySelectorAll('.chapter-button').forEach(node => node.classList.remove('is-agenda-preview'));
    const next = Math.max(0, Math.min(slides.length - 1, Math.trunc(index)));
    const direction = next >= pageIndex ? 1 : -1;
    stopTimeline(); landscape?.destroy(); exhibitView?.destroy?.();activeGallery?.destroy?.();workflowView?.destroy();workflowView=null; exhibitView=null; landscape=null; activeGallery=null; pageIndex = next; currentStep = 0;
    const s = slides[pageIndex], slide = el('article', 'slide');
    slide.dataset.layout=s.layout;
    if (s.layout === 'cover' || s.layout === 'closing') {
      slide.classList.add('cover-slide'); if (s.layout === 'closing') slide.classList.add('closing-slide');
      const cover = assetImage(4, 'cover-image'), shade = el('div', 'cover-shade'), copy = el('div', 'cover-content');
      const title = el('h1', '', s.title); title.id = 'slide-title'; title.tabIndex = -1;
      copy.append(title, el('p', 'cover-subtitle', s.subtitle), el('div', 'cover-rule'), el('p', 'cover-date', s.lead));
      slide.append(cover, shade, copy);
    } else {
      const heading = el('div', 'slide-heading'), title = el('h1', '', s.title); title.id = 'slide-title'; title.tabIndex = -1;
      heading.append(title); if (s.status) heading.append(el('span', 'status-label', s.status));
      const content = el('div', 'slide-content'); content.append(renderBody(s));
      slide.append(heading);
      if(s.interaction!=='database-cinematic'&&s.interaction!=='audit-focus'&&s.board!=='protected-units')for(const paragraph of s.leadParagraphs||[s.lead])slide.append(el('p','slide-lead',paragraph));
      slide.append(content);
      if (['gallery','expert'].includes(s.layout)) slide.classList.add('media-slide');
      if(s.interaction==='source-board')slide.classList.add('source-slide');
      if (s.interaction==='document-exhibit') slide.classList.add('exhibit-slide');
      if (s.interaction==='policy-library') slide.classList.add('policy-slide');
      if (['layers','workflow','database','staffing'].includes(s.layout)) slide.classList.add('technical-slide');
      if(s.interaction?.startsWith('registration-'))slide.classList.add('registration-slide');
      if(s.layout==='notice')slide.classList.add('notice-slide');
      if(s.interaction==='summary-focus')slide.classList.add('summary-slide');
      if (s.note && s.layout==='boundaries') slide.append(el('p','slide-note',s.note));
    }
    $('presentation').replaceChildren(slide);
    if (slide.classList.contains('cover-slide')) landscape=null;
    $('page-count').textContent = pad(pageIndex + 1) + ' / ' + slides.length;
    $('stage').dataset.page = String(pageIndex + 1);
    $('prev-button').disabled = pageIndex === 0; $('next-button').disabled = pageIndex === slides.length - 1;
    $('step-button').disabled = !['process', 'layers','workflow','database','staffing'].includes(s.layout)&&!s.interaction?.startsWith('registration-')&&s.interaction!=='summary-focus';
    document.querySelectorAll('.chapter-button').forEach((b, i) => b.setAttribute('aria-current', String(i === s.chapter)));
    $('page-progress-fill').style.transform = 'scaleX(' + (pageIndex + 1) / slides.length + ')';
    try { history.replaceState(null, '', '#p' + (pageIndex + 1)); } catch { location.hash = 'p' + (pageIndex + 1); }
    updateControls(); highlightStep(0); fitStage(); exhibitView?.refit?.(); activeGallery?.refit(); intro(animate, direction);
    if (keyboard) $('slide-title').focus({ preventScroll: true });
    if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function playDemonstration() {
    if (exhibitView) { if(exhibitView.autoplay){paused=false;updateControls();}exhibitView.reset(); return; }
    stopTimeline(); paused = false; updateControls();
    if (motionOff()) { notify('静态模式下可用“下一步”直接切换讲解位置。'); return; }
    const s = slides[pageIndex];
    landscape?.restart();
    if(s.interaction==='database-cinematic'){workflowView.play();return;}
    if(activeGallery?.play){activeGallery.play();return;}
    if (activeGallery?.element.getClientRects().length) {
      const g=activeGallery; g.select(g.ids[0], false);
      timeline=gsap.timeline();
      g.ids.slice(1).forEach((id,i)=>timeline.call(()=>g.select(id),[],(i+1)*3.2));
      timeline.to({}, {duration:3.2}, (g.ids.length-1)*3.2);
    } else if(s.layout==='workflow'){
      highlightStep(0);timeline=gsap.timeline();timeline.call(()=>highlightStep(1),[],2.4).call(()=>highlightStep(2),[],9.2).to({},{duration:2.6},9.2);
    } else if (['process','layers','database','staffing'].includes(s.layout)) {
      const count = s.steps?.length || s.points.length;
      const interval=s.interaction==='database-cinematic'?2.4:s.layout==='workflow'?3:1.5;
      highlightStep(0);
      timeline = gsap.timeline({ onComplete: () => {highlightStep(count - 1);if(s.interaction==='database-cinematic')workflowView?.finish();} });
      for (let i = 1; i < count; i++) timeline.call(() => highlightStep(i), [], i * interval);
      timeline.to({}, { duration: interval }, (count - 1) * interval);
    } else if (s.layout === 'chart') {
      timeline = gsap.timeline(); timeline.fromTo('.area-fill', { scaleX: 0 }, { scaleX: 1, duration: .9, ease: 'power3.out' });
    } else intro(true);
  }
  function togglePause() {
    if (motionOff()) return;
    paused = !paused;
    if (paused) { timeline?.pause(); landscape?.pause(); mediaTween?.pause(); stepTween?.pause(); exhibitView?.pause?.();workflowView?.pause(); }
    else { timeline?.resume(); landscape?.resume(); mediaTween?.resume(); stepTween?.resume(); exhibitView?.resume?.();workflowView?.resume(); }
    updateControls();
  }
  function pauseAll() { hideLoupe();paused = true; timeline?.pause(); landscape?.pause(); mediaTween?.pause(); stepTween?.pause(); exhibitView?.pause?.();workflowView?.pause(); updateControls(); }
  function skipAnimation() {
    timeline?.progress(1).pause(); landscape?.pause(); mediaTween?.progress(1).pause(); stepTween?.progress(1).pause(); exhibitView?.finish?.();
    const s = slides[pageIndex];
    if (['process','workflow','database','staffing'].includes(s.layout) || (s.layout === 'layers' && !exhibitView)) highlightStep((s.steps || s.points).length - 1);
    workflowView?.finish();activeGallery?.finish?.();
  }
  function openDialog(id) { hideLoupe();pauseAll(); const d = $(id); if (!d.open) d.showModal(); }
  function renderContents() {
    const q = $('contents-search').value.trim().toLocaleLowerCase();
    const nodes = slides.flatMap((s, i) => {
      if (!s.title.toLocaleLowerCase().includes(q)) return [];
      const b = button('', () => { $('contents-dialog').close(); showPage(i, { animate:false, keyboard:true }); }, 'contents-entry');
      b.append(el('span', '', pad(i + 1)), el('strong', '', s.title.replaceAll('\n', '')));
      b.setAttribute('aria-current', String(i === pageIndex)); return [b];
    });
    $('contents-list').replaceChildren(...(nodes.length ? nodes : [el('p', 'contents-empty', '没有匹配页面，请尝试其他关键词。')]));
  }
  function fitOriginal() {
    const img = $('original-image');
    if (!img.naturalWidth || !img.naturalHeight) return;
    const box = $('image-scroll');
    const ratio = Math.min((box.clientWidth - 28) / img.naturalWidth, (box.clientHeight - 28) / img.naturalHeight, 1);
    fittedWidth = Math.max(30, ratio * img.naturalWidth);
    img.style.width = (fittedWidth * zoom) + 'px';
    $('zoom-level').textContent = zoom === 1 ? '适应窗口' : Math.round(zoom * 100) + '%';
  }
  function openImage(id) {
    hideLoupe();
    const a = assets.get(id); if (!a) { notify('原件不存在。'); return; }
    pauseAll(); imageId = id; zoom = 1;
    const img = $('original-image'); img.hidden = true;
    $('image-title').textContent = RiverAtlasCaptions[id] || a.caption; img.alt = RiverAtlasCaptions[id] || a.caption;
    img.onload = () => { img.hidden = false; fitOriginal(); $('image-scroll').scrollTo(0, 0); };
    img.onerror = () => { notify('原件加载失败，请确认assets/originals目录完整。'); };
    img.style.transform = a.rotation ? 'rotate(' + a.rotation + 'deg)' : 'none';
    if (!$('image-dialog').open) $('image-dialog').showModal();
    img.src = a.path;
    if (img.complete && img.naturalWidth) { img.hidden = false; fitOriginal(); $('image-scroll').scrollTo(0, 0); }
  }
  function changeZoom(multiplier) { zoom = Math.max(.5, Math.min(8, zoom * multiplier)); fitOriginal(); }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notify('浏览器未允许页面全屏。可使用浏览器F11进入会议展示。'); }
  }
  $('prev-button').append(icon('prev')); $('next-button').append(icon('next')); $('help-button').append(icon('help'));
  RiverAtlasChapters.forEach((name, chapter) => {
    const b = button(name, () => showPage(chapterStart(chapter)), 'chapter-button'); $('chapter-nav').append(b);
  });
  $('prev-button').addEventListener('click', () => showPage(pageIndex - 1));
  $('next-button').addEventListener('click', () => showPage(pageIndex + 1));
  $('contents-button').addEventListener('click', () => { $('contents-search').value = ''; renderContents(); openDialog('contents-dialog'); });
  $('contents-search').addEventListener('input', renderContents);
  $('help-button').addEventListener('click', () => openDialog('help-dialog'));
  $('fullscreen-button').addEventListener('click', toggleFullscreen);
  $('play-button').addEventListener('click', playDemonstration);
  $('pause-button').addEventListener('click', togglePause);
  $('replay-button').addEventListener('click', playDemonstration);
  $('skip-button').addEventListener('click', skipAnimation);
  $('step-button').addEventListener('click', () => {
    stopTimeline(); const s = slides[pageIndex]; highlightStep((currentStep + 1) % (s.steps || s.points).length);
  });
  $('static-button').addEventListener('click', () => { manualStatic = !manualStatic; skipAnimation(); updateControls(); if (!motionOff() && !paused) { landscape?.resume(); mediaTween?.resume(); stepTween?.resume(); exhibitView?.resume?.(); workflowView?.resume(); } });
  $('zoom-in').addEventListener('click', () => changeZoom(1.5));
  $('zoom-out').addEventListener('click', () => changeZoom(1 / 1.5));
  $('zoom-reset').addEventListener('click', () => { zoom = 1; fitOriginal(); $('image-scroll').scrollTo(0, 0); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  window.addEventListener('hashchange', () => { const n = parseHash(); if (n !== pageIndex) showPage(n, { animate:false }); });
  window.addEventListener('resize', () => { hideLoupe();fitStage(); landscape?.resize(); exhibitView?.refit?.(); activeGallery?.refit(); if ($('image-dialog').open) fitOriginal(); });
  window.addEventListener('scroll',hideLoupe,{passive:true});
  window.addEventListener('blur',hideLoupe);
  document.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'){hideLoupe();return;}
    if(!lastMousePoint||Math.hypot(event.clientX-lastMousePoint.x,event.clientY-lastMousePoint.y)>.5)loupeMoves.add(event);
    lastMousePoint={x:event.clientX,y:event.clientY};
  },{capture:true,passive:true});
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')hideLoupe();},{passive:true});
  document.addEventListener('pointercancel',hideLoupe,{passive:true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen-button').setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    $('fullscreen-button').textContent = document.fullscreenElement ? '退出全屏' : '全屏'; fitStage();
  });
  reduceQuery.addEventListener('change', () => { skipAnimation(); updateControls(); if (!motionOff() && !paused) workflowView?.resume(); });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if ($('image-dialog').open) {
      if (e.key === '+' || e.key === '=') { changeZoom(1.5); e.preventDefault(); }
      if (e.key === '-') { changeZoom(1 / 1.5); e.preventDefault(); }
      return;
    }
    if (document.querySelector('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if(e.target.closest?.('.leaflet-container')&&['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;
    if (['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)) {
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? slides.length - 1 : pageIndex + (['ArrowRight','PageDown'].includes(e.key) ? 1 : -1);
      showPage(n, { keyboard:true }); return;
    }
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'f') { e.preventDefault(); toggleFullscreen(); }
    if (key === 'p' || (key === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); togglePause(); }
    if (key === 'r') playDemonstration();
    if (key === 'a' && !reduceQuery.matches) $('static-button').click();
    if (key === 's' && !$('step-button').disabled) $('step-button').click();
    if (key === '?') openDialog('help-dialog');
  });
  if (typeof gsap === 'undefined') notify('动画库未能加载，内容仍可阅读；请检查assets/vendor目录。');
  showPage(pageIndex); fitStage();
})();
