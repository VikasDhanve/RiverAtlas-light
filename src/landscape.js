/* Decorative landscape animation. The source image is not geographic or flow data. */
const RiverAtlasLandscape = (() => {
  'use strict';
  function create(host, { staticMode = false, paused = false } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'landscape-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.width = 1440; canvas.height = 672; host.prepend(canvas);
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    let frame = 0, time = 0, previous = 0, stopped = paused || staticMode, disposed = false, ready = false;
    let program, buffer, texture, timeUniform, lastDraw = -100;
    const fallback = host.querySelector('.cover-image');
    const camera = fallback.animate([
      { transform: 'scale(1.04) translate(0,0)' },
      { transform: 'scale(1.10) translate(-1%,.5%)' },
      { transform: 'scale(1.04) translate(0,0)' }
    ], { duration: 24000, iterations: Infinity, easing: 'ease-in-out' });
    camera.pause();
    function shader(type, text) {
      const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Landscape shader unavailable'); }
      return s;
    }
    function draw() {
      if (!ready || disposed) return;
      gl.uniform1f(timeUniform, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.frame = String(++frame);
    }
    function tick(now) {
      if (stopped || disposed) return;
      time += previous ? Math.min((now - previous) / 1000, .06) : 0; previous = now;
      if (now-lastDraw>=32) { draw(); lastDraw=now; } request = requestAnimationFrame(tick);
    }
    let request = 0;
    const image = new Image();
    try {
      if (!gl) throw new Error('WebGL unavailable');
      program = gl.createProgram();
      const vert = shader(gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5; gl_Position=vec4(position,0.,1.);}');
      const frag = shader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv; uniform sampler2D landscape; uniform float time; uniform vec2 crop;
        void main(){
          vec2 p=uv;
          // Preserve the source aspect ratio for both desktop and portrait screens.
          p=uv*crop+(vec2(1.)-crop)*vec2(.74,.5);
          p=(p-.5)/1.075+.5;
          p+=vec2(sin(time*.22)*.016,cos(time*.19)*.007);
          vec3 base=texture2D(landscape,p).rgb;
          float water=smoothstep(.055,.19,base.b-base.r)*smoothstep(.04,.14,base.g-base.r);
          float valley=smoothstep(.23,.62,base.g);
          water*=valley;
          vec2 ripple=vec2(sin(p.y*116.+time*1.8)+sin(p.x*83.-time*.9),cos(p.x*105.+time*1.2));
          vec2 q=p+ripple*vec2(.0018,.0009)*water;
          // Distant ridges move much less than the foreground river.
          q.x+=sin(time*.22)*.003*(1.-water)*(1.-p.y);
          vec3 color=texture2D(landscape,q).rgb;
          float crest=pow(.5+.5*sin(q.y*210.+q.x*43.-time*2.2),10.);
          color+=vec3(.12,.20,.20)*crest*water*.26;
          float light=exp(-pow((p.x-.65-sin(time*.11)*.22)*4.,2.));
          color+=vec3(.018,.025,.024)*light*(.35+.65*p.y);
          gl_FragColor=vec4(color,1.);
        }`);
      gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program);
      gl.deleteShader(vert); gl.deleteShader(frag);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Landscape program unavailable');
      gl.useProgram(program); timeUniform=gl.getUniformLocation(program,'time');
      resize();
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      image.onload = () => {
        if (disposed) return;
        try {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
          ready = true; draw(); canvas.classList.add('ready');
          fallback.style.visibility = 'hidden'; camera.cancel();
        } catch { canvas.remove(); }
      };
      image.onerror = () => canvas.remove();
      image.src = RiverAtlasLandscapeTexture;
    } catch { canvas.remove(); }
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); ready = false; canvas.remove(); fallback.style.visibility = '';
      if (!stopped) camera.play();
    });
    function resize() {
      if (!gl || !program || disposed) return;
      const ratio=host.clientWidth/Math.max(host.clientHeight,1), sourceRatio=2848/1600;
      gl.uniform2f(gl.getUniformLocation(program,'crop'),Math.min(1,ratio/sourceRatio),Math.min(1,sourceRatio/ratio));
      draw();
    }
    function pause() { stopped = true; previous = 0; cancelAnimationFrame(request); camera.pause(); }
    function resume() {
      if (disposed || !stopped) return;
      stopped = false; previous = 0; request = requestAnimationFrame(tick);
      if (!ready) camera.play();
    }
    function restart() { time = 0; draw(); camera.currentTime = 0; pause(); resume(); }
    function destroy() {
      pause(); disposed = true; image.onload = null; image.onerror = null; camera.cancel();
      if (gl) { if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); }
      canvas.remove();
    }
    if (!stopped) { request = requestAnimationFrame(tick); camera.play(); }
    return { pause, resume, restart, destroy, resize };
  }
  return { create };
})();
