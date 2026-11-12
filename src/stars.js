/* Pointer-driven stars and a short constellation wake; no idle loop or slide advancement. */
const RiverAtlasStars = (() => {
  'use strict';
  function create() {
    const canvas=document.createElement('canvas');canvas.id='starfield';canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
    const ctx=canvas.getContext('2d');
    if(!ctx){canvas.remove();return {setState(){}};}
    let seed=81247,w=0,h=0,x=0,y=0,targetX=0,targetY=0,request=0,paused=false,staticMode=false,pointer=null,lastMove=-Infinity;
    const trail=[],life=650;
    const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    const stars=Array.from({length:520},(_,i)=>({x:random(),y:random(),depth:i<380?.3:i<485?.65:1,r:i<380?.45+random()*.35:i<485?.7+random()*.4:1+random()*.35}));
    function draw(now=performance.now()) {
      ctx.clearRect(0,0,w,h);
      const mist=ctx.createRadialGradient(w*.73,h*.24,0,w*.73,h*.24,w*.55);
      mist.addColorStop(0,'rgba(45,105,148,.075)');mist.addColorStop(1,'rgba(45,105,148,0)');
      ctx.fillStyle=mist;ctx.fillRect(0,0,w,h);
      const strength=staticMode?0:Math.max(0,1-(now-lastMove)/life)**2,nearby=[];
      while(trail.length&&now-trail[0].time>life)trail.shift();
      for(const star of stars) {
        const px=star.x*(w+40)-20+x*star.depth,py=star.y*(h+30)-15+y*star.depth;
        ctx.fillStyle='rgba(185,218,237,'+(.29+star.depth*.24)+')';
        ctx.beginPath();ctx.arc(px,py,star.r,0,Math.PI*2);ctx.fill();
        if(star.depth===1){ctx.strokeStyle='rgba(145,198,224,.20)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(px-3,py);ctx.lineTo(px+3,py);ctx.moveTo(px,py-3);ctx.lineTo(px,py+3);ctx.stroke();}
        if(strength&&pointer){const distance=Math.hypot(px-pointer.x,py-pointer.y);if(distance<190)nearby.push({x:px,y:py,distance});}
      }
      function line(a,b,alpha,width=.9){
        ctx.strokeStyle='rgba(146,204,225,'+alpha+')';ctx.lineWidth=width;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
      nearby.sort((a,b)=>a.distance-b.distance);nearby.length=Math.min(12,nearby.length);
      let links=0;
      for(let i=0;i<nearby.length;i++){
        if(i<3)line(pointer,nearby[i],.28*strength*(1-nearby[i].distance/190),.8);
        for(let j=i+1;j<nearby.length&&links<16;j++){
          const distance=Math.hypot(nearby[i].x-nearby[j].x,nearby[i].y-nearby[j].y);
          if(distance<145){line(nearby[i],nearby[j],.37*strength*(1-distance/145));links++;}
        }
      }
      if(!staticMode)for(let i=1;i<trail.length;i++){
        const fade=Math.max(0,1-(now-trail[i-1].time)/life);
        line(trail[i-1],trail[i],.40*fade*fade,1);
      }
    }
    function tick() {
      request=0;if(paused||staticMode||document.hidden)return;
      x+=(targetX-x)*.15;y+=(targetY-y)*.15;draw();
      if(Math.abs(targetX-x)+Math.abs(targetY-y)>.035||performance.now()-lastMove<life)request=requestAnimationFrame(tick);
      else {x=targetX;y=targetY;draw();}
    }
    function start(){if(!request&&!paused&&!staticMode&&!document.hidden)request=requestAnimationFrame(tick);}
    function resize(){
      w=window.innerWidth;h=window.innerHeight;const ratio=Math.min(1,1920/Math.max(w,1));
      canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();
    }
    function setState(next){
      const wasStatic=staticMode,wasPaused=paused;paused=next.paused;staticMode=next.staticMode;
      if(paused||staticMode){cancelAnimationFrame(request);request=0;}
      if((staticMode&&!wasStatic)||(!paused&&wasPaused)){trail.length=0;lastMove=-Infinity;pointer=null;}
      if(staticMode&&!wasStatic){x=y=targetX=targetY=0;draw();}
      else if(!paused&&wasPaused)draw();
      if(!paused&&!staticMode&&Math.abs(targetX-x)+Math.abs(targetY-y)>.035)start();
    }
    window.addEventListener('pointermove',event=>{
      if(paused||staticMode||document.hidden||event.pointerType==='touch')return;
      if(pointer&&pointer.x===event.clientX&&pointer.y===event.clientY)return;
      lastMove=performance.now();pointer={x:event.clientX,y:event.clientY};
      trail.push({...pointer,time:lastMove});if(trail.length>16)trail.shift();
      targetX=(event.clientX/Math.max(w,1)-.5)*28;targetY=(event.clientY/Math.max(h,1)-.5)*20;start();
    },{passive:true});
    window.addEventListener('resize',resize);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(request);request=0;});
    resize();return {setState};
  }
  return {create};
})();
